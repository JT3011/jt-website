import {supabase, escapeHtml as esc, money} from '/performance-hub-integrations.js';
const $ = id => document.getElementById(id);
let state, registration, subscription, timer, loading = false, knownIds = null;
const date = iso => new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));
const notice = message => { $('notice').textContent=message; $('notice').hidden=!message; };
async function api(action, body) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session) throw Object.assign(new Error('Sign in with your JT account.'),{status:401});
  const response=await fetch('/api/hub-portal'+(body?'':'?action='+action),{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({action,...body})}:{})});
  const result=await response.json();
  if(!response.ok) throw Object.assign(new Error(result.error||'Please try again.'),{status:response.status});
  return result;
}
function lock(error) {
  clearInterval(timer); state=null; knownIds=null;
  $('workspace').hidden=true; $('signupList').replaceChildren();
  $('loading').hidden=true; $('login').hidden=error.status!==401;
  notice(error.message);
}
function render() {
  const search=$('search').value.trim().toLowerCase();
  const rows=state.signups.filter(row=>(row.client_name+' '+row.client_email).toLowerCase().includes(search));
  $('signupList').innerHTML=rows.length?rows.map(row=>`<article class="signup"><div><strong>${esc(row.client_name||'New subscriber')}</strong><p class="small muted email">${esc(row.client_email)}</p><p class="small muted">${esc(date(row.confirmed_at))}</p></div><div class="signup-right"><span class="badge">${row.subscription_status==='trialing'?'Trial confirmed':'Payment confirmed'}</span><p>${esc(money(row.amount_pence/100))}/month${row.subscription_status==='trialing'?' after trial':''}</p>${row.trial_end?`<p class="small muted">Trial ends ${esc(date(row.trial_end))}</p>`:''}<p class="small ${row.account_connected?'badge':'pending'}">${row.account_connected?'Hub account connected':'Hub account setup pending'}</p></div></article>`).join(''):`<p class="empty">${search?'No matching signups.':'New subscription confirmations will appear here. Only signups received after alerts were switched on are shown.'}</p>`;
}
async function refresh() {
  if(loading) return; loading=true;
  try {
    state=await api('signup-alerts');
    $('workspace').hidden=false; $('loading').hidden=true; $('login').hidden=true; $('signOut').hidden=false;
    $('checkoutLink').href=state.checkout_url;
    const fresh=knownIds&&state.signups.filter(row=>!knownIds.has(row.id));
    knownIds=new Set(state.signups.map(row=>row.id));
    if(fresh?.length) notice(`${fresh[0].client_name||fresh[0].client_email||'A client'} — subscription confirmed${fresh[0].subscription_status==='trialing'?' and trial started':''}.`);
    render(); $('liveStatus').textContent='Updated '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeStyle:'medium'}).format(new Date())+'. Updates automatically while open.';
  } catch(error) {
    if([401,403].includes(error.status)) lock(error);
    else {$('liveStatus').textContent='Updates paused. Reconnecting…';notice(error.message);}
  } finally {loading=false;}
}
function pushButtons(enabled) {
  $('enablePush').hidden=enabled; $('testPush').hidden=!enabled; $('disablePush').hidden=!enabled;
  $('enablePush').disabled=!registration||!state?.ready;
  $('pushStatus').textContent=enabled?'Notifications enabled on this device. Send a test to check delivery.':'Notifications are off on this device.';
}
async function preparePush() {
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(ios&&!standalone){$('installHelp').hidden=false;$('pushStatus').textContent='Add the Hub to your Home Screen to enable phone alerts.';return;}
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){$('pushStatus').textContent='This browser cannot receive push alerts. You can still watch confirmations on this page.';return;}
  if(!state.ready){$('pushStatus').textContent='Phone alerts are being configured. You can watch confirmations below.';return;}
  try{
    await navigator.serviceWorker.register('/service-worker.js',{scope:'/',updateViaCache:'none'});
    registration=await navigator.serviceWorker.ready;
    await registration.update();
    subscription=await registration.pushManager.getSubscription();
    const status=subscription?await api('signup-device-status',{endpoint:subscription.endpoint}):{enabled:false};
    pushButtons(status.enabled&&Notification.permission==='granted');
    if(Notification.permission==='denied'){$('enablePush').disabled=true;$('pushStatus').textContent='Notifications are blocked. Allow notifications for JT Hub in your device settings, then reopen this page.';}
  }catch(error){$('pushStatus').textContent=error.message;}
}
function keyBytes(key){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,char=>char.charCodeAt(0));}
$('enablePush').onclick=async()=>{
  if(!registration||!state?.public_key)return;
  $('enablePush').disabled=true;
  try {
    // Call subscribe directly from the tap, as required by Safari's user gesture rules.
    subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(state.public_key)});
    await api('signup-enable',{subscription:subscription.toJSON()});pushButtons(true);notice('Notifications enabled. Tap Send test alert to check this device.');
  }catch(error){notice(error.message||'Notifications could not be enabled.');$('enablePush').disabled=false;}
};
$('testPush').onclick=async()=>{if(!subscription)return;$('testPush').disabled=true;try{await api('signup-test',{endpoint:subscription.endpoint});notice('Test sent. Check for a JT notification on this device.');}catch(error){notice(error.message);if(error.status===410)pushButtons(false);}finally{$('testPush').disabled=false;}};
$('disablePush').onclick=async()=>{if(!subscription)return;try{await api('signup-disable',{endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;pushButtons(false);notice('Notifications turned off on this device.');}catch(error){notice(error.message);}};
$('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(state.checkout_url);notice('Signup link copied — 30 days free, then £12.99/month.');}catch{notice('Copy this link: '+state.checkout_url);}};
$('shareLink').hidden=!navigator.share;
$('shareLink').onclick=async()=>{try{await navigator.share({title:'JT Performance Hub',text:'Join the JT Performance Hub — 30 days free, then £12.99/month.',url:state.checkout_url});}catch(error){if(error.name!=='AbortError')notice('Sharing is unavailable. Use Copy signup link.');}};
$('search').oninput=()=>state&&render();
$('refresh').onclick=refresh;
$('signOut').onclick=async()=>{await supabase.auth.signOut();lock(Object.assign(new Error('Signed out.'),{status:401}));$('signOut').hidden=true;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state)refresh();});
supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')lock(Object.assign(new Error('Sign in with your JT account.'),{status:401}));});
async function start(){await refresh();if(state){await preparePush();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh();},5000);}}
$('loginForm').onsubmit=async event=>{event.preventDefault();$('loginButton').disabled=true;try{const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';notice('');await start();}catch(error){notice(error.message);}finally{$('loginButton').disabled=false;}};
start();
