import { createServiceClient } from "@/lib/supabase/service";

// Admin Portal: append-only audit trail. audit_logs has no insert/update/
// delete RLS policy for authenticated/anon (service-role-only by design,
// same "absence of a policy is the policy" pattern as promo_codes/
// subscriptions), so every write here goes through createServiceClient().
//
// Call this from any admin route right after a mutation actually
// succeeds -- never before, and never in a way whose failure could block
// the real operation. logAuditEvent() deliberately never throws: an
// audit-log outage must not turn into an outage for the admin action
// itself, it only gets console.error'd for investigation. If auditability
// of a specific action is later found to be non-negotiable (i.e. the
// action must not be allowed to proceed if it can't be logged), that's a
// deliberate design change at the call site, not something this helper
// should silently start enforcing.
export type AuditEventInput = {
  actorUserId: string;
  actorEmail: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("audit_logs").insert({
      actor_user_id: event.actorUserId,
      actor_email: event.actorEmail,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      details: event.details ?? null,
    });

    if (error) {
      console.error("[auditLog] insert failed:", error.message, { action: event.action, targetId: event.targetId });
    }
  } catch (err) {
    // Covers createServiceClient() throwing (missing env config) as well
    // as any unexpected error from the insert itself -- same fail-open-
    // but-loud posture either way.
    console.error("[auditLog] unexpected failure:", err, { action: event.action, targetId: event.targetId });
  }
}
