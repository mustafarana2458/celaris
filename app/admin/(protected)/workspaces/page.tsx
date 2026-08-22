import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { getAuthEmailMap } from "@/lib/adminUsers";
import { getPlanLimit } from "@/lib/aiCreditsCore";

// Admin Workspaces module: list page. Pure Server Component, same as
// Audit Logs -- each row just links to /admin/workspaces/[id] via a
// plain <Link>, no client JS needed for the list itself (the mutating
// actions live on the detail page).
//
// Read-only here: no writes happen on this page. Owner email comes from
// the Supabase Admin API (see lib/adminUsers.ts), not a public.users
// column -- that table doesn't store email.

const PLAN_LABELS: Record<string, string> = { free: "Free", solo: "Solo", team: "Team", scale: "Scale" };
const PROVIDER_LABELS: Record<string, string> = { lemonsqueezy: "Lemon Squeezy", safepay: "Safepay" };

type WorkspaceRow = {
  id: string;
  name: string;
  plan: string | null;
  ai_credits_used: number | null;
  owner_id: string | null;
};

export default async function AdminWorkspacesPage() {
  await requireAdminSessionPage();

  const supabase = createServiceClient();

  const [workspacesRes, subscriptionsRes, emailMap] = await Promise.all([
    supabase.from("workspaces").select("id, name, plan, ai_credits_used, owner_id").order("name", { ascending: true }),
    supabase.from("subscriptions").select("workspace_id, provider").eq("status", "active"),
    getAuthEmailMap(supabase),
  ]);

  if (workspacesRes.error) {
    console.error("[admin workspaces] fetch failed:", workspacesRes.error.message);
  }

  const workspaces = (workspacesRes.data as WorkspaceRow[] | null) ?? [];
  const activeSubByWorkspace = new Map<string, string>();
  for (const row of (subscriptionsRes.data as { workspace_id: string; provider: string }[] | null) ?? []) {
    activeSubByWorkspace.set(row.workspace_id, row.provider);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Workspaces</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {workspaces.length.toLocaleString()} workspace{workspaces.length === 1 ? "" : "s"} on the platform.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {workspaces.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No workspaces yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-6 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">AI credits</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => {
                  const plan = ws.plan ?? "free";
                  const limit = getPlanLimit(plan);
                  const used = ws.ai_credits_used ?? 0;
                  const provider = activeSubByWorkspace.get(ws.id);
                  return (
                    <tr key={ws.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{ws.name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {(ws.owner_id && emailMap.get(ws.owner_id)) || "--"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{PLAN_LABELS[plan] ?? plan}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {used.toLocaleString()} / {limit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {provider ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            {PROVIDER_LABELS[provider] ?? provider}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/admin/workspaces/${ws.id}`}
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
