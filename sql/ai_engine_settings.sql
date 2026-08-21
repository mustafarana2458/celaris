-- Admin Portal: AI Engine Control module.
--
-- app_settings already exists (used today by the Dev Panel's AI provider
-- mode selector -- see lib/groq.ts / lib/actions/devPanel.ts) as a plain
-- key/value table: key (text), value (text), updated_at, updated_by.
-- This does NOT create a new table -- it only (a) makes sure `key` has a
-- unique constraint so the admin routes can upsert safely, and (b) seeds
-- the two new keys the AI Engine page introduces, with safe defaults so
-- the page has something to read on first load.
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

-- OpenAI fallback safety net: off by default (route to gpt-4o-mini only if
-- both the selected strategy's providers already failed -- see
-- lib/groq.ts tryFinalFallback). Requires OPENAI_API_KEY to be set to
-- actually do anything once enabled.
insert into public.app_settings (key, value, updated_at)
values ('ai_engine_openai_fallback', 'false', now())
on conflict (key) do nothing;

-- Groq latency threshold (ms). Stored for the Admin Portal's AI Engine
-- page only -- NOT yet read by the live request path (lib/groq.ts still
-- uses a fixed 30s timeout / 3 retries). See the AI Engine build report
-- for what a live wiring change would look like.
insert into public.app_settings (key, value, updated_at)
values ('ai_engine_groq_latency_threshold_ms', '2500', now())
on conflict (key) do nothing;
