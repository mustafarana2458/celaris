import { redirect } from "next/navigation";

// Admin Auth Rebuild Phase 3: /admin-login was Phase 2's temporary login
// URL (see the Phase 2 report for why /admin/login wasn't reachable yet
// at the time). The real page now lives at app/admin/login/page.tsx --
// this stub only exists so anyone with the old URL bookmarked lands
// somewhere real instead of a dead link.
export default function AdminLoginRedirect() {
  redirect("/admin/login");
}
