import { requireAdminSessionPage } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";

// Admin Auth Rebuild Phase 3: hard server-side gate for every guarded
// admin page. Route-group placement ((protected)/ doesn't add a URL
// segment, so these pages still resolve to /admin/*) is what lets
// app/admin/login/page.tsx exist as an unguarded sibling outside this
// layout -- Next.js layouts wrap every descendant of their literal
// folder with no file-based way to exempt one nested page, which is
// exactly the constraint that forced Phase 2's login page to live at
// the temporary /admin-login instead of /admin/login.
//
// requireAdminSessionPage() is a single check (no "signed in but not
// platform admin" split like the old Supabase-based guard had) --
// admin_users has no separate tier, so there's only "valid admin
// session" or not. On failure it redirects to /admin/login itself, NOT
// the regular app's /login -- this admin is never expected to have a
// Supabase session at all.
//
// Same "layout only covers page RENDERS" caveat as before: every
// app/api/admin/**/route.ts still calls requireAdminSession() itself,
// since API routes are a separate tree this layout doesn't wrap.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminSessionPage();

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
