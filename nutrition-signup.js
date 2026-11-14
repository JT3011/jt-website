import {supabase} from '/performance-hub-free-access.js';
const $=id=>document.getElementById(id);
let mode=new URLSearchParams(location.search).get('mode')==='login'?'login':'signup';
let busy=false;
const nextPricing=new URLSearchParams(location.search).get('next')==='pricing';
const destination=nextPricing?'/nutrition-pricing.html':'/nutrition-programme.html';
function setMode(next){
 mode=next;const signup=mode==='signup',reset=mode==='reset';
 $('nameField').hidden=!signup;$('firstName').required=signup;
 $('confirmField').hidden=!signup;$('confirmPassword').required=signup;
 $('termsField').hidden=!signup;$('terms').required=signup;
 $('password').closest('label').hidden=reset;$('password').required=!reset;
 $('password').minLength=signup?10:1;$('password').autocomplete=signup?'new-password':'current-password';
 $('passwordHelp').hidden=!signup;$('forgotPassword').hidden=mode!=='login';
 $('formTitle').textContent=signup?'Let’s get started.':reset?'Reset your password.':'Welcome back.';
 $('formIntro').textContent=signup?'Create your free account, confirm your email and complete your nutrition questionnaire.':reset?'Enter your account email and we’ll send a password reset link.':'Sign in to your nutrition questionnaire, meal plan and check-ins.';
 $('formEyebrow').textContent=signup?'YOUR FIRST STEP':'YOUR NUTRITION PROGRAMME';
 $('submitButton').textContent=signup?'Create my account':reset?'Send reset link':'Sign in';
 $('switchMode').textContent=signup?'Sign in':'Create an account';
 $('switchMode').previousSibling.textContent=signup?'Already have an account? ':'New here? ';
 $('noCharge').hidden=!signup;$('formError').hidden=true;$('success').hidden=true;
 $('accountForm').hidden=false;$('switchRow').hidden=false;
}
function showError(message){$('formError').textContent=message;$('formError').hidden=false;}
function success(title,message){$('accountForm').hidden=true;$('success').replaceChildren();const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=message;$('success').append(h,p);$('success').hidden=false;$('success').focus();}
function changeMode(next){if(busy)return;setMode(next);const query=new URLSearchParams();if(next!=='signup')query.set('mode',next);if(nextPricing)query.set('next','pricing');history.replaceState(null,'',location.pathname+(query.size?'?'+query:''));}
$('headerLogin').onclick=event=>{event.preventDefault();changeMode('login');$('signup').scrollIntoView({behavior:'smooth'});};
$('switchMode').onclick=event=>{event.preventDefault();changeMode(mode==='signup'?'login':'signup');};
$('forgotPassword').onclick=event=>{event.preventDefault();changeMode('reset');};
$('useAnother').onclick=async()=>{try{const{error}=await supabase.auth.signOut();if(error)throw error;$('signedIn').hidden=true;setMode('signup');}catch(error){showError(error.message);}};
$('accountForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;$('formError').hidden=true;
 if(mode==='signup'&&$('password').value!==$('confirmPassword').value){showError('The passwords don’t match. Please check and try again.');return;}
 if(mode==='signup'&&!$('firstName').value.trim()){showError('Please enter your first name.');return;}
 const email=$('email').value.trim(),password=$('password').value;
 busy=true;$('submitButton').disabled=true;$('submitButton').textContent=mode==='signup'?'Creating your account…':mode==='reset'?'Sending…':'Signing in…';
 try{
  if(mode==='reset'){
   const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/performance-hub-reset-password.html?mode=update'});if(error)throw error;
   success('Check your inbox.','If an account exists for this email, you’ll receive a password reset link. After resetting, return here to sign in.');
  }else if(mode==='login'){
   const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;location.assign(destination);
  }else{
   const acceptedAt=new Date().toISOString();
   const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/performance-hub-free-profile.html',data:{first_name:$('firstName').value.trim(),free_hub_signup:true,service_focus:'nutrition',signup_source:'bark',legal_terms_accepted:true,terms_accepted_at:acceptedAt,privacy_acknowledged_at:acceptedAt}}});
   if(error)throw error;
   if(data.session){location.assign(destination);return;}
   success('Check your inbox.','Open the confirmation email to continue to your nutrition questionnaire. Check your junk folder too. If you already have an account, sign in below.');
   $('switchMode').textContent='Sign in';$('switchMode').previousSibling.textContent='Already registered? ';
  }
 }catch(error){showError(error.message||'Something went wrong. Please try again.');}
 finally{busy=false;$('submitButton').disabled=false;$('submitButton').textContent=mode==='signup'?'Create my account':mode==='reset'?'Send reset link':'Sign in';}
};
setMode(new URLSearchParams(location.search).get('mode')==='reset'?'reset':mode);
$('submitButton').disabled=false;
supabase.auth.getSession().then(({data,error})=>{if(error)throw error;if(data.session){$('continueAccount').href=destination;if(nextPricing)$('continueAccount').textContent='Continue to client pricing';$('signedIn').hidden=false;$('accountForm').hidden=true;$('switchRow').hidden=true;$('formIntro').textContent='Continue to your questionnaire and personal nutrition plan.';}}).catch(error=>showError(error.message));
