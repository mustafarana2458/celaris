import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdminPage } from "@/lib/superAdmin";
import { listAllAuthUsers, isCurrentlyBanned } from "@/lib/adminUsers";

// Admin Users module: list page. Pure Server Component, same pattern as
// Workspaces/Audit Logs -- each row links to /admin/users/[id] via a
// plain <Link>, no client JS needed for the list itself.
//
// Account data (email, created, last sign-in, suspended) comes from the
// Supabase Admin API (lib/adminUsers.ts) since auth.users isn't exposed
// through PostgREST. Display name and workspace memberships come from
// public.users / workspace_members via the service-role client.

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminUsersPage() {
  await requireSuperAdminPage();

  const supabase = createServiceClient();

  const [authUsers, profilesRes, membershipsRes, workspacesRes] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase.from("users").select("id, full_name"),
    supabase.from("workspace_members").select("user_id, workspace_id, role"),
    supabase.from("workspaces").select("id, name"),
  ]);

  const nameById = new Map<string, string>();
  for (const row of (profilesRes.data as { id: string; full_name: string | null }[] | null) ?? []) {
    if (row.full_name) nameById.set(row.id, row.full_name);
  }

  const workspaceNameById = new Map<string, string>();
  for (const row of (workspacesRes.data as { id: string; name: string }[] | null) ?? []) {
    workspaceNameById.set(row.id, row.name);
  }

  const membershipsByUser = new Map<string, { workspaceName: string; role: string }[]>();
  for (const row of (membershipsRes.data as { user_id: string; workspace_id: string; role: string }[] | null) ?? []) {
    const list = membershipsByUser.get(row.user_id) ?? [];
    list.push({ workspaceName: workspaceNameById.get(row.workspace_id) ?? "--", role: row.role });
    membershipsByUser.set(row.user_id, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {authUsers.length.toLocaleString()} registered user{authUsers.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {authUsers.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Workspaces</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last sign-in</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {authUsers.map((user) => {
                  const memberships = membershipsByUser.get(user.id) ?? [];
                  const suspended = isCurrentlyBanned(user.bannedUntil);
                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{user.email ?? "--"}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{nameById.get(user.id) ?? "--"}</td>
                      <td className="max-w-[240px] px-4 py-3 text-slate-500 dark:text-slate-400">
                        {memberships.length === 0
                          ? "--"
                          : memberships.map((m) => `${m.workspaceName} (${m.role})`).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(user.lastSignInAt)}</td>
                      <td className="px-4 py-3">
                        {suspended ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            Suspended
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-xs font-medium text-accent-hover hover:underline dark:text-accent"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
