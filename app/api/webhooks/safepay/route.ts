import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSafepayClient } from "@/lib/safepay";

// Safepay webhook receiver -- Phase 3a: verify + log only, no DB writes yet.
// Mirrors app/api/webhooks/lemonsqueezy/route.ts's Phase 2 shape (verify
// first, sync later), but Safepay's own SDK verifies very differently from
// Lemon Squeezy's raw-body HMAC, confirmed by reading
// node_modules/@sfpy/node-sdk/dist/resources/verify.js directly rather than
// assuming parity with LS:
//
//   Verify.prototype.webhook = function (request) {
//     var data = Buffer.from(JSON.stringify(request.body.data));
//     var signature = request.headers['x-sfpy-signature'];
//     return signature === crypto.createHmac('sha512', this.config.webhookSecret)
//       .update(data)
//       .digest('hex');
//   };
//
// Two things that break the "verify against the raw, unparsed body" pattern
// LS uses:
//   1. It hashes `JSON.stringify(request.body.data)` -- a *parsed* object's
//      `data` field, re-serialized -- not the exact bytes Safepay sent. So
//      the body MUST be JSON.parse'd before calling verify.webhook(), unlike
//      LS where parsing first would break the signature check.
//   2. It reads `request.headers['x-sfpy-signature']` via plain bracket
//      access, i.e. it wants a plain lowercased-key object (Node's
//      IncomingHttpHeaders shape), not a Fetch API Headers instance -- so
//      the NextRequest's Headers object has to be adapted, not passed as-is.
//
// Runs on the Node.js runtime (Route Handler default) -- do not add
// `export const runtime = "edge"` here; the SDK's verify step uses Node's
// built-in crypto module. Excluded from middleware.ts's matcher (confirmed:
// the matcher's negative lookahead excludes any `api/webhooks/*` path, same
// as the LS route already relies on) so this route never depends on or is
// delayed by Supabase auth/cookie handling -- Safepay sends no user session.

const SIGNATURE_HEADER = "x-sfpy-signature";

export async function POST(request: NextRequest) {
  // Raw text first, same discipline as LS -- but note we still parse it
  // below *before* verifying, because that's what this SDK's algorithm
  // actually operates on (see comment above). Reading via .text() first
  // (rather than request.json()) just avoids relying on Next's implicit
  // body-parsing behavior; it does not preserve byte-exact signing here the
  // way it matters for LS.
  const rawBody = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[safepay webhook] body is not valid JSON -- cannot verify or process:", err);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const signatureValue = request.headers.get(SIGNATURE_HEADER);

  // --- TEMPORARY DIAGNOSTIC (Phase 3b-fix) ---
  // The real sandbox payload has a top-level `data` field (matching what
  // the SDK's verify.webhook() assumes -- see the header comment), yet
  // verification still fails on every delivery. That means the SDK's own
  // re-serialized hash doesn't byte-match whatever Safepay actually signed
  // -- likely because Safepay signs the exact raw request bytes, while the
  // SDK hashes JSON.stringify() of a re-parsed object, which is not
  // guaranteed to reproduce the original bytes (key order, spacing, etc.).
  // Logging several candidate HMAC-SHA512 digests next to the received
  // signature so we can see which one (if any) matches on the next
  // delivery, then lock in the correct method and delete this block.
  // Sandbox test data only -- safe to log the raw body here.
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[safepay webhook][DIAGNOSTIC] SAFEPAY_WEBHOOK_SECRET is not set -- cannot compute candidates.");
  } else {
    // Deliberately reading SAFEPAY_WEBHOOK_SECRET directly here (the
    // "shared secret" from Safepay's Endpoints page), NOT SAFEPAY_SECRET_KEY
    // (the API/v1Secret) or SAFEPAY_PUBLIC_KEY (the apiKey) -- same secret
    // getSafepayClient() wires up as `webhookSecret` in lib/safepay.ts, so
    // there's no ambiguity about which of the three keys this is.
    const dataField = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).data : undefined;

    const candidateRawBody = createHmac("sha512", webhookSecret).update(rawBody, "utf8").digest("hex");
    const candidateDataField = createHmac("sha512", webhookSecret).update(JSON.stringify(dataField)).digest("hex");
    const candidateWholeEnvelope = createHmac("sha512", webhookSecret).update(JSON.stringify(payload)).digest("hex");

    console.log("[safepay webhook][DIAGNOSTIC] raw body (verbatim):", rawBody);
    console.log(`[safepay webhook][DIAGNOSTIC] received "${SIGNATURE_HEADER}":`, signatureValue);
    console.log("[safepay webhook][DIAGNOSTIC] secret used: process.env.SAFEPAY_WEBHOOK_SECRET (Endpoints-page shared secret)");
    console.log("[safepay webhook][DIAGNOSTIC] candidate a) HMAC-SHA512(raw body verbatim):         ", candidateRawBody);
    console.log("[safepay webhook][DIAGNOSTIC] candidate b) HMAC-SHA512(JSON.stringify(body.data)): ", candidateDataField);
    console.log("[safepay webhook][DIAGNOSTIC] candidate c) HMAC-SHA512(JSON.stringify(whole body)):", candidateWholeEnvelope);
  }
  // --- END TEMPORARY DIAGNOSTIC ---

  let verified = false;
  try {
    const safepay = getSafepayClient();
    verified = safepay.verify.webhook({
      body: payload,
      headers: { [SIGNATURE_HEADER]: signatureValue ?? undefined },
    });
  } catch (err) {
    // Throws if, e.g., the payload has no top-level `data` field (the SDK
    // does `JSON.stringify(request.body.data)` unconditionally -- see
    // above) or if getSafepayClient() itself isn't configured. Either way,
    // nothing is verified, so fail closed. Logging the parsed payload's
    // top-level keys (not its values) here is deliberate: if Safepay's real
    // envelope shape doesn't match what the SDK assumes, this is the only
    // way Phase 3b will find out why every request 401s, without logging
    // unverified payload content as if it were trustworthy.
    console.error(
      "[safepay webhook] verify.webhook threw -- rejecting request. Top-level payload keys:",
      typeof payload === "object" && payload !== null ? Object.keys(payload as Record<string, unknown>) : typeof payload,
      "error:",
      err
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!verified) {
    console.warn(`[safepay webhook] signature verification failed (header "${SIGNATURE_HEADER}") -- rejecting request.`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // Capture-only phase: log the entire verified payload so Phase 3b can be
  // designed against the real structure instead of guesses. Deliberately
  // logs the full body here (not a PII-narrowed subset like LS's
  // logWebhookPayload) -- this is temporary and sandbox-only; Phase 3b
  // should replace this with a narrow, field-specific log once the real
  // shape is known.
  console.log(`[safepay webhook] verified using header "${SIGNATURE_HEADER}"`);
  console.log("[safepay webhook] payload:", JSON.stringify(payload, null, 2));

  return NextResponse.json({ received: true }, { status: 200 });
}
