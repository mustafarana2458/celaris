import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminSessionPage } from "@/lib/adminAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Admin Portal Audit Logs module: read-only, reverse-chronological viewer
// for the audit_logs table. No mutations anywhere on this page -- writes
// only ever happen via lib/auditLog.ts's logAuditEvent(), called from the
// admin actions being audited (currently: the Promo Code wizard's create
// and toggle routes).
//
// requireAdminSessionPage() re-verifies the admin session explicitly,
// same reasoning as app/admin/(protected)/page.tsx (Overview): this
// module reads across every workspace/actor, so keeping that assumption
// visible here rather than relying solely on the layout matters more
// than for a module that only ever touches the current admin's own data.
//
// Reads via the service-role client -- audit_logs has no SELECT policy
// for anon/authenticated (service-role-only by RLS design, same as every
// other admin module's read path), and admin_users sessions have no
// Supabase role/RLS standing to lean on anyway now that admin auth is
// fully independent of Supabase.
//
// Filtering is a plain GET form (action/actor text inputs) -- no client
// component needed; the browser's own form submission re-navigates this
// Server Component with new searchParams, and the expandable "Details"
// cell below uses a bare <details>/<summary> element for the same reason
// (native disclosure widget, no JS required).

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ROW_LIMIT = 100;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; actor?: string };
}) {
  await requireAdminSessionPage();

  const actionFilter = searchParams.action?.trim() ?? "";
  const actorFilter = searchParams.actor?.trim() ?? "";

  const supabase = createServiceClient();
  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, actor_email, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (actionFilter) query = query.ilike("action", `%${actionFilter}%`);
  if (actorFilter) query = query.ilike("actor_email", `%${actorFilter}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[admin audit-logs] fetch failed:", error.message);
  }

  const rows = (data as AuditLogRow[] | null) ?? [];
  const hasFilter = Boolean(actionFilter || actorFilter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Read-only record of admin actions, newest first. Showing the latest {ROW_LIMIT}
          {hasFilter ? " matching" : ""} {rows.length === 1 ? "entry" : "entries"}.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <Input label="Action" name="action" defaultValue={actionFilter} placeholder="e.g. promo_code.create" />
        <Input label="Actor email" name="actor" defaultValue={actorFilter} placeholder="e.g. boss@celaris.cloud" />
        <Button type="submit">Filter</Button>
        {hasFilter && (
          <a
            href="/admin/audit-logs"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Clear
          </a>
        )}
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            {hasFilter ? "No entries match this filter." : "No audit log entries yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="px-6 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-700/60">
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.actor_email ?? "--"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-slate-100">{row.action}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {row.target_type ? `${row.target_type}${row.target_id ? `:${row.target_id}` : ""}` : "--"}
                    </td>
                    <td className="max-w-[320px] px-6 py-3">
                      {row.details ? (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-accent-hover dark:text-accent">
                            View
                          </summary>
                          <pre className="mt-2 max-w-xs overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
