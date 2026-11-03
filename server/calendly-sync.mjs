import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {fail,connectionToken} from './hub-integrations.mjs';
import {withProviderSync} from './provider-sync-state.mjs';
export const CAL='https://api.calendly.com';
export const WEBHOOK_ORIGIN='https://jt-website-orpin.vercel.app';
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const publicVenue=value=>/hamfield cottages/i.test(value||'')?'Berkeley, GL13 9TN':String(value||'').slice(0,500);
export async function cal(ctx,token,path,query={},body){
  const url=new URL(`${CAL}${path}`);for(const[k,v]of Object.entries(query))if(v)url.searchParams.set(k,v);
  let response;try{response=await ctx.fetchImpl(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});}catch{fail(503,'Calendly could not be reached.');}
  if(response.status===429)throw Object.assign(new Error('Calendly is temporarily busy.'),{status:503,retryAfter:Math.max(60,Number(response.headers.get('X-RateLimit-Reset'))||60)});
  if(!response.ok)fail(503,[401,403].includes(response.status)?'Reconnect Calendly with the required permissions.':'Calendly is temporarily unavailable.');return response.json();
}
export async function pages(ctx,token,path,query={}){
  const rows=[];let page_token;
  for(let i=0;i<20;i++){const data=await cal(ctx,token,path,{...query,count:'100',page_token});if(!Array.isArray(data.collection))fail(503,'Calendly returned an incomplete response.');rows.push(...data.collection);page_token=data.pagination?.next_page_token;if(!page_token)return rows;}
  fail(503,'This calendar is too large to load completely. Choose a shorter range.');
}
export async function connectionFor(ctx,host){
  if(host.coach_user_id){const own=await connectionToken(ctx,'calendly',host.coach_user_id);if(own?.metadata.user_uri===host.calendly_user_uri)return own;}
  for(const owner of await ctx.db('hub_staff',{role:'eq.owner',select:'user_id'})){const team=await connectionToken(ctx,'calendly',owner.user_id);if(team?.metadata.team&&team.metadata.organization_uri===host.organization_uri)return team;}
  return null;
}
export function bookingRow(event,invitee){
  if(!/^https:\/\/api\.calendly\.com\/scheduled_events\/[a-z0-9-]+$/i.test(event.uri||'')||!invitee.uri?.startsWith(`${event.uri}/invitees/`)||!UUID.test(invitee.uri.split('/').at(-1)))fail(400,'Invalid Calendly booking.');
  if(!Number.isFinite(Date.parse(event.start_time))||!(Date.parse(event.end_time)>Date.parse(event.start_time)))fail(400,'Invalid booking dates.');
  const host=event.event_memberships?.[0];
  return{external_booking_id:`${event.uri}|${invitee.uri}`,external_event_uri:event.uri,external_invitee_uri:invitee.uri,event_type_uri:event.event_type,event_name:String(event.name||'Coaching session').slice(0,300),invitee_name:String(invitee.name||'Booking').slice(0,200),invitee_email:String(invitee.email||'').trim().toLowerCase().slice(0,254),invitee_phone:invitee.text_reminder_number||null,coach_calendly_user_uri:host?.user||null,coach_email:host?.user_email||null,start_at:event.start_time,end_at:event.end_time,venue:publicVenue(event.location?.location),booking_status:event.status==='canceled'||invitee.status==='canceled'?'canceled':'active',source_updated_at:[event.updated_at,invitee.updated_at].filter(x=>Number.isFinite(Date.parse(x))).sort().at(-1)||null,last_seen_at:new Date().toISOString()};
}
export async function saveBookings(ctx,rows){
  if(rows.length)await ctx.db('session_connect_booking_queue',{on_conflict:'external_booking_id'},'POST',rows);
}
export async function scanHost(ctx,host,bounds,connection,cache={}){
  const started=new Date().toISOString();
  const bookings=await pages(ctx,connection.token,'/scheduled_events',{user:host.calendly_user_uri,...(connection.metadata.team?{organization:host.organization_uri}:{}),min_start_time:bounds.start,max_start_time:bounds.end,status:'active',sort:'start_time:asc'});
  const rows=[],activeIds=new Set(),manifest={};
  for(let i=0;i<bookings.length;i+=3){await Promise.all(bookings.slice(i,i+3).map(async event=>{
    const id=event.uri?.match(/^https:\/\/api\.calendly\.com\/scheduled_events\/([a-z0-9-]+)$/i)?.[1];if(!id||event.status!=='active')fail(502,'Invalid booking returned by Calendly.');
    const fingerprint=createHash('sha256').update(JSON.stringify(event)).digest('hex'),prior=cache.events?.[id];
    if(prior?.fingerprint===fingerprint&&Date.now()-Date.parse(prior.checked_at)<1800000){
      for(const key of prior.active_ids)activeIds.add(key);manifest[id]=prior;return;
    }
    const invitees=await pages(ctx,connection.token,`/scheduled_events/${id}/invitees`);
    const fresh=invitees.map(invitee=>bookingRow(event,invitee));rows.push(...fresh);
    const ids=fresh.filter(r=>r.booking_status==='active').map(r=>r.external_booking_id);
    for(const key of ids)activeIds.add(key);
    manifest[id]={fingerprint,checked_at:started,active_ids:ids};
  }));}
  // Reconcile absence only after ALL pages and invitees have succeeded. A provider
  // failure cannot cancel saved bookings; a newer webhook wins over this scan.
  await ctx.db('rpc/hub_apply_calendly_scan',{},'POST',{p_host:host.calendly_user_uri,p_start:bounds.start,p_end:bounds.end||null,p_started:started,p_rows:rows,p_active:[...activeIds]});
  return{connected:true,count:activeIds.size,synced_at:new Date().toISOString(),cache:{events:manifest}};
}
export async function syncHost(ctx,host,bounds){
  const connection=await connectionFor(ctx,host);if(!connection)return{connected:false};
  const key=`calendly:${host.calendly_user_uri}:${bounds.start}:${bounds.end||'future'}`;
  const result=await withProviderSync(ctx,key,120,cache=>scanHost(ctx,host,bounds,connection,cache));
  return{...result,automatic:!!connection.metadata.webhook_uri};
}
export const signingKey=(secret,userId)=>createHmac('sha256',secret).update(`jt-calendly-webhook-v1:${userId}`).digest('hex');
export function validSignature(raw,header,key,now=Date.now()){
  const values=String(header||'').split(',').map(x=>x.trim().split('=')),timestamps=values.filter(x=>x[0]==='t'),signatures=values.filter(x=>x[0]==='v1');
  if(timestamps.length!==1||!/^\d+$/.test(timestamps[0][1])||Math.abs(now/1000-Number(timestamps[0][1]))>180)return false;
  const expected=createHmac('sha256',key).update(`${timestamps[0][1]}.`).update(raw).digest();
  return signatures.some(([,s])=>/^[a-f0-9]{64}$/i.test(s||'')&&timingSafeEqual(expected,Buffer.from(s,'hex')));
}
export async function subscribe(ctx,token,metadata){
  const url=`${WEBHOOK_ORIGIN}/api/calendly-webhook?connection=${ctx.user.id}`;
  const query={organization:metadata.organization_uri,scope:metadata.team?'organization':'user',...(!metadata.team?{user:metadata.user_uri}:{})};
  const existing=await pages(ctx,token,'/webhook_subscriptions',query);
  const matched=existing.find(x=>x.callback_url===url&&x.state==='active');
  if(matched)return matched.uri;
  const data=await cal(ctx,token,'/webhook_subscriptions',{}, {url,events:['invitee.created','invitee.canceled'],...query,signing_key:signingKey(ctx.secret,ctx.user.id)});
  return data.resource?.uri;
}
