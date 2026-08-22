-- Celaris Improvements Phase 3: AI Credit Top-Up.
--
-- Adds ONE column (as asked) plus TWO things beyond the literal ask,
-- both required by explicit constraints in the same task and flagged
-- here rather than added silently:
--
--  1. A new table, ai_credit_purchases -- required for the explicit
--     "webhook idempotent ho (double-credit na ho)" constraint. A
--     one-time purchase has no natural idempotency signal the way a
--     subscription's current_period_end diff gives lib/subscriptionSync.ts
--     for free -- something has to remember "this exact order/payment was
--     already credited" durably, or a retried webhook delivery would add
--     the credits twice. This table's unique index on
--     (provider, provider_reference) is that memory, and mirrors this
--     codebase's own existing convention (subscriptions' unique
--     lemon_subscription_id / safepay_subscription_id) rather than
--     inventing a new one.
--
--  2. Two new RPCs, both required by the explicit "atomic ho (race
--     condition mein double-deduct ya negative na ho)" constraint. Both
--     mirror this codebase's own established atomic-RPC pattern (a single
--     UPDATE whose WHERE clause re-checks the live row, same shape as the
--     pre-existing deduct_ai_credits RPC that this whole system already
--     depends on) rather than doing a read-then-write from the app layer,
--     which cannot be made race-safe from JS alone.
--
-- Run via nano/psql on the self-hosted Supabase, then
-- NOTIFY pgrst, 'reload schema'.

-- =====================================================================
-- 1. purchased_ai_credits column
-- =====================================================================

alter table public.workspaces
  add column if not exists purchased_ai_credits integer not null default 0;

-- Defensive floor -- deduct_ai_credits_with_topup below is the only
-- normal way this column changes, and it already guarantees this never
-- goes negative, but a constraint costs nothing and catches any future
-- direct UPDATE that forgets that invariant.
alter table public.workspaces
  add constraint if not exists workspaces_purchased_ai_credits_non_negative
  check (purchased_ai_credits >= 0);

-- Deliberately NOT referenced by resetCreditsIfDue (lib/aiCredits.ts,
-- only ever writes ai_credits_used/ai_credits_reset_at), by
-- applyPlanToWorkspace / downgradeWorkspaceToFree in
-- lib/subscriptionSync.ts and lib/safepaySubscriptionSync.ts (only ever
-- write plan/ai_credits_used/ai_credits_reset_at), or by
-- app/api/cron/revert-promo/route.ts (only ever writes plan) -- every
-- one of those does a targeted UPDATE naming its own columns explicitly,
-- so none of them can touch this new column even by accident. That is
-- what makes "purchased credits never expire / never get reset" true --
-- not a rule enforced somewhere, just the absence of any code path that
-- writes to this column except the RPC below.


-- =====================================================================
-- 2. ai_credit_purchases -- idempotency ledger for one-time top-up
--    purchases (both providers). One row per successfully processed
--    purchase; the unique index is what makes a retried webhook
--    delivery a safe no-op instead of a double-credit.
-- =====================================================================

create table if not exists public.ai_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('lemonsqueezy', 'safepay')),
  -- Lemon Squeezy: the order id (data.id on the order_created event).
  -- Safepay: the tracker/reference identifying the one-time payment --
  -- see lib/creditTopUpSync.ts's comment on why this specific field is
  -- the least-verified part of the whole feature (Safepay isn't live
  -- yet, so this hasn't been confirmed against a real payload).
  provider_reference text not null,
  credits integer not null,
  amount_cents integer,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ai_credit_purchases_provider_reference
  on public.ai_credit_purchases (provider, provider_reference);

create index if not exists idx_ai_credit_purchases_workspace_id
  on public.ai_credit_purchases (workspace_id);

alter table public.ai_credit_purchases enable row level security;

-- Read: any workspace member can see their own workspace's purchase
-- history (same is_workspace_member(uuid) helper already backing
-- subscriptions' SELECT policy -- see sql/subscriptions_schema.sql).
drop policy if exists "ai_credit_purchases_select_workspace_members" on public.ai_credit_purchases;

create policy "ai_credit_purchases_select_workspace_members"
on public.ai_credit_purchases
for select
using (is_workspace_member(workspace_id));

-- Writes: deliberately no insert/update/delete policy for
-- authenticated/anon -- same "absence of a policy is the policy"
-- convention as subscriptions/promo_codes. Every write here goes
-- through grant_purchased_ai_credits() below (SECURITY DEFINER, so it
-- can write regardless of who invoked it), called only from the two
-- webhook handlers via the service-role client.


-- =====================================================================
-- 3. deduct_ai_credits_with_topup -- the deduction waterfall.
--    Monthly allowance first, purchased_ai_credits only once that's
--    exhausted, all within a single atomic UPDATE (same shape as the
--    existing deduct_ai_credits RPC this replaces at the call site in
--    lib/aiCredits.ts -- a new function rather than replacing that one
--    in place, since its exact current body isn't visible from this
--    repo and guessing at "replace" risks losing behavior that isn't
--    written down anywhere else).
--
--    p_limit is the workspace's monthly allowance (solo/team/scale --
--    see lib/aiCreditsCore.ts getPlanLimit, computed in TS and passed
--    in, same as the existing RPC already does -- it's plan config, not
--    something this function needs to re-derive).
-- =====================================================================

create or replace function public.deduct_ai_credits_with_topup(
  p_workspace_id uuid,
  p_cost integer,
  p_limit integer
) returns boolean
language sql
as $$
  update public.workspaces
  set
    ai_credits_used = ai_credits_used + least(p_cost, greatest(p_limit - ai_credits_used, 0)),
    purchased_ai_credits = purchased_ai_credits - greatest(p_cost - greatest(p_limit - ai_credits_used, 0), 0)
  where id = p_workspace_id
    and (greatest(p_limit - ai_credits_used, 0) + coalesce(purchased_ai_credits, 0)) >= p_cost
  returning true;
$$;

-- Worked example (p_cost = 3, p_limit = 500):
--   ai_credits_used = 499 (1 left this month), purchased_ai_credits = 10
--   -> monthly covers 1, purchased covers the remaining 2
--   -> ai_credits_used becomes 500, purchased_ai_credits becomes 8
--
--   ai_credits_used = 500 (0 left this month), purchased_ai_credits = 2
--   -> total available (0 + 2) < 3 -> WHERE clause excludes the row,
--      0 rows updated, function returns null (not true) -- the calling
--      code in lib/aiCredits.ts already treats "data !== true" as a
--      failure, same as it does for the existing RPC today.
--
-- Atomic the same way the existing deduct_ai_credits RPC already is:
-- Postgres evaluates a single UPDATE's SET expressions and WHERE clause
-- against one consistent row snapshot, so two concurrent calls for the
-- same workspace can't both read "3 available" and each deduct 3 from
-- an actual total of 3 -- the second call's WHERE clause re-evaluates
-- against whatever the first call already committed.


-- =====================================================================
-- 4. grant_purchased_ai_credits -- called by both webhook handlers after
--    a top-up purchase succeeds. Idempotent: a retried delivery for a
--    provider_reference already in ai_credit_purchases hits the unique
--    index, INSERT ... ON CONFLICT DO NOTHING is a no-op, and the
--    subsequent credit grant is skipped (FOUND is false after a
--    no-op ON CONFLICT DO NOTHING, per Postgres semantics) -- so calling
--    this twice for the same purchase is always safe.
-- =====================================================================

create or replace function public.grant_purchased_ai_credits(
  p_workspace_id uuid,
  p_provider text,
  p_provider_reference text,
  p_credits integer,
  p_amount_cents integer
) returns boolean
language plpgsql
as $$
begin
  insert into public.ai_credit_purchases (workspace_id, provider, provider_reference, credits, amount_cents)
  values (p_workspace_id, p_provider, p_provider_reference, p_credits, p_amount_cents)
  on conflict (provider, provider_reference) do nothing;

  if not found then
    -- Already processed by an earlier delivery of the same event --
    -- do NOT grant credits again.
    return false;
  end if;

  update public.workspaces
  set purchased_ai_credits = purchased_ai_credits + p_credits
  where id = p_workspace_id;

  return true;
end;
$$;

notify pgrst, 'reload schema';
