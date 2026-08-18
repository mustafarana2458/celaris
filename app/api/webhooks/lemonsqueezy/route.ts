import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { syncSubscriptionEvent } from "@/lib/subscriptionSync";

// Lemon Squeezy webhook receiver. Phase 2 built signature verification;
// Phase 3 (this file, now) adds the actual DB sync -- verified events are
// handed to lib/subscriptionSync.ts, which writes to subscriptions +
// workspaces via the service-role client (no user session exists for a
// webhook). Signature verification below is unchanged from Phase 2 -- a
// payload only ever reaches syncSubscriptionEvent after it's verified.
//
// Runs on the Node.js runtime (the Route Handler default) -- do not add
// `export const runtime = "edge"` here, since verification uses Node's
// built-in crypto module.
//
// Excluded from middleware.ts's matcher -- this route must never depend
// on or be delayed by Supabase auth/cookie handling, since Lemon Squeezy
// sends no user session.

const SIGNATURE_HEADER = "x-signature";

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signatureHeader, "hex");

  // timingSafeEqual throws on a length mismatch instead of returning
  // false -- a forged/malformed header won't be exactly 64 hex chars, so
  // guard the length first. This length check is not itself
  // timing-sensitive (a digest's length isn't a secret); only the
  // byte-for-byte comparison below is, which is why that part goes
  // through timingSafeEqual rather than `===`.
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

// Narrow, defensive read of only the fields Phase 3 will actually need --
// deliberately not a full type for Lemon Squeezy's payload shape (that
// can wait until DB-write logic exists and has a real reason to trust
// these fields). Every access is optional-chained since this is
// unvalidated external input. Logs only these fields, not the raw
// payload, so customer PII (email, name, card brand) in the full body
// never ends up in server logs.
function logWebhookPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    console.warn("[lemonsqueezy webhook] verified but payload is not an object:", payload);
    return;
  }

  const p = payload as Record<string, unknown>;
  const meta = (p.meta ?? {}) as Record<string, unknown>;
  const data = (p.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;
  const customData = (meta.custom_data ?? {}) as Record<string, unknown>;

  console.log("[lemonsqueezy webhook] verified event", {
    event_name: meta.event_name,
    workspace_id: customData.workspace_id,
    subscription_id: data.id,
    customer_id: attributes.customer_id,
    status: attributes.status,
    variant_id: attributes.variant_id,
    order_id: attributes.order_id,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  // Raw text, not request.json() -- signature verification needs the
  // exact bytes Lemon Squeezy signed. Parsing to JSON first (even just to
  // inspect it) and re-serializing can reorder keys/change whitespace and
  // make every signature check fail.
  const rawBody = await request.text();

  if (!secret) {
    // Fail closed: with no secret configured, nothing can be verified, so
    // nothing is trusted. Logged distinctly from a real signature
    // mismatch so this misconfiguration is obvious in server logs rather
    // than looking like an attack. Expected to happen until the webhook
    // secret is registered and added to the server's env (Phase 2 setup
    // step) -- every request 401s until then, which is the safe default.
    console.error("[lemonsqueezy webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured -- rejecting request.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 401 });
  }

  const signatureHeader = request.headers.get(SIGNATURE_HEADER);

  if (!verifySignature(rawBody, signatureHeader, secret)) {
    console.warn("[lemonsqueezy webhook] signature verification failed -- rejecting request.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[lemonsqueezy webhook] verified signature but body is not valid JSON:", err);
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  logWebhookPayload(payload);

  const result = await syncSubscriptionEvent(payload);

  if (!result.ok) {
    // A genuine write failure (transient DB error, etc.) -- 500 so Lemon
    // Squeezy retries. Safe to retry: syncSubscriptionEvent's upsert keys
    // off lemon_subscription_id and only re-grants credits when the
    // billing period actually changed, so a redelivery of the same event
    // can't double-charge or double-reset anything.
    console.error(`[lemonsqueezy webhook] sync failed for event, will let Lemon Squeezy retry: ${result.error}`);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }

  if (result.skipped) {
    console.log(`[lemonsqueezy webhook] event acknowledged, no sync performed: ${result.skipped}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
