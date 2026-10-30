import { supabase } from '/performance-hub-free-access.js?v=2';
import {mountPlayerSchedule,mountCoachSchedule} from '/performance-hub-coach-schedule.js?v=20261030-unlinked';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(value)) : '';
const time = value => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(value)) : '';
const number = n => new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(n);
let overview, selected, current, accessData, loadVersion = 0;
let signingOut = false;
let stopCoachSchedule;
const isStaff = () => ['owner','admin','coach'].includes(overview?.role);
function showWorkspace(view) {
  const sessions = view==='sessions' && isStaff();
  $('teamCalendar').hidden=!sessions;
  $('portal').hidden=sessions;
  $('sessionsView').setAttribute('aria-pressed',String(sessions));
  $('playersView').setAttribute('aria-pressed',String(!sessions));
  if(sessions) {
    history.replaceState(null,'','/performance-hub-portal.html');
    if(!stopCoachSchedule) stopCoachSchedule=mountCoachSchedule($('teamCalendar'));
  } else if(selected) {
    history.replaceState(null,'',`?player=${encodeURIComponent(selected)}`);
  } else if(overview.players[0]) {
    openPlayer(overview.players[0].id);
  } else {
    $('record').innerHTML='<div class="empty">No player records are connected yet.</div>';
  }
}
$('sessionsView').addEventListener('click',()=>showWorkspace('sessions'));
$('playersView').addEventListener('click',()=>showWorkspace('players'));
function notice(message,error=false) { $('notice').textContent=message; $('notice').hidden=!message; $('notice').classList.toggle('error',error); }
async function api(action, payload, query={}) {
  const {data,error} = await supabase.auth.getSession();
  if (error || !data.session) { location.replace('/performance-hub-login.html'); throw new Error('Please sign in.'); }
  const params = new URLSearchParams({action,...query});
  const response = await fetch(`/api/hub-portal?${params}`,{method:payload?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify({action,...payload}):undefined});
  let result;
  try { result=await response.json(); } catch { throw new Error('The coaching portal is temporarily unavailable. Please try again.'); }
  if (response.status===401) { await supabase.auth.signOut(); location.replace('/performance-hub-login.html'); }
  if (!response.ok) throw new Error(result.error||'Unable to complete that request.');
  return result;
}
function renderPlayers() {
  const query=$('playerSearch').value.trim().toLowerCase();
  const players=overview.players.filter(p=>p.name.toLowerCase().includes(query));
  $('playerList').innerHTML=players.length ? players.map(p=>`<button class="player-button" data-player="${esc(p.id)}" aria-pressed="${p.id===selected}"><span class="avatar">${esc(p.name.split(/\s+/).slice(0,2).map(n=>n[0]).join(''))}</span><span><strong>${esc(p.name)}</strong><small>${p.isSelf?'My player profile':p.canEdit?'Coaching record':'View your record'}</small></span></button>`).join('') : '<p class="muted small">No players match that name.</p>';
  $('playerList').querySelectorAll('[data-player]').forEach(b=>b.addEventListener('click',()=>openPlayer(b.dataset.player)));
}
function creditsHtml(data) {
  const entries=data.credit?.credits || [];
  const grouped=new Map();
  for (const entry of entries) {
    const key=entry.service || 'Coaching sessions';
    const group=grouped.get(key)||{remaining:0,unknown:false};
    if (typeof entry.remaining==='number' && Number.isFinite(entry.remaining)) group.remaining+=entry.remaining; else group.unknown=true;
    grouped.set(key,group);
  }
  let content;
  if (grouped.size) content=`<div class="credit-grid">${[...grouped].map(([service,g])=>`<div class="credit-block"><p>${esc(service)}</p><div class="balance"><b>${g.unknown?'—':number(g.remaining)}</b><span>${g.unknown?'Balance under review':'sessions remaining'}</span></div>${!g.unknown&&g.remaining<0?'<p>Please contact JT to review your session balance.</p>':''}</div>`).join('')}</div>`;
  else content=`<p class="muted">${data.syncStatus==='unlinked'?'JT is connecting your session balance. It will appear here once your record is linked.':'No linked session balance yet. JT can check the payment link in Airtable.'}</p>`;
  const states={unlinked:'Awaiting connection',connection_pending:'Saved Airtable balance',unavailable:'Last saved balance · updates unavailable',live:'Connected to Airtable',cached:'Connected to Airtable'};
  return `<section class="panel credits-panel"><div class="section-head"><p class="eyebrow">Your session credits</p><span class="tag">Read only</span></div>${content}<p class="credit-note">${esc(states[data.syncStatus]||'Balance pending')}${data.credit?.synced_at?` · Synced ${esc(time(data.credit.synced_at))} (UK time)`:''}. Balances are managed by JT.</p>${data.syncStatus==='connection_pending'?'<p class="credit-note">Automatic updates are awaiting connection. Contact JT to confirm a recent payment or session.</p>':''}</section>`;
}
function programmeHtml(kind) {
  const programme=current.programmes.find(p=>p.kind===kind);
  const title=kind==='gym'?'Your gym programme.':'Your nutrition programme.';
  return `<article class="panel plan"><div class="plan-top"><span class="plan-icon">${kind==='gym'?'01 / TRAIN':'02 / FUEL'}</span>${programme?`<span class="tag">${programme.status==='draft'?'Draft':'Personal plan'}</span>`:''}</div><h3>${esc(programme?.title||title)}</h3>${programme?`${programme.goal?`<p class="plan-goal">${esc(programme.goal)}</p>`:''}<div class="plan-dates">${programme.starts_on?`<span>Starts ${esc(date(programme.starts_on))}</span>`:''}${programme.review_on?`<span>Review ${esc(date(programme.review_on))}</span>`:''}</div><div class="plan-content">${esc(programme.content)}</div><p class="small muted">Updated ${esc(date(programme.updated_at))}</p>`:`<p class="plan-empty">${current.canEdit?'Create an individual plan for this player. Save a draft while you work, then publish it for the player and parent.':'Your coach will add your personal programme here. Once shared, you and your connected parent can open it any time.'}</p>`}${current.canEdit?`<button class="button outline small" data-edit="${kind}">${programme?'Edit programme':'Create programme'}</button>`:''}</article>`;
}
async function openPlayer(id,refresh=false) {
  selected=id; current=null; const version=++loadVersion;
  renderPlayers(); $('record').innerHTML='<div class="empty">Loading player information…</div>';
  history.replaceState(null,'',`?player=${encodeURIComponent(id)}`);
  try {
    const data=await api('player',null,{player:id,...(refresh?{refresh:'1'}:{})});
    if (version!==loadVersion || signingOut) return;
    current=data;
    $('record').innerHTML=`<div class="record-head"><div><p class="eyebrow">The next step starts here</p><h2>${esc(current.profile.name)}</h2><p class="muted small">${esc([current.profile.primary_position,current.profile.playing_level].filter(Boolean).join(' · '))}</p></div><span class="tag">${current.canEdit?'Coach access':'Player & parent view'}</span></div>${creditsHtml(current)}${current.airtableUrl?`<p><a class="button outline small" target="_blank" rel="noopener noreferrer" href="${esc(current.airtableUrl)}">Update credits in Airtable ↗</a></p><p class="small muted">Update the linked payment’s Completed +1 value after delivery, then refresh this record. Booking a session does not deduct credits.</p>`:''}<div class="record-links"><a class="button outline small" href="/performance-hub-plans.html?player=${encodeURIComponent(id)}">Session plans ↗</a><a class="button outline small" href="/performance-hub-sessions.html?player=${encodeURIComponent(id)}">Session history & feedback ↗</a><button class="button outline small" id="refreshRecord">Refresh record</button></div>${current.profile.development_goal?`<p class="muted">Current focus: ${esc(current.profile.development_goal)}</p>`:''}<section id="playerCalendar"></section><div class="plan-grid">${programmeHtml('gym')}${programmeHtml('nutrition')}</div>`;
    $('record').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));
    $('refreshRecord').addEventListener('click',()=>openPlayer(selected,true));
    mountPlayerSchedule($('playerCalendar'),id,{name:current.profile.name,staff:isStaff(),scheduleLabel:$('sessionsView').textContent});
  } catch(error) {
    if(version!==loadVersion) return;
    $('record').innerHTML=`<div class="empty"><p>${esc(error.message)}</p><button class="button outline small" id="retryPlayer">Try again</button></div>`;
    $('retryPlayer').addEventListener('click',()=>openPlayer(id));
  }
}
function openEditor(kind) {
  const p=current.programmes.find(p=>p.kind===kind)||{};
  $('programmeForm').reset(); $('programmeError').textContent='';
  $('programmeKind').value=kind; $('programmePlayerId').value=selected;
  $('programmeType').textContent=`Personal ${kind} programme`;
  $('programmeHeading').textContent=p.id?'Refine the plan.':'Create a plan.';
  $('programmePlayer').textContent=`For ${current.profile.name}`;
  for (const [id,value] of Object.entries({programmeTitle:p.title,programmeGoal:p.goal,programmeContent:p.content,programmeStart:p.starts_on,programmeReview:p.review_on,programmeStatus:p.status||'draft'})) $(id).value=value||'';
  $('programmeDialog').showModal(); $('programmeTitle').focus();
}
$('programmeForm').addEventListener('submit',async event=>{
  event.preventDefault(); $('saveProgramme').disabled=true; $('programmeError').textContent='';
  try {
    await api('save-programme',{player:$('programmePlayerId').value,kind:$('programmeKind').value,title:$('programmeTitle').value,goal:$('programmeGoal').value,content:$('programmeContent').value,starts_on:$('programmeStart').value,review_on:$('programmeReview').value,status:$('programmeStatus').value});
    $('programmeDialog').close(); notice('Programme saved.'); await openPlayer(selected);
  } catch(error){$('programmeError').textContent=error.message;} finally {$('saveProgramme').disabled=false;}
});
const accountLabel=a=>`${a.name==='Player'?'':a.name+' · '}${a.email}`;
const options=(items,value,label,placeholder)=>`<option value="">${esc(placeholder)}</option>`+items.map(i=>`<option value="${esc(value(i))}">${esc(label(i))}</option>`).join('');
async function loadAccess() {
  $('accessContent').innerHTML='<p class="muted">Loading account connections…</p>';
  accessData=await api('access');
  const players=overview.players;
  const playerOptions=options(players,p=>p.id,p=>p.name,'Choose a player');
  const accountOptions=options(accessData.accounts,a=>a.id,accountLabel,'Choose a verified account');
  const linked=[...accessData.coaches.map(l=>({...l,account:l.coach_user_id,kind:'coach'})),...accessData.parents.map(l=>({...l,account:l.parent_user_id,kind:'parent'}))];
  const label=id=>accountLabel(accessData.accounts.find(a=>a.id===id)||{name:'Player',email:'Account'});
  $('accessContent').innerHTML=`
    <section class="access-section"><h3>1. Approve a coach</h3><p class="muted small">Existing members keep their password. New coaches activate their approved email at the coach login. Share the link personally.</p>
      <form id="coachForm"><div class="form-grid"><div><label for="coachName">Coach name</label><input id="coachName" required maxlength="100"></div><div><label for="coachEmail">Coach email</label><input id="coachEmail" type="email" required maxlength="254"></div></div><button class="button small" type="submit">Approve coach</button></form>
      <p class="small"><a href="/performance-hub-coach-access.html">Open coach login ↗</a></p>
      <div class="access-list">${accessData.accounts.filter(a=>['owner','admin','coach'].includes(a.role)).map(a=>`<div class="access-row"><span>${esc(accountLabel(a))}<br><span class="muted">${esc(a.role)}</span></span></div>`).join('')}${accessData.invites.map(i=>`<div class="access-row"><span>${esc(i.display_name)} · ${esc(i.email)}<br><span class="muted">Awaiting activation</span></span></div>`).join('')}</div>
    </section>
    <section class="access-section"><h3>2. Connect a coach or parent</h3><p class="muted small">Parents see only the players you connect. Coaches can manage programmes and sessions for their assigned players. A parent already using their child’s profile does not need a second link.</p>
      <form id="connectionForm"><label for="accessPlayer">Player record</label><select id="accessPlayer" required>${playerOptions}</select><label for="accessAccount">Account to connect</label><select id="accessAccount" required>${accountOptions}</select><label for="accessKind">Access</label><select id="accessKind"><option value="parent">Parent · view only</option><option value="coach">Coach · manage programmes & sessions</option></select><button class="button small" type="submit">Connect account</button></form>
      <p class="muted small">Missing an account? Ask them to create and confirm a free Hub account first.</p>
      <div class="access-list">${linked.map((l,i)=>`<div class="access-row"><span>${esc(label(l.account))}<br><span class="muted">${esc(l.kind)} for ${esc(players.find(p=>p.id===l.player_user_id)?.name||'Player')}</span></span><button type="button" data-unlink="${i}">Remove</button></div>`).join('')||'<p class="small muted">No separate coach or parent connections yet.</p>'}</div>
    </section>
    <section class="access-section"><h3>3. Connect session credits</h3><p class="muted small">Match the player to their exact Airtable record. Balances use the linked Payments records and remain read-only in the Hub. Check identity before linking; names may repeat.</p>
      <form id="airtableForm"><label for="creditPlayer">Hub player</label><select id="creditPlayer" required>${playerOptions}</select><label for="creditRecord">Airtable player</label><select id="creditRecord" required>${options(accessData.airtablePlayers,a=>a.airtable_record_id,a=>`${a.display_name} · ${a.airtable_record_id}`,'Choose the matching Airtable player')}</select><button class="button small" type="submit">Save credit connection</button></form>
      <div class="access-list">${accessData.links.map(l=>`<div class="access-row"><span>${esc(players.find(p=>p.id===l.player_user_id)?.name||'Player')} → ${esc(accessData.airtablePlayers.find(a=>a.airtable_record_id===l.airtable_record_id)?.display_name||'Airtable record')}</span></div>`).join('')}</div>
      <p class="small muted">${overview.airtableConfigured?'Balances refresh when a player opens their record, at most once every five minutes.':'Automatic updates need AIRTABLE_READ_TOKEN in the website’s Vercel environment. Use a token with data.records:read access to the Client Profile base. Saved balances stay labelled with the sync date.'}</p>
      <button class="button outline small" id="syncAirtable" type="button">Sync all Airtable balances</button>
    </section>`;
  $('accessPlayer').value=selected||''; $('creditPlayer').value=selected||'';
  function selectCredit(){ $('creditRecord').value=accessData.links.find(l=>l.player_user_id===$('creditPlayer').value)?.airtable_record_id||''; }
  selectCredit(); $('creditPlayer').addEventListener('change',selectCredit);
  const submit=(form,action,payload,success)=>$(form).addEventListener('submit',e=>{e.preventDefault();runAccess($(form).querySelector('button'),action,payload(),success);});
  submit('coachForm','grant-coach',()=>({name:$('coachName').value,email:$('coachEmail').value}),'Coach approved.');
  submit('connectionForm','link-access',()=>({player:$('accessPlayer').value,account:$('accessAccount').value,kind:$('accessKind').value,active:true}),'Account connected.');
  submit('airtableForm','link-airtable',()=>({player:$('creditPlayer').value,record:$('creditRecord').value}),'Airtable record connected.');
  $('accessContent').querySelectorAll('[data-unlink]').forEach(b=>b.addEventListener('click',()=>{const l=linked[Number(b.dataset.unlink)];runAccess(b,'link-access',{player:l.player_user_id,account:l.account,kind:l.kind,active:false},'Connection removed.');}));
  $('syncAirtable').addEventListener('click',()=>runAccess($('syncAirtable'),'sync-airtable',{},'Balances updated.'));
}
async function runAccess(button,action,payload,success) {
  button.disabled=true; $('accessNotice').textContent='Saving…'; $('accessNotice').className='';
  try { const result=await api(action,payload); await loadAccess(); $('accessNotice').textContent=result.message||success; if(selected) await openPlayer(selected); }
  catch(error){$('accessNotice').textContent=error.message;$('accessNotice').className='error';}
  finally {button.disabled=false;}
}
$('manageAccess').addEventListener('click',async()=>{ $('accessDialog').showModal(); $('accessNotice').textContent=''; try{await loadAccess();}catch(error){$('accessContent').textContent=error.message;} });
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
function clearWorkspace() { stopCoachSchedule?.(); signingOut=true; ++loadVersion; $('portal').hidden=true; $('teamCalendar').hidden=true; $('teamCalendar').replaceChildren(); $('workspaceViews').hidden=true; $('record').replaceChildren(); }
$('signOut').addEventListener('click',async()=>{ clearWorkspace(); await supabase.auth.signOut(); location.replace('/performance-hub-login.html'); });
$('playerSearch').addEventListener('input',renderPlayers);
supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){ clearWorkspace(); location.replace('/performance-hub-login.html'); }});
async function init() {
  try {
    overview=await api('overview'); $('loading').hidden=true;
    $('trainingLink').href=overview.trainingUrl;
    $('coachLink').hidden=!isStaff(); $('manageAccess').hidden=overview.role!=='owner'; $('ownerActions').hidden=overview.role!=='owner';
    $('workspaceViews').hidden=!isStaff();
    $('sessionsView').textContent=['owner','admin'].includes(overview.role)?'All team sessions':'My coaching sessions';
    $('trainingLink').textContent=overview.role==='client'?'Training Hub':'My player Hub';
    $('roleLabel').textContent=overview.role==='owner'?'JT · Team overview':overview.role==='coach'?'JT · Coach workspace':'JT · My coaching';
    $('welcome').textContent=overview.role==='owner'?'Every coach’s sessions, with player records one tap away.':overview.role==='client'?'Your session credits and personal programmes, all in one place.':'Your coaching sessions, players and programmes in one place.';
    if (overview.players.length===1 && overview.role==='client') {
      document.querySelector('.roster').hidden=true;
      $('portal').style.gridTemplateColumns='1fr';
    }
    renderPlayers();
    const requested=new URLSearchParams(location.search).get('player');
    const requestedPlayer=overview.players.find(p=>p.id===requested);
    if(isStaff()&&!requestedPlayer) { showWorkspace('sessions'); return; }
    $('portal').hidden=false; $('playersView').setAttribute('aria-pressed','true');
    const initial=requestedPlayer||overview.players[0];
    if(initial) await openPlayer(initial.id); else $('record').innerHTML='<div class="empty">Your account is ready. JT can now connect your player record. <a href="/performance-hub-free.html">Open the Training Hub</a>.</div>';
  } catch(error) { $('loading').innerHTML=`<p>${esc(error.message)}</p><button class="button outline small" id="retryPortal">Try again</button> <a href="/performance-hub-login.html">Return to login</a>`; $('retryPortal').addEventListener('click',init); }
}
init();
