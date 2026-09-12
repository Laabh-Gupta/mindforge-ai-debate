-- Idempotent MindForge deployment migration. Run in the Supabase SQL editor.
-- Existing skill_records are retained and migrated without inventing practice duration.
create table if not exists public.practice_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint practice_payload_fields check (payload ?& array['id','status','updatedAt','startedAt','durationSeconds','modeId','topic','turns','messages']),
  constraint practice_payload_time check (jsonb_typeof(payload->'updatedAt') = 'number' and jsonb_typeof(payload->'durationSeconds') = 'number' and (payload->>'durationSeconds')::numeric between 0 and 86400),
  constraint practice_payload_completion check (payload->>'status' != 'completed' or (payload ? 'completedAt' and jsonb_typeof(payload->'completedAt') = 'number')),
  constraint practice_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint practice_payload_id check (payload->>'id' = id::text),
  constraint practice_payload_status check (payload->>'status' in ('active', 'completed')),
  constraint practice_payload_size check (octet_length(payload::text) <= 1048576)
);
create index if not exists practice_sessions_owner_updated on public.practice_sessions(user_id, updated_at desc);
alter table public.practice_sessions enable row level security;
drop policy if exists practice_select_own on public.practice_sessions;
create policy practice_select_own on public.practice_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists practice_insert_own on public.practice_sessions;
create policy practice_insert_own on public.practice_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists practice_update_own on public.practice_sessions;
create policy practice_update_own on public.practice_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists practice_delete_own on public.practice_sessions;
create policy practice_delete_own on public.practice_sessions for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.practice_sessions from anon;
grant select, insert, update, delete on public.practice_sessions to authenticated;

-- A durable deletion marker prevents offline devices from restoring cleared history.
create table if not exists public.practice_history_resets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cleared_at bigint not null
);
alter table public.practice_history_resets enable row level security;
drop policy if exists resets_select_own on public.practice_history_resets;
create policy resets_select_own on public.practice_history_resets for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.practice_history_resets from public, anon, authenticated;
grant select on public.practice_history_resets to authenticated;

create or replace function public.clear_practice_history()
returns bigint language plpgsql security definer set search_path = public as $$
declare who uuid := auth.uid(); cutoff bigint;
begin
  if who is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(who::text, 0));
  cutoff := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  insert into public.practice_history_resets(user_id, cleared_at) values(who, cutoff)
  on conflict(user_id) do update set cleared_at = excluded.cleared_at;
  delete from public.practice_sessions where user_id = who;
  if to_regclass('public.skill_records') is not null then
    execute 'delete from public.skill_records where user_id = $1' using who;
  end if;
  return cutoff;
end;
$$;
revoke all on function public.clear_practice_history() from public, anon;
grant execute on function public.clear_practice_history() to authenticated;

-- Security invoker preserves RLS. Stale autosaves cannot replace newer reviews.
create or replace function public.save_practice_session(session_id uuid, session_payload jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if session_payload->>'id' is distinct from session_id::text
    or jsonb_typeof(session_payload->'updatedAt') is distinct from 'number'
    or jsonb_typeof(session_payload->'turns') is distinct from 'array'
    or jsonb_typeof(session_payload->'durationSeconds') is distinct from 'number'
    or (session_payload->>'durationSeconds')::numeric not between 0 and 86400
    or length(session_payload->>'topic') > 3000 then
    raise exception 'Invalid session';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.practice_history_resets where user_id = auth.uid() and (session_payload->>'startedAt')::numeric <= cleared_at) then return; end if;
  insert into public.practice_sessions(id, user_id, payload)
  values(session_id, auth.uid(), session_payload)
  on conflict(id) do update set payload = excluded.payload, updated_at = now()
  where practice_sessions.user_id = auth.uid()
    and (practice_sessions.payload->>'updatedAt')::numeric < (excluded.payload->>'updatedAt')::numeric
    and not (practice_sessions.payload->>'status' = 'completed' and excluded.payload->>'status' = 'active');
end;
$$;
revoke all on function public.save_practice_session(uuid,jsonb) from public, anon;
grant execute on function public.save_practice_session(uuid,jsonb) to authenticated;

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 60),
  listed boolean not null default false
);
alter table public.community_profiles enable row level security;
drop policy if exists community_own on public.community_profiles;
create policy community_own on public.community_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.community_profiles from anon;
grant select, insert, update, delete on public.community_profiles to authenticated;

-- Return only deliberately public names and completion totals. Never return IDs or transcripts.
create or replace function public.practice_leaderboard(period text default 'all')
returns table(display_name text, sessions bigint, xp bigint)
language sql stable security definer set search_path = public as $$
  select p.display_name, count(s.id), count(s.id)*100
  from public.community_profiles p
  join public.practice_sessions s on s.user_id = p.user_id
  where p.listed and s.payload->>'status' = 'completed'
    and coalesce((s.payload->>'completedAt')::numeric, 0) <= extract(epoch from now())*1000
    and (period = 'all'
      or (period = 'week' and (s.payload->>'completedAt')::numeric >= extract(epoch from now() - interval '7 days')*1000)
      or (period = 'month' and (s.payload->>'completedAt')::numeric >= extract(epoch from now() - interval '30 days')*1000))
  group by p.user_id, p.display_name
  order by count(s.id) desc, p.display_name
  limit 50;
$$;
revoke all on function public.practice_leaderboard(text) from public;
grant execute on function public.practice_leaderboard(text) to anon, authenticated;

do $$
begin
  if to_regclass('public.skill_records') is not null then
    insert into public.practice_sessions(id,user_id,payload,updated_at)
    select id, user_id, jsonb_build_object(
      'id',id::text,'modeId',mode_id,'modeName',mode_name,'topic',topic,
      'startedAt',floor(extract(epoch from created_at)*1000),
      'updatedAt',floor(extract(epoch from created_at)*1000),
      'completedAt',floor(extract(epoch from created_at)*1000),
      'status','completed','durationSeconds',0,'difficulty','intermediate',
      'turns','[]'::jsonb,'messages','[]'::jsonb,'overall',overall,
      'evaluation',jsonb_build_object('summary','Imported score record. The original transcript and duration were not stored.',
        'scores',scores,'strengths','[]'::jsonb,'weaknesses','[]'::jsonb,'suggestions','[]'::jsonb,'fallacies','[]'::jsonb)
    ),created_at from public.skill_records on conflict(id) do nothing;
  end if;
end;
$$;
