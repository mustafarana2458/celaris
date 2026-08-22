-- Admin Auth Rebuild Phase 4 cleanup: drop the OLD, now fully-unused
-- Supabase-based admin gate -- public.platform_admins and
-- public.is_platform_admin(). Confirmed via full-repo grep that no app
-- code references either anymore (lib/superAdmin.ts, the only caller,
-- was deleted in this same cleanup pass).
--
-- is_platform_admin() signature: zero-arg -- is_platform_admin(). This
-- is NOT a guess: it's documented in lib/superAdmin.ts's own comment
-- (now deleted, but was explicit) -- "deliberately zero-arg -- it
-- checks auth.uid() internally, not a client-supplied id -- so this can
-- never be used to probe whether some OTHER user is a platform admin."
-- If you want to double-check independently before running the drop
-- below, `\df is_platform_admin` in psql will confirm it.
--
-- ===================================================================
-- STEP 1 -- DRY RUN. Run these three SELECTs FIRST and read the output
-- before running anything in STEP 2. Nothing here changes any data.
-- ===================================================================

-- 1a. Any RLS policy (on ANY table) whose USING/WITH CHECK expression
-- mentions is_platform_admin -- these are exactly what CASCADE would
-- drop when the function goes. audit_logs is the one table known to
-- have had a redundant "platform admins can SELECT directly" policy
-- alongside the app's service-role access (the app itself never relied
-- on this -- it always read audit_logs via the service-role client --
-- so even if this shows up, dropping it changes no app behavior, only
-- removes a now-pointless direct-RLS-read path). Anything else showing
-- up here is unexpected and worth pausing on.
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where qual ilike '%is_platform_admin%' or with_check ilike '%is_platform_admin%';

-- 1b. Every object (of any kind -- policy, view, function, etc.) Postgres
-- itself has recorded as depending on is_platform_admin(). Broader net
-- than 1a -- catches anything 1a's text search might miss (e.g. a
-- wrapper function calling it, rather than a policy expression).
select
  pg_describe_object(classid, objid, objsubid) as dependent_object,
  deptype
from pg_depend
where refobjid = 'public.is_platform_admin()'::regprocedure
order by 1;

-- 1c. Same as 1b, for the platform_admins TABLE itself -- expected to
-- show mostly its own RLS policy (self-select via auth.uid(), unrelated
-- to the function above) and little/nothing else, since nothing else in
-- this schema has a foreign key into platform_admins.
select
  pg_describe_object(classid, objid, objsubid) as dependent_object,
  deptype
from pg_depend
where refobjid = 'public.platform_admins'::regclass
order by 1;

-- ===================================================================
-- STEP 2 -- DESTRUCTIVE. Only run this after reviewing STEP 1's output
-- and confirming nothing unexpected showed up.
-- ===================================================================

drop function if exists public.is_platform_admin() cascade;
drop table if exists public.platform_admins cascade;

notify pgrst, 'reload schema';
