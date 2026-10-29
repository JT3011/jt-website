import {endpoint,fail,saveConnection,connectionToken} from '../server/hub-integrations.mjs';
const CAL='https://api.calendly.com';
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
async function cal(ctx,token,path,query={}){
  const url=new URL(`${CAL}${path}`);for(const[k,v]of Object.entries(query))if(v)url.searchParams.set(k,v);
  let response;try{response=await ctx.fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});}catch{fail(503,'Calendly could not be reached.');}
  if(!response.ok)fail(503,[401,403].includes(response.status)?'Reconnect Calendly with calendar read access.':'Calendly is temporarily unavailable.');return response.json();
}
async function pages(ctx,token,path,query={}){
  const rows=[];let page_token;
  for(let i=0;i<20;i++){const data=await cal(ctx,token,path,{...query,count:'100',page_token});rows.push(...(data.collection||[]));page_token=data.pagination?.next_page_token;if(!page_token)return rows;}
  fail(503,'This calendar contains too many bookings to display completely. Narrow the date range.');
}
export function mergeEvents(calendly,sessions){
  const uris=new Set(calendly.map(e=>e.uri));return[...calendly,...sessions.filter(s=>!s.external_event_uri||!uris.has(s.external_event_uri)).map(s=>({id:s.id,uri:s.external_event_uri,name:s.session_type||'Coaching session',players:[s.player_name||s.booking_name||'Linked Hub player'],start:s.start_at,end:s.end_at,source:'Hub',status:s.status,venue:s.venue||''}))].filter(e=>!['cancelled','canceled'].includes(e.status)).sort((a,b)=>a.start.localeCompare(b.start));
}
async function connectionFor(ctx,host){
  if(host.coach_user_id){const own=await connectionToken(ctx,'calendly',host.coach_user_id);if(own?.metadata.user_uri===host.calendly_user_uri)return own;}
  for(const owner of await ctx.db('hub_staff',{role:'eq.owner',select:'user_id'})){const team=await connectionToken(ctx,'calendly',owner.user_id);if(team?.metadata.team&&team.metadata.organization_uri===host.organization_uri)return team;}
  return null;
}
export async function scheduleWork(ctx){
  if(!['owner','admin','coach'].includes(ctx.role))fail(403,'Coach access is required.');
  const {body,db,user}=ctx;
  if(ctx.method==='POST'&&ctx.action==='connect'){
    const token=String(body.token||'').trim();if(token.length<20||token.length>5000)fail(400,'Enter your Calendly personal access token.');
    const {resource:me}=await cal(ctx,token,'/users/me');
    if(me.email?.toLowerCase()!==user.email.toLowerCase())fail(403,'Connect the Calendly account with the same email as your Hub login.');
    const memberships=ctx.owner?await pages(ctx,token,'/organization_memberships',{organization:me.current_organization}):[];
    const own=memberships.find(m=>m.user?.uri===me.uri),team=ctx.owner&&['owner','admin'].includes(own?.role);
    await saveConnection(ctx,'calendly',token,{user_uri:me.uri,organization_uri:me.current_organization,team:!!team});
    await db('session_connect_calendly_hosts',{on_conflict:'calendly_user_uri'},'POST',{calendly_user_uri:me.uri,calendly_email:me.email,calendly_name:me.name,coach_user_id:user.id,enabled:true,scheduling_url:me.scheduling_url,calendly_timezone:me.timezone||'Europe/London',organization_uri:me.current_organization});
    if(team){
      // Existing staff mappings are preserved; a booking never grants access to player records.
      for(const m of memberships){if(!m.user?.uri)continue;await db('session_connect_calendly_hosts',{on_conflict:'calendly_user_uri'},'POST',{calendly_user_uri:m.user.uri,calendly_email:m.user.email,calendly_name:m.user.name,scheduling_url:m.user.scheduling_url,calendly_timezone:m.user.timezone||'Europe/London',organization_uri:me.current_organization,enabled:true});}
    }
    return{connected:true,team:!!team};
  }
  if(ctx.method!=='GET'||ctx.action!=='overview')fail(404,'Action not found.');
  const hosts=await db('session_connect_calendly_hosts',{enabled:'eq.true',...(!ctx.manager?{coach_user_id:`eq.${user.id}`}:{ }),select:'calendly_user_uri,calendly_name,coach_user_id,scheduling_url,calendly_timezone,organization_uri'});
  const chosen=ctx.params.get('coach'),host=chosen?hosts.find(h=>h.calendly_user_uri===chosen):hosts.find(h=>h.coach_user_id===user.id)||hosts[0];
  if(chosen&&!host)fail(403,'This calendar is not available to your account.');
  if(!host)return{hosts:[],events:[],connected:false,message:'Connect your Calendly account to see your day and upcoming sessions.'};
  const day=ctx.params.get('day')||dayInZone(),bounds=dayBounds(day,28),oneDay=dayBounds(day),connection=await connectionFor(ctx,host);
  const cached=(await db('hub_coach_calendar_cache',{coach_uri:`eq.${host.calendly_user_uri}`,start_day:`lte.${day}`,days:'eq.28',order:'start_day.desc',limit:'1'}))[0];
  let events=cached?.events||[],syncedAt=cached?.synced_at||null,stale=true,warning=null,busyAvailable=false;
  if(connection&&cached?.start_day===day&&Date.now()-Date.parse(cached.synced_at)<300000&&ctx.params.get('refresh')!=='1'){stale=false;busyAvailable=events.some(e=>e.source==='Busy');}
  else if(connection){try{
    const bookings=await pages(ctx,connection.token,'/scheduled_events',{user:host.calendly_user_uri,...(connection.metadata.team?{organization:host.organization_uri}:{}),min_start_time:bounds.start,max_start_time:bounds.end,status:'active',sort:'start_time:asc'});
    events=[];
    // Limit concurrency to avoid rate-limiting large coaching schedules.
    for(let i=0;i<bookings.length;i+=5){events.push(...await Promise.all(bookings.slice(i,i+5).map(async e=>{
      const id=e.uri?.match(/^https:\/\/api\.calendly\.com\/scheduled_events\/([a-zA-Z0-9-]+)$/)?.[1];if(!id)fail(502,'Calendly returned an invalid booking.');
      const invitees=await pages(ctx,connection.token,`/scheduled_events/${id}/invitees`,{status:'active'});
      return{id,uri:e.uri,name:e.name,players:invitees.map(p=>p.name),start:e.start_time,end:e.end_time,venue:e.location?.location||'',source:'Calendly',status:e.status};
    })));}
    const busyStart=new Date(Math.max(Date.now()+1000,Date.parse(oneDay.start))).toISOString();
    if(busyStart<oneDay.end){try{const busy=await pages(ctx,connection.token,'/user_busy_times',{user:host.calendly_user_uri,start_time:busyStart,end_time:oneDay.end});busyAvailable=true;events.push(...busy.filter(b=>['external','reserved'].includes(b.type)).map((b,i)=>({id:`busy-${i}`,name:'Busy · connected calendar',players:[],start:b.start_time,end:b.end_time,source:'Busy',status:'active',venue:''})));}catch{/* Bookings remain usable when external-calendar availability is not granted. */}}
    syncedAt=new Date().toISOString();stale=false;
    await db('hub_coach_calendar_cache',{on_conflict:'coach_uri,start_day,days'},'POST',{coach_uri:host.calendly_user_uri,start_day:day,days:28,events,synced_at:syncedAt});
  }catch(error){warning=error.message;}}
  if(!connection)warning='Connect Calendly for automatic updates. Any saved bookings below are a dated snapshot.';
  if(!cached&&!connection){
    const queue=await db('session_connect_booking_queue',{coach_calendly_user_uri:`eq.${host.calendly_user_uri}`,start_at:`gte.${bounds.start}`,and:`(start_at.lt.${bounds.end})`,select:'id,external_event_uri,event_name,invitee_name,start_at,end_at,venue,booking_status,last_seen_at',limit:'1000'});
    events=queue.filter(q=>!['canceled','cancelled'].includes(q.booking_status)).map(q=>({id:q.id,uri:q.external_event_uri,name:q.event_name,players:[q.invitee_name].filter(Boolean),start:q.start_at,end:q.end_at,venue:q.venue,source:'Calendly snapshot',status:q.booking_status}));
    syncedAt=queue.map(q=>q.last_seen_at).filter(Boolean).sort().at(-1)||null;
  }
  const sessions=host.coach_user_id?await db('session_connect_sessions',{coach_user_id:`eq.${host.coach_user_id}`,start_at:`gte.${bounds.start}`,and:`(start_at.lt.${bounds.end})`,select:'id,external_event_uri,session_type,start_at,end_at,status,venue,booking_name',limit:'1000'}):[];
  return{hosts:hosts.map(h=>({uri:h.calendly_user_uri,name:h.calendly_name})),selected:host.calendly_user_uri,booking_url:host.scheduling_url,timezone:'Europe/London',day,events:mergeEvents(events.filter(e=>Date.parse(e.start)>=Date.parse(bounds.start)&&Date.parse(e.start)<Date.parse(bounds.end)),sessions),coverage_end:stale&&cached?dayBounds(cached.start_day,28).end:null,connected:!!connection,stale,synced_at:syncedAt,warning,busy_available:busyAvailable};
}
export default endpoint(scheduleWork);
