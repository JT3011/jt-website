begin;
alter table public.hub_personal_plans
 add column price_attempt_day date,
 add column price_attempts integer not null default 0 check(price_attempts >= 0);

-- A questionnaire edit and a coach approval must not race each other.
-- Invoker permissions are sufficient: only the server can write these tables.
create function private.hub_personal_plan_publish_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare intake public.hub_programme_intakes;
begin
 if new.status = 'published' and old.status is distinct from 'published' then
  select * into intake from public.hub_programme_intakes where id = new.intake_id for share;
  if intake.id is null or intake.status <> 'submitted'
   or intake.revision <> new.intake_revision
   or intake.player_user_id <> new.player_user_id or intake.kind <> new.kind
   or new.approved_by is null or new.approved_at is null then
   raise exception 'The questionnaire changed. Review a fresh draft before sharing.' using errcode = '23514';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.hub_personal_plan_publish_guard() from public, anon, authenticated;
create trigger hub_personal_plan_publish_guard before update of status on public.hub_personal_plans
 for each row execute function private.hub_personal_plan_publish_guard();
commit;
