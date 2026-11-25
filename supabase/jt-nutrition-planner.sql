begin;
create table public.hub_nutrition_planner (
 player_user_id uuid primary key references public.profiles(id) on delete cascade,
 revision integer not null default 1 check(revision > 0),
 data jsonb not null default '{"favourites":[],"weeks":{}}'::jsonb
   check(jsonb_typeof(data)='object' and jsonb_typeof(data->'favourites')='array' and jsonb_typeof(data->'weeks')='object' and octet_length(data::text)<256000),
 updated_at timestamptz not null default now()
);
alter table public.hub_nutrition_planner enable row level security;
revoke all on public.hub_nutrition_planner from public,anon,authenticated;
grant select on public.hub_nutrition_planner to authenticated;
grant select,insert,update,delete on public.hub_nutrition_planner to service_role;
create policy nutrition_planner_read on public.hub_nutrition_planner for select to authenticated using(private.hub_portal_view(player_user_id));
commit;
