import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://hunrekcnmtabowiivmrk.supabase.co','sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ');
const sections=[['training','Training','#dbc181','Weekly sessions / 7'],['nutrition','Nutrition','#9bd89b','Weekly habits / 7'],['mindset','Mindset','#c1a5ff','Weekly sessions / 7'],['recovery','Recovery','#91c9e8','Saved recovery check-in'],['challenges','Challenges','#64e4ed','Today’s tasks completed'],['journal','Journal','#ee92b2','Check-in days / 7'],['matchday','Matchday','#f59e7b','This week’s reflection'],['progress','Progress','#639bff','Weekly actions / 21']];
const stage=document.getElementById('stage');
const latest=new Map();
let fallback;
function fallbackPanel(){
 if(!stage.classList.contains('jt-no-webgl'))return;
 if(!fallback){fallback=document.createElement('section');fallback.className='jt-fallback-metrics';fallback.setAttribute('aria-label','Saved performance progress');stage.insertAdjacentElement('afterend',fallback);}
 fallback.replaceChildren();
 for(const [id,name,color,basis]of sections){const data=latest.get(id);const card=document.createElement('a');card.href=`/performance-hub-${id}.html`;card.target='_top';card.style.setProperty('--holo',color);const title=document.createElement('strong');title.textContent=`${name} · ${data?.value==null?'—':data.value+'%'}`;const label=document.createElement('span');label.textContent=basis;const status=document.createElement('small');status.textContent=data?.state||'Not logged';card.append(title,label,status);fallback.append(card);}
}
const percent=(n,d)=>Math.max(0,Math.min(100,Math.round(n/d*100)));
function show(id,value,state='Saved'){
 const section=sections.find(s=>s[0]===id);
 const detail={id,value,state:value==null&&state==='Saved'?'Not logged':state,basis:section[3]};
 latest.set(id,detail);window.dispatchEvent(new CustomEvent('jt-section-progress',{detail}));fallbackPanel();
}
window.addEventListener('jt-facility-ready',()=>{latest.forEach(detail=>window.dispatchEvent(new CustomEvent('jt-section-progress',{detail})));});
new MutationObserver(fallbackPanel).observe(stage,{attributes:true,attributeFilter:['class']});
let busy=false;
async function refresh(){if(busy||document.hidden)return;busy=true;try{
 const {data:s,error:authError}=await db.auth.getSession();if(authError)throw authError;const u=s.session?.user?.id;if(!u){sections.forEach(([id])=>show(id,null,'Sign in'));return;}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const week=d.toISOString().slice(0,10);const recent=new Date(today+'T12:00:00Z');recent.setUTCDate(recent.getUTCDate()-6);
 const [progress,readiness,match,plan]=await Promise.all([
 db.from('player_progress').select('training_sessions,nutrition_habits,mindset_sessions').eq('user_id',u).eq('week_start',week).maybeSingle(),
 db.from('daily_readiness_checkins').select('checkin_date,sleep_quality,muscle_soreness,illness_symptoms').eq('user_id',u).gte('checkin_date',recent.toISOString().slice(0,10)).lte('checkin_date',today),
 db.from('matchday_reflections').select('id').eq('user_id',u).gte('match_date',week).lte('match_date',today).limit(1),
 db.rpc('get_my_daily_challenges')]);
 const row=progress.data;
 for(const [id,key]of [['training','training_sessions'],['nutrition','nutrition_habits'],['mindset','mindset_sessions']])show(id,row?percent(Number(row[key]),7):null,progress.error?'Unavailable':'Saved');
 show('progress',row?percent(Number(row.training_sessions)+Number(row.nutrition_habits)+Number(row.mindset_sessions),21):null,progress.error?'Unavailable':'Saved');
 const check=readiness.data?.find(r=>r.checkin_date===today);show('recovery',check?percent(Number(check.sleep_quality)+(10-Number(check.muscle_soreness))+(10-Number(check.illness_symptoms)),30):null,readiness.error?'Unavailable':'Saved');
 show('journal',readiness.error?null:percent(new Set((readiness.data||[]).map(r=>r.checkin_date)).size,7),readiness.error?'Unavailable':'Last 7 days');
 show('matchday',match.error?null:match.data?.length?100:0,match.error?'Unavailable':'This week');
 const tasks=plan.data?.challenges;show('challenges',tasks?.length?percent(tasks.filter(x=>x.completed).length,tasks.length):null,plan.error?'Unavailable':'Today');
 }catch(e){sections.forEach(([id])=>show(id,null,'Reconnect to update'));}finally{busy=false;}}
refresh();document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);window.addEventListener('jt-performance-saved',refresh);setInterval(refresh,60000);

