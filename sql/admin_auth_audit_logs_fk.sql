-- Admin Auth Rebuild Phase 3: audit_logs.actor_user_id currently
-- (almost certainly) has a foreign key to auth.users. From Phase 3
-- onward, every admin action's actor_user_id will be an admin_users.id
-- instead -- admin_users is deliberately unrelated to auth.users -- which
-- would violate that FK on every single admin-action audit insert.
--
-- RUN THIS BEFORE DEPLOYING THE PHASE 3 APP CODE. logAuditEvent() never
-- throws on a failed insert (only console.error's -- see lib/auditLog.ts),
-- so without this, every admin action would keep working but silently
-- stop being audit-logged from the moment the new code goes live.
--
-- Decision: actor_user_id WILL be populated going forward (with the
-- admin_users.id of whoever performed the action), not left null --
-- actor_email is also still populated on every call, but keeping the id
-- too preserves a stable, unique identifier per actor for future
-- filtering/joins (an email string is weaker -- theoretically reusable
-- across different admin_users rows over time).
--
-- Finds and drops whatever the FK constraint is actually named (not
-- committed to this repo, so the exact name isn't known here) rather
-- than requiring you to look it up first. Safe to run more than once --
-- it's a no-op if the constraint is already gone.
--
-- Run this once via docker exec/psql on the self-hosted Postgres, then
-- NOTIFY pgrst, 'reload schema'.

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'audit_logs'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'actor_user_id';

  if fk_name is not null then
    execute format('alter table public.audit_logs drop constraint %I', fk_name);
  end if;
end $$;

alter table public.audit_logs alter column actor_user_id drop not null;
