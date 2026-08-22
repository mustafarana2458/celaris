-- Admin Portal: Payment gateway toggles (Safepay / Lemon Squeezy), added
-- to the existing Financials module.
--
-- Reuses app_settings exactly like sql/ai_engine_settings.sql already did
-- for the AI provider mode / OpenAI fallback settings -- no new table.
-- The unique constraint on `key` this needs was already added by that
-- migration, but the guard below is repeated defensively (idempotent, a
-- no-op if it already exists) in case this file is ever run standalone
-- on an instance that hasn't run ai_engine_settings.sql yet.
--
-- Run this once via nano/psql on the self-hosted Supabase, then
-- NOTIFY pgrst, 'reload schema'.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_settings'::regclass
      and contype = 'u'
      and conkey = (
        select array_agg(attnum order by attnum)
        from pg_attribute
        where attrelid = 'public.app_settings'::regclass
          and attname = 'key'
      )
  ) then
    alter table public.app_settings add constraint app_settings_key_key unique (key);
  end if;
end $$;

-- Lemon Squeezy: the confirmed-working gateway -- on by default.
insert into public.app_settings (key, value, updated_at)
values ('payment_gateway_lemonsqueezy_enabled', 'true', now())
on conflict (key) do nothing;

-- Safepay: NOT live yet (go-live pending with the provider, plus a
-- separate unresolved metadata/workspace-resolution issue specific to the
-- one-time AI-credit top-up flow -- see lib/actions/aiCreditsTopUp.ts's
-- OPEN GAP comments). Off by default -- an admin can flip this on from
-- the Financials page once go-live is approved, but doing so only makes
-- the option VISIBLE in the billing/top-up modals again; it does not by
-- itself fix the top-up metadata gap. See lib/paymentGateways.ts.
insert into public.app_settings (key, value, updated_at)
values ('payment_gateway_safepay_enabled', 'false', now())
on conflict (key) do nothing;

notify pgrst, 'reload schema';
