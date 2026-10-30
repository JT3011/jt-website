import {endpoint,fail,saveConnection} from '../server/hub-integrations.mjs';
import {cal,pages,syncHost,subscribe,UUID,publicVenue,connectionFor} from '../server/calendly-sync.mjs';
import {coachDirectory,chooseCalendar,calendarRows} from '../server/coach-calendars.mjs';
export const dayInZone=(date=new Date(),zone='Europe/London')=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function dayBounds(day,days=1,zone='Europe/London'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(`${day}T12:00:00Z`))||new Date(`${day}T12:00:00Z`).toISOString().slice(0,10)!==day)fail(400,'Choose a valid date.');
  const midnight=d=>{
    const target=Date.parse(`${d}T00:00:00Z`);let utc=target;
    for(let i=0;i<3;i++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));utc+=target-Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);}
    return new Date(utc).toISOString();
  };
  return{start:midnight(day),end:midnight(new Date(Date.parse(`${day}T12:00:00Z`)+days*86400000).toISOString().slice(0,10))};
}
export function mergeEvents(calendly,sessions){
  const uris=new Set(calendly.map(e=>e.uri));return[...calendly,...sessions.filter(s=>!s.external_event_uri||!uris.has(s.external_event_uri)).map(s=>({id:s.id,uri:s.external_event_uri,name:s.session_type||'Coaching session',players:[s.player_name||s.booking_name||'Linked Hub player'],start:s.start_at,end:s.end_at,source:'Hub',status:s.status,venue:s.venue||''}))].filter(e=>!['cancelled','canceled'].includes(e.status)).sort((a,b)=>a.start.localeCompare(b.start));
}
async function playerSchedule(ctx){
  const player=ctx.params.get('player');if(!UUID.test(player||''))fail(400,'Choose a player.');
  const allowed=ctx.manager||player===ctx.user.id||(await ctx.db('session_connect_parent_players',{parent_user_id:`eq.${ctx.user.id}`,player_user_id:`eq.${player}`,active:'eq.true',select:'player_user_id'})).length||(ctx.role==='coach'&&(await ctx.db('session_connect_coach_players',{coach_user_id:`eq.${ctx.user.id}`,player_user_id:`eq.${player}`,active:'eq.true',select:'player_user_id'})).length);
  if(!allowed)fail(403,'This player is not connected to your account.');
  const day=ctx.params.get('day')||dayInZone(),bounds=dayBounds(day);
  const base={player_user_id:`eq.${player}`,start_at:`gte.${bounds.start}`,order:'start_at.asc,id.asc'};
  const [sessions,queue,calendars]=await Promise.all([
    calendarRows(ctx.db,'session_connect_sessions',{...base,select:'id,coach_user_id,start_at,end_at,session_type,status,venue,external_event_uri'}),
    calendarRows(ctx.db,'session_connect_booking_queue',{...base,select:'id,event_name,start_at,end_at,venue,calendar_id,coach_user_id,last_seen_at,converted_session_id,booking_status'}),
    ctx.db('hub_coach_calendars',{enabled:'eq.true',select:'id,display_name,coach_user_id,booking_url'})
  ]);
  const coachIds=[...new Set(sessions.map(s=>s.coach_user_id))];
  const profiles=coachIds.length?await ctx.db('profiles',{id:`in.(${coachIds.join(',')})`,select:'id,player_name,first_name'}):[];
  const hosts=await ctx.db('session_connect_calendly_hosts',{enabled:'eq.true',select:'coach_user_id,calendly_name,scheduling_url'});
  const info=(coachId,calendarId)=>{const calendar=calendars.find(c=>c.id===calendarId)||(coachId?calendars.find(c=>c.coach_user_id===coachId):null);return{coach:calendar?.display_name||profiles.find(p=>p.id===coachId)?.player_name||profiles.find(p=>p.id===coachId)?.first_name||hosts.find(h=>h.coach_user_id===coachId)?.calendly_name||'JT coach',booking_url:calendar?.booking_url||hosts.find(h=>h.coach_user_id===coachId)?.scheduling_url};};
  const events=[...sessions.map(s=>{const q=queue.find(q=>q.converted_session_id===s.id);return{id:s.id,player_id:player,name:s.session_type,start:s.start_at,end:s.end_at,status:q?.booking_status==='canceled'?'cancelled':s.status,venue:publicVenue(s.venue),...info(s.coach_user_id,q?.calendar_id)};}),...queue.filter(q=>!q.converted_session_id).map(q=>({id:q.id,player_id:player,name:q.event_name,start:q.start_at,end:q.end_at,status:q.booking_status==='canceled'?'cancelled':'scheduled',venue:publicVenue(q.venue),...info(q.coach_user_id,q.calendar_id)}))].sort((a,b)=>a.start.localeCompare(b.start));
  return{day,synced_at:queue.map(q=>q.last_seen_at).filter(Boolean).sort().at(-1)||null,events};
}
export async function scheduleWork(ctx){
  if(ctx.method==='GET'&&ctx.action==='player')return playerSchedule(ctx);
  if(!['owner','admin','coach'].includes(ctx.role))fail(403,'Coach access is required.');
  const {body,db,user}=ctx;
  if(ctx.method==='POST'&&ctx.action==='coach-login'){
    if(!ctx.owner)fail(403,'Only the CEO can assign coach logins.');
    if(!/^[a-z][a-z0-9_-]{0,39}$/.test(body.calendar||'')||typeof body.email!=='string')fail(400,'Choose a coach and their login email.');
    return db('rpc/hub_set_coach_calendar_email',{},'POST',{p_calendar:body.calendar,p_email:body.email},true);
  }
  if(ctx.method==='POST'&&ctx.action==='connect'){
    const token=String(body.token||'').trim();if(token.length<20||token.length>5000)fail(400,'Enter your Calendly personal access token.');
    const {resource:me}=await cal(ctx,token,'/users/me');
    if(me.email?.trim().toLowerCase()!==user.email.trim().toLowerCase())fail(403,'Connect Calendly using the same email as your Hub login.');
    const memberships=ctx.owner?await pages(ctx,token,'/organization_memberships',{organization:me.current_organization}):[];
    const team=ctx.owner&&['owner','admin'].includes(memberships.find(m=>m.user?.uri===me.uri)?.role);
    const metadata={user_uri:me.uri,organization_uri:me.current_organization,team:!!team};
    await saveConnection(ctx,'calendly',token,metadata);
    await db('session_connect_calendly_hosts',{on_conflict:'calendly_user_uri'},'POST',{calendly_user_uri:me.uri,calendly_email:me.email,calendly_name:me.name,coach_user_id:user.id,enabled:true,scheduling_url:me.scheduling_url,calendly_timezone:me.timezone||'Europe/London',organization_uri:me.current_organization});
    if(team)for(const m of memberships){if(m.user?.uri)await db('session_connect_calendly_hosts',{on_conflict:'calendly_user_uri'},'POST',{calendly_user_uri:m.user.uri,calendly_email:m.user.email,calendly_name:m.user.name,scheduling_url:m.user.scheduling_url,calendly_timezone:m.user.timezone||'Europe/London',organization_uri:me.current_organization,enabled:true});}
    let warning=null;
    try{metadata.webhook_uri=await subscribe(ctx,token,metadata);await saveConnection(ctx,'calendly',token,metadata);}catch{warning='Bookings refresh while the dashboard is open. Add webhooks:read and webhooks:write to your token, then reconnect to enable updates while the Hub is closed.';}
    return{connected:true,team:!!team,automatic:!!metadata.webhook_uri,warning};
  }
  if(ctx.method==='POST'&&ctx.action==='link'){
    if(!ctx.manager)fail(403,'Only JT or an administrator can link bookings.');
    if(![body.booking,body.player,body.coach].every(x=>UUID.test(x||'')))fail(400,'Choose the booking, player and delivering coach.');
    const result=await db('rpc/hub_link_booking',{},'POST',{p_queue_id:body.booking,p_player_user_id:body.player,p_coach_user_id:body.coach,p_remember_contact:body.remember_email===true,p_remember_coach:body.remember_coach===true},true);
    return{linked:true,session:result};
  }
  if(ctx.method!=='GET'||ctx.action!=='overview')fail(404,'Action not found.');
  const day=ctx.params.get('day')||dayInZone(),bounds={start:dayBounds(day).start};
  const [staff,hosts,rules,calendars]=await Promise.all([db('hub_staff',{select:'user_id,role',...(!ctx.manager?{user_id:`eq.${user.id}`}:{})}),db('session_connect_calendly_hosts',{enabled:'eq.true',select:'*'}),db('hub_calendly_coach_rules',{select:'event_name,coach_user_id,display_name,calendar_id'}),db('hub_coach_calendars',{enabled:'eq.true',select:'*',order:'display_name.asc'})]);
  const staffIds=staff.map(s=>s.user_id),profiles=staffIds.length?await db('profiles',{id:`in.(${staffIds.join(',')})`,select:'id,player_name,first_name'}):[];
  const coaches=coachDirectory(ctx,staff,hosts,profiles,calendars),{selected,calendar}=chooseCalendar(ctx,coaches);
  const assignedHosts=selected==='all'?hosts:hosts.filter(h=>h.calendly_user_uri===calendar.host_uri||h.coach_user_id===calendar.user_id&&calendar.user_id);
  const sync=[];let warning=null;
  for(const host of assignedHosts){
    try{
      const cached=(await db('hub_coach_calendar_cache',{coach_uri:`eq.${host.calendly_user_uri}`,start_day:`eq.${day}`,days:'eq.28',scope:'eq.all',select:'synced_at',limit:'1'}))[0];
      const connection=await connectionFor(ctx,host);
      if(connection&&cached&&Date.now()-Date.parse(cached.synced_at)<300000&&ctx.params.get('refresh')!=='1'){sync.push({connected:true,synced_at:cached.synced_at,automatic:!!connection.metadata.webhook_uri});continue;}
      const result=await syncHost(ctx,host,bounds);sync.push({...result,automatic:!!connection?.metadata.webhook_uri});
      if(result.connected)await db('hub_coach_calendar_cache',{on_conflict:'coach_uri,start_day,days'},'POST',{coach_uri:host.calendly_user_uri,start_day:day,days:28,scope:'all',events:[],synced_at:result.synced_at});
    }catch{warning='Some Calendly updates are unavailable. Saved bookings are shown; check Calendly for recent changes.';}
  }
  await db('rpc/hub_reconcile_bookings',{},'POST',{});
  const query={start_at:`gte.${bounds.start}`,order:'start_at.asc,id.asc'};
  const queueScope=selected==='all'?{}:calendars.some(c=>c.id===selected)?{calendar_id:`eq.${selected}`,...(!ctx.manager?{coach_user_id:`eq.${user.id}`}:{})}:{coach_user_id:`eq.${calendar.user_id}`};
  const [queue,sessions]=await Promise.all([
    calendarRows(db,'session_connect_booking_queue',{...query,...queueScope,select:'id,calendar_id,external_event_uri,event_name,invitee_name,invitee_email,player_user_id,coach_user_id,start_at,end_at,venue,booking_status,converted_session_id,issue_code,last_seen_at'}),
    selected!=='all'&&!calendar.user_id?[]:calendarRows(db,'session_connect_sessions',{...query,...(selected==='all'?{}:{coach_user_id:`eq.${calendar.user_id}`}),select:'id,player_user_id,coach_user_id,external_event_uri,session_type,start_at,end_at,status,venue,booking_name'})
  ]);
  const permitted=ctx.manager?null:new Set((await db('session_connect_coach_players',{coach_user_id:`eq.${user.id}`,active:'eq.true',select:'player_user_id'})).map(l=>l.player_user_id));
  const playerIds=[...new Set([...queue,...sessions].map(s=>s.player_user_id).filter(id=>id&&(!permitted||permitted.has(id))))];
  const [players,links]=playerIds.length?await Promise.all([db('profiles',{id:`in.(${playerIds.join(',')})`,select:'id,player_name,first_name'}),db('hub_player_airtable_links',{player_user_id:`in.(${playerIds.join(',')})`,select:'player_user_id,airtable_record_id'})]):[[],[]];
  const records=[...new Set(links.map(x=>x.airtable_record_id))],credits=records.length?await db('hub_airtable_players',{airtable_record_id:`in.(${records.join(',')})`,select:'airtable_record_id,credits,synced_at'}):[];
  const info=s=>({calendar_id:s.calendar_id||(s.coach_user_id?coaches.find(c=>c.user_id===s.coach_user_id)?.id:null),player_id:!permitted||permitted.has(s.player_user_id)?s.player_user_id:null,coach_id:s.coach_user_id,coach:coaches.find(c=>c.id===s.calendar_id)?.name||(s.coach_user_id?coaches.find(c=>c.user_id===s.coach_user_id)?.name:null)||rules.find(r=>r.event_name===s.event_name)?.display_name||'Coach to confirm',players:[players.find(p=>p.id===s.player_user_id)?.player_name||players.find(p=>p.id===s.player_user_id)?.first_name||s.invitee_name||s.booking_name||'Player'],credit:credits.find(c=>c.airtable_record_id===links.find(l=>l.player_user_id===s.player_user_id)?.airtable_record_id)||null});
  const linked=new Set(queue.map(q=>q.converted_session_id).filter(Boolean));
  const events=[...queue.map(q=>({id:q.id,session_id:q.converted_session_id,uri:q.external_event_uri,name:q.event_name,start:q.start_at,end:q.end_at,status:q.booking_status==='canceled'?'cancelled':sessions.find(s=>s.id===q.converted_session_id)?.status||'scheduled',venue:publicVenue(q.venue),needs_link:!q.converted_session_id,source:'Calendly',...info(q)})),...sessions.filter(s=>!linked.has(s.id)).map(s=>({id:s.id,session_id:s.id,uri:s.external_event_uri,name:s.session_type,start:s.start_at,end:s.end_at,status:s.status,venue:publicVenue(s.venue),source:'Hub',...info(s)}))].sort((a,b)=>a.start.localeCompare(b.start));
  const connected=sync.length>0&&sync.every(x=>x.connected),automatic=connected&&sync.every(x=>x.automatic);
  if(!connected&&!warning)warning='Saved bookings · connect Calendly below for automatic updates.';
  const needs=ctx.manager?queue.filter(q=>!q.converted_session_id&&q.booking_status==='active'):[];
  const choices=needs.length?await db('profiles',{select:'id,player_name,first_name,account_type',order:'player_name.asc.nullslast',limit:'1000'}):[];
  return{day,coaches,selected,booking_url:calendar?.booking_url,link_coaches:coaches.filter(c=>c.user_id).map(c=>({id:c.user_id,name:c.name})),coach_accounts:ctx.owner?coaches.filter(c=>calendars.some(r=>r.id===c.id)):undefined,owner:ctx.owner,manager:ctx.manager,events,connected,automatic,stale:!connected||!!warning,warning,synced_at:[...sync.map(x=>x.synced_at),...queue.map(x=>x.last_seen_at)].filter(Boolean).sort().at(-1)||null,needs_link:needs.map(q=>({id:q.id,name:q.invitee_name,email:q.invitee_email,event:q.event_name,start:q.start_at,player:q.player_user_id,coach:q.coach_user_id,reason:q.issue_code})),players:choices.filter(p=>p.account_type!=='parent'&&!staffIds.includes(p.id)).map(p=>({id:p.id,name:p.player_name||p.first_name||'Player'}))};
}
export default endpoint(scheduleWork);
