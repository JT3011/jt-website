begin;
create table public.hub_programme_intakes (
 id uuid primary key default gen_random_uuid(),
 player_user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('nutrition','gym')),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object' and octet_length(answers::text)<16000),
 status text not null default 'draft' check(status in ('draft','submitted')),
 revision integer not null default 1 check(revision>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 unique(player_user_id,kind)
);
create table public.hub_personal_plans (
 id uuid primary key default gen_random_uuid(),
 player_user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('nutrition','gym')),
 intake_id uuid not null references public.hub_programme_intakes(id),
 intake_revision integer not null,
 status text not null check(status in ('generating','draft','published','failed','review_required')),
 plan jsonb,
 prices jsonb not null default '[]' check(jsonb_typeof(prices)='array'),
 price_checked_at timestamptz,
 price_lock_at timestamptz,
 message text not null default '',
 coach_note text not null default '',
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 approved_at timestamptz
);
create unique index hub_personal_plan_one_job on public.hub_personal_plans(player_user_id,kind) where status='generating';
create index hub_personal_plans_player_kind_created on public.hub_personal_plans(player_user_id,kind,created_at desc);
create index hub_personal_plans_intake_idx on public.hub_personal_plans(intake_id);
create index hub_personal_plans_creator_idx on public.hub_personal_plans(created_by);
create index hub_personal_plans_approver_idx on public.hub_personal_plans(approved_by);
create index hub_programme_intakes_updater_idx on public.hub_programme_intakes(updated_by);
create table public.hub_programme_checkins (
 id uuid primary key default gen_random_uuid(),
 player_user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('nutrition','gym')),
 plan_id uuid not null references public.hub_personal_plans(id),
 logged_on date not null,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<12000),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 unique(player_user_id,kind,logged_on)
);
create index hub_programme_checkins_plan_idx on public.hub_programme_checkins(plan_id);
create index hub_programme_checkins_updater_idx on public.hub_programme_checkins(updated_by);
alter table public.hub_programme_intakes enable row level security;
alter table public.hub_personal_plans enable row level security;
alter table public.hub_programme_checkins enable row level security;
revoke all on public.hub_programme_intakes,public.hub_personal_plans,public.hub_programme_checkins from public,anon,authenticated;
grant select on public.hub_programme_intakes,public.hub_personal_plans,public.hub_programme_checkins to authenticated;
grant select,insert,update,delete on public.hub_programme_intakes,public.hub_personal_plans,public.hub_programme_checkins to service_role;
create policy programme_intake_read on public.hub_programme_intakes for select to authenticated using(private.hub_portal_view(player_user_id));
create policy personal_plan_read on public.hub_personal_plans for select to authenticated using(private.hub_portal_edit(player_user_id) or (status='published' and private.hub_portal_view(player_user_id)));
create policy programme_checkin_read on public.hub_programme_checkins for select to authenticated using(private.hub_portal_view(player_user_id));
commit;
