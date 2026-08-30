-- MindForge: session history table.
-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).

create table if not exists public.skill_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode_id text not null,
  mode_name text not null,
  topic text not null,
  overall smallint not null check (overall between 0 and 100),
  scores jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists skill_records_user_id_created_at_idx
  on public.skill_records (user_id, created_at desc);

alter table public.skill_records enable row level security;

-- Each user can only see and write their own session history.
create policy "Users can view their own skill records"
  on public.skill_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own skill records"
  on public.skill_records for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own skill records"
  on public.skill_records for delete
  using (auth.uid() = user_id);

-- No update policy: session records are immutable once written.
