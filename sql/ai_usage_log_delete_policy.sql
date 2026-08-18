-- AI Usage Log: allow owners/admins to clear the log (Settings > AI Usage
-- tab "Clear logs" button). ai_usage_log already has RLS enabled with
-- SELECT/INSERT policies from the AI Credit System phases, but no DELETE
-- policy -- without this, the delete in lib/actions/aiUsage.ts
-- (clearAiUsageLog) silently affects 0 rows under RLS even though the
-- server action's own role check (owner/admin) passes.
--
-- Run this once via nano/psql on the self-hosted Supabase, then
-- NOTIFY pgrst, 'reload schema'.

create index if not exists idx_ai_usage_log_workspace_id
  on public.ai_usage_log (workspace_id);

drop policy if exists "ai_usage_log_delete_owner_admin" on public.ai_usage_log;

create policy "ai_usage_log_delete_owner_admin"
on public.ai_usage_log
for delete
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ai_usage_log.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);
