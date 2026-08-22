-- Celaris Pre-launch: full test-data wipe.
--
-- Deletes: the Aevia workspace (89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d) and
-- every row in every workspace-scoped table that belongs to it, plus the
-- 3 named auth accounts and every row (app-side and auth-side) tied to
-- them.
--
-- Does NOT touch: admin_users, admin_sessions (separate admin auth,
-- rebuilt recently -- unrelated to this test data), app_settings
-- (platform config), promo_codes (definitions -- only this workspace's
-- REDEMPTIONS are removed), audit_logs (the Admin Portal's own audit
-- trail -- treated as platform-level record-keeping, not "this
-- workspace's data", same reasoning as leaving promo_codes definitions
-- alone).
--
-- IMPORTANT -- how this list was built, and its real limitation:
-- most of this app's table schemas are NOT committed to this repo (per
-- this project's existing convention -- SQL is written once, run
-- manually, and not re-committed after). I do not have direct access to
-- the live database from this environment. This file's table list and
-- delete order were derived by reading every .from("...") call and every
-- workspace_id/FK-shaped column reference across the actual application
-- code (lib/actions/**, the dashboard pages) -- not by reading real
-- CREATE TABLE statements for most of these tables. I confirmed actual
-- FK/cascade behavior only for the few tables whose schema IS committed
-- (subscriptions -- workspace_id references workspaces(id) on delete
-- cascade, per sql/subscriptions_schema.sql).
--
-- Because of that, STEP 1 (dry run) and STEP 3 (post-delete orphan
-- check) are not optional formalities here -- they are the actual
-- verification that this list is complete and the order is correct.
-- Run STEP 1 and STEP 4 (the live introspection cross-check) BEFORE
-- STEP 2, and compare their output against the table list below. If
-- either surfaces a table not listed here, STOP and tell me before
-- running STEP 2 -- do not extend this file by guessing.
--
-- UPDATE (revision 2): STEP 4's own introspection query, run against the
-- live DB, surfaced exactly this -- two tables with a workspace_id
-- column that the original version of this file missed: activities and
-- attachments. Neither is referenced anywhere in the current app code
-- (confirmed by grepping the whole codebase for both names, including
-- case-insensitively and partial matches -- zero real hits, only
-- unrelated "inactivity"/generic-copy matches for "activit*"). That
-- means I have no code-derived evidence of their actual FK
-- relationships -- unlike every other table in this file, which was
-- placed based on a real column reference somewhere in lib/actions/**.
-- They're now included (see the FK/cascade map below for exactly how,
-- and why), placed in the leaf/junction group -- the safe default when
-- outbound-FK direction is unknown, since deleting first is correct
-- whether or not they reference another workspace-scoped table. Re-run
-- STEP 4 again after this update, as the authoritative check that
-- nothing else is still missing -- I can't independently guarantee that
-- without live DB access myself.
--
-- Run via nano/psql on the self-hosted Supabase. Not run by Claude.

-- =====================================================================
-- Target IDs (fill in / confirm before running)
-- =====================================================================
-- Aevia workspace id:            89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d
-- Target emails:
--   bilalrana2003lbl@gmail.com
--   mustafarana2458@gmail.com
--   mustafarana2726@gmail.com
--
-- Resolve the 3 auth user ids once, here, and note them down -- every
-- later query in this file that needs a user id references this by
-- comment; psql doesn't have variables across statements without
-- \gset/\set (session-dependent), so IDs are repeated literally below
-- rather than assumed to carry over. Run this first and keep the ids
-- handy:

select id, email, created_at
from auth.users
where email in (
  'bilalrana2003lbl@gmail.com',
  'mustafarana2458@gmail.com',
  'mustafarana2726@gmail.com'
);

-- =====================================================================
-- SAFETY CHECK -- do any of these 3 users own/belong to a workspace
-- OTHER than Aevia? If this returns any row whose id is NOT
-- 89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d, STOP: deleting these 3 auth
-- users (Step 2, bottom of this file) removes their membership from
-- EVERY workspace they're in, not just Aevia -- this only explicitly
-- deletes Aevia's own data, so a different workspace they belong to
-- would be left behind with a dangling/orphaned membership once their
-- auth.users row is gone.
-- =====================================================================

select w.id, w.name, w.owner_id
from public.workspaces w
where w.owner_id in (
  select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'
  )
)
and w.id <> '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

select wm.workspace_id, w.name, wm.user_id, wm.role
from public.workspace_members wm
join public.workspaces w on w.id = wm.workspace_id
where wm.user_id in (
  select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'
  )
)
and wm.workspace_id <> '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- =====================================================================
-- FK / cascade map (as derived from application code -- see the note at
-- the top of this file re: confidence level).
--
-- Workspace-scoped tables (every one below has its OWN direct
-- workspace_id column -- confirmed by grepping every lib/actions/*.ts
-- file's actual .eq("workspace_id", ...) / insert({ workspace_id: ... })
-- calls; this is NOT inferred from a parent-table join, each of these
-- genuinely carries workspace_id itself):
--
--   Pure junction / leaf tables (no other app table references these):
--     invoice_items, deal_assignees, deal_departments,
--     project_assignees, project_departments, department_members,
--     contact_tags, subtasks, milestones
--
--   activities, attachments -- added in revision 2 (see the UPDATE note
--   at the top of this file). NOT referenced anywhere in the app code --
--   no page, action, or component queries either table, so there is no
--   code-derived evidence of their real column shape or outbound FKs.
--   Placed here (leaf-first) as the safe default for an unknown-shape
--   table: both names strongly suggest child/log records that reference
--   a PARENT entity (an activity logged against a contact/deal, a file
--   attached to an invoice/task/project), not the other way around --
--   the same shape as every other table in this leaf group -- and I
--   found no evidence of anything else referencing THEM. Deleting them
--   first is correct whether that guess is right or not: if they do
--   reference another workspace-scoped entity, deleting them before that
--   entity avoids an FK violation; if they turn out to be fully
--   standalone, deleting them first is still harmless.
--   attachments specifically: if this table stores metadata about
--   uploaded files (a storage path/URL column) rather than the file
--   content itself, deleting its ROWS here does NOT delete the actual
--   bytes from Supabase Storage -- same caveat already flagged for the
--   avatars/logos buckets in the original report. Not handled by this
--   file either way.
--
--   Standalone workspace(+user)-scoped, no outbound FK to another
--   workspace-scoped table:
--     ai_chat_history (workspace_id + user_id),
--     ai_usage_log (workspace_id + user_id),
--     promo_code_redemptions (workspace_id + user_id -- confirmed via
--       redeem_promo_code(p_workspace_id, p_user_id) in
--       app/api/promo/redeem/route.ts),
--     subscriptions (workspace_id, CONFIRMED "on delete cascade" from
--       workspaces in sql/subscriptions_schema.sql -- the one table here
--       I have real schema confidence on),
--     sales_targets, user_preferences (user_id + workspace_id),
--     invitations
--
--   Entities with an outbound nullable FK to another workspace-scoped
--   entity (must be deleted before the table they point to):
--     tasks           -> (subtasks already gone) -> may reference projects
--     invoices        -> contact_id (contacts)
--     deals           -> contact_id (contacts), company_id (companies),
--                         pipeline_id (pipelines)
--     projects        -> client_id/"company_id" (companies -- actual DB
--                         column is client_id per lib/actions/projects.ts's
--                         own comment, formData field is named company_id),
--                         deal_id (deals), template_id (project_templates)
--     recurring_profiles -> contact_id (contacts)
--
--   Referenced-by-the-above lookup/entity tables (delete only after
--   everything above is gone):
--     contacts        <- referenced by deals, invoices, contact_tags,
--                         recurring_profiles
--     companies       <- referenced by contacts, deals, projects
--     pipelines       <- referenced by deals
--     products        <- referenced by invoice_items
--     project_templates <- referenced by projects
--     tags            <- referenced by contact_tags
--     departments     <- referenced by department_members,
--                         project_departments, deal_departments
--     team_members    <- referenced by project_assignees/deal_assignees
--                         via a nullable team_member_id (per
--                         sql/2b_access_restriction_rls.sql's comment:
--                         "ghost team_members... tagging only")
--     segments        (no confirmed inbound references from other
--                       tables -- safe alongside the above)
--
--   Membership / root:
--     workspace_members  (workspace_id + user_id)
--     workspaces          (the root -- delete last of the workspace-
--                           scoped set)
--
-- User-scoped (not workspace-scoped) auth-adjacent tables:
--     public.users        (id = auth.users.id)
--     auth.identities, auth.sessions, auth.refresh_tokens -- Supabase's
--       own auth schema defines these with "on delete cascade" from
--       auth.users(id) by design (documented Supabase/GoTrue behavior,
--       not specific to this project) -- included explicitly anyway,
--       per the request that nothing survive that "cascade se na ude".
--     auth.users itself -- deleted last, after everything above.
--
-- NOT deleted, explicitly, anywhere in this file:
--     admin_users, admin_sessions, app_settings, promo_codes,
--     audit_logs, platform_admins (already dropped in an earlier phase).
-- =====================================================================


-- =====================================================================
-- STEP 1 -- DRY RUN. Row counts only, nothing is deleted. Run this
-- first and read every number before going anywhere near STEP 2.
-- =====================================================================

select 'invoice_items'         as table_name, count(*) from public.invoice_items         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deal_assignees',            count(*) from public.deal_assignees        where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deal_departments',          count(*) from public.deal_departments      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_assignees',         count(*) from public.project_assignees     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_departments',       count(*) from public.project_departments   where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'department_members',        count(*) from public.department_members    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'contact_tags',               count(*) from public.contact_tags          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'subtasks',                   count(*) from public.subtasks              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'milestones',                 count(*) from public.milestones            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'activities',                  count(*) from public.activities            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'attachments',                 count(*) from public.attachments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'ai_chat_history',            count(*) from public.ai_chat_history       where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'ai_usage_log',                count(*) from public.ai_usage_log          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'promo_code_redemptions',      count(*) from public.promo_code_redemptions where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'subscriptions',               count(*) from public.subscriptions         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'sales_targets',               count(*) from public.sales_targets         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'user_preferences',            count(*) from public.user_preferences      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'invitations',                 count(*) from public.invitations           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'tasks',                       count(*) from public.tasks                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'invoices',                    count(*) from public.invoices              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deals',                       count(*) from public.deals                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'projects',                    count(*) from public.projects              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'recurring_profiles',          count(*) from public.recurring_profiles    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'contacts',                    count(*) from public.contacts              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'companies',                   count(*) from public.companies             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'pipelines',                   count(*) from public.pipelines             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'products',                    count(*) from public.products              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_templates',           count(*) from public.project_templates     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'tags',                        count(*) from public.tags                  where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'departments',                 count(*) from public.departments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'team_members',                count(*) from public.team_members          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'segments',                    count(*) from public.segments              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'workspace_members (by ws)',   count(*) from public.workspace_members     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'workspaces',                  count(*) from public.workspaces            where id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
order by 1;

-- User-scoped counts (independent of the workspace id -- these catch
-- membership/data these 3 users might have anywhere, not just Aevia;
-- see the SAFETY CHECK above).
select 'workspace_members (by user)' as table_name, count(*) from public.workspace_members
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'))
union all select 'public.users', count(*) from public.users
  where id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'))
union all select 'auth.identities', count(*) from auth.identities
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'))
union all select 'auth.sessions', count(*) from auth.sessions
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'))
union all select 'auth.refresh_tokens', count(*) from auth.refresh_tokens
  where user_id::uuid in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'))
union all select 'auth.users', count(*) from auth.users
  where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com');


-- =====================================================================
-- STEP 4 (run this alongside STEP 1, before STEP 2) -- live introspection
-- cross-check. Finds every table with a workspace_id column that
-- ACTUALLY exists in this database, regardless of whether the app code
-- happens to reference it. Compare this list against the table_name
-- values in STEP 1 above -- if this returns a table not covered there,
-- STOP and tell me before running STEP 2.
-- =====================================================================

select table_schema, table_name
from information_schema.columns
where column_name = 'workspace_id'
  and table_schema = 'public'
order by table_name;

-- Same idea for anything with a direct FK to auth.users that STEP 1's
-- user-scoped block might not cover.
select
  tc.table_schema, tc.table_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth' and ccu.table_name = 'users'
  and tc.table_schema = 'public'
order by tc.table_name;


-- =====================================================================
-- STEP 2 -- DESTRUCTIVE. Only run after STEP 1 and STEP 4's output has
-- been reviewed and matches expectations, and the SAFETY CHECK above
-- returned no unexpected other-workspace rows.
--
-- Order matters -- children/junctions first, root (workspaces) last,
-- then user profile rows, then auth-side rows, then auth.users itself.
-- Every statement is scoped by workspace_id/user_id explicitly (not
-- relying on assumed cascade for anything except subscriptions, which
-- is confirmed to cascade already but is still deleted explicitly here
-- for clarity and defensiveness).
-- =====================================================================

begin;

-- -- Junction / leaf tables --
delete from public.invoice_items         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.deal_assignees        where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.deal_departments      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.project_assignees     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.project_departments   where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.department_members    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.contact_tags          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.subtasks              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.milestones            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
-- activities/attachments (revision 2 -- see the FK/cascade map above):
-- not referenced anywhere in app code, placed leaf-first as the safe
-- default. attachments row deletion does NOT remove the underlying
-- Supabase Storage file if this table stores file metadata rather than
-- the file content itself -- not handled by this SQL file.
delete from public.activities            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.attachments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- -- Standalone workspace(+user)-scoped --
delete from public.ai_chat_history       where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.ai_usage_log          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.promo_code_redemptions where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.subscriptions         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.sales_targets         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.user_preferences      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.invitations           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- -- Entities with outbound FKs to other entities (delete before what they point to) --
delete from public.tasks                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.invoices              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.deals                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.projects              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.recurring_profiles    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- -- Referenced-by-the-above lookup/entity tables --
delete from public.contacts              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.companies             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.pipelines             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.products              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.project_templates     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.tags                  where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.departments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.team_members          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.segments              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- -- Membership, then the workspace itself --
delete from public.workspace_members     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';
delete from public.workspaces            where id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d';

-- -- Any OTHER workspace membership these 3 users might have had
-- (belt-and-suspenders after the SAFETY CHECK above -- should be 0 rows
-- if that check came back clean).
delete from public.workspace_members
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'));

-- -- Profile rows --
delete from public.users
  where id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'));

-- -- Auth-side rows (defensive/explicit -- Supabase's own schema already
-- cascades these from auth.users by design, but deleting explicitly
-- here means nothing is left relying on that assumption unverified). --
delete from auth.identities
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'));
delete from auth.sessions
  where user_id in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'));
delete from auth.refresh_tokens
  where user_id::uuid in (select id from auth.users where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com'));

-- -- The auth accounts themselves, last. --
delete from auth.users
  where email in (
    'bilalrana2003lbl@gmail.com', 'mustafarana2458@gmail.com', 'mustafarana2726@gmail.com');

-- Review the output of every statement above (row counts deleted) before
-- committing. If anything looks wrong, "rollback;" instead of "commit;".
-- commit;


-- =====================================================================
-- STEP 3 -- run AFTER commit, to confirm zero orphans. Every one of
-- these should return 0. This is the same query set as STEP 1's
-- workspace-scoped block, re-run post-delete.
-- =====================================================================

select 'invoice_items'         as table_name, count(*) from public.invoice_items         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deal_assignees',            count(*) from public.deal_assignees        where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deal_departments',          count(*) from public.deal_departments      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_assignees',         count(*) from public.project_assignees     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_departments',       count(*) from public.project_departments   where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'department_members',        count(*) from public.department_members    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'contact_tags',               count(*) from public.contact_tags          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'subtasks',                   count(*) from public.subtasks              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'milestones',                 count(*) from public.milestones            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'activities',                  count(*) from public.activities            where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'attachments',                 count(*) from public.attachments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'ai_chat_history',            count(*) from public.ai_chat_history       where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'ai_usage_log',                count(*) from public.ai_usage_log          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'promo_code_redemptions',      count(*) from public.promo_code_redemptions where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'subscriptions',               count(*) from public.subscriptions         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'sales_targets',               count(*) from public.sales_targets         where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'user_preferences',            count(*) from public.user_preferences      where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'invitations',                 count(*) from public.invitations           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'tasks',                       count(*) from public.tasks                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'invoices',                    count(*) from public.invoices              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'deals',                       count(*) from public.deals                 where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'projects',                    count(*) from public.projects              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'recurring_profiles',          count(*) from public.recurring_profiles    where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'contacts',                    count(*) from public.contacts              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'companies',                   count(*) from public.companies             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'pipelines',                   count(*) from public.pipelines             where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'products',                    count(*) from public.products              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'project_templates',           count(*) from public.project_templates     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'tags',                        count(*) from public.tags                  where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'departments',                 count(*) from public.departments           where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'team_members',                count(*) from public.team_members          where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'segments',                    count(*) from public.segments              where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'workspace_members',           count(*) from public.workspace_members     where workspace_id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'workspaces',                  count(*) from public.workspaces            where id = '89f1ba20-9587-46c1-8b1b-2bb46f2b7d6d'
union all select 'public.users',                count(*) from public.users                 where id in (select id from auth.users where email in ('bilalrana2003lbl@gmail.com','mustafarana2458@gmail.com','mustafarana2726@gmail.com'))
union all select 'auth.users',                  count(*) from auth.users                   where email in ('bilalrana2003lbl@gmail.com','mustafarana2458@gmail.com','mustafarana2726@gmail.com')
order by 1;


-- =====================================================================
-- Explicitly confirmed UNTOUCHED by this entire file (no DELETE/UPDATE
-- statement above references any of these):
--   admin_users, admin_sessions, app_settings, promo_codes, audit_logs
-- =====================================================================
