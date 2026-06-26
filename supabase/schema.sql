-- robin schema
-- Robin is the command center — it reads from all suite apps and owns
-- the VILE empire tracking tables (content pipeline, platform stats, revenue).
-- All tables use Supabase Auth user_id (uuid) as the owner reference.

-- ── Dashboard Config ─────────────────────────────────────────────────────────

create table if not exists robin_dashboard_config (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  modules     jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create index if not exists robin_dashboard_config_user_id_idx on robin_dashboard_config(user_id);

-- ── Platform Stats (social follower counts) ──────────────────────────────────

create table if not exists vile_platform_stats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  platform        text not null,
  follower_count  integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, platform)
);

create index if not exists vile_platform_stats_user_id_idx on vile_platform_stats(user_id);

-- ── Content Pipeline ─────────────────────────────────────────────────────────

create table if not exists vile_content_pipeline (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  series_id   text not null,
  stage       text not null,
  note        text,
  updated_at  timestamptz not null default now(),
  unique (user_id, series_id)
);

create index if not exists vile_content_pipeline_user_id_idx on vile_content_pipeline(user_id);

-- ── Revenue Streams ──────────────────────────────────────────────────────────

create table if not exists vile_revenue_streams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stream      text not null,
  amount      numeric(12, 2) not null default 0,
  notes       text,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, stream)
);

create index if not exists vile_revenue_streams_user_id_idx on vile_revenue_streams(user_id);

-- ── Empire Settings ──────────────────────────────────────────────────────────

create table if not exists vile_empire_settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  current_phase   integer not null default 1,
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

create index if not exists vile_empire_settings_user_id_idx on vile_empire_settings(user_id);

-- ── Fraud Cases ──────────────────────────────────────────────────────────────

create table if not exists vile_fraud_cases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  status      text,
  notes       text,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists vile_fraud_cases_user_id_idx on vile_fraud_cases(user_id);

-- ── Recommended RLS policies ─────────────────────────────────────────────────
-- Enable RLS and add a policy for each table:
-- alter table <table> enable row level security;
-- create policy "Users manage their own data"
--   on <table> for all using (auth.uid() = user_id);
