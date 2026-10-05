// Authenticated data stays in memory. Never use localStorage or Cache API for rankings.
export function initFacilityLeaderboard(supabase){
 const dialog=document.querySelector('#facilityLeaderboard'),status=dialog.querySelector('[data-board-status]'),list=dialog.querySelector('[data-board-rows]'),join=dialog.querySelector('[data-board-join]'),leave=dialog.querySelector('[data-board-leave]'),choice=dialog.querySelector('[data-board-choice]'),consent=dialog.querySelector('[data-board-consent]');
 let current=null,user=null,timer=null,request=0;
 const publish=()=>window.dispatchEvent(new CustomEvent('jt-board-state',{detail:current||{rows:[],message:'Sign in to view the leaderboard.'}}));
 function clear(message){current={rows:[],message};list.replaceChildren();status.textContent=message;choice.textContent='';join.hidden=true;leave.hidden=true;publish();}
 function schedule(delay){clearTimeout(timer);timer=setTimeout(refresh,Math.max(1000,Math.min(delay,2147483647)));}
 async function refresh(){
  if(document.hidden){schedule(60000);return;}const ticket=++request;
  try{
   const {data:session,error:sessionError}=await supabase.auth.getSession();if(ticket!==request)return;if(sessionError)throw sessionError;user=session?.session?.user;
   if(!user){clear('Sign in to view the leaderboard.');schedule(60000);return;}
   const {data,error}=await supabase.rpc('hub_facility_leaderboard');if(ticket!==request)return;if(error)throw error;
   current=data;list.replaceChildren();
   for(const row of data.rows){const li=document.createElement('li'),name=document.createElement('span'),points=document.createElement('strong');name.textContent=`${row.rank}. ${row.alias}${row.is_you?' · You':''}`;points.textContent=Number(row.points).toLocaleString()+' PP';li.append(name,points);list.append(li);}
   const date=new Date(data.cutoff).toLocaleDateString('en-GB',{timeZone:'Europe/London'});status.textContent=data.rows.length?`Points earned before ${date}, 00:00 UK. Rankings update each midnight.`:'No players have joined yet. Be the first to set the pace.';
   join.hidden=!!data.you;leave.hidden=!data.you;choice.textContent=data.you?`You appear as ${data.you.alias} · Rank ${data.you.rank} · ${data.you.points} PP.`:'Joining shares only a generated JT Athlete alias and your Performance Points with signed-in members.';
   publish();const untilMidnight=new Date(data.next_refresh)-new Date(data.server_now)+500;schedule(Math.min(60000,untilMidnight));
  }catch(error){if(ticket!==request)return;clear(navigator.onLine?'Leaderboard unavailable. We’ll retry shortly.':'Offline — connect to load current rankings.');schedule(30000);}
 }
 join.addEventListener('submit',async event=>{event.preventDefault();if(!user||!consent.checked)return;const button=join.querySelector('button');button.disabled=true;try{const {error}=await supabase.from('hub_leaderboard_members').insert({user_id:user.id});if(error&&error.code!=='23505')throw error;consent.checked=false;await refresh();}catch{status.textContent='Could not join. Please try again.';}finally{button.disabled=false;}});
 leave.addEventListener('click',async()=>{if(!user)return;leave.disabled=true;try{const {error}=await supabase.from('hub_leaderboard_members').delete().eq('user_id',user.id);if(error)throw error;await refresh();}catch{status.textContent='Could not leave. Please try again.';}finally{leave.disabled=false;}});
 document.querySelectorAll('[data-open-leaderboard]').forEach(b=>b.addEventListener('click',()=>{dialog.showModal();refresh();}));
 window.addEventListener('jt-board-request',publish);
 window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){++request;user=null;clear('Sign in to view the leaderboard.');}else setTimeout(refresh,0);});
 refresh();return {open(){dialog.showModal();refresh();}};
}
