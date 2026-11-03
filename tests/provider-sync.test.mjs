import test from 'node:test';
import assert from 'node:assert/strict';
import {scanHost,pages} from '../server/calendly-sync.mjs';
import {withProviderSync} from '../server/provider-sync-state.mjs';
import {createSyncJob,syncBounds} from '../server/provider-sync.mjs';
import {syncAirtable,F,PLAYERS} from '../server/airtable-credits.mjs';
import {scheduleWork} from '../api/coach-schedule.mjs';
import {createAirtableHandler} from '../api/hub-airtable.mjs';
import {autoRefresh} from '../performance-hub-auto-refresh.js';
const owner='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222';
const event={uri:`https://api.calendly.com/scheduled_events/${owner}`,name:'Test football',status:'active',start_time:'2026-11-04T18:00:00Z',end_time:'2026-11-04T19:00:00Z',updated_at:'2026-11-03T10:00:00Z',event_memberships:[{user:'host-a'}]};
const invitee={uri:`${event.uri}/invitees/${child}`,name:'Test player',email:'test@example.invalid',status:'active'};
const host={calendly_user_uri:'host-a'},connection={token:'test-provider-token',metadata:{}},bounds={start:'2026-11-01T00:00:00Z'};
const json=data=>new Response(JSON.stringify(data),{status:200});
test('complete scans reconcile only the selected host and date range, keeping active invitees',async()=>{
 const writes=[],urls=[];
 const ctx={db:async(...args)=>{writes.push(args);return[];},fetchImpl:async input=>{const url=new URL(input);urls.push(url);return json({collection:url.pathname.endsWith('/invitees')?[invitee,{...invitee,uri:`${event.uri}/invitees/33333333-3333-4333-8333-333333333333`,status:'canceled'}]:[event]});}};
 const result=await scanHost(ctx,host,bounds,connection);
 assert.equal(urls[0].searchParams.get('status'),'active');assert.equal(writes.length,1);
 const [table,,method,body]=writes[0];assert.equal(table,'rpc/hub_apply_calendly_scan');assert.equal(method,'POST');assert.equal(body.p_host,'host-a');assert.equal(body.p_start,bounds.start);
 assert.deepEqual(body.p_active,[`${event.uri}|${invitee.uri}`]);assert.equal(body.p_rows.length,2);assert.equal(result.count,1);
 // Unchanged events use the compact manifest, avoiding an invitee request for every open tab.
 urls.length=0;writes.length=0;
 await scanHost(ctx,host,bounds,connection,result.cache);assert.equal(urls.length,1);assert.equal(writes[0][3].p_rows.length,0);assert.equal(writes[0][3].p_active.length,1);
});
test('a failed later page or invitee request never reconciles absence or changes saved bookings',async()=>{
 for(const mode of ['page','invitee','malformed']){
  let writes=0;
  const ctx={db:async()=>{writes++;},fetchImpl:async input=>{const u=new URL(input);if(mode==='malformed')return json({error:'bad'});if(mode==='page'&&u.searchParams.has('page_token')||mode==='invitee'&&u.pathname.endsWith('/invitees'))return new Response('',{status:503});return json({collection:[event],...(mode==='page'?{pagination:{next_page_token:'two'}}:{})});}};
  await assert.rejects(scanHost(ctx,host,bounds,connection));assert.equal(writes,0);
 }
});
test('an empty successful provider scan is authoritative, unlike an incomplete response',async()=>{
 let body;await scanHost({fetchImpl:async()=>json({collection:[]}),db:async(t,q,m,b)=>{body=b;}},host,bounds,connection);
 assert.deepEqual(body.p_active,[]);assert.deepEqual(body.p_rows,[]);
});
test('429 responses carry backoff rather than retrying immediately',async()=>{
 await assert.rejects(pages({fetchImpl:async()=>new Response('',{status:429,headers:{'X-RateLimit-Reset':'120'}})},'token','/scheduled_events'),e=>e.status===503&&e.retryAfter===120);
});
test('shared leases skip duplicate provider calls and failure does not claim a successful sync',async()=>{
 let called=false,finished;
 const cached=await withProviderSync({db:async()=>({acquired:false,last_success:'2026-11-03T10:00:00Z'})},'key',120,()=>{called=true;});assert.equal(called,false);assert.equal(cached.stale,false);
 await assert.rejects(withProviderSync({db:async(t,q,m,b)=>{if(t.includes('claim'))return{acquired:true,lease_id:'lease',cache:{old:true}};finished=b;}},'key',120,async()=>{throw Object.assign(Error('provider error'),{retryAfter:300});}));
 assert.equal(finished.p_success,false);assert.equal(finished.p_seconds,300);assert.deepEqual(finished.p_cache,{old:true});
});
test('Airtable saves only after both complete tables load and preserves reciprocal credit links',async()=>{
 for(const failPayments of [false,true]){
  const writes=[];const ctx={env:{AIRTABLE_READ_TOKEN:'test-token'},db:async(t,q,m,b)=>{if(t.includes('claim'))return{acquired:true,lease_id:'lease'};writes.push({t,b});return[];},fetchImpl:async input=>{if(String(input).includes(PLAYERS))return json({records:[{id:'recPlayer',fields:{[F.name]:'Test player',[F.payments]:['recPayment']}}]});if(failPayments)return new Response('',{status:503});return json({records:[{id:'recPayment',fields:{[F.players]:['recPlayer'],[F.remaining]:4,[F.service]:'Football'}},{id:'recUnrelated',fields:{[F.players]:['recOther'],[F.remaining]:10}}]});}};
  if(failPayments){await assert.rejects(syncAirtable(ctx));assert.ok(!writes.some(w=>w.t==='hub_airtable_players'));}
  else{const result=await syncAirtable(ctx);assert.equal(result.count,1);const saved=writes.find(w=>w.t==='hub_airtable_players').b;assert.equal(saved[0].credits.length,1);assert.equal(saved[0].credits[0].remaining,4);}
 }
});
test('coach and parent schedules show only active Calendly bookings, not cancelled or orphan Hub logs',async()=>{
 const queue=['active','canceled','cancelled'].map((booking_status,i)=>({id:`q${i}`,converted_session_id:`s${i}`,booking_status,player_user_id:child,coach_user_id:owner,event_name:'Football',start_at:event.start_time,end_at:event.end_time}));
 const db=async(t)=>t==='session_connect_booking_queue'?queue:t==='session_connect_sessions'?[...queue.map(q=>({id:q.converted_session_id,player_user_id:child,coach_user_id:owner,status:'completed',start_at:event.start_time,end_at:event.end_time})),{id:'orphan',status:'scheduled',start_at:event.start_time,end_at:event.end_time}]:t==='hub_staff'?[{user_id:owner,role:'owner'}]:t==='session_connect_parent_players'?[{player_user_id:child}]:[];
 const ctx={role:'owner',manager:true,owner:true,user:{id:owner},params:new URLSearchParams({day:'2026-11-03',player:child}),method:'GET',db};
 for(const action of ['overview','player']){const result=await scheduleWork({...ctx,action});assert.deepEqual(result.events.map(e=>e.id),['q0']);}
});
test('scheduled job tickets are required, atomic, single-use and never returned',async()=>{
 let claimed=false,runs=0;const ticket='a'.repeat(64),env={SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'server-secret'};
 const handler=createSyncJob({env,run:async()=>{runs++;return[{connected:true,stale:false}];},fetchImpl:async input=>{const url=new URL(input);if(url.searchParams.has('ticket_hash')){if(claimed)return json([]);claimed=true;return json([{id:'job'}]);}return json([]);}});
 const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',headers:{}},res);assert.equal(res.code,401);assert.equal(runs,0);
 await handler({method:'POST',headers:{authorization:`Bearer ${ticket}`}},res);assert.equal(res.code,200);assert.equal(runs,1);assert.ok(!JSON.stringify(res.data).includes(ticket));
 await handler({method:'POST',headers:{authorization:`Bearer ${ticket}`}},res);assert.equal(res.code,401);assert.equal(runs,1);
});
test('open schedules poll every 30 seconds, pause hidden tabs and avoid overlapping requests',async()=>{
 const listeners={},doc={hidden:true,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n]};let tick,delay,cleared=false,calls=0,finish;
 const win={addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n],setInterval:(f,ms)=>{tick=f;delay=ms;return 1;},clearInterval:()=>cleared=true};
 const stop=autoRefresh({isConnected:true,hidden:false,querySelector:()=>null},()=>{calls++;return new Promise(r=>finish=r);},{window:win,document:doc});
 assert.equal(delay,30000);await tick();assert.equal(calls,0);doc.hidden=false;const pending=tick();await tick();assert.equal(calls,1);finish();await pending;stop();assert.equal(cleared,true);assert.deepEqual(Object.keys(listeners),[]);
});
test('today and future calendars share a seven-day recovery window, historical days remain accessible',()=>{
 const now=Date.parse('2026-11-03T12:00:00Z');assert.equal(syncBounds('2026-12-01T00:00:00Z',now).start,'2026-10-27T00:00:00.000Z');assert.equal(syncBounds('2026-01-01T00:00:00Z',now).start,'2026-01-01T00:00:00Z');
});

test('shared API route keeps scheduled jobs and normal connections separately authenticated',async()=>{
 const handler=createAirtableHandler({env:{},fetchImpl:async()=>{throw Error('Unexpected provider call');}});
 for(const url of ['/api/hub-airtable?job=provider-sync','/api/hub-airtable']){
  const response={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler({url,method:'POST',headers:{},body:{action:'connect'}},response);
  assert.equal(response.code,401);
 }
});
