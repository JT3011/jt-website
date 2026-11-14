import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normaliseIntake} from '../server/programmes/core.mjs';

const source=await readFile(new URL('../nutrition-signup.js',import.meta.url),'utf8');
function signupHarness({search='',session=null,signupResult={data:{session:null}},loginError=null}={}){
 const elements=new Map(),calls=[],routes=[];
 function element(){return{value:'',hidden:false,disabled:false,required:false,textContent:'',previousSibling:{textContent:''},children:[],closest(){return this.parent||(this.parent=element());},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);},focus(){},scrollIntoView(){}};}
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 get('firstName').value='Alex';
 const supabase={auth:{getSession:async()=>({data:{session}}),signUp:async data=>{calls.push(data);return signupResult;},signInWithPassword:async data=>{calls.push(data);return{error:loginError};},resetPasswordForEmail:async(email,options)=>{calls.push({email,options});return{};},signOut:async()=>({})}};
 const context=vm.createContext({supabase,document:{getElementById:get,createElement:element},location:{search,pathname:'/nutrition',origin:'https://nutrition.test',assign:path=>routes.push(path)},history:{replaceState(){}},URLSearchParams,Date});
 vm.runInContext(source.replace(/^import .*;\n/,''),context);
 return{get,calls,routes,submit:()=>get('accountForm').onsubmit({preventDefault(){}})};
}
test('nutrition signup stores a service preference, requests existing confirmation route and waits for verification',async()=>{
 const h=signupHarness();h.get('firstName').value='Alex';h.get('email').value='alex@example.test';h.get('password').value=h.get('confirmPassword').value='test-only-password';
 await h.submit();assert.equal(h.calls.length,1);const request=h.calls[0];
 assert.equal(request.options.data.service_focus,'nutrition');assert.equal(request.options.data.signup_source,'bark');assert.equal(request.options.data.legal_terms_accepted,true);
 assert.equal(request.options.emailRedirectTo,'https://nutrition.test/performance-hub-free-profile.html');assert.equal(h.routes.length,0);assert.equal(h.get('success').hidden,false);assert.equal(h.get('accountForm').hidden,true);
});
test('mismatched passwords do not call signup and API failures leave a usable form',async()=>{
 const h=signupHarness();h.get('password').value='test-only-password';h.get('confirmPassword').value='different';await h.submit();assert.equal(h.calls.length,0);assert.match(h.get('formError').textContent,/don’t match/);
 const bad=signupHarness({signupResult:{error:{message:'Please try again later.'}}});await bad.submit();assert.equal(bad.get('formError').hidden,false);assert.equal(bad.get('submitButton').disabled,false);assert.equal(bad.get('accountForm').hidden,false);
});
test('immediate sessions and existing-account login enter nutrition without changing existing account metadata',async()=>{
 const h=signupHarness({signupResult:{data:{session:{user:{id:'test'}}}}});await h.submit();assert.deepEqual(h.routes,['/nutrition-programme.html']);
 const login=signupHarness({search:'?mode=login'});await login.submit();assert.deepEqual(login.routes,['/nutrition-programme.html']);assert.deepEqual(Object.keys(login.calls[0]).sort(),['email','password']);
});
test('reset uses existing recovery mode and does not submit passwords or create an account',async()=>{
 const h=signupHarness({search:'?mode=reset'});h.get('email').value='alex@example.test';await h.submit();assert.equal(h.calls[0].options.redirectTo,'https://nutrition.test/performance-hub-reset-password.html?mode=update');assert.equal(h.get('password').required,false);assert.equal(h.routes.length,0);
});
test('login and email-confirmation landing route nutrition accounts without granting paid access',async()=>{
 const accessSource=(await readFile(new URL('../performance-hub-free-access.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'').replaceAll('export ','');
 for(const [focus,status,destination] of [['nutrition','free','/nutrition-programme.html'],['nutrition','active','/nutrition-programme.html'],[null,'free','/performance-hub-portal.html']]){
  const routes=[],user={id:'test',user_metadata:{service_focus:focus}};
  const client={auth:{getSession:async()=>({data:{session:{user}}})},from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{subscription_status:status}})})};
  const context=vm.createContext({createClient:()=>client,window:{location:{replace:url=>routes.push(url)}}});vm.runInContext(accessSource,context);
  const access=await vm.runInContext('routeSignedInUser()',context);assert.equal(routes.pop(),destination);assert.equal(access.isPremium,status==='active');
  if(focus==='nutrition'){assert.equal(await vm.runInContext('requireFreeAccess()',context),null);assert.equal(routes.pop(),'/nutrition-programme.html');}
 }
});
test('nutrition questionnaire accepts an adult without football profile fields and keeps youth safeguards',async()=>{
 const code=(await readFile(new URL('../performance-hub-programme-form.js',import.meta.url),'utf8')).replace(/^import .*;\n/,"const e=s=>String(s??'');\n");
 const {wizardStep}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const answers={age:32,goal:'Easy family meals',routine:'Office work and family',health:'none',consent:true,diet:'Vegetarian',likes:'Pasta',dislikes:'none',allergies:'none',current_day:'Toast, lunch, dinner',shop:'Tesco',budget:60};
 assert.equal(normaliseIntake('nutrition',answers,{},{submit:true}).age,32);
 for(let step=0;step<5;step++)assert.doesNotMatch(wizardStep('nutrition',step,answers,{nutritionOnly:true}).html,/football|player|Match days/i);
 assert.match(wizardStep('nutrition',0,answers).html,/Player’s age/);
 assert.throws(()=>normaliseIntake('nutrition',{...answers,age:15},{},{submit:true}),/guardian/);
});

test('pricing sign-in returns to the fixed owner page, while arbitrary return URLs are ignored',async()=>{
 const pricing=signupHarness({search:'?mode=login&next=pricing'});await pricing.submit();assert.deepEqual(pricing.routes,['/nutrition-pricing.html']);
 const unsafe=signupHarness({search:'?mode=login&next=https://example.invalid'});await unsafe.submit();assert.deepEqual(unsafe.routes,['/nutrition-programme.html']);
});
