import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

// Safepay webhook receiver -- Phase 3b-fix: verify + log only, no DB writes
// yet. Signature verification is a manual raw-body HMAC-SHA512 compare, NOT
// the SDK's verify.webhook(). That method hashes JSON.stringify(body.data)
// (a re-parsed object, re-serialized) rather than the exact bytes Safepay
// signed -- confirmed wrong empirically: across 4 real sandbox deliveries,
// the received x-sfpy-signature only ever matched HMAC-SHA512 of the raw
// request body verbatim, never JSON.stringify(body.data) or
// JSON.stringify(the whole body). So verification here mirrors
// app/api/webhooks/lemonsqueezy/route.ts's raw-body HMAC pattern (algorithm
// and header name differ, structure doesn't): SHA512 instead of LS's
// SHA256, keyed with SAFEPAY_WEBHOOK_SECRET (the Endpoints-page shared
// secret) instead of LEMONSQUEEZY_WEBHOOK_SECRET, header x-sfpy-signature
// instead of x-signature.
//
// Runs on the Node.js runtime (Route Handler default) -- do not add
// `export const runtime = "edge"` here; verification uses Node's built-in
// crypto module. Excluded from middleware.ts's matcher (confirmed: the
// matcher's negative lookahead excludes any `api/webhooks/*` path, same as
// the LS route already relies on) so this route never depends on or is
// delayed by Supabase auth/cookie handling -- Safepay sends no user session.

const SIGNATURE_HEADER = "x-sfpy-signature";

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signatureHeader, "hex");

  // timingSafeEqual throws on a length mismatch instead of returning false
  // -- a forged/malformed header won't be exactly 128 hex chars (SHA-512),
  // so guard the length first. This length check is not itself
  // timing-sensitive (a digest's length isn't a secret); only the
  // byte-for-byte comparison below is, which is why that part goes through
  // timingSafeEqual rather than `===`.
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: NextRequest) {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;

  // Raw text, not request.json() -- signature verification needs the exact
  // bytes Safepay signed. Parsing to JSON first (even just to inspect it)
  // and re-serializing changes the bytes and makes the signature check
  // fail -- this is exactly the bug the SDK's own verify.webhook() has.
  const rawBody = await request.text();

  if (!secret) {
    // Fail closed: with no secret configured, nothing can be verified, so
    // nothing is trusted. Logged distinctly from a real signature mismatch
    // so this misconfiguration is obvious in server logs rather than
    // looking like an attack.
    console.error("[safepay webhook] SAFEPAY_WEBHOOK_SECRET is not configured -- rejecting request.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 401 });
  }

  const signatureHeader = request.headers.get(SIGNATURE_HEADER);

  let signatureValid: boolean;
  try {
    signatureValid = verifySignature(rawBody, signatureHeader, secret);
  } catch (err) {
    console.error(`[safepay webhook] signature verification threw (header "${SIGNATURE_HEADER}") -- rejecting request:`, err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!signatureValid) {
    console.warn(`[safepay webhook] signature verification failed (header "${SIGNATURE_HEADER}") -- rejecting request.`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[safepay webhook] verified signature but body is not valid JSON:", err);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Narrow, PII-conscious log -- mirrors LS's logWebhookPayload style
  // (specific fields only, not the full body). Envelope shape confirmed
  // from real sandbox payloads: `type` (event name, e.g.
  // "subscription.created" / "subscription.payment.succeeded") and
  // `merchant_api_key` live at the top level; the subscription resource
  // itself (id, status, plan_id, ...) lives under `data`.
  //
  // Lifecycle note for the next phase (Phase 3c, not implemented here):
  // subscription.created fires with data.status "INCOMPLETE" before any
  // payment has been taken; subscription.payment.succeeded fires once the
  // charge clears, with data.status "ACTIVE". Granting/upgrading the plan
  // needs to happen on that ACTIVE transition, not on "created" -- otherwise
  // a workspace would be upgraded for a subscription that never actually
  // gets paid.
  if (typeof payload === "object" && payload !== null) {
    const p = payload as Record<string, unknown>;
    const data = (p.data ?? {}) as Record<string, unknown>;
    console.log("[safepay webhook] verified event", {
      type: p.type,
      subscription_id: data.id,
      status: data.status,
    });
  } else {
    console.warn("[safepay webhook] verified but payload is not an object:", payload);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
