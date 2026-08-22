import { createServiceClient } from "@/lib/supabase/service";
import { PromoCodesClient } from "@/components/admin/promo/PromoCodesClient";

// Admin Promo Code wizard: list page. This is a Server Component nested
// under app/admin/(protected)/layout.tsx, which already ran its admin
// session guard before this ever renders -- Next.js always executes the
// full layout chain for any request to a nested route, so there is no
// way to reach this page without passing that check first. (The two API
// routes this module's client component calls are separate invocations
// and re-check themselves -- see app/api/admin/promo/{create,toggle}/route.ts.)
//
// Reads via the service-role client, not the session client: promo_codes
// has no SELECT policy for `authenticated` (service-role-only by RLS
// design, per Phase 1's promo schema), and even if it did, a super-admin
// listing codes needs to see every row regardless of workspace/RLS scope.
export type PromoCodeRow = {
  id: string;
  code: string;
  description: string | null;
  reward_type: string;
  reward_payload: Record<string, unknown>;
  max_redemptions: number;
  current_redemptions: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export default async function AdminPromoCodesPage() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, description, reward_type, reward_payload, max_redemptions, current_redemptions, is_active, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin promo-codes] fetch failed:", error.message);
  }

  return <PromoCodesClient initialCodes={(data as PromoCodeRow[] | null) ?? []} />;
}
