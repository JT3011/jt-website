import {endpoint,fail,connectionToken} from '../server/hub-integrations.mjs';
import {calendarRows} from '../server/coach-calendars.mjs';
import {APEX_BASE,APEX_TABLE,APEX_FIELDS,importPlan} from '../server/apex-plan-import.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const columns='id,session_id,player_user_id,calendar_id,session_date,title,objective,status,source_name,revision,updated_at';
const staff=ctx=>['owner','admin','coach'].includes(ctx.role);
async function allowedSessions(ctx,player){
  const {db,user}=ctx;
  let filter={};
  if(!ctx.owner&&staff(ctx)){
    const links=await db('session_connect_coach_players',{coach_user_id:`eq.${user.id}`,active:'eq.true',select:'player_user_id'});
    if(!links.length||player&&!links.some(l=>l.player_user_id===player))return[];
    filter={coach_user_id:`eq.${user.id}`,player_user_id:player?`eq.${player}`:`in.(${links.map(l=>l.player_user_id).join(',')})`};
  }else if(!ctx.owner){
    const links=await db('session_connect_parent_players',{parent_user_id:`eq.${user.id}`,active:'eq.true',select:'player_user_id'}),ids=[user.id,...links.map(x=>x.player_user_id)];
    if(player&&!ids.includes(player))return[];
    filter={player_user_id:player?`eq.${player}`:`in.(${ids.join(',')})`};
  }else if(player)filter={player_user_id:`eq.${player}`};
  return calendarRows(db,'session_connect_sessions',{...filter,select:'id,player_user_id,coach_user_id,start_at,end_at,session_type,status',order:'start_at.desc,id.asc'});
}
async function planNames(ctx,plans,sessions){
  const ids=[...new Set([...plans.map(x=>x.player_user_id),...sessions.map(x=>x.player_user_id)].filter(Boolean))];
  const [profiles,calendars]=await Promise.all([ids.length?ctx.db('profiles',{id:`in.(${ids.join(',')})`,select:'id,player_name,first_name'}):[],ctx.db('hub_coach_calendars',{enabled:'eq.true',select:'id,display_name,coach_user_id'})]);
  return{profiles,calendars};
}
export async function plansWork(ctx){
  const {db,body,params}=ctx,player=params.get('player');
  if(player&&!UUID.test(player))fail(400,'Choose a player.');
  if(ctx.method==='POST'&&ctx.action==='save'){
    if(!staff(ctx))fail(403,'Only JT and the assigned coach can edit session plans.');
    if(body.id&&!UUID.test(body.id)||!body.id&&!UUID.test(body.session||''))fail(400,'Choose a session plan.');
    if(typeof body.title!=='string'||!body.title.trim()||body.title.length>180||typeof body.content!=='string'||!body.content.trim()||body.content.length>16000||typeof(body.objective||'')!=='string'||(body.objective||'').length>2000||!['draft','published'].includes(body.status))fail(400,'Add a title and plan, and choose who can see it.');
    const id=await db('rpc/hub_save_session_plan',{},'POST',{p_id:body.id||null,p_session:body.session||null,p_title:body.title,p_objective:body.objective||'',p_content:body.content,p_status:body.status,p_revision:Number.isInteger(body.revision)?body.revision:0},true);
    return{id,saved:true};
  }
  if(ctx.method==='POST'&&ctx.action==='link'){
    if(!ctx.owner)fail(403,'Only JT can connect imported plans.');
    if(!UUID.test(body.id||'')||!UUID.test(body.player||'')||!body.calendar)fail(400,'Choose the player and coach.');
    await db('rpc/hub_link_session_plan',{},'POST',{p_id:body.id,p_player:body.player,p_calendar:body.calendar,p_revision:body.revision},true);return{linked:true};
  }
  if(ctx.method==='POST'&&ctx.action==='sync-apex'){
    if(!ctx.owner)fail(403,'Only JT can import Apex plans.');
    const token=ctx.env.AIRTABLE_READ_TOKEN||(await connectionToken(ctx,'airtable',ctx.user.id))?.token;
    if(!token)fail(409,'Connect Airtable in Calendar connection & automatic updates, then import Apex plans.');
    const [links,sessions,calendars,existing]=await Promise.all([db('hub_player_airtable_links',{select:'player_user_id,airtable_record_id'}),calendarRows(db,'session_connect_sessions',{select:'id,player_user_id,coach_user_id,external_event_uri',order:'id.asc'}),db('hub_coach_calendars',{select:'id,coach_user_id'}),calendarRows(db,'hub_session_plans',{select:'source_record_id,session_id',order:'id.asc'})]);
    const records=[];let offset;
    for(let page=0;page<100;page++){
      const url=new URL(`https://api.airtable.com/v0/${APEX_BASE}/${APEX_TABLE}`);url.searchParams.set('returnFieldsByFieldId','true');url.searchParams.set('pageSize','100');url.searchParams.set('filterByFormula',"{APEX Coach Plan}!=''");for(const id of Object.values(APEX_FIELDS))url.searchParams.append('fields[]',id);if(offset)url.searchParams.set('offset',offset);
      const response=await ctx.fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});if(!response.ok)fail(502,'Airtable plans could not be read. Check the connection and try again.');
      const data=await response.json();records.push(...data.records);offset=data.offset;if(!offset)break;
    }
    if(offset)fail(502,'The Apex import is too large. Please contact JT.');
    const sourceIds=new Set(existing.map(x=>x.source_record_id)),sessionIds=new Set(existing.map(x=>x.session_id).filter(Boolean));let skipped=0;
    const rows=[];for(const r of records){if(sourceIds.has(r.id)){skipped++;continue;}const row=importPlan(r,{links,sessions,calendars});if(!row){skipped++;continue;}if(row.session_id&&sessionIds.has(row.session_id)){skipped++;continue;}if(row.session_id)sessionIds.add(row.session_id);rows.push(row);}
    for(let i=0;i<rows.length;i+=40)await db('hub_session_plans',{on_conflict:'source_record_id'},'POST',rows.slice(i,i+40),false,'return=representation,resolution=ignore-duplicates');
    return{imported:rows.length,pending:rows.filter(x=>!x.player_user_id||!x.calendar_id).length,skipped};
  }
  if(ctx.method!=='GET')fail(404,'Action not found.');
  if(ctx.action==='detail'){
    const id=params.get('id'),sessionId=params.get('session');
    if(id&&!UUID.test(id)||!id&&!UUID.test(sessionId||''))fail(400,'Choose a session plan.');
    const plans=await db('hub_session_plans',{...(id?{id:`eq.${id}`}:{session_id:`eq.${sessionId}`}),select:'*',limit:'1'},'GET',undefined,true);
    const plan=plans[0];
    if(id&&!plan)fail(404,'This session plan is not available to your account.');
    const sessions=await allowedSessions(ctx,player);const session=sessions.find(s=>s.id===(plan?.session_id||sessionId));
    if(!plan&&!session)fail(404,'This session plan is not available to your account.');
    const {profiles,calendars}=await planNames(ctx,plan?[plan]:[],session?[session]:[]);
    return{plan:plan||null,session:session||null,can_edit:staff(ctx),owner:ctx.owner,player_name:profiles.find(p=>p.id===(plan?.player_user_id||session?.player_user_id))?.player_name||'Player connection needed',coach:calendars.find(c=>c.id===plan?.calendar_id||session&&c.coach_user_id===session.coach_user_id)?.display_name||'Coach connection needed',calendars:ctx.owner?calendars:[],players:ctx.owner?(await db('profiles',{select:'id,player_name,first_name,account_type',order:'player_name.asc',limit:'1000'})).filter(p=>!calendars.some(c=>c.coach_user_id===p.id)).map(p=>({id:p.id,name:p.player_name||p.first_name||'Player'})):[]};
  }
  if(ctx.action!=='overview')fail(404,'Action not found.');
  // RLS is applied with the real caller's token; the service role never supplies plan contents here.
  const plans=[];for(let offset=0;offset<10000;offset+=500){const page=await db('hub_session_plans',{select:columns,...(player?{player_user_id:`eq.${player}`}:{}) ,order:'session_date.desc,id.asc',limit:'500',offset:String(offset)},'GET',undefined,true);plans.push(...page);if(page.length<500)break;if(offset===9500)fail(502,'Too many plans. Choose a player.');}
  const sessions=staff(ctx)?await allowedSessions(ctx,player):[];
  const {profiles,calendars}=await planNames(ctx,plans,sessions);
  const names=p=>profiles.find(x=>x.id===p)?.player_name||profiles.find(x=>x.id===p)?.first_name||'Player connection needed';
  return{owner:ctx.owner,can_edit:staff(ctx),plans:plans.map(p=>({...p,player_name:names(p.player_user_id),coach:calendars.find(c=>c.id===p.calendar_id)?.display_name||'Coach connection needed'})),sessions:sessions.filter(s=>s.status!=='cancelled'&&!plans.some(p=>p.session_id===s.id)).map(s=>({...s,player_name:names(s.player_user_id),coach:calendars.find(c=>c.coach_user_id===s.coach_user_id)?.display_name||'Assigned coach'}))};
}
export default endpoint(plansWork);
