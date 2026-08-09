-- Team Submodule 4 Part 2b: assignment-based SELECT visibility for
-- projects and deals. Run this whole file once via nano/psql on the
-- self-hosted Supabase, then NOTIFY pgrst, 'reload schema'.
--
-- Safety defaults baked into the helper functions below:
--   1. workspace owner/admin always see everything (no bypass = no lockout).
--   2. a project/deal with zero assignees AND zero assigned departments is
--      treated as open -- every workspace member sees it. Restriction only
--      kicks in once someone actually assigns it to a person or department.
--   3. ghost team_members (directory profiles, no login / no auth.uid())
--      are NOT considered for access -- they are tagging only. Only real
--      users (user_id columns) grant visibility.
--   4. department_members is queried live inside the helper, not cached,
--      so removing someone from a department revokes access on their very
--      next request -- nothing to invalidate.
--
-- Only SELECT is restricted. INSERT/UPDATE/DELETE stay on the existing
-- is_workspace_member(workspace_id) check, unchanged from today -- any
-- workspace member can still create/edit/delete any project or deal, same
-- as before this migration. (Note: this means a member could still
-- update/delete a project/deal they can no longer see, if they already
-- know its id -- same tradeoff the app's own actions already accept by
-- trusting workspace_id + id, not raised as a blocker, just documented.)

-- ---------------------------------------------------------------------
-- 1. Defensive indexes (IF NOT EXISTS -- safe to run even if these
--    already exist from the 2a migration).
-- ---------------------------------------------------------------------

create index if not exists idx_project_assignees_project_id
  on public.project_assignees (project_id);

create index if not exists idx_project_assignees_user_id
  on public.project_assignees (user_id);

create index if not exists idx_project_departments_project_id
  on public.project_departments (project_id);

create index if not exists idx_project_departments_department_id
  on public.project_departments (department_id);

create index if not exists idx_deal_assignees_deal_id
  on public.deal_assignees (deal_id);

create index if not exists idx_deal_assignees_user_id
  on public.deal_assignees (user_id);

create index if not exists idx_deal_departments_deal_id
  on public.deal_departments (deal_id);

create index if not exists idx_deal_departments_department_id
  on public.deal_departments (department_id);

create index if not exists idx_department_members_department_id
  on public.department_members (department_id);

create index if not exists idx_department_members_user_id
  on public.department_members (user_id);

create index if not exists idx_workspace_members_workspace_user
  on public.workspace_members (workspace_id, user_id);

-- ---------------------------------------------------------------------
-- 2. Helper functions.
--
--    SECURITY DEFINER + a locked search_path so these run as the
--    function owner (bypasses RLS on projects/deals/junction tables
--    internally, avoiding recursive-policy issues) without being
--    hijackable via a malicious search_path.
-- ---------------------------------------------------------------------

create or replace function public.can_see_project(p_project_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_workspace_id uuid;
  v_role text;
begin
  select workspace_id into v_workspace_id
  from public.projects
  where id = p_project_id;

  if v_workspace_id is null then
    return false;
  end if;

  select role into v_role
  from public.workspace_members
  where workspace_id = v_workspace_id
    and user_id = auth.uid();

  if v_role is null then
    -- not a member of this project's workspace at all
    return false;
  end if;

  if v_role in ('owner', 'admin') then
    return true;
  end if;

  -- unassigned = open to the whole workspace
  if not exists (
    select 1 from public.project_assignees where project_id = p_project_id
  ) and not exists (
    select 1 from public.project_departments where project_id = p_project_id
  ) then
    return true;
  end if;

  -- directly assigned (real user only, ghosts do not grant access)
  if exists (
    select 1 from public.project_assignees
    where project_id = p_project_id
      and user_id = auth.uid()
  ) then
    return true;
  end if;

  -- member of an assigned department (real user only)
  if exists (
    select 1
    from public.project_departments pd
    join public.department_members dm on dm.department_id = pd.department_id
    where pd.project_id = p_project_id
      and dm.user_id = auth.uid()
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.can_see_deal(p_deal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_workspace_id uuid;
  v_role text;
begin
  select workspace_id into v_workspace_id
  from public.deals
  where id = p_deal_id;

  if v_workspace_id is null then
    return false;
  end if;

  select role into v_role
  from public.workspace_members
  where workspace_id = v_workspace_id
    and user_id = auth.uid();

  if v_role is null then
    return false;
  end if;

  if v_role in ('owner', 'admin') then
    return true;
  end if;

  if not exists (
    select 1 from public.deal_assignees where deal_id = p_deal_id
  ) and not exists (
    select 1 from public.deal_departments where deal_id = p_deal_id
  ) then
    return true;
  end if;

  if exists (
    select 1 from public.deal_assignees
    where deal_id = p_deal_id
      and user_id = auth.uid()
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.deal_departments dd
    join public.department_members dm on dm.department_id = dd.department_id
    where dd.deal_id = p_deal_id
      and dm.user_id = auth.uid()
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Split "ws projects" (cmd=ALL) into per-command policies.
--    SELECT now goes through can_see_project(). INSERT/UPDATE/DELETE
--    stay exactly as they were (is_workspace_member(workspace_id)) so
--    create/edit/delete behavior does not change in this migration.
-- ---------------------------------------------------------------------

drop policy if exists "ws projects" on public.projects;

create policy "ws projects select" on public.projects
  for select
  using (public.can_see_project(id));

create policy "ws projects insert" on public.projects
  for insert
  with check (public.is_workspace_member(workspace_id));

create policy "ws projects update" on public.projects
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "ws projects delete" on public.projects
  for delete
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------
-- 4. Same split for "ws deals".
-- ---------------------------------------------------------------------

drop policy if exists "ws deals" on public.deals;

create policy "ws deals select" on public.deals
  for select
  using (public.can_see_deal(id));

create policy "ws deals insert" on public.deals
  for insert
  with check (public.is_workspace_member(workspace_id));

create policy "ws deals update" on public.deals
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "ws deals delete" on public.deals
  for delete
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------
-- 5. Reload PostgREST's schema cache so it picks up the new functions
--    and the policy split immediately.
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
