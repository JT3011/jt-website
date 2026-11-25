import {supabase} from '/performance-hub-free-access.js';
import {NUTRITION_CHECKOUT_URL,validCheckoutId,verifyNutritionCheckout,connectNutritionMembership,rememberNutritionCheckout,getAccessState} from '/nutrition-membership.js?v=20261125.2';
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
let mode=query.get('mode')==='login'?'login':'signup',busy=false,checkoutVerified=false;
const nextPricing=query.get('next')==='pricing';
const destination=nextPricing?'/nutrition-pricing.html':'/nutrition-programme.html';
const checkoutId=validCheckoutId(query.get('session_id'))?query.get('session_id'):null;
function setMode(next){
 mode=next;const signup=mode==='signup',reset=mode==='reset';
 $('nameField').hidden=!signup;$('firstName').required=signup;
 $('confirmField').hidden=!signup;$('confirmPassword').required=signup;
 $('termsField').hidden=!signup;$('terms').required=signup;
 $('password').closest('label').hidden=reset;$('password').required=!reset;
 $('password').minLength=signup?10:1;$('password').autocomplete=signup?'new-password':'current-password';
 $('passwordHelp').hidden=!signup;$('forgotPassword').hidden=mode!=='login';
 $('formTitle').textContent=signup?'Make it yours.':reset?'Reset your password.':'Welcome back.';
 $('formIntro').textContent=signup?'Create your account, confirm your email and tell us about your nutrition goals.':reset?'Enter your email and we’ll send a password reset link.':'Sign in to your meal plan, check-ins and JT AI Coach.';
 $('formEyebrow').textContent='YOUR NUTRITION ACCOUNT';
 $('submitButton').textContent=signup?'Create my nutrition account':reset?'Send reset link':'Sign in';
 $('switchMode').textContent=signup?'Sign in':'Create an account';
 $('switchMode').previousSibling.textContent=signup?'Already have an account? ':'New here? ';
 $('noCharge').hidden=!signup||checkoutVerified;$('formError').hidden=true;$('success').hidden=true;
 $('accountForm').hidden=false;$('switchRow').hidden=false;
}
function showError(message){$('formError').textContent=message;$('formError').hidden=false;}
function success(title,message){$('accountForm').hidden=true;$('success').replaceChildren();const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=message;$('success').append(h,p);$('success').hidden=false;$('success').focus();}
function changeMode(next){if(busy)return;setMode(next);const params=new URLSearchParams();if(next!=='signup')params.set('mode',next);if(nextPricing)params.set('next','pricing');if(checkoutId)params.set('session_id',checkoutId);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
async function enter(){
 if(checkoutId){
  if(!checkoutVerified)throw Error('Your checkout has not been verified. Refresh this page to check it again.');
  await rememberNutritionCheckout(checkoutId);
  await connectNutritionMembership(checkoutId);
 }
 location.assign(destination);
}
$('headerLogin').onclick=event=>{event.preventDefault();changeMode('login');$('signup').scrollIntoView({behavior:'smooth'});};
$('switchMode').onclick=event=>{event.preventDefault();changeMode(mode==='signup'?'login':'signup');};
$('forgotPassword').onclick=event=>{event.preventDefault();changeMode('reset');};
$('useAnother').onclick=async()=>{try{const{error}=await supabase.auth.signOut();if(error)throw error;$('signedIn').hidden=true;setMode('signup');}catch(error){showError(error.message);}};
$('continueAccount').onclick=async event=>{event.preventDefault();if(busy)return;busy=true;try{await enter();}catch(error){showError(error.message);}finally{busy=false;}};
$('accountForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;$('formError').hidden=true;
 if(checkoutId&&!checkoutVerified){showError('Your checkout has not been verified yet. Refresh to retry.');return;}
 if(mode==='signup'&&$('password').value!==$('confirmPassword').value){showError('The passwords don’t match. Please check and try again.');return;}
 if(mode==='signup'&&!$('firstName').value.trim()){showError('Please enter your first name.');return;}
 const email=$('email').value.trim(),password=$('password').value;
 busy=true;$('submitButton').disabled=true;$('submitButton').textContent=mode==='signup'?'Creating your account…':mode==='reset'?'Sending…':'Signing in…';
 try{
  if(mode==='reset'){
   const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/performance-hub-reset-password.html?mode=update'});if(error)throw error;
   success('Check your inbox.','If an account exists for this email, you’ll receive a password reset link. After resetting, return here to sign in.');
  }else if(mode==='login'){
   const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await enter();
  }else{
   const acceptedAt=new Date().toISOString();
   const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/performance-hub-free-profile.html',data:{first_name:$('firstName').value.trim(),free_hub_signup:true,service_focus:'nutrition',signup_source:'bark',...(checkoutVerified?{nutrition_checkout_session:checkoutId}:{}),legal_terms_accepted:true,terms_accepted_at:acceptedAt,privacy_acknowledged_at:acceptedAt}}});
   if(error)throw error;
   if(data.session){await enter();return;}
   success('Check your inbox.',checkoutVerified?'Your subscription is confirmed. Open the confirmation email to connect your membership and enter your nutrition space. Check your junk folder too. If you already have an account, sign in below.':'Open the confirmation email to enter your nutrition space. Check your junk folder too. If you already have an account, sign in below.');
   $('switchMode').textContent='Sign in';$('switchMode').previousSibling.textContent='Already registered? ';
  }
 }catch(error){showError(error.message||'Something went wrong. Please try again.');}
 finally{busy=false;$('submitButton').disabled=false;$('submitButton').textContent=mode==='signup'?'Create my nutrition account':mode==='reset'?'Send reset link':'Sign in';}
};
setMode(query.get('mode')==='reset'?'reset':mode);
$('trialLink').href=NUTRITION_CHECKOUT_URL;
(async()=>{
 try{
  if(checkoutId){
   $('checkoutStatus').hidden=false;$('checkoutStatus').textContent='Checking your subscription…';
   const result=await verifyNutritionCheckout(checkoutId);checkoutVerified=true;
   $('checkoutStatus').textContent=result.subscriptionStatus==='trialing'?'Your 30-day trial is confirmed. Complete your account below.':'Your subscription is confirmed. Complete your account below.';
   if(result.email){$('email').value=result.email;$('email').readOnly=true;}
   $('noCharge').hidden=true;$('trialLink').textContent='Complete my account';$('trialLink').href='#signup';
  }
  const{data,error}=await supabase.auth.getSession();if(error)throw error;
  if(data.session&&!checkoutVerified){const access=await getAccessState();if(access.isPremium||access.membership?.subscription_status&&access.membership.subscription_status!=='free'){$('trialLink').href=destination;$('trialLink').textContent='Open my nutrition space';}}
  if(data.session){$('continueAccount').href=destination;if(nextPricing)$('continueAccount').textContent='Continue to client pricing';$('signedIn').hidden=false;$('accountForm').hidden=true;$('switchRow').hidden=true;$('formIntro').textContent=checkoutVerified?'Connect this subscription to your account using the same email as checkout.':'Your nutrition space is ready to open.';}
 }catch(error){showError(error.message);if(checkoutId)$('checkoutStatus').textContent='We could not confirm this checkout yet. Refresh to retry; you do not need to pay again.';}
 finally{$('submitButton').disabled=false;}
})();
