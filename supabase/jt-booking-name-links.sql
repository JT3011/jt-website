-- Name matches connect coaching records, never grant a new parent relationship.
alter table public.session_connect_booking_queue
 add column matched_player_name text,
 add column matched_airtable_record_id text,
 add column player_match_method text;

create or replace function private.hub_booking_name(p_name text) returns text
language sql immutable set search_path='' as $$
 select btrim(regexp_replace(lower(coalesce(p_name,'')),'[^[:alnum:]]+',' ','g'));
$$;
revoke all on function private.hub_booking_name(text) from public,anon,authenticated;

create or replace function private.hub_booking_name_match(p_name text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare names text[]; n int; c public.hub_apex_context; ids uuid[]; v_id uuid; label text;
begin
 names:=array[private.hub_booking_name(p_name),private.hub_booking_name(substring(p_name from '\(([^)]+)\)'))];
 select count(*) into n from public.hub_apex_context a where a.id like 'rec%' and exists(
  select 1 from jsonb_array_elements_text(a.aliases||jsonb_build_array(a.player_name)) alias
  where private.hub_booking_name(alias)=any(names) and private.hub_booking_name(alias)<>'');
 if n>1 then return jsonb_build_object('method','ambiguous'); end if;
 if n=1 then
  select * into c from public.hub_apex_context a where a.id like 'rec%' and exists(
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

create or replace function private.hub_booking_player_match(p_name text,p_email text,p_phone text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare m jsonb; v_player uuid; known_airtable text; contacts uuid[]; aliases uuid[]; family uuid[]; v_email text:=lower(btrim(coalesce(p_email,''))); label text;
begin
 m:=private.hub_booking_name_match(p_name);
 v_player:=public.session_connect_resolve_booking_player(p_email,p_phone);
 if v_player is not null then
  select airtable_record_id into known_airtable from public.hub_player_airtable_links where player_user_id=v_player;
  if ((m->>'player') is not null and (m->>'player')::uuid<>v_player) or(known_airtable is not null and m->>'airtable' is not null and known_airtable<>m->>'airtable') then
   return jsonb_build_object('method','conflict');
  end if;
  select player_name into label from public.profiles where id=v_player;
  return jsonb_build_object('method','verified_contact','player',v_player,'airtable',known_airtable,'name',coalesce(nullif(label,''),p_name));
 end if;
 -- Known conflicting contact details or shared households cannot be bypassed by a name.
 select array_agg(distinct a.player_user_id) into aliases from public.session_connect_booking_aliases a where a.active and
 ((a.alias_type='email' and a.alias_value=v_email and v_email<>'') or(a.alias_type='phone' and a.alias_value=public.session_connect_normalise_booking_alias('phone',p_phone) and coalesce(p_phone,'')<>''));
 if cardinality(aliases)>1 then return jsonb_build_object('method','conflict'); end if;
 select array_agg(distinct pp.player_user_id) into family from auth.users u join public.session_connect_parent_players pp on pp.parent_user_id=u.id and pp.active
 where lower(btrim(u.email))=v_email and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now());
 if cardinality(family)>0 and cardinality(aliases)=1 and not(aliases[1]=any(family)) then return jsonb_build_object('method','conflict'); end if;
 contacts:=case when cardinality(family)>0 then family else aliases end;
 if cardinality(contacts)>0 then
  if m->>'player' is null or not((m->>'player')::uuid=any(contacts)) then return jsonb_build_object('method','conflict'); end if;
 end if;
 return m;
end;$$;
revoke all on function private.hub_booking_player_match(text,text,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.hub_match_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_player uuid; v_coach uuid; v_session uuid; v_status text; v_name text; match jsonb; prior public.session_connect_booking_queue%rowtype;
begin
  if tg_op='INSERT' then
    select * into prior from public.session_connect_booking_queue where external_booking_id=new.external_booking_id;
    if found then
      if prior.source_updated_at is not null and new.source_updated_at<prior.source_updated_at then return prior; end if;
      new.converted_session_id:=prior.converted_session_id; new.calendar_id:=prior.calendar_id;
      if prior.converted_session_id is not null then new.player_user_id:=prior.player_user_id; new.coach_user_id:=prior.coach_user_id; end if;
    end if;
  end if;
  if tg_op='UPDATE' and old.source_updated_at is not null and new.source_updated_at<old.source_updated_at then return old; end if;
  -- Keep the explicit link selected by JT; only the booking details may change.
  if tg_op='UPDATE' and old.converted_session_id is not null then
    new.player_user_id:=old.player_user_id; new.coach_user_id:=old.coach_user_id;
    new.converted_session_id:=old.converted_session_id; new.calendar_id:=old.calendar_id;
  end if;
  if new.converted_session_id is not null then
    if new.calendar_id is null or (tg_op='UPDATE' and old.converted_session_id is null) then
      select id into new.calendar_id from public.hub_coach_calendars where coach_user_id=new.coach_user_id and enabled;
    end if;
    update public.session_connect_sessions set start_at=new.start_at,end_at=new.end_at,venue=new.venue,
      status=case when status in ('completed','no_show') then status
        when new.booking_status='canceled' then 'cancelled' when status='in_progress' then status else 'scheduled' end
      where id=new.converted_session_id;
    return new;
  end if;
  select r.coach_user_id,r.calendar_id into v_coach,new.calendar_id from public.hub_calendly_coach_rules r where r.event_name=new.event_name;
  if not found then
    select id into new.calendar_id from public.hub_coach_calendars where calendly_host_uri=new.coach_calendly_user_uri and host_default and enabled;
    select h.coach_user_id into v_coach from public.session_connect_calendly_hosts h
      where h.calendly_user_uri=new.coach_calendly_user_uri and h.enabled;
    -- Unknown named delivery coaches require review, even if JT hosts the booking.
    v_name:=lower(substring(new.event_name from '(?i)with ([A-Za-z]+)'));
    if v_name is not null and not exists(select 1 from auth.users u where u.id=v_coach
      and (lower(split_part(u.email,'@',1))=v_name or (v_name='jt' and exists(select 1 from public.hub_staff s where s.user_id=u.id and s.role='owner')))) then v_coach:=null; new.calendar_id:=null; end if;
  end if;
  if not exists(select 1 from public.hub_staff s where s.user_id=v_coach and s.role in ('owner','admin','coach')) then v_coach:=null; end if;
  match:=private.hub_booking_player_match(new.invitee_name,new.invitee_email,new.invitee_phone);
  v_player:=(match->>'player')::uuid;
  new.matched_player_name:=match->>'name';
  new.matched_airtable_record_id:=match->>'airtable';
  new.player_match_method:=match->>'method';
  new.coach_user_id:=v_coach; new.player_user_id:=v_player;
  if v_player is null or v_coach is null then
    new.issue_code:=case when v_coach is null then 'coach_not_linked' when match->>'method' in ('ambiguous','conflict') then 'player_name_review' when new.matched_airtable_record_id is not null then 'player_account_pending' else 'player_not_linked' end;
    new.issue_detail:=case when v_coach is null then 'Choose the delivering coach.' when new.matched_airtable_record_id is not null then 'Player matched to Airtable. Coaching can continue before Hub signup.' when match->>'method' in ('ambiguous','conflict') then 'Name or contact details match more than one player. JT review required.' else 'No reliable player match. Booking remains on the coach calendar.' end;
    return new;
  end if;
  if new.booking_status='active' then
    insert into public.session_connect_coach_players(coach_user_id,player_user_id,active)
      values(v_coach,v_player,true) on conflict(coach_user_id,player_user_id) do update set active=true;
  end if;
  insert into public.session_connect_sessions(player_user_id,coach_user_id,start_at,end_at,session_type,venue,status,source,external_booking_id,external_event_uri,external_invitee_uri,booking_email,booking_name)
    values(v_player,v_coach,new.start_at,new.end_at,new.event_name,new.venue,case when new.booking_status='canceled' then 'cancelled' else 'scheduled' end,'calendly',new.external_booking_id,new.external_event_uri,new.external_invitee_uri,new.invitee_email,new.invitee_name)
    on conflict(source,external_booking_id) where external_booking_id is not null do update set
      start_at=excluded.start_at,end_at=excluded.end_at,venue=excluded.venue,
      status=case when session_connect_sessions.status in ('completed','no_show') then session_connect_sessions.status else excluded.status end
    returning id into v_session;
  new.converted_session_id:=v_session; new.issue_code:=null; new.issue_detail:=null;
  return new;
end $function$

create or replace function private.hub_link_named_booking_plan() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.player_user_id is not null and new.converted_session_id is not null and new.matched_airtable_record_id is not null then
  update public.hub_session_plans p set player_user_id=new.player_user_id,session_id=new.converted_session_id,revision=p.revision+1,updated_at=now()
  where p.booking_id=new.id and p.calendar_id=new.calendar_id and p.status='draft'
   and p.airtable_record_id=new.matched_airtable_record_id
   and (p.player_user_id is null or p.player_user_id=new.player_user_id)
   and (p.session_id is null or p.session_id=new.converted_session_id)
   and (p.player_user_id is null or p.session_id is null)
   and not exists(select 1 from public.hub_session_plans other where other.session_id=new.converted_session_id and other.id<>p.id);
 end if;
 return new;
end;$$;
revoke all on function private.hub_link_named_booking_plan() from public,anon,authenticated;
create trigger hub_link_named_booking_plan after insert or update on public.session_connect_booking_queue
 for each row execute function private.hub_link_named_booking_plan();
