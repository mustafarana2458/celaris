-- Admin Auth Rebuild -- Phase 1: schema only.
--
-- Two new tables, fully independent of Supabase auth.users -- no FK to
-- it anywhere. Both are service-role-only by RLS design (RLS enabled,
-- zero policies -- same "absence of a policy is the policy" convention
-- as promo_codes/subscriptions elsewhere in this schema): regular
-- Supabase Auth sessions (anon/authenticated roles) can never read or
-- write either table, only server code using the service-role client can.
--
-- Does NOT touch audit_logs / the actor_user_id FK -- per the boss's
-- decision, that constraint drop + making the column nullable is being
-- handled separately in its own SQL, not here.
--
-- Run this once via docker exec/psql on the self-hosted Postgres, then
-- NOTIFY pgrst, 'reload schema'.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- Case-insensitive uniqueness (admin@x.com and Admin@x.com must not be
-- two different rows) without needing the citext extension.
create unique index if not exists admin_users_email_lower_key
  on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  -- sha256 of the raw session token that lives in the httpOnly cookie.
  -- The raw token itself is NEVER stored -- same reasoning as never
  -- storing a plaintext password.
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Set (not deleted) on logout/revocation, so a revoked session leaves
  -- a record that it existed rather than vanishing.
  revoked_at timestamptz,
  user_agent text
);

create unique index if not exists admin_sessions_token_hash_key
  on public.admin_sessions (token_hash);

create index if not exists idx_admin_sessions_admin_user_id
  on public.admin_sessions (admin_user_id);

-- Supports a future cleanup job (delete/ignore rows past expiry) without
-- a full table scan.
create index if not exists idx_admin_sessions_expires_at
  on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;

-- ---------------------------------------------------------------------
-- First-admin seed template. Do NOT run this block as-is -- replace the
-- three placeholders first. Generate the password_hash value with
-- scripts/hash-admin-password.js (see the accompanying report for exact
-- usage) -- never hand-type or invent a hash here.
-- ---------------------------------------------------------------------
-- insert into public.admin_users (email, password_hash, name)
-- values (
--   'REPLACE_WITH_ADMIN_EMAIL',
--   'REPLACE_WITH_BCRYPT_HASH_FROM_THE_SCRIPT',
--   'REPLACE_WITH_ADMIN_NAME'
-- );
