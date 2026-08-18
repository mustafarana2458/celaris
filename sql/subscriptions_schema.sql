-- Lemon Squeezy Integration - Phase 1: subscriptions table schema.
-- Defines the table + RLS only. No checkout/webhook/plan-credit logic
-- here -- those are later phases (schema -> checkout -> webhook ->
-- plan-sync).
--
-- Run this once via nano/psql on the self-hosted Supabase, then
-- NOTIFY pgrst, 'reload schema'.

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  lemon_customer_id text not null,
  lemon_subscription_id text not null unique,
  -- Order id from the initial purchase. Nullable -- the
  -- subscription_created webhook payload carries it, but nothing else
  -- about this table depends on it being present (e.g. a manual
  -- admin-side correction wouldn't necessarily have it on hand).
  lemon_order_id text,

  -- solo / team / scale -- same three values as workspaces.plan.
  plan_tier text not null check (plan_tier in ('solo', 'team', 'scale')),
  -- Which of the 6 Lemon Squeezy variants (3 tiers x monthly/yearly) this
  -- row is on -- lets a later phase tell "Solo Monthly" from "Solo
  -- Yearly" without inferring it from plan_tier + current_period_end.
  variant_id text not null,

  -- Lemon Squeezy subscription statuses: on_trial, active, paused,
  -- past_due, unpaid, cancelled, expired. Stored as-is (no CHECK
  -- constraint) so a status Lemon Squeezy adds later doesn't reject the
  -- webhook write.
  status text not null,

  current_period_end timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lookups.
create index if not exists idx_subscriptions_workspace_id
  on public.subscriptions (workspace_id);

create index if not exists idx_subscriptions_lemon_subscription_id
  on public.subscriptions (lemon_subscription_id);

create index if not exists idx_subscriptions_status
  on public.subscriptions (status);

-- One workspace, at most one row with status = 'active' at a time. This
-- is a PARTIAL unique index (only applies where status = 'active'), not
-- a uniqueness constraint on workspace_id itself -- a workspace can still
-- accumulate multiple historical rows over time (a cancelled row, an
-- expired row, a past_due row waiting on payment retry) without
-- conflicting with this. An upgrade/downgrade (Solo -> Team) is expected
-- to UPDATE the existing active row in place rather than insert a new
-- one, so this index should never actually get exercised in normal
-- operation -- it exists as a backstop against a bug or a retried
-- webhook creating two simultaneously-active rows for the same
-- workspace.
create unique index if not exists idx_subscriptions_one_active_per_workspace
  on public.subscriptions (workspace_id)
  where status = 'active';

alter table public.subscriptions enable row level security;

-- Read: any member of the workspace can see its subscription row(s)
-- (needed by the Settings > Billing tab in a later phase). Reuses
-- is_workspace_member(uuid), the same helper already backing the
-- INSERT/UPDATE/DELETE checks on projects/deals (see the comment in
-- sql/2b_access_restriction_rls.sql). If that function's name or
-- signature differs on your server, adjust this one line before running
-- -- everything else in this file is independent of it.
drop policy if exists "subscriptions_select_workspace_members" on public.subscriptions;

create policy "subscriptions_select_workspace_members"
on public.subscriptions
for select
using (is_workspace_member(workspace_id));

-- Writes: deliberately NO insert/update/delete policy for the
-- authenticated/anon roles below. With RLS enabled, a table with no
-- policy for a given command denies that command outright for every
-- ordinary role; only a service-role connection bypasses RLS entirely by
-- design. So every write to this table -- insert on subscription_created,
-- update on renewal/cancellation/upgrade -- must go through the
-- service-role client (lib/supabase/service.ts) from the webhook handler
-- built in a later phase, never a user-session client, never a client
-- component, never a normal Server Action. There is no policy to add
-- here for that to hold -- the absence of one is the policy.
