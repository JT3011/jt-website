begin;
do $$
declare fixture_player uuid;
begin
 select id into fixture_player from public.profiles where id not in(select player_user_id from public.hub_nutrition_planner) limit 1;
 if fixture_player is null then raise exception 'No untouched profile available for rollback-only verification'; end if;
 perform set_config('jt.planner_fixture',fixture_player::text,true);
 insert into public.hub_nutrition_planner(player_user_id,data) values(fixture_player,'{"favourites":[],"weeks":{}}');
 if has_table_privilege('anon','public.hub_nutrition_planner','select') then raise exception 'Anonymous read grant';end if;
 if has_table_privilege('authenticated','public.hub_nutrition_planner','insert,update,delete') then raise exception 'Direct client write grant';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ begin if exists(select 1 from public.hub_nutrition_planner where player_user_id=current_setting('jt.planner_fixture')::uuid) then raise exception 'Unrelated account can read planner';end if;end $$;
select set_config('request.jwt.claim.sub',current_setting('jt.planner_fixture'),true);
do $$ begin if not exists(select 1 from public.hub_nutrition_planner where player_user_id=current_setting('jt.planner_fixture')::uuid) then raise exception 'Own planner not visible';end if;end $$;
reset role;
rollback;
select 'planner RLS and write grants verified; synthetic row rolled back' as result;
