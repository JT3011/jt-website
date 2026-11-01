import {hubApi,escapeHtml as e,ukDate} from '/performance-hub-integrations.js';
export const zoneDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const time=iso=>ukDate(iso,{hour:'2-digit',minute:'2-digit'});
const active=event=>!['cancelled','canceled'].includes(event.status);
const shift=(day,n)=>new Date(Date.parse(`${day}T12:00:00Z`)+n*86400000).toISOString().slice(0,10);
const bookingLink=value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='calendly.com'?u.href:null;}catch{return null;}};
function sessionRow(event,parent=false){
  const credits=event.credit?.credits||[],balances=new Map();
  for(const c of credits){const label=c.service||'Sessions',prior=balances.get(label)||{remaining:0,unknown:false};if(typeof c.remaining==='number')prior.remaining+=c.remaining;else prior.unknown=true;balances.set(label,prior);}
  return `<article class="cal-row ${!active(event)?'cal-cancelled':''}"><time datetime="${e(event.start)}">${time(event.start)}<small>to ${time(event.end)}</small></time><div class="cal-detail"><div class="cal-row-top"><strong>${e(parent?event.name:event.players?.join(' & ')||event.name)}</strong><span class="cal-tag">${!active(event)?'Cancelled':event.needs_link?'JT review':event.account_pending?'Matched':e(event.status.replace('_',' '))}</span></div>${!parent?`<p>${e(event.name)}</p>`:''}<p>${e(event.coach)}${event.venue?` · ${e(event.venue)}`:''}</p>${balances.size?`<p class="cal-credit">${[...balances].map(([label,c])=>`${e(label)}: <b>${c.unknown?'Under review':e(c.remaining)+' left'}</b>`).join(' · ')}</p><small class="cal-muted">Saved balance · ${ukDate(event.credit.synced_at,{day:'numeric',month:'short'})}</small>`:''}<div class="cal-actions">${event.session_id||event.source==='Calendly'?`<a class="cal-link cal-plan-link" href="/performance-hub-plans.html?${event.source==='Calendly'?'booking='+encodeURIComponent(event.id):'session='+encodeURIComponent(event.session_id)}">Session plan</a>`:''}${event.player_id&&!parent?`<a class="cal-link" href="/performance-hub-portal.html?player=${encodeURIComponent(event.player_id)}">Player</a>`:''}${event.session_id&&!parent?`<a class="cal-link" href="/performance-hub-coach-dashboard.html?day=${zoneDay(new Date(event.start))}&session=${encodeURIComponent(event.session_id)}">${event.status==='completed'?'Session log':'Log session'} ↗</a>`:''}${parent&&bookingLink(event.booking_url)?`<a class="cal-link" href="${e(bookingLink(event.booking_url))}" target="_blank" rel="noopener noreferrer">Book with coach ↗</a>`:''}${event.needs_link?'<span class="cal-muted">Player match needs review.</span>':''}</div></div></article>`;
}
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${name==='refresh'?'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/>':`<path d="${name==='prev'?'m14 7-5 5 5 5':'m10 7 5 5-5 5'}"/>`}</svg>`;
function dateControls(){return `<div class="cal-toolbar"><div class="cal-date-group"><button type="button" class="cal-button cal-step" data-cal-prev aria-label="Previous day">${icon('prev')}</button><label class="cal-date-picker"><span class="cal-date-text" data-cal-date-text aria-hidden="true"></span><input data-cal-day type="date" aria-label="Choose a day" value="${zoneDay()}"></label><button type="button" class="cal-button cal-step" data-cal-next aria-label="Next day">${icon('next')}</button></div><button type="button" class="cal-button cal-today" data-cal-today>Today</button><button type="button" class="cal-button cal-refresh" data-cal-refresh aria-label="Refresh sessions" title="Refresh sessions">${icon('refresh')}</button></div>`;}
function syncDate(root){
  const input=root.querySelector('[data-cal-day]');
  if(!input.value)input.value=zoneDay();
  const day=input.value+'T12:00:00Z';
  root.querySelector('[data-cal-date-text]').textContent=ukDate(day,{weekday:'short',day:'numeric',month:'short'});
  root.querySelector('[data-cal-year]').textContent=input.value.slice(0,4);
}
function calendarState(root,state){
  root.dataset.state=state;root.setAttribute('aria-busy',String(state==='loading'));
  root.querySelector('[data-cal-refresh]').disabled=state==='loading';
  const coach=root.querySelector('[data-cal-coach]');
  if(coach)coach.disabled=state==='loading'||!root.dataset.coachesReady;
}
function wireDates(root,load){
  const q=s=>root.querySelector(s),reload=(refresh=false)=>{syncDate(root);load(refresh);};
  syncDate(root);
  const input=q('[data-cal-day]');
  const openPicker=()=>{if(typeof input.showPicker==='function'){try{input.showPicker();}catch{ /* Native keyboard entry remains available. */ }}};
  input.addEventListener('click',openPicker);
  input.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&typeof input.showPicker==='function'){event.preventDefault();openPicker();}});
  input.onchange=()=>reload();q('[data-cal-refresh]').onclick=()=>reload(true);
  q('[data-cal-today]').onclick=()=>{q('[data-cal-day]').value=zoneDay();reload();};
  for(const[selector,n]of[['prev',-1],['next',1]])q(`[data-cal-${selector}]`).onclick=()=>{q('[data-cal-day]').value=shift(q('[data-cal-day]').value||zoneDay(),n);reload();};
}
function renderLists(root,data,parent=false){
  const q=s=>root.querySelector(s),events=data.events||[],day=q('[data-cal-day]').value;
  const today=events.filter(x=>zoneDay(new Date(x.start))===day),upcoming=events.filter(x=>zoneDay(new Date(x.start))>day);
  q('[data-cal-heading]').textContent=ukDate(`${day}T12:00:00Z`,{weekday:'long',day:'numeric',month:'long'});
  q('[data-cal-timeline]').innerHTML=today.map(x=>sessionRow(x,parent)).join('')||'<p class="cal-empty">No sessions on this day.</p>';
  let last='';q('[data-cal-upcoming]').innerHTML=upcoming.map(x=>{const date=zoneDay(new Date(x.start)),heading=date!==last?`<h4 class="cal-day">${ukDate(x.start,{weekday:'long',day:'numeric',month:'short'})}</h4>`:'';last=date;return heading+sessionRow(x,parent);}).join('')||'<p class="cal-empty">No upcoming sessions.</p>';
  q('[data-cal-counts]').innerHTML=`<div><b>${today.filter(active).length}</b><span>On this day</span></div><div><b>${upcoming.filter(active).length}</b><span>Upcoming</span></div>${!parent&&events.some(x=>x.needs_link&&active(x))?`<div><b>${events.filter(x=>x.needs_link&&active(x)).length}</b><span>To review</span></div>`:''}`;
}
const columns='<div class="cal-loading-state" aria-hidden="true"><div><i></i><span></span><span></span></div><div><i></i><span></span><span></span></div></div><div class="cal-stats" data-cal-counts></div><div class="cal-grid"><section><h3 data-cal-heading>Your day</h3><div class="cal-list" data-cal-timeline></div></section><section><h3>Next sessions</h3><div class="cal-list" data-cal-upcoming></div></section></div>';
export function mountPlayerSchedule(root,player,{name,staff=false,scheduleLabel='Coaching sessions'}={}){
  root.classList.add('jt-schedule','cal-family','cal-premium');root.innerHTML=`<div class="cal-heading-row"><h2>Sessions</h2><span class="cal-timezone"><span data-cal-year></span><i aria-hidden="true">·</i>UK time</span></div>${staff?`<p><a class="cal-link" href="/performance-hub-portal.html">← ${e(scheduleLabel)}</a></p>`:''}${dateControls()}<div class="cal-status" role="status" aria-live="polite" data-cal-status></div>${columns}<details class="hub-help"><summary>Missing a booking?</summary><p>Ask JT to connect the email used in Calendly to this player.</p></details>`;
  let sequence=0;
  async function load(){
    const version=++sequence;calendarState(root,'loading');
    root.querySelector('[data-cal-status]').textContent='Loading sessions…';
    try{
      const query=new URLSearchParams({action:'player',player,day:root.querySelector('[data-cal-day]').value});
      const data=await hubApi('coach-schedule',null,`?${query}`);
      if(version!==sequence||!root.isConnected)return;
      renderLists(root,data,true);calendarState(root,'ready');
      root.querySelector('[data-cal-status]').textContent=data.synced_at?'Updated '+ukDate(data.synced_at,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Waiting for a booking update.';
    }catch(error){if(version!==sequence||!root.isConnected)return;calendarState(root,'error');root.querySelector('[data-cal-status]').textContent=error.message;}
  }
  wireDates(root,load);load();
}
export function mountCoachSchedule(root){
  root.classList.add('jt-schedule','cal-premium');root.innerHTML=`<div class="cal-heading-row"><h2>Schedule</h2><span class="cal-timezone"><span data-cal-year></span><i aria-hidden="true">·</i>UK time</span></div><div class="cal-controls"><div class="cal-coach-select"><label><span class="cal-field-label">Coach</span><select data-cal-coach disabled><option value="">Loading…</option></select></label><button class="cal-button" data-cal-mine hidden>My sessions</button></div>${dateControls()}</div><div class="cal-status" role="status" aria-live="polite" data-cal-status>Loading your private schedule…</div>${columns}<details class="cal-calendar-links"><summary>Booking links</summary><a class="cal-link" data-cal-booking hidden target="_blank" rel="noopener noreferrer">Booking link ↗</a><a class="cal-link" href="https://calendly.com/app/scheduled_events/user/me" target="_blank" rel="noopener noreferrer">Open Calendly ↗</a></details><div data-cal-linking></div><div data-cal-coach-accounts></div><details class="cal-setup"><summary>Calendar settings</summary><p>Connect Calendly for automatic booking updates. JT sees the team; each coach sees their own sessions. Use a Calendly account with access to the calendars you want to sync.</p><form data-cal-connect><label>Calendly personal access token<input name="token" type="password" required maxlength="5000" autocomplete="off" placeholder="Paste token securely"></label><p>Create a token in Calendly → Integrations & apps → API & webhooks. Include scheduled_events:read, users:read, organizations:read, webhooks:read and webhooks:write. The token is encrypted on the server.</p><button class="cal-button" type="submit">Connect Calendly</button><p class="cal-connect-status" role="status"></p></form></details><details data-airtable-setup hidden><summary>Credit settings</summary><p>JT’s Airtable base stays the source of truth. Connect a token with data.records:read access to that base so parents see the latest saved balances.</p><form data-airtable-connect><label>Airtable personal access token<input name="token" type="password" required maxlength="5000" autocomplete="off"></label><button class="cal-button" type="submit">Connect credit balances</button><p role="status"></p></form></details>`;
  const q=s=>root.querySelector(s);let sequence=0;
  const dayFromUrl=new URLSearchParams(location.search).get('day');if(/^\d{4}-\d{2}-\d{2}$/.test(dayFromUrl||''))q('[data-cal-day]').value=dayFromUrl;
  function linking(data){
    const items=data.needs_link||[];q('[data-cal-linking]').innerHTML=items.length?`<details class="cal-review"><summary>${items.length} booking${items.length===1?' needs':'s need'} linking · JT review</summary><p>These names need a check. Choose the player and the coach delivering the session. For a shared family email, leave “Remember email” off and link each booking to the correct child.</p>${items.map(x=>`<form class="cal-link-form" data-booking="${e(x.id)}"><h4>${e(x.name)} · ${ukDate(x.start,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</h4><p>${e(x.event)}<br>${e(x.email)}</p>${x.reason==='coach_not_linked'?'<p>Choose the coach who will deliver this session. A missing coach needs an approved Hub account first — use Coach access below.</p>':''}<div class="cal-form-grid"><label>Player<select name="player" required><option value="">Choose player</option>${data.players.map(p=>`<option value="${e(p.id)}" ${p.id===x.player?'selected':''}>${e(p.name)}</option>`).join('')}</select></label><label>Delivering coach<select name="coach" required><option value="">Choose coach</option>${(data.link_coaches||data.coaches).map(c=>`<option value="${e(c.id)}" ${c.id===x.coach?'selected':''}>${e(c.name)}</option>`).join('')}</select></label></div><label class="cal-check"><input name="remember_email" type="checkbox">Remember this email for this player</label><label class="cal-check"><input name="remember_coach" type="checkbox">Use this coach for future “${e(x.event)}” bookings</label><button class="cal-button" type="submit">Link booking</button><p class="cal-form-status" role="status"></p></form>`).join('')}</details>`:'';
    for(const form of root.querySelectorAll('.cal-link-form'))form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Linking booking…';try{await hubApi('coach-schedule',{action:'link',booking:form.dataset.booking,player:form.elements.player.value,coach:form.elements.coach.value,remember_email:form.elements.remember_email.checked,remember_coach:form.elements.remember_coach.checked});await load();}catch(error){status.textContent=error.message;button.disabled=false;}};
  }
  function coachAccounts(data){
    const rows=data.coach_accounts||[];
    q('[data-cal-coach-accounts]').innerHTML=data.owner?`<details class="cal-coach-access"><summary>Coach access</summary><p>Manage coach logins and booking links.</p>${rows.map(c=>`<form class="cal-account-form" data-calendar="${e(c.id)}"><h4>${e(c.name)}</h4><p class="cal-access-state">${c.account_status==='ready'?'Hub login connected':c.account_status==='awaiting_signup'?'Email approved · waiting for verified Hub sign-up':'Add this coach’s Hub login email'}</p><a class="cal-link" href="${e(bookingLink(c.booking_url))}" target="_blank" rel="noopener noreferrer">Booking link ↗</a>${c.account_status==='ready'?`<p>${e(c.email)}</p>`:`<label>Coach’s login email<input name="email" type="email" value="${e(c.email)}" required maxlength="254" autocomplete="off"></label><button class="cal-button" type="submit">Save coach login</button><p>They sign up or sign in at <a class="cal-link" href="/performance-hub-coach-access.html">Coach access</a> with this email and verify it. No invitation email is sent.</p>`}<p role="status"></p></form>`).join('')}</details>`:'';
    for(const form of root.querySelectorAll('.cal-account-form'))form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Saving coach access…';try{const r=await hubApi('coach-schedule',{action:'coach-login',calendar:form.dataset.calendar,email:form.elements.email.value});status.textContent=r.connected?'Coach login connected.':'Email approved. The coach can now sign up and verify their email.';button.textContent='Saved';}catch(error){status.textContent=error.message;button.disabled=false;}};
    q('[data-cal-mine]').hidden=!data.owner;
    q('[data-cal-mine]').onclick=()=>{const own=rows.find(c=>c.id==='jt');if(own){q('[data-cal-coach]').value=own.id;load();}};
  }
  async function load(refresh=false){
    const version=++sequence,day=q('[data-cal-day]').value||zoneDay(),coach=q('[data-cal-coach]').value;
    calendarState(root,'loading');q('[data-cal-status]').textContent='Loading schedule…';
    try{
      const query=new URLSearchParams({day,...(coach?{coach}:{}),...(refresh?{refresh:'1'}:{})});const data=await hubApi('coach-schedule',null,`?${query}`);if(version!==sequence||!root.isConnected)return;
      q('[data-cal-coach]').innerHTML=(data.manager?'<option value="all">All coaches</option>':'')+data.coaches.map(c=>`<option value="${e(c.id)}">${e(c.name)}</option>`).join('');q('[data-cal-coach]').value=data.selected;root.dataset.coachesReady='true';
      q('[data-cal-status]').textContent=[data.warning||(data.automatic?'Automatic updates on':'Calendar refreshes every 5 minutes'),data.synced_at?`${data.stale?'Saved':'Checked'} ${ukDate(data.synced_at,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}.`:''].filter(Boolean).join(' ');
      const url=bookingLink(data.booking_url);q('[data-cal-booking]').hidden=!url;if(url)q('[data-cal-booking]').href=url;
      q('[data-airtable-setup]').hidden=!data.owner;renderLists(root,data);linking(data);coachAccounts(data);calendarState(root,'ready');
      window.dispatchEvent(new CustomEvent('jt-calendar-day',{detail:{day,sessionIds:data.selected==='all'?null:data.events.map(x=>x.session_id).filter(Boolean)}}));
    }catch(error){if(version!==sequence||!root.isConnected)return;calendarState(root,'error');q('[data-cal-status]').textContent=error.message;if(!root.dataset.coachesReady)q('[data-cal-coach]').innerHTML='<option value="">Unavailable</option>';}
  }
  wireDates(root,load);q('[data-cal-coach]').onchange=()=>load();
  for(const[selector,endpoint,label]of[['data-cal-connect','coach-schedule','Calendly'],['data-airtable-connect','hub-airtable','Airtable']])q(`[${selector}]`).onsubmit=async event=>{event.preventDefault();const form=event.target,token=form.elements.token.value,button=form.querySelector('button'),status=form.querySelector('[role="status"]');form.elements.token.value='';button.disabled=true;status.textContent=`Verifying ${label}…`;try{const result=await hubApi(endpoint,{action:'connect',token});status.textContent=result.warning||`${label} connected.`;await load(true);}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
  load();const timer=setInterval(()=>{if(root.isConnected&&!root.hidden&&!document.hidden&&!root.querySelector('.cal-link-form:focus-within')&&!root.querySelector('.cal-review[open]')&&!root.querySelector('.cal-coach-access[open]'))load();},300000);
  return ()=>{++sequence;clearInterval(timer);};
}
for(const root of document.querySelectorAll('[data-coach-schedule]'))mountCoachSchedule(root);
