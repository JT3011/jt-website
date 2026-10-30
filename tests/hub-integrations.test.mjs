import test from 'node:test';
import assert from 'node:assert/strict';
import {seal,unseal,endpoint} from '../server/hub-integrations.mjs';
import {storeWork,validateSettings,discountInput} from '../api/hub-store.mjs';
import {scheduleWork,dayBounds,mergeEvents} from '../api/coach-schedule.mjs';
const settings={tier_code:'foundation',discount_type:'percentage',discount_value:10,minimum_subtotal:20,valid_days:30,active:true,terms_accepted:true};
const eligible={tier_code:'foundation',tier_name:'Foundation',eligible:true,claimed:false};
function shopContext(options={}){
 const state={claims:[],created:new Set(),creates:0,writes:[],points:450};
 const ctx={user:{id:'player',email:'player@example.test'},role:'client',owner:false,method:'POST',action:'claim',body:{tier_code:'foundation'},env:{SHOPIFY_ADMIN_ACCESS_TOKEN:'test-token'},secret:'server-secret',params:new URLSearchParams(),
 db:async(table,query={},method='GET',body)=>{
  if(method!=='GET')state.writes.push({table,method,body});
  if(table==='hub_store_reward_claims'){
   if(method==='POST'){if(state.claims.length)throw Object.assign(Error('Conflict'),{status:409});state.claims.push({...body,id:'claim-1',status:'pending'});return state.claims;}
   if(method==='PATCH'){Object.assign(state.claims[0],body);return state.claims;}
   return state.claims;
  }
  if(table==='rpc/get_my_reward_ladder')return[{...eligible,...options.ladder}];
  if(table==='hub_store_reward_settings')return[{...settings,...options.settings}];
  if(table==='player_performance_accounts')return[{lifetime_points:state.points,points_balance:state.points}];
  return[];
 },fetchImpl:async(url,init)=>{
   const {query,variables}=JSON.parse(init.body);let data;
   if(query.includes('HubShop'))data={shop:{id:'gid://shopify/Shop/106145481052',myshopifyDomain:'xtkzjd-5g.myshopify.com',currencyCode:'GBP'},currentAppInstallation:{accessScopes:[{handle:'write_discounts'}]}};
   if(query.includes('HubRewardLookup'))data={codeDiscountNodeByCode:state.created.has(variables.code)?{id:'gid://shopify/DiscountCodeNode/1'}:null};
   if(query.includes('HubRewardCreate')){
    state.creates++;if(options.failCreate)throw Error('offline');
    if(state.created.has(variables.input.code))data={discountCodeBasicCreate:{codeDiscountNode:null,userErrors:[{message:'Already exists'}]}};
    else{state.created.add(variables.input.code);if(options.lostResponse&&state.creates===1)throw Error('response lost');data={discountCodeBasicCreate:{codeDiscountNode:{id:'gid://shopify/DiscountCodeNode/1'},userErrors:[]}};}
   }
   return new Response(JSON.stringify({data}),{status:200});
 }};return{ctx,state};
}
test('credentials are encrypted and bound to provider and user',()=>{const value=seal('private-token','key','calendly:a');assert.ok(!value.includes('private'));assert.equal(unseal(value,'key','calendly:a'),'private-token');assert.throws(()=>unseal(value,'key','calendly:b'));assert.throws(()=>unseal(value,'wrong','calendly:a'));});
test('discount configuration rejects invalid values and requires owner approval',()=>{for(const change of [{discount_value:101},{discount_value:-1},{minimum_subtotal:-1},{valid_days:0},{terms_accepted:false}])assert.throws(()=>validateSettings({...settings,...change}));assert.equal(validateSettings({...settings,active:false,discount_value:null}).active,false);});
test('code is single use, non-stacking, no subscription discount; fixed value is total',()=>{const c={code:'JT-TEST',id:'1',created_at:'2026-10-29T00:00:00Z',expires_at:'2026-11-29T00:00:00Z',discount_snapshot:settings};const i=discountInput(c);assert.equal(i.usageLimit,1);assert.equal(i.customerGets.value.percentage,.1);assert.equal(i.customerGets.appliesOnSubscription,false);assert.deepEqual(i.combinesWith,{orderDiscounts:false,productDiscounts:false,shippingDiscounts:false});assert.equal(i.minimumRequirement.subtotal.greaterThanOrEqualToSubtotal,'20');assert.equal(discountInput({...c,discount_snapshot:{...settings,discount_type:'fixed'}}).customerGets.value.discountAmount.appliesOnEachItem,false);});
test('locked milestones cannot issue rewards',async()=>{const{ctx,state}=shopContext({ladder:{eligible:false}});await assert.rejects(storeWork(ctx),{status:403});assert.equal(state.claims.length,0);});
test('legacy rewards and inactive milestones cannot be claimed twice',async()=>{for(const options of [{ladder:{claimed:true,claim_status:'approved'}},{settings:{active:false}}]){const{ctx,state}=shopContext(options);await assert.rejects(storeWork(ctx),{status:409});assert.equal(state.creates,0);}});
test('clients cannot change settings or connect Shopify',async()=>{const{ctx}=shopContext();for(const action of ['settings','connect'])await assert.rejects(storeWork({...ctx,action}),{status:403});});
test('concurrent requests use one reserved code and leave points unchanged',async()=>{const{ctx,state}=shopContext();const results=await Promise.all([storeWork(ctx),storeWork(ctx)]);assert.equal(state.claims.length,1);assert.equal(state.created.size,1);assert.equal(results[0].claim.code,results[1].claim.code);assert.ok(results[0].claim.url.startsWith('https://jtmindbodybalance.myshopify.com/discount/'));assert.equal(state.points,450);assert.ok(state.writes.every(w=>!w.table.includes('performance_accounts')));});
test('Shopify failure keeps a pending reservation without exposing a fake code',async()=>{const{ctx,state}=shopContext({failCreate:true});await assert.rejects(storeWork(ctx),{status:503});assert.equal(state.claims[0].status,'pending');const overview=await storeWork({...ctx,method:'GET',action:'overview'});assert.equal(overview.claims[0].code,undefined);assert.equal(state.points,450);});
test('lost Shopify response recovers the same code without another creation',async()=>{const{ctx,state}=shopContext({lostResponse:true});await assert.rejects(storeWork(ctx),{status:503});const result=await storeWork(ctx);assert.equal(result.claim.status,'issued');assert.equal(state.creates,1);assert.equal(state.claims.length,1);});
test('DST days and invalid dates',()=>{for(const[day,hours]of[['2026-03-29',23],['2026-10-25',25],['2026-10-29',24]]){const{start,end}=dayBounds(day);assert.equal((Date.parse(end)-Date.parse(start))/3600000,hours);}assert.throws(()=>dayBounds('2026-02-30'));});
test('calendar does not duplicate synced Hub sessions or include cancellations',()=>{const events=mergeEvents([{uri:'a',start:'2026-10-29T10:00:00Z',status:'active'}],[{id:'1',external_event_uri:'a',start_at:'2026-10-29T10:00:00Z'},{id:'2',start_at:'2026-10-29T11:00:00Z',status:'cancelled'},{id:'3',start_at:'2026-10-29T09:00:00Z',status:'scheduled'}]);assert.equal(events.length,2);assert.equal(events[0].id,'3');});
test('clients cannot access calendars; coaches cannot select another host',async()=>{await assert.rejects(scheduleWork({role:'client'}),{status:403});await assert.rejects(scheduleWork({role:'coach',user:{id:'coach-a'},method:'GET',action:'overview',params:new URLSearchParams({coach:'coach-b'}),db:async()=>[{calendly_user_uri:'coach-a',coach_user_id:'coach-a'}]}),{status:403});});
test('saved calendars are marked stale and credentials are never returned',async()=>{const ctx={role:'coach',manager:false,user:{id:'coach-a'},method:'GET',action:'overview',params:new URLSearchParams({day:'2026-10-29'}),db:async(table)=>{if(table==='hub_staff')return[{user_id:'coach-a',role:'coach'}];if(table==='session_connect_calendly_hosts')return[{calendly_user_uri:'uri-a',calendly_name:'Coach A',coach_user_id:'coach-a'}];if(table==='session_connect_booking_queue')return[{id:'b',event_name:'Football',start_at:'2026-10-29T10:00:00Z',end_at:'2026-10-29T11:00:00Z',invitee_name:'Test Player',booking_status:'active',last_seen_at:'2026-10-29T00:00:00Z'}];return[];}};const r=await scheduleWork(ctx);assert.equal(r.stale,true);assert.equal(r.connected,false);assert.equal(r.events.length,1);assert.ok(!JSON.stringify(r).includes('encrypted_token'));});
test('handler requires verified auth and does not trust role metadata',async()=>{
 const handler=endpoint(ctx=>({owner:ctx.owner}),{env:{SUPABASE_URL:'https://test.example',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'secret'},fetchImpl:async url=>new Response(JSON.stringify(String(url).includes('/auth/')?{id:'user',email_confirmed_at:'2026',user_metadata:{role:'owner'}}:[]),{status:200})});
 const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'GET',headers:{},url:'/'},res);assert.equal(res.code,401);
 await handler({method:'GET',headers:{authorization:'Bearer token'},url:'/'},res);assert.equal(res.code,200);assert.equal(res.body.owner,false);
 await handler({method:'POST',headers:{authorization:'Bearer token',host:'hub.test',origin:'https://evil.test'},url:'/'},res);assert.equal(res.code,403);
});
