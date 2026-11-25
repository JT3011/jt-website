import {supabase,hubApi,escapeHtml as e} from '/performance-hub-integrations.js';
import {getAccessState,connectNutritionMembership,NUTRITION_CHECKOUT_URL} from '/nutrition-membership.js?v=20261125.2';
const $=id=>document.getElementById(id);
const titles={today:['Today, <em>made simple.</em>','Your food. Your routine. Your goals.'],week:['Your week, <em>considered.</em>','Variety you can look forward to.'],shop:['Shop with <em>a plan.</em>','The ingredients, quantities and costs that matter.'],progress:['Small steps. <em>Real progress.</em>','Notice what works. Build on it.'],coach:['Support for <em>real life.</em>','A practical answer when you need a little guidance.'],support:['A little more <em>support.</em>','Your programme, your questions, your next step.']};
export async function startNutritionDashboard(overview,{navigate,questionnaire,canNavigate}){
 let access,claimFailed=false,page='today',latest=null,chatBusy=false,history=[],initial=true;
 const requestedView=new URLSearchParams(location.search).get('view');
 const say=message=>{$('notice').textContent=message;$('notice').hidden=!message;};
 try{await connectNutritionMembership();}catch(error){claimFailed=true;say(error.message+' You do not need to pay again.');}
 access=await getAccessState();
 const member=access.isPremium,status=access.membership?.subscription_status;
 const hasBilling=Boolean(status&&status!=='free');
 $('membershipBadge').hidden=false;$('membershipBadge').textContent=member?(status==='trialing'?'Trial active':'Member'):'Your nutrition account';
 $('manageMembership').hidden=!hasBilling;$('teamHub').hidden=!['owner','admin','coach'].includes(overview.role);
 // The saved preference controls navigation only; it is never used to grant access.
 if(overview.role==='client'&&access.user?.user_metadata?.service_focus!=='nutrition'){
  const {error}=await supabase.auth.updateUser({data:{service_focus:'nutrition'}});
  if(error)say('Your programme is available, but your home-page preference could not be saved. Try again next time.');
 }
 if(!member&&overview.role==='client'){
  $('membershipBanner').hidden=false;
  $('membershipBanner').innerHTML=claimFailed?'<div><h2>Connect your membership.</h2><p>Use the same verified email as your checkout. Contact JT if you need help connecting it.</p></div><a class="button" href="mailto:info@jtmindbodybalance.com?subject=Nutrition%20membership%20help">Contact JT</a>':hasBilling?'<div><h2>Check your membership.</h2><p>Open billing to review your subscription and restore JT AI Coach access.</p></div><button class="button" id="billingHelp">Manage membership</button>':`<div><h2>Your next step starts here.</h2><p>Start your 30-day trial, then £12.99/month. Your personal nutrition space and JT AI Coach, together.</p></div><a class="button" href="${NUTRITION_CHECKOUT_URL}">Start my trial</a>`;
 }
 async function billing(){try{const result=await hubApi('create-portal-session',{});const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw Error('Billing is unavailable. Please contact JT.');location.assign(url.href);}catch(error){say(error.message);}}
 $('manageMembership').onclick=billing;if($('billingHelp'))$('billingHelp').onclick=billing;
 function setPage(next){
  if(canNavigate&&!canNavigate()){say("Finish the current save, or choose Save & exit on your questionnaire, before changing sections.");return;}
  page=next;document.body.dataset.nutritionView=next;
  document.querySelectorAll('[data-nutrition-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nutritionView===page)));
  $('nutritionTitle').innerHTML=titles[page][0];$('nutritionSubtitle').textContent=titles[page][1];
  $('nutritionCoach').hidden=page!=='coach';$('nutritionSupport').hidden=page!=='support';
  $('nutritionToday').hidden=page!=='today'||!latest?.active;
  if(['coach','support'].includes(page)){$('workspace').hidden=true;$('wizard').hidden=true;}
  else navigate(page);
  if(page==='support')import('/nutrition-client-price.js?v=20261125.2').catch(()=>{});
 }
 document.querySelectorAll('[data-nutrition-view]').forEach(b=>b.onclick=()=>setPage(b.dataset.nutritionView));
 $('supportCheckin').onclick=()=>setPage('progress');
 $('supportAnswers').onclick=()=>{setPage('today');questionnaire();};
 function message(role,text){const el=document.createElement('div'),label=document.createElement('b');el.className='coach-message '+role;label.textContent=role==='user'?'YOU':'JT AI COACH';el.append(label,document.createTextNode(text));$('coachMessages').append(el);el.scrollIntoView({block:'nearest',behavior:'smooth'});}
 document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('coachQuestion').value=b.dataset.prompt;$('coachQuestion').focus();});
 $('nutritionCoachForm').onsubmit=async event=>{
  event.preventDefault();if(chatBusy)return;$('coachError').hidden=true;
  const text=$('coachQuestion').value.trim();if(!text)return;
  if(!member){$('coachError').textContent='JT AI Coach needs an active membership or trial. Use the membership link above to get started.';$('coachError').hidden=false;return;}
  if(!$('coachConsent').checked){$('coachError').textContent='Please agree to the AI support notice before sending.';$('coachError').hidden=false;return;}
  chatBusy=true;$('sendCoach').disabled=true;$('sendCoach').textContent='Thinking…';
  try{
   const result=await hubApi('performance-coach',{service:'nutrition',consent:true,message:text,history:history.slice(-8)});
   if(!result.answered||!result.answer)throw Error('Your coach could not respond just now. Please try again.');
   message('user',text);message('assistant',result.answer);history.push({role:'user',content:text},{role:'assistant',content:result.answer});history=history.slice(-8);$('coachQuestion').value='';
  }catch(error){$('coachError').textContent=error.message;$('coachError').hidden=false;}
  finally{chatBusy=false;$('sendCoach').disabled=false;$('sendCoach').textContent='Ask JT AI Coach';}
 };
 return{update(state,view,player){
  latest=state;
  if(!['coach','support'].includes(page)){page=view==='recipes'?'today':view;document.querySelectorAll('[data-nutrition-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nutritionView===page)));}
  if(["coach","support"].includes(page))$("workspace").hidden=true;
  document.querySelectorAll('[data-nutrition-view]').forEach(b=>b.disabled=false);
  const name=state.profile.first_name||state.profile.player_name?.split(' ')[0];
  $('nutritionGreeting').textContent=name?'YOUR NUTRITION · '+name.toUpperCase():'PERSONAL NUTRITION';
  const log=state.logs.find(x=>x.logged_on===state.today)?.data;
  $('nutritionToday').innerHTML=`<article><small>MEALS</small><strong>${(log?.done||[]).filter(x=>['breakfast','lunch','dinner','snack'].includes(x)).length}<span> / 4</span></strong><span>Checked in</span></article><article><small>HYDRATION</small><strong>${log?.water??'—'}<span> cups</span></strong><span>${log?.water!=null?'Logged today':'Log in Progress'}</span></article><article><small>ENERGY</small><strong>${log?.energy??'—'}<span> / 5</span></strong><span>${log?.energy!=null?'Your check-in':'Daily check-in'}</span></article>`;
  $('nutritionToday').hidden=page!=='today'||view!=='today'||!state.active;
  if(initial){initial=false;if(Object.hasOwn(titles,requestedView))queueMicrotask(()=>setPage(requestedView));}
  if(player!==access.user?.id){$('nutritionSubtitle').textContent='Viewing '+(state.profile.player_name||'this client')+'’s programme. JT AI Coach uses your own account’s nutrition context.';}
 }};
}
