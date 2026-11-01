import {randomUUID} from 'node:crypto';
import {fail} from '../hub-integrations.mjs';
import {normaliseIntake,needsReview,basketNeeds,basketSummary,cleanCheckin} from './core.mjs';
import {makePersonalPlan,priceBasket} from './ai.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function programmeAccess(ctx,player){
 if(!UUID.test(player||''))fail(400,'Choose a player.');
 const [coaches,parents]=await Promise.all([ctx.db('session_connect_coach_players',{coach_user_id:`eq.${ctx.user.id}`,player_user_id:`eq.${player}`,active:'eq.true',select:'player_user_id'}),ctx.db('session_connect_parent_players',{parent_user_id:`eq.${ctx.user.id}`,player_user_id:`eq.${player}`,active:'eq.true',select:'player_user_id'})]);
 const edit=ctx.manager||ctx.owner||ctx.role==='coach'&&coaches.length>0;
 if(!(ctx.user.id===player||parents.length||edit))fail(403,'This player is not connected to your account.');
 const p=(await ctx.db('profiles',{id:`eq.${player}`,select:'id,player_name,first_name,age_group,primary_position,playing_level,development_goal,guardian_consent'}))[0];
 if(!p)fail(404,'Player profile not found.');return{edit:Boolean(edit),profile:p};
}
export async function programmesWork(ctx){
 const {db,body,params}=ctx,player=ctx.method==='POST'?body.player:params.get('player'),kind=(ctx.method==='POST'?body.kind:params.get('kind'))||'nutrition';
 if(!['nutrition','gym'].includes(kind))fail(400,'Choose nutrition or gym.');
 const access=await programmeAccess(ctx,player),filter={player_user_id:`eq.${player}`,kind:`eq.${kind}`};
 const intake=(await db('hub_programme_intakes',{...filter,select:'*'},'GET',undefined,true))[0]||null;
 if(ctx.method==='GET'){
  await db('hub_personal_plans',{...filter,status:'eq.generating',created_at:`lt.${new Date(Date.now()-300000).toISOString()}`},'PATCH',{status:'failed',message:'The previous request timed out. Please try again.'});
  const [plans,latest,logs]=await Promise.all([db('hub_personal_plans',{...filter,select:'*',status:access.edit?'in.(draft,published)':'eq.published',order:'created_at.desc',limit:'8'},'GET',undefined,true),db('hub_personal_plans',{...filter,select:'id,status,message,intake_revision,created_at',order:'created_at.desc',limit:'1'}),db('hub_programme_checkins',{...filter,select:'*',order:'logged_on.desc',limit:'60'},'GET',undefined,true)]);
  const active=plans.find(x=>x.status==='published')||null,draft=access.edit?plans.find(x=>x.status==='draft')||null:null;
  return{profile:access.profile,can_review:access.edit,intake,active,draft,latest:latest[0]||null,logs,today:day(),ai_available:Boolean(ctx.env.OPENAI_API_KEY)};
 }
 if(ctx.action==='intake'){
  let answers;try{answers=normaliseIntake(kind,body.answers||{},access.profile,{submit:body.submit===true});}catch(e){fail(400,e.message);}
  if(intake&&body.revision!==intake.revision)fail(409,'Answers changed elsewhere. Reload before saving.');
  const row={player_user_id:player,kind,answers,status:body.submit?'submitted':'draft',revision:(intake?.revision||0)+1,updated_by:ctx.user.id,updated_at:new Date().toISOString()};
  const rows=await db('hub_programme_intakes',intake?{id:`eq.${intake.id}`,revision:`eq.${intake.revision}`}:{},intake?'PATCH':'POST',row,false,'return=representation');
  if(!rows.length)fail(409,'Answers changed elsewhere. Reload before saving.');return{intake:rows[0],saved:true};
 }
 if(ctx.action==='generate'){
  if(!intake||intake.status!=='submitted')fail(400,'Complete and submit the questionnaire first.');
  let answers;try{answers=normaliseIntake(kind,intake.answers,access.profile,{submit:true});}catch(e){fail(400,e.message);}
  await db('hub_personal_plans',{...filter,status:'eq.generating',created_at:`lt.${new Date(Date.now()-300000).toISOString()}`},'PATCH',{status:'failed',message:'The previous request timed out. Please try again.'});
  const recent=await db('hub_personal_plans',{...filter,created_at:`gte.${new Date(Date.now()-86400000).toISOString()}`,select:'id,status,intake_revision'});
  if(recent.some(x=>x.status==='generating'))fail(409,'Apex is already preparing this plan. Refresh shortly.');
  const existing=recent.find(x=>x.intake_revision===intake.revision&&['draft','published','review_required'].includes(x.status));if(existing)return{saved:true,id:existing.id};
  if(recent.length>=4)fail(429,'Four plan attempts have been made today. Your answers are saved; try tomorrow.');
  const id=randomUUID(),review=needsReview(kind,answers);
  await db('hub_personal_plans',{},'POST',{id,player_user_id:player,kind,intake_id:intake.id,intake_revision:intake.revision,status:review?'review_required':'generating',created_by:ctx.user.id,message:review?'Your coach needs to review your readiness before a programme is prepared.':''},false,'return=representation');
  if(review)return{id,saved:true,review_required:true};
  try{
   const plan=await makePersonalPlan(ctx,kind,answers,access.profile);
   const latest=(await db('hub_programme_intakes',{id:`eq.${intake.id}`,select:'revision,status'}))[0];
   if(latest.revision!==intake.revision||latest.status!=='submitted')throw Error('Your answers changed. Create a fresh plan from the latest questionnaire.');
   await db('hub_personal_plans',{id:`eq.${id}`,status:'eq.generating'},'PATCH',{status:'draft',plan,message:'Apex draft ready for coach review.'});
   return{id,saved:true};
  }catch(e){await db('hub_personal_plans',{id:`eq.${id}`,status:'eq.generating'},'PATCH',{status:'failed',message:'Apex could not finish. Your questionnaire is saved.'});fail(502,e.message?.startsWith('Apex')||e.message?.startsWith('Your answers')?e.message:'Apex could not make a suitable complete plan. Your coach can review your answers.');}
 }
 if(!UUID.test(body.plan_id||''))fail(400,'Choose a programme.');
 const p=(await db('hub_personal_plans',{...filter,id:`eq.${body.plan_id}`,select:'*'},'GET',undefined,true))[0];
 if(!p||!p.plan)fail(404,'This programme is not available.');
 if(ctx.action==='publish'){
  if(!access.edit)fail(403,'Only JT or the assigned coach can share this plan.');
  if(p.status!=='draft'||p.intake_revision!==intake?.revision||intake.status!=='submitted')fail(409,'Create a new draft from the latest answers before sharing.');
  if(body.reviewed!==true)fail(400,'Confirm you have reviewed the plan and questionnaire.');
  if(needsReview(kind,intake.answers))fail(409,'Readiness needs review before this plan can be shared.');
  await db('hub_personal_plans',{id:`eq.${p.id}`,status:'eq.draft'},'PATCH',{status:'published',approved_by:ctx.user.id,approved_at:new Date().toISOString(),coach_note:String(body.coach_note||'').trim().slice(0,2000),message:'Shared by your coach.'});return{published:true};
 }
 if(ctx.action==='prices'){
  if(kind!=='nutrition')fail(400,'Shopping applies to nutrition plans.');
  if(p.intake_revision!==intake?.revision)fail(409,'Create a new plan after changing your food preferences.');
  if(p.price_lock_at&&Date.now()-Date.parse(p.price_lock_at)<250000)fail(409,'Prices are already being checked.');
  const needs=basketNeeds(p.plan,intake.answers.servings),prices=p.prices||[],pending=needs.filter(n=>!prices.some(x=>x.id===n.id));
  if(!pending.length&&p.price_checked_at&&Date.now()-Date.parse(p.price_checked_at)<86400000)return{complete:true,summary:basketSummary(prices)};
  const reset=!pending.length,batch=(reset?needs:pending).slice(0,8),lock=new Date().toISOString();
  const attempts=p.price_attempt_day===day()?p.price_attempts:0;
  if(attempts>=10)fail(429,'Today’s price-check limit has been reached. Your shopping list is saved; try tomorrow.');
  const locked=await db('hub_personal_plans',{id:`eq.${p.id}`,price_attempts:`eq.${p.price_attempts||0}`,...(p.price_lock_at?{price_lock_at:`eq.${p.price_lock_at}`}:{price_lock_at:'is.null'})},'PATCH',{price_lock_at:lock,price_attempt_day:day(),price_attempts:attempts+1});if(!locked.length)fail(409,'Prices are already being checked.');
  try{
   const checked=await priceBasket(ctx,intake.answers.shop,batch),next=[...(reset?[]:prices.filter(x=>!batch.some(b=>b.id===x.id))),...checked];
   await db('hub_personal_plans',{id:`eq.${p.id}`,price_lock_at:`eq.${lock}`},'PATCH',{prices:next,price_lock_at:null,price_checked_at:next.length===needs.length?new Date().toISOString():null});
   return{complete:next.length===needs.length,summary:basketSummary(next)};
  }catch{await db('hub_personal_plans',{id:`eq.${p.id}`,price_lock_at:`eq.${lock}`},'PATCH',{price_lock_at:null});fail(502,'Store prices could not be checked. Your plan is saved; try again later.');}
 }
 if(ctx.action==='checkin'){
  if(p.status!=='published')fail(400,'Your coach will share this plan before tracking starts.');
  const date=body.logged_on||day(),oldest=new Date(Date.now()-31*86400000).toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>day()||date<oldest)fail(400,'Choose a date in the last 31 days.');
  const data=cleanCheckin(kind,body.data||{},p.plan,intake?.answers.age);
  await db('hub_programme_checkins',{on_conflict:'player_user_id,kind,logged_on'},'POST',{player_user_id:player,kind,plan_id:p.id,logged_on:date,data,updated_by:ctx.user.id,updated_at:new Date().toISOString()});return{saved:true};
 }
 fail(404,'Action not found.');
}

