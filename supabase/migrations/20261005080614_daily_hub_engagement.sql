-- Daily rewards and persisted personalised assignments. UK calendar day, including DST.
create schema if not exists hub_private;
revoke all on schema hub_private from public, anon;
grant usage on schema hub_private to authenticated;
create table hub_private.daily_catalog (
 challenge_id uuid primary key references public.performance_challenges(id),
 audience text not null, minutes integer not null
);
create table hub_private.daily_assignments (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, challenge_id uuid not null references public.performance_challenges(id),
 slot integer not null check(slot between 1 and 4),
 primary key(user_id,day,challenge_id), unique(user_id,day,slot)
);
alter table hub_private.daily_catalog enable row level security;
alter table hub_private.daily_assignments enable row level security;
revoke all on all tables in schema hub_private from public,anon,authenticated;
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_01','One clear intention','Choose one thing you want to do well today. Say or write it in one sentence.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_02','Name a recent win','Recall one thing you improved recently and name the action that helped.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_03','Your reset word','Choose a short cue such as next ball. Practise saying it after imagining a mistake.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_04','Confidence evidence','Write one example of a difficult football moment you handled well.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_05','Prepare your kit','Check the kit and equipment you need for your next session.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_06','One question for coach','Prepare one specific question about something you want to improve.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_07','Thank a teammate','Thank someone for one specific thing they did to help your football.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_08','Focus in five breaths','Take five comfortable, unforced breaths and bring attention back to the present.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_09','Check your energy','Rate your energy from 1 to 5. Tell a parent or coach if you need a lighter day.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_09';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_10','Water ready','Make drinking water available for your next activity; follow your usual hydration needs.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_10';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_11','Protect your bedtime','Choose one practical step to make tonight’s usual bedtime easier.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_11';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_12','Clear your practice space','Check your practice area for obstacles and make it safe before you start.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_12';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_13','Name your support','Name one person you can ask for help when training feels difficult.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_13';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_14','Pick your cue','Choose one simple technical cue to remember at your next session.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_14';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_15','Pack a normal snack','Plan a familiar snack for your next session with a parent if needed.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_15';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_16','Celebrate effort','Name an effort you are proud of, even if the result did not go your way.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_16';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_17','Switch off one distraction','Put one distraction away for a minute and focus on your next useful action.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_17';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_18','Tomorrow made easier','Set out one item tonight that will help you be ready tomorrow.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_18';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_19','Your team contribution','Choose one way to encourage a teammate at your next session.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_19';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_quick_20','Small next step','Break a current football goal into one action you can control today.','mindset','daily',1,1) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'quick',1 from public.performance_challenges where challenge_code='jt_daily_quick_20';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_01','Spot the detail: Body shape when delaying a winger','Watch a short football clip and identify one example of body shape when delaying a winger. Describe what made it effective.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_02','Draw your decision: Distance from your nearest centre-back','Sketch a simple pitch situation involving distance from your nearest centre-back. Mark two options and choose one.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_03','Explain it simply: Checking your shoulder before receiving','Explain checking your shoulder before receiving to a parent, teammate or yourself. Give one useful cue.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_04','Walk it through: Covering a teammate who steps out','In a clear space, slowly walk through covering a teammate who steps out without contact. Focus on decisions, not speed.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_05','Coach’s eye: Protecting the inside passing lane','Think of your last session: where could protecting the inside passing lane have helped? Note one change for next time.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_06','Two good options: Timing an overlapping run','Imagine a match situation involving timing an overlapping run. Name a safe option and a more ambitious option.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_07','Pause and predict: Communicating when the line moves','Pause a football clip before a player acts. Predict how communicating when the line moves could help, then compare.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_defender_08','Teach the cue: Finding a safe forward pass','Create a short reminder about finding a safe forward pass and explain when you will use it next.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'defender',3 from public.performance_challenges where challenge_code='jt_daily_defender_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_01','Spot the detail: Scanning before the ball arrives','Watch a short football clip and identify one example of scanning before the ball arrives. Describe what made it effective.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_02','Draw your decision: Receiving on the back foot','Sketch a simple pitch situation involving receiving on the back foot. Mark two options and choose one.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_03','Explain it simply: Creating a passing angle','Explain creating a passing angle to a parent, teammate or yourself. Give one useful cue.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_04','Walk it through: Knowing when to play one touch','In a clear space, slowly walk through knowing when to play one touch without contact. Focus on decisions, not speed.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_05','Coach’s eye: Turning away from pressure','Think of your last session: where could turning away from pressure have helped? Note one change for next time.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_06','Two good options: Supporting behind the ball','Imagine a match situation involving supporting behind the ball. Name a safe option and a more ambitious option.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_07','Pause and predict: Switching play into space','Pause a football clip before a player acts. Predict how switching play into space could help, then compare.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_midfielder_08','Teach the cue: Tracking a runner after losing possession','Create a short reminder about tracking a runner after losing possession and explain when you will use it next.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'midfielder',3 from public.performance_challenges where challenge_code='jt_daily_midfielder_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_01','Spot the detail: Checking away before moving towards the ball','Watch a short football clip and identify one example of checking away before moving towards the ball. Describe what made it effective.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_02','Draw your decision: Curving a run to stay onside','Sketch a simple pitch situation involving curving a run to stay onside. Mark two options and choose one.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_03','Explain it simply: Finding space on a defender’s blind side','Explain finding space on a defender’s blind side to a parent, teammate or yourself. Give one useful cue.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_04','Walk it through: Choosing a far-post run','In a clear space, slowly walk through choosing a far-post run without contact. Focus on decisions, not speed.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_05','Coach’s eye: Protecting the ball with your body','Think of your last session: where could protecting the ball with your body have helped? Note one change for next time.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_06','Two good options: Deciding when to pass instead of shoot','Imagine a match situation involving deciding when to pass instead of shoot. Name a safe option and a more ambitious option.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_07','Pause and predict: Reacting after a blocked shot','Pause a football clip before a player acts. Predict how reacting after a blocked shot could help, then compare.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_attacker_08','Teach the cue: Pressing to close a passing lane','Create a short reminder about pressing to close a passing lane and explain when you will use it next.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'attacker',3 from public.performance_challenges where challenge_code='jt_daily_attacker_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_01','Spot the detail: Setting your feet before a shot','Watch a short football clip and identify one example of setting your feet before a shot. Describe what made it effective.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_02','Draw your decision: Checking position relative to the posts','Sketch a simple pitch situation involving checking position relative to the posts. Mark two options and choose one.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_03','Explain it simply: Communicating with your defenders','Explain communicating with your defenders to a parent, teammate or yourself. Give one useful cue.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_04','Walk it through: Choosing a safe distribution option','In a clear space, slowly walk through choosing a safe distribution option without contact. Focus on decisions, not speed.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_05','Coach’s eye: Supporting behind a defensive line','Think of your last session: where could supporting behind a defensive line have helped? Note one change for next time.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_06','Two good options: Getting ready for a back pass','Imagine a match situation involving getting ready for a back pass. Name a safe option and a more ambitious option.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_07','Pause and predict: Judging when to stay on your feet','Pause a football clip before a player acts. Predict how judging when to stay on your feet could help, then compare.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_goalkeeper_08','Teach the cue: Resetting after conceding','Create a short reminder about resetting after conceding and explain when you will use it next.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'goalkeeper',3 from public.performance_challenges where challenge_code='jt_daily_goalkeeper_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_01','Spot the detail: Scanning before receiving','Watch a short football clip and identify one example of scanning before receiving. Describe what made it effective.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_02','Draw your decision: Offering a passing option','Sketch a simple pitch situation involving offering a passing option. Mark two options and choose one.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_03','Explain it simply: Communicating early','Explain communicating early to a parent, teammate or yourself. Give one useful cue.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_04','Walk it through: Reacting after losing the ball','In a clear space, slowly walk through reacting after losing the ball without contact. Focus on decisions, not speed.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_05','Coach’s eye: Using your weaker foot with control','Think of your last session: where could using your weaker foot with control have helped? Note one change for next time.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_06','Two good options: Recognising open space','Imagine a match situation involving recognising open space. Name a safe option and a more ambitious option.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_07','Pause and predict: Protecting the ball','Pause a football clip before a player acts. Predict how protecting the ball could help, then compare.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_general_08','Teach the cue: Supporting a teammate','Create a short reminder about supporting a teammate and explain when you will use it next.','training','daily',2,3) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'general',3 from public.performance_challenges where challenge_code='jt_daily_general_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_01','Plan one action: Recovering after a mistake','Write one action for recovering after a mistake at your next session. Keep it realistic and discuss it with your coach if needed.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_02','Find your baseline: Asking for the ball','Describe where you are now with asking for the ball. Choose one sign of improvement to look for.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_03','Learn from someone: Speaking to a teammate','Ask a parent, coach or teammate for one useful idea about speaking to a teammate. Note what you will try.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_04','Review a moment: Staying calm before a match','Recall one recent moment related to staying calm before a match. What worked, and what would you change?','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_05','Visualise the process: Trying a new skill','Spend two comfortable minutes imagining yourself working on trying a new skill. Describe the actions, not just the result.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_06','Make a simple checklist: Taking coach feedback','Write a three-step checklist to help with taking coach feedback. Use it at your next suitable session.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_07','Choose your measure: Handling a disappointing result','Choose a simple way to notice progress with handling a disappointing result, without adding extra training today.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_confidence_08','Connect the dots: Recognising your own improvement','Explain how recognising your own improvement supports your overall football target. Pick one small next step.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'confidence',5 from public.performance_challenges where challenge_code='jt_daily_confidence_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_01','Plan one action: Planning a recovery day','Write one action for planning a recovery day at your next session. Keep it realistic and discuss it with your coach if needed.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_02','Find your baseline: Recognising fatigue','Describe where you are now with recognising fatigue. Choose one sign of improvement to look for.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_03','Learn from someone: Building a warm-up habit','Ask a parent, coach or teammate for one useful idea about building a warm-up habit. Note what you will try.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_04','Review a moment: Preparing for regular practice','Recall one recent moment related to preparing for regular practice. What worked, and what would you change?','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_05','Visualise the process: Keeping a consistent sleep routine','Spend two comfortable minutes imagining yourself working on keeping a consistent sleep routine. Describe the actions, not just the result.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_06','Make a simple checklist: Discussing training load with your coach','Write a three-step checklist to help with discussing training load with your coach. Use it at your next suitable session.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_07','Choose your measure: Choosing quality over extra repetitions','Choose a simple way to notice progress with choosing quality over extra repetitions, without adding extra training today.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_fitness_08','Connect the dots: Noticing how you feel after activity','Explain how noticing how you feel after activity supports your overall football target. Pick one small next step.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'fitness',5 from public.performance_challenges where challenge_code='jt_daily_fitness_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_01','Plan one action: First-touch direction','Write one action for first-touch direction at your next session. Keep it realistic and discuss it with your coach if needed.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_02','Find your baseline: Passing accuracy','Describe where you are now with passing accuracy. Choose one sign of improvement to look for.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_03','Learn from someone: Weaker-foot confidence','Ask a parent, coach or teammate for one useful idea about weaker-foot confidence. Note what you will try.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_04','Review a moment: Finishing decisions','Recall one recent moment related to finishing decisions. What worked, and what would you change?','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_05','Visualise the process: Dribbling into space','Spend two comfortable minutes imagining yourself working on dribbling into space. Describe the actions, not just the result.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_06','Make a simple checklist: Crossing decisions','Write a three-step checklist to help with crossing decisions. Use it at your next suitable session.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_07','Choose your measure: Movement before receiving','Choose a simple way to notice progress with movement before receiving, without adding extra training today.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_skill_08','Connect the dots: Ball protection','Explain how ball protection supports your overall football target. Pick one small next step.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'skill',5 from public.performance_challenges where challenge_code='jt_daily_skill_08';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_01','Plan one action: Your main development goal','Write one action for your main development goal at your next session. Keep it realistic and discuss it with your coach if needed.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_01';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_02','Find your baseline: A useful coaching cue','Describe where you are now with a useful coaching cue. Choose one sign of improvement to look for.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_02';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_03','Learn from someone: One strength to build on','Ask a parent, coach or teammate for one useful idea about one strength to build on. Note what you will try.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_03';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_04','Review a moment: One skill to practise next','Recall one recent moment related to one skill to practise next. What worked, and what would you change?','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_04';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_05','Visualise the process: A habit that supports your football','Spend two comfortable minutes imagining yourself working on a habit that supports your football. Describe the actions, not just the result.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_05';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_06','Make a simple checklist: A recent session lesson','Write a three-step checklist to help with a recent session lesson. Use it at your next suitable session.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_06';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_07','Choose your measure: A match decision to improve','Choose a simple way to notice progress with a match decision to improve, without adding extra training today.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_07';
insert into public.performance_challenges(challenge_code,challenge_title,challenge_description,challenge_category,cadence,points_awarded,sort_order) values('jt_daily_progress_08','Connect the dots: Your next achievable target','Explain how your next achievable target supports your overall football target. Pick one small next step.','progress','daily',3,5) on conflict(challenge_code) do update set challenge_title=excluded.challenge_title,challenge_description=excluded.challenge_description;
insert into hub_private.daily_catalog select id,'progress',5 from public.performance_challenges where challenge_code='jt_daily_progress_08';

create or replace function hub_private.my_daily_challenges() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); d date:=(now() at time zone 'Europe/London')::date;
 p text; g text; pos text; goal text; s integer; audience text; chosen uuid; result jsonb; used integer;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select lower(coalesce(primary_position,'')||' '||coalesce(secondary_position,'')),lower(coalesce(development_goal,'')) into p,g from public.profiles where id=u;
 pos:=case when p ~ '(goal|keeper|(^| )gk( |$))' then 'goalkeeper'
 when p ~ '(back|defen|(^| )(cb|lb|rb|lwb|rwb)( |$))' then 'defender'
 when p ~ '(mid|(^| )(cm|cdm|cam|lm|rm)( |$))' then 'midfielder'
 when p ~ '(wing|strik|forward|attack|(^| )(st|cf|lw|rw)( |$))' then 'attacker' else 'general' end;
 goal:=case when g ~ '(confiden|mental|mind|anx|calm)' then 'confidence'
 when g ~ '(fit|speed|strong|strength|stamina|power|endurance)' then 'fitness'
 when g ~ '(pass|touch|shoot|finish|dribbl|cross|techni|skill)' then 'skill' else 'progress' end;
 for s in 1..4 loop
  if exists(select 1 from hub_private.daily_assignments a where a.user_id=u and a.day=d and a.slot=s) then continue; end if;
  audience:=case when s<=2 then 'quick' when s=3 then pos else goal end;
  select c.challenge_id into chosen from hub_private.daily_catalog c
  join public.performance_challenges pc on pc.id=c.challenge_id and pc.is_active
  where c.audience=audience and not exists(select 1 from hub_private.daily_assignments a where a.user_id=u and a.day=d and a.challenge_id=c.challenge_id)
  order by coalesce((select max(a.day) from hub_private.daily_assignments a where a.user_id=u and a.challenge_id=c.challenge_id),date '1900-01-01'),md5(u::text||d::text||c.challenge_id::text) limit 1;
  if chosen is not null then insert into hub_private.daily_assignments values(u,d,chosen,s); end if;
 end loop;
 select coalesce(sum(c.points_awarded),0)::integer into used from public.player_challenge_completions c join public.performance_challenges pc on pc.id=c.challenge_id where c.user_id=u and pc.cadence='daily' and c.period_key>=date_trunc('week',d::timestamp)::date and c.period_key<=d;
 select coalesce(jsonb_agg(to_jsonb(pc)||jsonb_build_object('slot',a.slot,'minutes',cat.minutes,'period_key',d,'completed',co.id is not null,'points_available',least(pc.points_awarded,greatest(0,12-used))) order by a.slot),'[]'::jsonb) into result
 from hub_private.daily_assignments a join public.performance_challenges pc on pc.id=a.challenge_id join hub_private.daily_catalog cat on cat.challenge_id=pc.id
 left join public.player_challenge_completions co on co.user_id=u and co.challenge_id=a.challenge_id and co.period_key=d
 where a.user_id=u and a.day=d;
 return jsonb_build_object('day',d,'timezone','Europe/London','weekly_remaining',greatest(0,12-used),'challenges',result);
end $$;
revoke all on function hub_private.my_daily_challenges() from public,anon;
grant execute on function hub_private.my_daily_challenges() to authenticated;
create or replace function public.get_my_daily_challenges() returns jsonb language sql security invoker set search_path='' as $$ select hub_private.my_daily_challenges() $$;
revoke all on function public.get_my_daily_challenges() from public,anon;
grant execute on function public.get_my_daily_challenges() to authenticated;
CREATE OR REPLACE FUNCTION hub_private.register_daily_login()
 RETURNS TABLE(login_counted boolean, current_streak integer, best_streak integer, points_balance integer, lifetime_points integer, reward_points integer, reward_label text, next_milestone integer, next_reward integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  current_utc_date date := (timezone('Europe/London', now()))::date;
  previous_activity_date date;
  previous_streak integer := 0;
  previous_best_streak integer := 0;
  updated_streak integer := 0;
  updated_best integer := 0;
  updated_balance integer := 0;
  updated_lifetime integer := 0;
  counted_today boolean := false;
  milestone_label text := null;
  awarded integer := 0;
  event_created boolean := false;
  following_milestone integer := 7;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.initialise_my_performance_profile();

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,0));

  select
    ppa.last_activity_date,
    coalesce(ppa.current_streak,0),
    coalesce(ppa.best_streak,0),
    coalesce(ppa.points_balance,0),
    coalesce(ppa.lifetime_points,0)
  into
    previous_activity_date,
    previous_streak,
    previous_best_streak,
    updated_balance,
    updated_lifetime
  from public.player_performance_accounts ppa
  where ppa.user_id = current_user_id
  for update;

  if previous_activity_date = current_utc_date then
    updated_streak := greatest(previous_streak,1);
    counted_today := false;
  elsif previous_activity_date = current_utc_date - 1 then
    updated_streak := previous_streak + 1;
    counted_today := true;
  else
    updated_streak := 1;
    counted_today := true;
  end if;

  updated_best := greatest(previous_best_streak,updated_streak);

  if counted_today then
    milestone_label := case updated_streak
      when 7 then '7 Day Hub Streak'
      when 14 then '14 Day Hub Streak'
      when 30 then '30 Day Hub Streak'
      when 60 then '60 Day Hub Streak'
      when 90 then '90 Day Hub Streak'
      else null
    end;
  end if;

  update public.player_performance_accounts ppa
  set
    current_streak = updated_streak,
    best_streak = updated_best,
    last_activity_date = current_utc_date,
    updated_at = now()
  where ppa.user_id = current_user_id;

  insert into public.performance_point_events(user_id,event_key,event_type,points,description,metadata)
  values(current_user_id,'daily_login:'||current_utc_date::text,'daily_login',1,'Daily Hub sign-in',jsonb_build_object('day',current_utc_date,'timezone','Europe/London'))
  on conflict(user_id,event_key) do nothing returning true into event_created;
  counted_today:=coalesce(event_created,false);
  if counted_today then
    awarded:=1;
    update public.player_performance_accounts ppa set points_balance=ppa.points_balance+1,lifetime_points=ppa.lifetime_points+1 where ppa.user_id=current_user_id returning ppa.points_balance,ppa.lifetime_points into updated_balance,updated_lifetime;
  end if;
  following_milestone := case
    when updated_streak < 7 then 7
    when updated_streak < 14 then 14
    when updated_streak < 30 then 30
    when updated_streak < 60 then 60
    else 90
  end;

  return query
  select counted_today, updated_streak, updated_best, updated_balance, updated_lifetime, awarded, milestone_label, following_milestone, 0;
end;
$function$
;
revoke all on function hub_private.register_daily_login() from public,anon;
grant execute on function hub_private.register_daily_login() to authenticated;
create or replace function public.register_daily_login()
returns table(login_counted boolean,current_streak integer,best_streak integer,points_balance integer,lifetime_points integer,reward_points integer,reward_label text,next_milestone integer,next_reward integer)
language sql security invoker set search_path='' as $$ select * from hub_private.register_daily_login() $$;
revoke all on function public.register_daily_login() from public,anon;
grant execute on function public.register_daily_login() to authenticated;
CREATE OR REPLACE FUNCTION hub_private.complete_performance_challenge(selected_challenge_code text)
 RETURNS TABLE(completed boolean, points_awarded integer, points_balance integer, lifetime_points integer, current_streak integer, newly_unlocked text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  current_user_id uuid := auth.uid();
  current_utc_date date := (timezone('Europe/London', now()))::date;
  current_week_start date := date_trunc('week', timezone('Europe/London', now()))::date;
  selected_challenge public.performance_challenges%rowtype;
  challenge_period date;
  completion_created boolean := false;
  weekly_daily_points integer := 0;
  award_points integer := 0;
  previous_activity_date date;
  previous_streak integer := 0;
  previous_best_streak integer := 0;
  updated_streak integer := 0;
  updated_balance integer := 0;
  updated_lifetime integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,0));
  perform public.initialise_my_performance_profile();

  select challenge.*
  into selected_challenge
  from public.performance_challenges challenge
  where challenge.challenge_code = selected_challenge_code
    and challenge.is_active = true;

  if not found then
    raise exception 'Challenge not found';
  end if;

  if selected_challenge.cadence = 'daily' then
    perform hub_private.my_daily_challenges();
    if not exists(select 1 from hub_private.daily_assignments a where a.user_id=current_user_id and a.day=current_utc_date and a.challenge_id=selected_challenge.id) then
      raise exception 'This challenge is not in today’s plan. Refresh your daily challenges.';
    end if;
    challenge_period := current_utc_date;

    select coalesce(sum(pcc.points_awarded),0)::integer
    into weekly_daily_points
    from public.player_challenge_completions pcc
    join public.performance_challenges pc on pc.id = pcc.challenge_id
    where pcc.user_id = current_user_id
      and pc.cadence = 'daily'
      and (pcc.completed_at at time zone 'Europe/London')::date between current_week_start and current_week_start + 6;

    award_points := least(
      selected_challenge.points_awarded,
      greatest(0, 12 - weekly_daily_points)
    );
  else
    challenge_period := current_week_start;
    award_points := selected_challenge.points_awarded;
  end if;

  insert into public.player_challenge_completions (
    user_id, challenge_id, period_key, points_awarded
  )
  values (
    current_user_id, selected_challenge.id, challenge_period, award_points
  )
  on conflict (user_id, challenge_id, period_key) do nothing
  returning true into completion_created;

  if not coalesce(completion_created,false) then
    select ppa.points_balance, ppa.lifetime_points, ppa.current_streak
    into updated_balance, updated_lifetime, updated_streak
    from public.player_performance_accounts ppa
    where ppa.user_id = current_user_id;

    return query
    select false, 0, coalesce(updated_balance,0), coalesce(updated_lifetime,0), coalesce(updated_streak,0), array[]::text[];
    return;
  end if;

  select ppa.last_activity_date, ppa.current_streak, ppa.best_streak
  into previous_activity_date, previous_streak, previous_best_streak
  from public.player_performance_accounts ppa
  where ppa.user_id = current_user_id
  for update;

  previous_streak := coalesce(previous_streak,0);
  previous_best_streak := coalesce(previous_best_streak,0);

  if previous_activity_date is null then
    updated_streak := 1;
  elsif previous_activity_date = current_utc_date then
    updated_streak := greatest(previous_streak,1);
  elsif previous_activity_date = current_utc_date - 1 then
    updated_streak := previous_streak + 1;
  else
    updated_streak := 1;
  end if;

  update public.player_performance_accounts ppa
  set
    points_balance = ppa.points_balance + award_points,
    lifetime_points = ppa.lifetime_points + award_points,
    current_streak = updated_streak,
    best_streak = greatest(previous_best_streak, updated_streak),
    last_activity_date = current_utc_date,
    updated_at = now()
  where ppa.user_id = current_user_id
  returning ppa.points_balance, ppa.lifetime_points
  into updated_balance, updated_lifetime;

  insert into public.performance_point_events (
    user_id, event_key, event_type, points, description, metadata
  )
  values (
    current_user_id,
    selected_challenge.challenge_code || ':' || challenge_period::text,
    'challenge_completion',
    award_points,
    selected_challenge.challenge_title,
    jsonb_build_object(
      'challenge_code', selected_challenge.challenge_code,
      'period_key', challenge_period,
      'cadence', selected_challenge.cadence,
      'weekly_daily_challenge_cap', case when selected_challenge.cadence='daily' then 12 else null end
    )
  )
  on conflict (user_id, event_key) do nothing;

  return query
  select true, award_points, updated_balance, updated_lifetime, updated_streak, array[]::text[];
end;
$function$
;
revoke all on function hub_private.complete_performance_challenge(text) from public,anon;
grant execute on function hub_private.complete_performance_challenge(text) to authenticated;
create or replace function public.complete_performance_challenge(selected_challenge_code text)
returns table(completed boolean,points_awarded integer,points_balance integer,lifetime_points integer,current_streak integer,newly_unlocked text[])
language sql security invoker set search_path='' as $$ select * from hub_private.complete_performance_challenge(selected_challenge_code) $$;
revoke all on function public.complete_performance_challenge(text) from public,anon;
grant execute on function public.complete_performance_challenge(text) to authenticated;
