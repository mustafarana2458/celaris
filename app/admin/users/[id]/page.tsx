import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdminPage } from "@/lib/superAdmin";
import { getAuthUser, isCurrentlyBanned } from "@/lib/adminUsers";
import { UserDetailClient } from "@/components/admin/users/UserDetailClient";

export type AdminUserDetail = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspended: boolean;
  memberships: { workspaceName: string; role: string }[];
};

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  await requireSuperAdminPage();

  const supabase = createServiceClient();

  const [authUser, profileRes, membershipsRes] = await Promise.all([
    getAuthUser(supabase, params.id),
    supabase.from("users").select("full_name").eq("id", params.id).maybeSingle<{ full_name: string | null }>(),
    supabase
      .from("workspace_members")
      .select("role, workspaces(name)")
      .eq("user_id", params.id),
  ]);

  if (!authUser) {
    notFound();
  }

  type MembershipRow = { role: string; workspaces: { name: string } | { name: string }[] | null };
  const memberships = ((membershipsRes.data as MembershipRow[] | null) ?? []).map((row) => {
    const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
    return { workspaceName: ws?.name ?? "--", role: row.role };
  });

  const detail: AdminUserDetail = {
    id: authUser.id,
    email: authUser.email,
    fullName: profileRes.data?.full_name ?? null,
    createdAt: authUser.createdAt,
    lastSignInAt: authUser.lastSignInAt,
    suspended: isCurrentlyBanned(authUser.bannedUntil),
    memberships,
  };

  return <UserDetailClient user={detail} />;
}
