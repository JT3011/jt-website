import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db = createClient('https://hunrekcnmtabowiivmrk.supabase.co', 'sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ', {auth:{persistSession:true,autoRefreshToken:true}});
const host = document.getElementById('dashboardState') || document.getElementById('hubContent');
const ukDay = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const safe = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false, loadedDay='', panel, userId, timer;
const style=document.createElement('style');
style.textContent=`
.jt-daily{margin:0 0 22px;padding:18px;border:1px solid #aa8a47;border-radius:22px;background:radial-gradient(ellipse at top right,#302817,#101110 65%);color:#f5f1e8;box-shadow:0 16px 45px #0003}
.jt-daily *{box-sizing:border-box}.jt-daily summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px}.jt-daily summary::-webkit-details-marker{display:none}.jt-daily summary::after{content:'⌄';font-size:22px;color:#d8bc78}.jt-daily details[open] summary::after{transform:rotate(180deg)}
.jt-daily .jt-earned{font-size:12px;color:#e7cb85}.jt-daily-track{height:9px;background:#ffffff15;border-radius:20px;overflow:hidden;margin-top:15px}.jt-daily-fill{display:block;height:100%;background:linear-gradient(90deg,#a17c32,#f4dea0);width:100%;border-radius:inherit;transform-origin:left}.jt-daily.celebrate .jt-daily-fill{animation:jt-fill 1.2s cubic-bezier(.2,.7,.2,1) both}.jt-daily.celebrate .jt-earned{display:inline-block;animation:jt-points 1.3s ease both}.jt-signin-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;list-style:none;padding:0;margin:16px 0 0}.jt-signin-days li{text-align:center;color:#bdb8ad}.jt-signin-days b{display:grid;place-items:center;width:30px;height:30px;margin:auto;border:1px solid #ffffff30;border-radius:50%;font-size:13px}.jt-signin-days .collected b{background:#dbc181;color:#111;border-color:#dbc181}.jt-signin-days [aria-current] b{outline:2px solid #dbc181;outline-offset:3px}.jt-signin-days span{display:block;margin-top:8px;font-size:10px}.jt-signin-days li:last-child span{color:#f4dea0;font-weight:bold}
.jt-daily-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 10px}.jt-daily h2{font-size:clamp(20px,4vw,28px);line-height:1.15;margin:0;color:#fff}.jt-daily-count{white-space:nowrap;color:#e7cb85;font-size:12px}.jt-daily-intro{font-size:12px;color:#c9c4b8;margin:0 0 12px}.jt-daily-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.jt-daily-card{padding:14px;border:1px solid #ffffff20;border-radius:14px;background:#ffffff05;display:flex;flex-direction:column;min-width:0}.jt-daily-card.quick{background:#c9a45b12;border-color:#c9a45b55}.jt-daily-card.done{border-color:#85b49b}.jt-daily-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#d8bc78}.jt-daily-card h3{font-size:15px;line-height:1.3;margin:8px 0;color:#fff}.jt-daily-card p{font-size:12px;line-height:1.5;color:#c9c4b8;margin:0 0 12px;flex:1}.jt-daily button,.jt-daily a.jt-daily-link{font:inherit;font-size:12px;border-radius:9px;padding:10px;border:1px solid #c9a45b;background:#dbc181;color:#111;cursor:pointer;text-align:center;text-decoration:none}.jt-daily button:disabled{opacity:.65;cursor:default}.jt-daily button:focus-visible,.jt-daily summary:focus-visible,.jt-daily a:focus-visible{outline:3px solid white;outline-offset:3px}.jt-daily-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;font-size:11px;color:#bdb8ad}.jt-daily-status{min-height:18px;font-size:13px;color:#e7cb85;margin-top:10px}.jt-daily-status:empty{display:none}
@keyframes jt-fill{from{transform:scaleX(var(--from))}to{transform:scaleX(var(--to))}}@keyframes jt-points{0%{opacity:0;transform:translateY(14px) scale(.8)}65%{opacity:1;transform:translateY(-3px) scale(1.12)}100%{transform:none}}
@media(max-width:800px){.jt-daily-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.jt-daily{padding:14px}.jt-daily-card{padding:11px}.jt-daily-footer{align-items:flex-start}.jt-daily-card h3{font-size:14px}}
@media(prefers-reduced-motion:reduce){.jt-daily *{animation:none!important;transition:none!important}}
`;
function stats(result){
 for(const [id,key] of [['pointsBalance','points_balance'],['lifetimePoints','lifetime_points'],['currentStreak','current_streak']]){const el=document.getElementById(id);if(el&&result[key]!=null)el.textContent=String(result[key]);}
}
function message(text){panel.querySelector('.jt-daily-status').textContent=text;}
function render(plan,login){
 const tasks=plan.challenges||[];const done=tasks.filter(x=>x.completed).length;
 const cycleDay=Math.min(7,Math.max(1,Number(login?.cycle_day)||1));
 const fromDay=login?.login_counted?cycleDay-1:cycleDay;
 const open=login?.login_counted || panel.querySelector('details')?.open;
 panel.classList.toggle('celebrate',!!login?.login_counted);
 panel.innerHTML=`<details ${open?'open':''}><summary><strong>Daily sign-in · ${cycleDay} / 7</strong><span class="jt-earned" role="status">${login?.login_counted?`+${Number(login.reward_points)} Performance Point${login.reward_points===1?'':'s'}`:'Today’s reward collected'}</span></summary>
 <ol class="jt-signin-days" aria-label="Seven-day reward cycle">${Array.from({length:7},(_,i)=>`<li class="${i<cycleDay?'collected':''}" ${i+1===cycleDay?'aria-current="step"':''}><b>${i+1}</b><span>+${i===6?5:1} pt${i===6?'s':''}</span></li>`).join('')}</ol>
 <div class="jt-daily-track" role="progressbar" aria-label="Seven-day sign-in reward progress" aria-valuemin="0" aria-valuemax="7" aria-valuenow="${cycleDay}"><span class="jt-daily-fill" style="--from:${fromDay/7};--to:${cycleDay/7};transform:scaleX(${cycleDay/7})"></span></div></details>
 <div class="jt-daily-heading"><h2>Today’s Performance Plan</h2><span class="jt-daily-count">${done} / ${tasks.length} done</span></div><p class="jt-daily-intro">Start small, then build. A fresh plan each day, matched to the player profile where available.</p>
 <div class="jt-daily-grid">${tasks.map(c=>`<article class="jt-daily-card ${c.slot<=2?'quick':''} ${c.completed?'done':''}"><span class="jt-daily-label">${c.slot<=2?'Daily Foundations':c.slot===3?'Your position':'Your goal'} · ${Number(c.minutes)} min</span><h3>${safe(c.challenge_title)}</h3><p>${safe(c.challenge_description)}</p><button type="button" data-code="${safe(c.challenge_code)}" ${c.completed?'disabled':''}>${c.completed?'Completed ✓':`I’ve done this · +${Number(c.points_available)} pt${c.points_available===1?'':'s'}`}</button></article>`).join('')}</div>
 <div class="jt-daily-footer"><span>${Number(plan.weekly_remaining)} / 12 daily-challenge points left this week. Only mark tasks you have done.</span><a class="jt-daily-link" href="/performance-hub-challenges.html">Weekly challenges →</a></div><div class="jt-daily-status" role="status" aria-live="polite"></div>`;
 for(const id of ['dailyChallengeProgress','challengeProgress']){const el=document.getElementById(id);if(el)el.textContent=`${done}/${tasks.length}`;}
 if(login?.login_counted) setTimeout(()=>panel.classList.remove('celebrate'),1500);
 panel.querySelector('details').addEventListener('toggle',e=>{if(!e.target.open)panel.classList.remove('celebrate');});
 panel.querySelectorAll('[data-code]').forEach(button=>button.addEventListener('click',async()=>{
  if(busy)return;busy=true;const code=button.dataset.code;button.disabled=true;button.textContent='Saving…';
  try{
   const {data,error}=await db.rpc('complete_performance_challenge',{selected_challenge_code:code});if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;stats(result);
   const fresh=await db.rpc('get_my_daily_challenges');if(fresh.error)throw fresh.error;
   if(fresh.data.day!==loadedDay){loadedDay='';busy=false;await refresh();return;}
   render(fresh.data,{...login,login_counted:false});
   message(result.completed?`Completed ✓ +${Number(result.points_awarded)} Performance Points${result.points_awarded===0?' — weekly challenge limit reached. Your task still counts.':''}`:'Already completed — your points are safe.');
  }catch(e){button.disabled=false;button.textContent='Retry completion';message(e.message||'Could not save. Please try again.');}
  finally{busy=false;}
 }));
}
async function refresh(){
 if(busy||document.hidden||host.classList.contains('hidden'))return;busy=true;
 try{
  const session=await db.auth.getSession();userId=session.data.session?.user?.id;if(!userId)return;
  const reward=await db.rpc('register_daily_login_cycle');if(reward.error)throw reward.error;
  const login=Array.isArray(reward.data)?reward.data[0]:reward.data;
  const plan=await db.rpc('get_my_daily_challenges');if(plan.error)throw plan.error;
  loadedDay=plan.data.day;stats(login);render(plan.data,login);
 }catch(e){panel.innerHTML='<p>Today’s plan could not load. Your saved points are safe.</p><button type="button">Try again</button>';panel.querySelector('button').onclick=refresh;console.warn('Daily Hub:',e.message);}
 finally{busy=false;}
}
function start(){
 if(!host||host.classList.contains('hidden')||panel)return;
 document.head.append(style);panel=document.createElement('section');panel.className='jt-daily';panel.setAttribute('aria-label','Daily sign-in and challenges');panel.innerHTML='<p>Preparing your daily plan…</p>';host.prepend(panel);
 refresh();timer=setInterval(()=>{if(loadedDay&&ukDay()!==loadedDay)refresh();},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loadedDay!==ukDay())refresh();});
 window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});
}
if(host){new MutationObserver(start).observe(host,{attributes:true,attributeFilter:['class']});start();}
