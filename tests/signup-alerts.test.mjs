import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, createECDH, randomBytes} from 'node:crypto';
import {createWebhook} from '../api/stripe-webhook.mjs';
import {createHandler} from '../api/hub-portal.mjs';
import {processSignupEvent, handleSignupAlerts, validatePushSubscription, signupNotification} from '../server/signup-alerts.mjs';

const env={STRIPE_SECRET_KEY:'test-placeholder',STRIPE_PRICE_ID:'price_hub',STRIPE_WEBHOOK_SECRET:'test-signing-placeholder',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_placeholder',SUPABASE_PUBLISHABLE_KEY:'public-placeholder'};
const event=()=>({id:'evt_example',created:1795600000,livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_live_Example',mode:'subscription',payment_link:'plink_1TuwAP2aPmMCWSgwHJpG6jL6'}}});
const session=()=>({...event().data.object,livemode:true,status:'complete',payment_status:'no_payment_required',customer:'cus_example',customer_details:{name:'Sample Client',email:'sample@example.test'},subscription:{id:'sub_example',status:'trialing',trial_end:1798192000},line_items:{data:[{quantity:1,price:{id:'price_hub',unit_amount:1299,currency:'gbp',recurring:{interval:'month',interval_count:1}}}]}});
function fixture({checkout=session(),devices=[{id:'device-1',user_id:'owner',subscription:{}}],pushError}={}){
  let sent=0,fetches=0;const rows=new Map(),deliveries=new Map(),calls=[];
  const db=async(table,query={},options={})=>{
    calls.push({table,query,options});
    if(table==='hub_staff')return[{user_id:'owner'}];
    if(table==='hub_signup_alerts'){if(!rows.has(options.body.id))rows.set(options.body.id,options.body);return[];}
    if(table==='hub_signup_push_devices'){if(options.method==='DELETE'){devices.splice(devices.findIndex(d=>'eq.'+d.id===query.id),1);return[];}return devices;}
    if(table==='rpc/hub_claim_signup_delivery'){
      const key=options.body.p_signup+options.body.p_device,old=deliveries.get(key);
      if(old&&(old.delivered_at||old.leased_until!==new Date(0).toISOString()))return[];
      const claim={lease_token:'lease-example'};deliveries.set(key,claim);return[claim];
    }
    if(table==='hub_signup_push_deliveries'){
      const key=query.signup_id.slice(3)+query.device_id.slice(3),old=deliveries.get(key);
      if(options.method==='PATCH'){Object.assign(old,options.body);return[];}
      return old?[old]:[];
    }
    throw Error('Unexpected table '+table);
  };
  return{rows,deliveries,calls,devices,get sent(){return sent;},get fetches(){return fetches;},deps:{env,db,fetchImpl:async()=>{fetches++;return Response.json(checkout);},push:async()=>{sent++;if(pushError)throw pushError;}}};
}

test('verified trial signup records once and sends one notification per owner device across retries',async()=>{
  const f=fixture();assert.deepEqual(await processSignupEvent(event(),f.deps),{recorded:true});
  await processSignupEvent({...event(),id:'evt_retry'},f.deps);
  assert.equal(f.rows.size,1);assert.equal(f.sent,1);assert.equal(f.rows.values().next().value.subscription_status,'trialing');
  assert.match(signupNotification(f.rows.values().next().value).body,/trial/);assert.doesNotMatch(signupNotification(f.rows.values().next().value).body,/Payment confirmed/);
});
test('asynchronous checkout waits for confirmed payment; successful completion deduplicates by checkout',async()=>{
  const checkout=session();checkout.subscription.status='active';checkout.payment_status='unpaid';
  const f=fixture({checkout});assert.deepEqual(await processSignupEvent(event(),f.deps),{ignored:true});assert.equal(f.sent,0);
  checkout.payment_status='paid';await processSignupEvent({...event(),type:'checkout.session.async_payment_succeeded'},f.deps);
  await processSignupEvent(event(),f.deps);assert.equal(f.sent,1);assert.match(signupNotification(f.rows.values().next().value).body,/Payment confirmed/);
});
test('unrelated links, test mode, invalid subscriptions and changed prices never announce success',async()=>{
  for(const alter of [e=>e.livemode=false,e=>e.data.object.mode='payment',e=>e.data.object.payment_link='another_link',e=>e.data.object.id='cs_test_fake']){
    const e=event();alter(e);const f=fixture();assert.deepEqual(await processSignupEvent(e,f.deps),{ignored:true});assert.equal(f.fetches,0);
  }
  for(const alter of [s=>s.status='open',s=>s.livemode=false,s=>s.subscription.status='incomplete',s=>s.line_items.data[0].price.id='other',s=>s.line_items.data[0].price.unit_amount=999,s=>s.line_items.data[0].quantity=2]){
    const s=session();alter(s);const f=fixture({checkout:s});assert.deepEqual(await processSignupEvent(event(),f.deps),{ignored:true});assert.equal(f.rows.size,0);
  }
});
test('a transient push failure releases the lease and fails the webhook for retry',async()=>{
  const f=fixture({pushError:Object.assign(new Error('unavailable'),{statusCode:503})});
  await assert.rejects(processSignupEvent(event(),f.deps),/retrying/);
  assert.equal(f.deliveries.values().next().value.leased_until,new Date(0).toISOString());
  await assert.rejects(processSignupEvent(event(),f.deps));assert.equal(f.sent,2);
});
test('expired devices are removed; revoked owners receive no alert; zero devices still records confirmation',async()=>{
  const f=fixture({pushError:Object.assign(new Error('expired'),{statusCode:410})});await processSignupEvent(event(),f.deps);assert.equal(f.devices.length,0);
  const g=fixture({devices:[{id:'former-device',user_id:'former-owner'}]});await processSignupEvent(event(),g.deps);assert.equal(g.sent,0);assert.equal(g.rows.size,1);
});
test('a missing signature, wrong signature, stale signature and test event never reach notification processing',async()=>{
  let calls=0;const webhook=createWebhook({env,signupProcessor:async()=>calls++});
  const raw=JSON.stringify(event()),now=Math.floor(Date.now()/1000);
  const signature=(body,timestamp)=>`t=${timestamp},v1=${createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex')}`;
  for(const sig of ['',`t=${now},v1=bad`,signature(raw,now-600)]){
    const response=await webhook.fetch(new Request('https://hub.test/api/stripe-webhook',{method:'POST',body:raw,headers:{'stripe-signature':sig}}));assert.equal(response.status,400);
  }
  const testBody=JSON.stringify({...event(),livemode:false});
  assert.equal((await webhook.fetch(new Request('https://hub.test/api/stripe-webhook',{method:'POST',body:testBody,headers:{'stripe-signature':signature(testBody,now)}}))).status,200);assert.equal(calls,0);
  assert.equal((await webhook.fetch(new Request('https://hub.test/api/stripe-webhook',{method:'POST',body:raw,headers:{'stripe-signature':signature(raw,now)}}))).status,200);assert.equal(calls,1);
});
test('only the server-authorized owner can list, enable, disable or test alerts, including forged owner metadata',async()=>{
  for(const role of ['client','coach','admin'])for(const action of ['signup-alerts','signup-enable','signup-disable','signup-test','signup-device-status']){
    await assert.rejects(handleSignupAlerts({role,action,method:action==='signup-alerts'?'GET':'POST',body:{}}),e=>e.status===403);
  }
  const fetchImpl=async input=>{
    const path=new URL(input).pathname;
    if(path.endsWith('/auth/v1/user'))return Response.json({id:'someone',email_confirmed_at:'2026-01-01',user_metadata:{role:'owner'}});
    if(['/hub_staff','/session_connect_coach_players','/session_connect_parent_players'].some(s=>path.endsWith(s)))return Response.json([]);
    throw Error('Unauthorized downstream read');
  };
  let status;await createHandler({env,fetchImpl})({url:'/api/hub-portal?action=signup-alerts',method:'GET',headers:{authorization:'Bearer example'}},{setHeader(){},status(n){status=n;return this;},json(){}});assert.equal(status,403);
});
test('push subscriptions reject arbitrary endpoints and invalid encryption keys',()=>{
  const ecdh=createECDH('prime256v1');ecdh.generateKeys();const keys={p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')};
  for(const endpoint of ['http://web.push.apple.com/x','https://127.0.0.1/x','https://evil.example/x','https://web.push.apple.com.evil.example/x','https://web.push.apple.com:8443/x','https://user:pass@web.push.apple.com/x'])assert.throws(()=>validatePushSubscription({endpoint,keys}));
  assert.equal(validatePushSubscription({endpoint:'https://web.push.apple.com/example',keys}).keys.p256dh,keys.p256dh);
  assert.throws(()=>validatePushSubscription({endpoint:'https://web.push.apple.com/example',keys:{auth:'bad',p256dh:'bad'}}));
});
test('dashboard distinguishes checkout confirmation from completed Hub account registration',async()=>{
  const row={id:'cs_live_Example',client_name:'Example'};
  for(const linked of [false,true]){
    const result=await handleSignupAlerts({role:'owner',user:{id:'owner'},action:'signup-alerts',method:'GET',env,db:async table=>table==='hub_signup_alerts'?[row]:table==='memberships'&&linked?[{stripe_checkout_session_id:row.id}]:[]});
    assert.equal(result.signups[0].account_connected,linked);assert.equal(result.ready,false);assert.equal(result.public_key,null);
  }
});
