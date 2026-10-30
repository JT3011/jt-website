import {endpoint,fail,saveConnection} from '../server/hub-integrations.mjs';
import {cal,pages,syncHost,subscribe,UUID,publicVenue,connectionFor} from '../server/calendly-sync.mjs';
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
  const day=ctx.params.get('day')||dayInZone(),bounds=dayBounds(day,28);
  const sessions=await ctx.db('session_connect_sessions',{player_user_id:`eq.${player}`,start_at:`gte.${bounds.start}`,and:`(start_at.lt.${bounds.end})`,select:'id,coach_user_id,start_at,end_at,session_type,status,venue,external_event_uri',order:'start_at.asc',limit:'1000'});
  const coachIds=[...new Set(sessions.map(s=>s.coach_user_id))];
  const profiles=coachIds.length?await ctx.db('profiles',{id:`in.(${coachIds.join(',')})`,select:'id,player_name,first_name'}):[];
  const hosts=await ctx.db('session_connect_calendly_hosts',{enabled:'eq.true',select:'coach_user_id,calendly_name,scheduling_url'});
  const queue=await ctx.db('session_connect_booking_queue',{player_user_id:`eq.${player}`,start_at:`gte.${bounds.start}`,and:`(start_at.lt.${bounds.end})`,select:'last_seen_at,converted_session_id,booking_status',order:'last_seen_at.desc',limit:'1000'});
  return{day,synced_at:queue[0]?.last_seen_at||null,events:sessions.map(s=>({id:s.id,player_id:player,name:s.session_type,start:s.start_at,end:s.end_at,status:queue.some(q=>q.converted_session_id===s.id&&q.booking_status==='canceled')?'cancelled':s.status,venue:publicVenue(s.venue),coach:profiles.find(p=>p.id===s.coach_user_id)?.player_name||profiles.find(p=>p.id===s.coach_user_id)?.first_name||hosts.find(h=>h.coach_user_id===s.coach_user_id)?.calendly_name||'JT coach',booking_url:hosts.find(h=>h.coach_user_id===s.coach_user_id)?.scheduling_url}))};
}
export async function scheduleWork(ctx){
  if(ctx.method==='GET'&&ctx.action==='player')return playerSchedule(ctx);
  if(!['owner','admin','coach'].includes(ctx.role))fail(403,'Coach access is required.');
  const {body,db,user}=ctx;
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
  const day=ctx.params.get('day')||dayInZone(),bounds=dayBounds(day,28);
  const [staff,hosts,rules]=await Promise.all([db('hub_staff',{select:'user_id,role',...(!ctx.manager?{user_id:`eq.${user.id}`}:{})}),db('session_connect_calendly_hosts',{enabled:'eq.true',select:'*'}),db('hub_calendly_coach_rules',{select:'event_name,coach_user_id,display_name'})]);
  const staffIds=staff.map(s=>s.user_id),profiles=staffIds.length?await db('profiles',{id:`in.(${staffIds.join(',')})`,select:'id,player_name,first_name'}):[];
  const coaches=staff.map(s=>({id:s.user_id,name:profiles.find(p=>p.id===s.user_id)?.player_name||profiles.find(p=>p.id===s.user_id)?.first_name||hosts.find(h=>h.coach_user_id===s.user_id)?.calendly_name||'JT coach'}));
  const selected=ctx.params.get('coach')||(ctx.manager?'all':user.id);
  if((selected==='all'&&!ctx.manager)||(selected!=='all'&&!staffIds.includes(selected)))fail(403,'This coach calendar is not available to your account.');
  // A delivering coach can have sessions hosted by JT. Refresh only that coach's relevant hosts,
  // then return bookings scoped by the delivering coach, never the whole host calendar.
  const ruleNames=rules.filter(r=>r.coach_user_id===user.id).map(r=>r.event_name);
  const assignedHosts=ctx.manager?hosts:hosts.filter(h=>h.coach_user_id===user.id||ruleNames.length&&h.calendly_name==='JT Mind & Body Balance');
  const sync=[];let warning=null;
  for(const host of assignedHosts){
    try{
      const cached=(await db('hub_coach_calendar_cache',{coach_uri:`eq.${host.calendly_user_uri}`,start_day:`eq.${day}`,days:'eq.28',select:'synced_at',limit:'1'}))[0];
      const connection=await connectionFor(ctx,host);
      if(connection&&cached&&Date.now()-Date.parse(cached.synced_at)<300000&&ctx.params.get('refresh')!=='1'){sync.push({connected:true,synced_at:cached.synced_at,automatic:!!connection.metadata.webhook_uri});continue;}
      const result=await syncHost(ctx,host,bounds);sync.push({...result,automatic:!!connection?.metadata.webhook_uri});
      if(result.connected)await db('hub_coach_calendar_cache',{on_conflict:'coach_uri,start_day,days'},'POST',{coach_uri:host.calendly_user_uri,start_day:day,days:28,events:[],synced_at:result.synced_at});
    }catch{warning='Some Calendly updates are unavailable. Saved bookings are shown; check Calendly for recent changes.';}
  }
  await db('rpc/hub_reconcile_bookings',{},'POST',{});
  const query={start_at:`gte.${bounds.start}`,and:`(start_at.lt.${bounds.end})`,...(selected==='all'?{}:{coach_user_id:`eq.${selected}`}),limit:'1000',order:'start_at.asc'};
  const [queue,sessions]=await Promise.all([db('session_connect_booking_queue',{...query,select:'id,external_event_uri,event_name,invitee_name,invitee_email,player_user_id,coach_user_id,start_at,end_at,venue,booking_status,converted_session_id,issue_code,last_seen_at'}),db('session_connect_sessions',{...query,select:'id,player_user_id,coach_user_id,external_event_uri,session_type,start_at,end_at,status,venue,booking_name'})]);
  if(queue.length===1000||sessions.length===1000)fail(503,'Too many sessions to show completely. Please contact JT.');
  const playerIds=[...new Set([...queue,...sessions].map(s=>s.player_user_id).filter(Boolean))];
  const [players,links]=playerIds.length?await Promise.all([db('profiles',{id:`in.(${playerIds.join(',')})`,select:'id,player_name,first_name'}),db('hub_player_airtable_links',{player_user_id:`in.(${playerIds.join(',')})`,select:'player_user_id,airtable_record_id'})]):[[],[]];
  const records=[...new Set(links.map(x=>x.airtable_record_id))],credits=records.length?await db('hub_airtable_players',{airtable_record_id:`in.(${records.join(',')})`,select:'airtable_record_id,credits,synced_at'}):[];
  const info=s=>({player_id:s.player_user_id,coach_id:s.coach_user_id,coach:coaches.find(c=>c.id===s.coach_user_id)?.name||rules.find(r=>r.event_name===s.event_name)?.display_name||'Coach to confirm',players:[players.find(p=>p.id===s.player_user_id)?.player_name||players.find(p=>p.id===s.player_user_id)?.first_name||s.invitee_name||s.booking_name||'Player'],credit:credits.find(c=>c.airtable_record_id===links.find(l=>l.player_user_id===s.player_user_id)?.airtable_record_id)||null});
  const linked=new Set(queue.map(q=>q.converted_session_id).filter(Boolean));
  const events=[...queue.map(q=>({id:q.id,session_id:q.converted_session_id,uri:q.external_event_uri,name:q.event_name,start:q.start_at,end:q.end_at,status:q.booking_status==='canceled'?'cancelled':sessions.find(s=>s.id===q.converted_session_id)?.status||'scheduled',venue:publicVenue(q.venue),needs_link:!q.converted_session_id,source:'Calendly',...info(q)})),...sessions.filter(s=>!linked.has(s.id)).map(s=>({id:s.id,session_id:s.id,uri:s.external_event_uri,name:s.session_type,start:s.start_at,end:s.end_at,status:s.status,venue:publicVenue(s.venue),source:'Hub',...info(s)}))].sort((a,b)=>a.start.localeCompare(b.start));
  const connected=sync.length>0&&sync.every(x=>x.connected),automatic=connected&&sync.every(x=>x.automatic);
  if(!connected&&!warning)warning='Saved bookings · connect Calendly below for automatic updates.';
  const needs=ctx.manager?queue.filter(q=>!q.converted_session_id&&q.booking_status==='active'):[];
  const choices=needs.length?await db('profiles',{select:'id,player_name,first_name,account_type',order:'player_name.asc.nullslast',limit:'1000'}):[];
  return{day,coaches,selected,booking_url:hosts.find(h=>h.coach_user_id===selected)?.scheduling_url,owner:ctx.owner,manager:ctx.manager,events,connected,automatic,stale:!connected||!!warning,warning,synced_at:[...sync.map(x=>x.synced_at),...queue.map(x=>x.last_seen_at)].filter(Boolean).sort().at(-1)||null,needs_link:needs.map(q=>({id:q.id,name:q.invitee_name,email:q.invitee_email,event:q.event_name,start:q.start_at,player:q.player_user_id,coach:q.coach_user_id,reason:q.issue_code})),players:choices.filter(p=>p.account_type!=='parent'&&!staffIds.includes(p.id)).map(p=>({id:p.id,name:p.player_name||p.first_name||'Player'}))};
}
export default endpoint(scheduleWork);
