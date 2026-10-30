-- Calendly identities are booking links, never login or parent-access grants.
begin;
create table if not exists public.hub_calendly_coach_rules (
  event_name text primary key,
  coach_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  updated_at timestamptz not null default now()
);
alter table public.hub_calendly_coach_rules enable row level security;
revoke all on public.hub_calendly_coach_rules from anon, authenticated;
grant select,insert,update on public.hub_calendly_coach_rules to service_role;
alter table public.session_connect_booking_queue add column if not exists source_updated_at timestamptz;

create or replace function public.session_connect_resolve_booking_player(p_email text, p_phone text default null)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_email text:=lower(trim(coalesce(p_email,''))); v_ids uuid[]; v_parent uuid; v_count int;
begin
  -- A shared household email must never silently select one child.
  select u.id into v_parent from auth.users u where lower(trim(u.email))=v_email
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until<now());
  select count(*) into v_count from public.session_connect_parent_players
    where parent_user_id=v_parent and active;
  if v_count>1 then return null; end if;
  select array_agg(distinct candidate) into v_ids from (
    select a.player_user_id candidate from public.session_connect_booking_aliases a
      where a.active and ((a.alias_type='email' and a.alias_value=v_email and v_email<>'')
        or (a.alias_type='phone' and a.alias_value=public.session_connect_normalise_booking_alias('phone',p_phone) and coalesce(p_phone,'')<>''))
    union
    select pp.player_user_id from public.session_connect_parent_players pp
      where pp.parent_user_id=v_parent and pp.active and v_count=1
    union
    select p.id from public.profiles p where p.id=v_parent and v_count=0
      and coalesce(p.account_type,'player')<>'parent'
      and not exists(select 1 from public.hub_staff s where s.user_id=p.id)
  ) candidates;
  if cardinality(v_ids)=1 then return v_ids[1]; end if;
  return null;
end $$;
revoke all on function public.session_connect_resolve_booking_player(text,text) from public,anon,authenticated;
grant execute on function public.session_connect_resolve_booking_player(text,text) to service_role;

create or replace function private.hub_match_booking() returns trigger
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_player uuid; v_coach uuid; v_session uuid; v_status text; v_name text; prior public.session_connect_booking_queue%rowtype;
begin
  if tg_op='INSERT' then
    select * into prior from public.session_connect_booking_queue where external_booking_id=new.external_booking_id;
    if found then
      if prior.source_updated_at is not null and new.source_updated_at<prior.source_updated_at then return prior; end if;
      new.converted_session_id:=prior.converted_session_id;
      if prior.converted_session_id is not null then new.player_user_id:=prior.player_user_id; new.coach_user_id:=prior.coach_user_id; end if;
    end if;
  end if;
  if tg_op='UPDATE' and old.source_updated_at is not null and new.source_updated_at<old.source_updated_at then return old; end if;
  -- Keep the explicit link selected by JT; only the booking details may change.
  if tg_op='UPDATE' and old.converted_session_id is not null then
    new.player_user_id:=old.player_user_id; new.coach_user_id:=old.coach_user_id;
    new.converted_session_id:=old.converted_session_id;
  end if;
  if new.converted_session_id is not null then
    update public.session_connect_sessions set start_at=new.start_at,end_at=new.end_at,venue=new.venue,
      status=case when status in ('completed','no_show') then status
        when new.booking_status='canceled' then 'cancelled' else 'scheduled' end
      where id=new.converted_session_id;
    return new;
  end if;
  select r.coach_user_id into v_coach from public.hub_calendly_coach_rules r where r.event_name=new.event_name;
  if not found then
    select h.coach_user_id into v_coach from public.session_connect_calendly_hosts h
      where h.calendly_user_uri=new.coach_calendly_user_uri and h.enabled;
    -- Unknown named delivery coaches require review, even if JT hosts the booking.
    v_name:=lower(substring(new.event_name from '(?i)with ([A-Za-z]+)'));
    if v_name is not null and not exists(select 1 from auth.users u where u.id=v_coach
      and (lower(split_part(u.email,'@',1))=v_name or (v_name='jt' and exists(select 1 from public.hub_staff s where s.user_id=u.id and s.role='owner')))) then v_coach:=null; end if;
  end if;
  if not exists(select 1 from public.hub_staff s where s.user_id=v_coach and s.role in ('owner','admin','coach')) then v_coach:=null; end if;
  v_player:=public.session_connect_resolve_booking_player(new.invitee_email,new.invitee_phone);
  new.coach_user_id:=v_coach; new.player_user_id:=v_player;
  if v_player is null or v_coach is null then
    new.issue_code:=case when v_coach is null then 'coach_not_linked' else 'player_not_linked' end;
    new.issue_detail:=case when v_coach is null then 'Choose the delivering coach.' else 'Choose a player. Shared or conflicting emails need review.' end;
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
end $$;
revoke all on function private.hub_match_booking() from public,anon,authenticated;
drop trigger if exists hub_match_booking on public.session_connect_booking_queue;
create trigger hub_match_booking before insert or update on public.session_connect_booking_queue
  for each row execute function private.hub_match_booking();

-- Service-only reconciliation lets new confirmed accounts match existing bookings.
create or replace function public.hub_reconcile_bookings() returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.session_connect_booking_queue set updated_at=now()
    where converted_session_id is null and booking_status='active' and start_at>now()-interval '7 days';
  get diagnostics n=row_count; return n;
end $$;
revoke all on function public.hub_reconcile_bookings() from public,anon,authenticated;
grant execute on function public.hub_reconcile_bookings() to service_role;

create or replace function public.hub_link_booking(p_queue_id uuid,p_player_user_id uuid,p_coach_user_id uuid,p_remember_contact boolean default false,p_remember_coach boolean default false)
returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare q public.session_connect_booking_queue%rowtype; result uuid; family_count integer;
begin
  if not public.session_connect_is_manager() then raise exception 'Manager access required'; end if;
  select * into q from public.session_connect_booking_queue where id=p_queue_id for update;
  if not found or q.booking_status<>'active' then raise exception 'Active booking not found'; end if;
  if q.converted_session_id is not null then return q.converted_session_id; end if;
  if not exists(select 1 from public.hub_staff where user_id=p_coach_user_id and role in ('owner','admin','coach')) then raise exception 'Choose an approved coach'; end if;
  select count(*) into family_count from public.session_connect_parent_players pp join auth.users u on u.id=pp.parent_user_id
    where lower(trim(u.email))=lower(trim(q.invitee_email)) and pp.active;
  if p_remember_contact and family_count>1 then raise exception 'Shared family email: link this booking only'; end if;
  if p_remember_coach then
    insert into public.hub_calendly_coach_rules(event_name,coach_user_id,display_name)
      select q.event_name,p_coach_user_id,coalesce(p.player_name,p.first_name,'Coach') from public.profiles p where p.id=p_coach_user_id
      on conflict(event_name) do update set coach_user_id=excluded.coach_user_id,display_name=excluded.display_name,updated_at=now();
  end if;
  -- Avoid automatic matching until the manager's selected player has been applied.
  insert into public.session_connect_coach_players(coach_user_id,player_user_id,active,created_by)
    values(p_coach_user_id,p_player_user_id,true,auth.uid()) on conflict(coach_user_id,player_user_id) do update set active=true;
  insert into public.session_connect_sessions(player_user_id,coach_user_id,start_at,end_at,session_type,venue,status,source,external_booking_id,external_event_uri,external_invitee_uri,booking_email,booking_name,created_by)
    values(p_player_user_id,p_coach_user_id,q.start_at,q.end_at,q.event_name,q.venue,'scheduled','calendly',q.external_booking_id,q.external_event_uri,q.external_invitee_uri,q.invitee_email,q.invitee_name,auth.uid())
    on conflict(source,external_booking_id) where external_booking_id is not null do update set updated_at=now()
    returning id into result;
  update public.session_connect_booking_queue set player_user_id=p_player_user_id,coach_user_id=p_coach_user_id,converted_session_id=result,issue_code=null,issue_detail=null where id=q.id;
  if p_remember_contact then perform public.session_connect_link_booking_alias(p_player_user_id,'email',q.invitee_email,q.invitee_name); end if;
  return result;
end $$;
revoke all on function public.hub_link_booking(uuid,uuid,uuid,boolean,boolean) from public,anon;
grant execute on function public.hub_link_booking(uuid,uuid,uuid,boolean,boolean) to authenticated;

grant select,insert,update on public.session_connect_booking_queue to service_role;
grant select on public.session_connect_calendly_event_types to service_role;
alter table public.hub_provider_connections drop constraint hub_provider_connections_provider_check;
alter table public.hub_provider_connections add constraint hub_provider_connections_provider_check check(provider in ('shopify','calendly','airtable'));
commit;
