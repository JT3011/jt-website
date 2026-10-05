-- Only voluntary, generated aliases appear on the shared facility board.
create table public.hub_leaderboard_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 alias text not null unique default ('JT Athlete ' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
 joined_at timestamptz not null default now()
);
alter table public.hub_leaderboard_members enable row level security;
revoke all on public.hub_leaderboard_members from public, anon, authenticated;
grant select, delete on public.hub_leaderboard_members to authenticated;
grant insert(user_id) on public.hub_leaderboard_members to authenticated;
create policy "Read own leaderboard choice" on public.hub_leaderboard_members for select to authenticated using ((select auth.uid())=user_id);
create policy "Join as self" on public.hub_leaderboard_members for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Leave as self" on public.hub_leaderboard_members for delete to authenticated using ((select auth.uid())=user_id);
create schema if not exists private;
grant usage on schema private to authenticated;
-- Cross-player aggregation needs definer rights, but only aliases and totals leave this private function.
create function private.facility_leaderboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 caller uuid := auth.uid();
 midnight timestamptz := date_trunc('day',now() at time zone 'Europe/London') at time zone 'Europe/London';
 next_midnight timestamptz := (date_trunc('day',now() at time zone 'Europe/London') + interval '1 day') at time zone 'Europe/London';
 result jsonb;
begin
 if caller is null then raise exception 'Sign in to view the leaderboard' using errcode='42501'; end if;
 with totals as (
  select m.user_id,m.alias,coalesce(sum(greatest(e.points,0)),0)::bigint as points
  from public.hub_leaderboard_members m
  left join public.performance_point_events e on e.user_id=m.user_id and e.created_at<midnight
  group by m.user_id,m.alias
 ), ranked as (
  select alias,points,dense_rank() over(order by points desc) as rank,user_id=caller as is_you from totals
 ), top_rows as (select * from ranked order by rank,alias limit 20)
 select jsonb_build_object('cutoff',midnight,'next_refresh',next_midnight,'server_now',now(),
  'rows',coalesce((select jsonb_agg(to_jsonb(t) order by t.rank,t.alias) from top_rows t),'[]'::jsonb),
  'you',(select to_jsonb(r) from ranked r where is_you),
  'total_members',(select count(*) from totals)) into result;
 return result;
end $$;
revoke all on function private.facility_leaderboard() from public, anon, authenticated;
grant execute on function private.facility_leaderboard() to authenticated;
create function public.hub_facility_leaderboard() returns jsonb language sql stable security invoker set search_path='' as $$ select private.facility_leaderboard(); $$;
revoke all on function public.hub_facility_leaderboard() from public, anon, authenticated;
grant execute on function public.hub_facility_leaderboard() to authenticated;
comment on function public.hub_facility_leaderboard() is 'Opt-in aliases and point totals through the latest London midnight; no raw events or personal profiles exposed. The server cutoff advances daily, including DST.';
