create or replace function private.hub_booking_name_directory()
returns table(id text,player_name text,aliases jsonb)
language sql stable security invoker set search_path='' as $$
 select p.airtable_record_id,p.display_name,
   to_jsonb(p.booking_names)||coalesce(a.aliases,'[]'::jsonb)||jsonb_build_array(a.player_name)||
   coalesce((select jsonb_agg(pr.player_name) from public.hub_player_airtable_links l join public.profiles pr on pr.id=l.player_user_id where l.airtable_record_id=p.airtable_record_id and private.hub_booking_name(pr.player_name) like '% %'),'[]'::jsonb)
 from public.hub_airtable_players p left join public.hub_apex_context a on a.id=p.airtable_record_id
 where private.hub_booking_name(p.display_name) not in ('','player') and p.display_name not ilike 'name needed%'
 union all
 select a.id,a.player_name,a.aliases from public.hub_apex_context a
 where a.id like 'rec%' and not exists(select 1 from public.hub_airtable_players p where p.airtable_record_id=a.id)
 and private.hub_booking_name(a.player_name) not in ('','player') and a.player_name not ilike 'name needed%';
$$;
revoke all on function private.hub_booking_name_directory() from public,anon,authenticated;

create or replace function private.hub_booking_name_match(p_name text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare names text[]; n int; c record; ids uuid[]; v_id uuid; label text;
begin
 names:=array[private.hub_booking_name(p_name),private.hub_booking_name(substring(p_name from '\(([^)]+)\)'))];
 -- An explicit recorded booking alias takes precedence over a child's short name.
 if exists(select 1 from private.hub_booking_name_directory() a where exists(
   select 1 from jsonb_array_elements_text(a.aliases||jsonb_build_array(a.player_name)) alias
   where private.hub_booking_name(alias)=names[1] and names[1]<>'')) then names:=array[names[1]]; end if;
 select count(*) into n from private.hub_booking_name_directory() a where a.id like 'rec%' and exists(
  select 1 from jsonb_array_elements_text(a.aliases||jsonb_build_array(a.player_name)) alias
  where private.hub_booking_name(alias)=any(names) and private.hub_booking_name(alias)<>'');
 if n>1 then return jsonb_build_object('method','ambiguous'); end if;
 if n=1 then
  select * into c from private.hub_booking_name_directory() a where a.id like 'rec%' and exists(
   select 1 from jsonb_array_elements_text(a.aliases||jsonb_build_array(a.player_name)) alias
   where private.hub_booking_name(alias)=any(names) and private.hub_booking_name(alias)<>'');
  select array_agg(distinct l.player_user_id) into ids from public.hub_player_airtable_links l join auth.users u on u.id=l.player_user_id
   where l.airtable_record_id=c.id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
   and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.hub_staff s where s.user_id=u.id);
  if cardinality(ids)>1 then return jsonb_build_object('method','ambiguous'); end if;
  v_id:=ids[1];
  if v_id is null and private.hub_booking_name(c.player_name) like '% %' then
   select array_agg(p.id) into ids from public.profiles p join auth.users u on u.id=p.id
    where private.hub_booking_name(p.player_name)=private.hub_booking_name(c.player_name)
    and (coalesce(p.account_type,'player')<>'parent' or not exists(select 1 from public.session_connect_parent_players pp where pp.parent_user_id=p.id and pp.active)) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.hub_staff s where s.user_id=p.id);
   if cardinality(ids)=1 then v_id:=ids[1]; elsif cardinality(ids)>1 then return jsonb_build_object('method','ambiguous'); end if;
  end if;
  return jsonb_build_object('method','airtable_name','player',v_id,'airtable',c.id,'name',c.player_name);
 end if;
 -- A full, unique verified Hub player name is a fallback. Never guess from a first name.
 select array_agg(p.id) into ids from public.profiles p join auth.users u on u.id=p.id
 where private.hub_booking_name(p.player_name)=any(names) and private.hub_booking_name(p.player_name) like '% %'
  and (coalesce(p.account_type,'player')<>'parent' or not exists(select 1 from public.session_connect_parent_players pp where pp.parent_user_id=p.id and pp.active)) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.hub_staff s where s.user_id=p.id);
 if cardinality(ids)>1 then return jsonb_build_object('method','ambiguous'); end if;
 if cardinality(ids)=1 then
  select player_name into label from public.profiles where id=ids[1];
  return jsonb_build_object('method','hub_name','player',ids[1],'name',label);
 end if;
 return jsonb_build_object('method','unmatched');
end;$$;
revoke all on function private.hub_booking_name_match(text) from public,anon,authenticated;

