import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import handler from '../api/performance-coach.mjs';
import verify from '../api/verify-checkout.mjs';
import {buildNutritionInstructions} from '../server/nutrition-coach.mjs';
const userId='00000000-0000-4000-8000-000000000001';
const env={OPENAI_API_KEY:'fixture-key',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',STRIPE_SECRET_KEY:'fixture-stripe',STRIPE_PRICE_ID:'price_fixture'};
const restoreEnv=()=>{const previous={...process.env};Object.assign(process.env,env);return()=>{for(const key of Object.keys(env)){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}};};
async function coachRun({body={service:'nutrition',consent:true,message:'Help me prepare lunches.',history:[]},membership='trialing',confirmed=true}={}){
 const undo=restoreEnv(),oldFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);calls.push({url:u,options,body:options.body?JSON.parse(options.body):null});
  if(u.pathname==='/auth/v1/user')return Response.json({id:userId,email_confirmed_at:confirmed?'2026-01-01':null});
  if(u.pathname.endsWith('/memberships'))return Response.json([{subscription_status:membership}]);
  if(u.pathname.endsWith('/profiles'))return Response.json([{age_group:null,onboarding_complete:false}]);
  if(u.pathname.endsWith('/hub_programme_intakes'))return Response.json([{answers:{age:34,goal:'Easy lunches',allergies:'peanuts',likes:'pasta',health_notes:'sensitive note not needed',consent:true}}]);
  if(u.pathname.endsWith('/hub_personal_plans'))return Response.json([{status:'published',plan:{title:'Personal week',summary:'Simple meals',recipes:[],ingredients:[],week:[],habits:[]}}]);
  if(u.pathname.endsWith('/consume_coach_message'))return Response.json({allowed:true});
  if(u.pathname==='/v1/moderations')return Response.json({results:[{categories:{}}]});
  if(u.pathname==='/v1/responses')return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Prepare two simple lunches from your shared plan.'}]}]});
  throw Error('Unexpected URL '+u);
 };
 const response={statusCode:200,setHeader(){},status(s){this.statusCode=s;return this;},json(body){this.body=body;return this;}};
 try{await handler({method:'POST',headers:{authorization:'Bearer fixture-token'},body},response);return{response,calls};}finally{globalThis.fetch=oldFetch;undo();}
}
test('nutrition coach accepts incomplete football profiles and loads only own nutrition intake and published plan',async()=>{
 const{response,calls}=await coachRun();assert.equal(response.statusCode,200);assert.equal(response.body.answered,true);
 const intake=calls.find(c=>c.url.pathname.endsWith('/hub_programme_intakes')),plan=calls.find(c=>c.url.pathname.endsWith('/hub_personal_plans'));
 assert.equal(intake.url.searchParams.get('player_user_id'),'eq.'+userId);assert.equal(intake.url.searchParams.get('kind'),'eq.nutrition');assert.equal(plan.url.searchParams.get('status'),'eq.published');
 const ai=calls.find(c=>c.url.pathname==='/v1/responses').body;
 assert.equal(ai.store,false);assert.match(ai.instructions,/peanuts/);assert.match(ai.instructions,/Never assume they play football/);assert.doesNotMatch(ai.instructions,/sensitive note not needed/);assert.equal(ai.input.at(-1).content,'Help me prepare lunches.');
});
test('nutrition coach requires consent, confirmed email and paid/trial membership before AI calls',async()=>{
 for(const options of [{body:{service:'nutrition',message:'Hello'}},{confirmed:false},{membership:'free'},{membership:'canceled'}]){
  const{response,calls}=await coachRun(options);assert.ok(response.statusCode>=400);assert.ok(!calls.some(c=>c.url.hostname==='api.openai.com'));
 }
});
test('football coaching still requires completed player onboarding',async()=>{
 const{response,calls}=await coachRun({body:{message:'Help with passing.'}});assert.equal(response.statusCode,409);assert.ok(!calls.some(c=>c.url.hostname==='api.openai.com'));
});
test('nutrition coaching never includes a draft plan or private health notes and covers unknown-age safeguards',()=>{
 const prompt=buildNutritionInstructions({answers:{allergies:'sesame',health_notes:'SECRET'}},{status:'draft',plan:{title:'PRIVATE DRAFT'}});
 assert.match(prompt,/SHARED PLAN: null/);assert.doesNotMatch(prompt,/SECRET|PRIVATE DRAFT/);assert.match(prompt,/age is unknown or under 18/);
});
test('verified checkout returns nutrition presentation tag without changing subscription verification',async()=>{
 const undo=restoreEnv(),oldFetch=globalThis.fetch;
 try{
  for(const[reference,live,price,expected]of[['nutrition',true,'price_fixture',200],['football',true,'price_fixture',200],['nutrition',false,'price_fixture',403],['nutrition',true,'price_wrong',403]]){
   globalThis.fetch=async()=>Response.json({livemode:live,status:'complete',payment_status:'no_payment_required',mode:'subscription',client_reference_id:reference,line_items:{data:[{price:{id:price}}]},subscription:{status:'trialing'}});
   const r=await verify.fetch(new Request('https://fixture.test/api/verify-checkout?session_id=cs_live_Test'));
   const data=await r.json();assert.equal(r.status,expected);if(expected===200)assert.equal(data.serviceFocus,reference==='nutrition'?'nutrition':null);
  }
 }finally{globalThis.fetch=oldFetch;undo();}
});
test('membership connection uses authenticated server claim and preserves pending checkout on failure',async()=>{
 const code=(await readFile(new URL('../nutrition-membership.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export \{.*\};\n/gm,'').replaceAll('export ','');
 for(const ok of [true,false]){
  const calls=[],user={id:userId,user_metadata:{nutrition_checkout_session:'cs_live_Fixture'}};
  const context=vm.createContext({UPGRADE_URL:'https://buy.stripe.com/fixture',getAccessState(){},supabase:{auth:{getSession:async()=>({data:{session:{user,access_token:'fixture-token'}}}),updateUser:async input=>{calls.push(input);return{};}}},fetch:async(url,opts)=>{assert.equal(url,'/api/claim-membership');assert.equal(opts.headers.Authorization,'Bearer fixture-token');assert.equal(JSON.parse(opts.body).session_id,'cs_live_Fixture');return Response.json(ok?{claimed:true}:{error:'Emails must match.'},{status:ok?200:403});},Error});
  vm.runInContext(code,context);if(ok){assert.equal(await vm.runInContext('connectNutritionMembership()',context),true);assert.equal(calls[0].data.nutrition_checkout_session,null);assert.equal(calls[0].data.service_focus,'nutrition');}else{await assert.rejects(vm.runInContext('connectNutritionMembership()',context),/Emails must match/);assert.equal(calls.length,0);}
 }
});
test('checkout routing selects nutrition only from verified Stripe session and never follows a supplied URL',async()=>{
 const code=await readFile(new URL('../hub-checkout-route.js',import.meta.url),'utf8');
 for(const focus of ['nutrition',null]){
  const routes=[],classes=new Set();
  const context=vm.createContext({URLSearchParams,AbortSignal,location:{search:'?session_id=cs_live_Fixture&next=https://invalid.test',replace:p=>routes.push(p)},document:{documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}},fetch:async()=>Response.json({verified:true,serviceFocus:focus})});
  await vm.runInContext(code,context);assert.deepEqual(routes,focus?['/nutrition?session_id=cs_live_Fixture#signup']:[]);if(!focus)assert.equal(classes.size,0);
 }
});
