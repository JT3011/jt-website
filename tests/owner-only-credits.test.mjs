import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../api/hub-portal.mjs';
import {scheduleWork} from '../api/coach-schedule.mjs';
const user='11111111-1111-4111-8111-111111111111',player='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'public-fixture',SUPABASE_SECRET_KEY:'secret-fixture'};
const json=data=>new Response(JSON.stringify(data),{status:200});
test('players, parents, assigned coaches and admins get their authorized profile without credit data or lookups',async()=>{
 for(const role of ['player','parent','coach','admin']){
  const target=role==='player'?user:player;
  const fetchImpl=async(input)=>{
   const u=new URL(input),table=u.pathname.split('/').at(-1);
   if(u.pathname==='/auth/v1/user')return json({id:user,email_confirmed_at:'2026-01-01',user_metadata:{role:'owner'}});
   if(table==='hub_staff')return json(['coach','admin'].includes(role)?[{user_id:user,role}]:[]);
   if(table==='session_connect_coach_players')return json(role==='coach'?[{player_user_id:player}]:[]);
   if(table==='session_connect_parent_players')return json(role==='parent'?[{player_user_id:player}]:[]);
   if(table==='profiles')return json([{id:target,player_name:'Sample player'}]);
   if(table==='hub_player_programmes')return json([{title:'Authorized training plan'}]);
   throw Error('Unexpected private credit/provider lookup: '+table);
  };
  let status,payload;const res={setHeader(){},status(n){status=n;return this;},json(v){payload=v;}};
  await createHandler({env,fetchImpl})({method:'GET',url:`/api/hub-portal?action=player&player=${target}&refresh=1&owner=true`,headers:{authorization:'Bearer fixture'}},res);
  assert.equal(status,200,role);assert.equal(payload.canViewCredits,false);assert.equal(payload.profile.name,'Sample player');assert.equal(payload.programmes.length,1);
  for(const key of ['credit','syncStatus','airtableUrl'])assert.equal(Object.hasOwn(payload,key),false,role+' '+key);
 }
});
test('coach and admin schedule APIs omit financial data even if the database response includes it',async()=>{
 for(const role of ['coach','admin','owner']){
  const owner=role==='owner',db=async(table,q)=>{
   if(table==='hub_staff')return[{user_id:user,role}];
   if(table==='hub_coach_calendars')return[{id:'test',display_name:'Test coach',coach_user_id:user}];
   if(table==='session_connect_booking_queue')return[{id:'booking',calendar_id:'test',coach_user_id:user,matched_airtable_record_id:'recFixture',matched_player_name:'Sample player',booking_status:'active',start_at:'2026-11-03T17:00:00Z',end_at:'2026-11-03T18:00:00Z',event_name:'Football'}];
   if(table==='hub_airtable_players'){
    assert.equal(q.select.includes('credits'),owner);
    return[{airtable_record_id:'recFixture',display_name:'Sample player',credits:[{remaining:98765,purchased:99999,used:1234}]}];
   }
   return[];
  };
  const data=await scheduleWork({role,owner,manager:role!=='coach',user:{id:user},params:new URLSearchParams({coach:'test',day:'2026-11-03'}),method:'GET',action:'overview',db});
  assert.deepEqual(data.events[0].players,['Sample player']);assert.equal(data.events[0].can_view_credits,owner);
  if(owner)assert.equal(data.events[0].credit.credits[0].remaining,98765);
  else{assert.doesNotMatch(JSON.stringify(data),/98765|99999|1234|purchased|remaining|"credit"|credit_sync/);}
 }
});
