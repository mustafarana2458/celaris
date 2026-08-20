import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/superAdmin";
import { AdminShell } from "@/components/admin/AdminShell";

// Super Admin Portal Phase 1: hard server-side gate for the entire
// app/admin/* tree. A Next.js layout always runs for every nested route
// under it, so this one check covers every current and future admin page
// without each of them repeating it -- but it only covers page RENDERS.
// Any future admin Server Action (a mutation, not just a page load) must
// call isPlatformAdmin() again itself; it is a separate invocation this
// layout does not wrap.
//
// Deliberately two checks, not one: "signed in" and "is a platform admin"
// are different failures with different destinations. A workspace
// owner/admin (workspace_members.role) who is NOT a platform admin is
// still signed in, so they hit the second check and land on /dashboard,
// not /login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = await isPlatformAdmin(supabase);
  if (!allowed) {
    redirect("/dashboard");
  }

  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
