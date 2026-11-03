-- Participants are separate Airtable records on one provider booking. No account grants.
alter table public.session_connect_booking_queue add column airtable_participants text[] not null default '{}'
 check(cardinality(airtable_participants)=0 or cardinality(airtable_participants) between 2 and 10);
CREATE OR REPLACE FUNCTION private.hub_match_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare v_player uuid; v_coach uuid; v_session uuid; v_status text; v_name text; match jsonb; prior public.session_connect_booking_queue%rowtype;
begin
  if cardinality(new.airtable_participants)>1 and new.converted_session_id is not null then raise exception 'Group booking must not belong to one player'; end if;
  if tg_op='INSERT' then
    select * into prior from public.session_connect_booking_queue where external_booking_id=new.external_booking_id;
    if found then
      if prior.source_updated_at is not null and new.source_updated_at<prior.source_updated_at then return prior; end if;
      new.converted_session_id:=prior.converted_session_id; new.calendar_id:=prior.calendar_id; new.airtable_participants:=prior.airtable_participants;
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
    -- Enrich the displayed Airtable identity without changing an existing session owner.
    match:=private.hub_booking_player_match(new.invitee_name,new.invitee_email,new.invitee_phone);
    if match->>'airtable' is not null and
      (match->>'player' is null or (match->>'player')::uuid=new.player_user_id) and
      (new.matched_airtable_record_id is null or new.matched_airtable_record_id=match->>'airtable') then
      new.matched_airtable_record_id:=match->>'airtable';
      select d.player_name into new.matched_player_name from private.hub_booking_name_directory() d where d.id=new.matched_airtable_record_id;
      new.player_match_method:=coalesce(new.player_match_method,match->>'method');
    end if;
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
  if cardinality(new.airtable_participants)>1 then
    if new.converted_session_id is not null or new.player_user_id is not null then raise exception 'Group booking must not belong to one player'; end if;
    if (select count(distinct p.airtable_record_id) from public.hub_airtable_players p where p.airtable_record_id=any(new.airtable_participants))<>cardinality(new.airtable_participants) then raise exception 'Choose distinct existing Airtable players'; end if;
    select string_agg(p.display_name,' & ' order by ids.ord) into new.matched_player_name
      from unnest(new.airtable_participants) with ordinality ids(id,ord) join public.hub_airtable_players p on p.airtable_record_id=ids.id;
    new.coach_user_id:=v_coach;new.player_user_id:=null;new.matched_airtable_record_id:=null;new.player_match_method:='airtable_group';
    new.issue_code:=case when v_coach is null then 'coach_not_linked' else 'group_accounts_pending' end;
    new.issue_detail:='Shared booking matched to separate Airtable player profiles. Individual Hub accounts are needed for private session logs.';
    return new;
  end if;
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
end $function$;


