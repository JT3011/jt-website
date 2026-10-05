// The bucket remains private. Short-lived signed URLs are fetched only for opted-in models.
export function initFacilityCrowd(supabase){
 const dialog=document.querySelector('#facilitySharing'),status=dialog.querySelector('[data-sharing-status]'),form=dialog.querySelector('form[data-sharing-form]'),checkbox=form.querySelector('input'),save=form.querySelector('button');
 let tour=null,loadModel=null,generation=0,refreshTimer=null;
 const summary=document.querySelector('#facilityCrowdSummary');
 function dispose(scene){const seen=new Set();scene?.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(seen.has(m))continue;seen.add(m);for(const v of Object.values(m))if(v?.isTexture&&!seen.has(v)){seen.add(v);v.dispose();}m.dispose();}});}
 async function refresh(){
  const ticket=++generation;clearTimeout(refreshTimer);tour?.clearAmbient();
  try{
   const {data,error}=await supabase.auth.getSession();if(ticket!==generation)return;if(error)throw error;const user=data.session?.user;
   if(!user){status.textContent='Sign in to choose whether to share your avatar.';save.disabled=true;summary.textContent='Sign in to see shared member avatars.';return;}
   const [choice,model]=await Promise.all([supabase.from('hub_avatar_sharing').select('user_id').eq('user_id',user.id).maybeSingle(),supabase.from('player_avatar_models').select('storage_path').eq('user_id',user.id).maybeSingle()]);if(ticket!==generation)return;if(choice.error||model.error)throw choice.error||model.error;
   checkbox.checked=!!choice.data;save.disabled=!model.data;status.textContent=model.data?'Sharing is optional. Other signed-in members can see your avatar appearance, without your name or profile. These characters do not show who is online.':'Create your personal avatar first to enable sharing.';
   if(!tour||!loadModel)return;
   const result=await supabase.rpc('hub_facility_crowd');if(ticket!==generation)return;if(result.error)throw result.error;
   const paths=[...new Set((result.data||[]).map(r=>r.storage_path))].slice(0,10);let loaded=0;
   summary.textContent=paths.length?'Loading shared member avatars…':'No other members have shared their avatars yet.';
   // Sequential loading avoids ten simultaneous model/texture allocations on mobile.
   for(const path of paths){if(ticket!==generation)return;
    try{const signed=await supabase.storage.from('player-avatars').createSignedUrl(path,60);if(signed.error)throw signed.error;if(ticket!==generation)return;const gltf=await loadModel(signed.data.signedUrl,'Shared member avatar',20000);if(ticket!==generation){dispose(gltf.scene);return;}if(tour.addAmbient(gltf.scene))loaded++;else dispose(gltf.scene);}catch{ /* A deleted, revoked or unavailable model must not block the user's athlete. */ }
   }
   summary.textContent=loaded?`${loaded} shared member avatar${loaded===1?'':'s'} · ambient movement, not live presence`:(paths.length?'Shared avatars are unavailable right now.':'No other members have shared their avatars yet.');
  }catch{if(ticket===generation){summary.textContent='Shared avatars are unavailable. Your own athlete is unaffected.';status.textContent='Could not load sharing preferences. Please try again.';save.disabled=true;}}
  finally{if(ticket===generation)refreshTimer=setTimeout(()=>{if(!document.hidden)refresh();else refreshTimer=setTimeout(refresh,60000);},300000);}
 }
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{const {data}=await supabase.auth.getSession(),user=data.session?.user;if(!user)throw Error('Sign in');const result=checkbox.checked?await supabase.from('hub_avatar_sharing').insert({user_id:user.id}):await supabase.from('hub_avatar_sharing').delete().eq('user_id',user.id);if(result.error&&result.error.code!=='23505')throw result.error;await refresh();status.textContent=checkbox.checked?'Your avatar can now appear in other members’ facilities.':'Your avatar is private. Open facilities refresh their crowd within five minutes.';}catch{status.textContent='Could not save. Please try again.';save.disabled=false;}});
 document.querySelectorAll('[data-open-sharing]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();refresh();}));
 supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){++generation;tour?.clearAmbient();checkbox.checked=false;save.disabled=true;summary.textContent='Sign in to see shared member avatars.';}else if(event==='SIGNED_IN')setTimeout(refresh,0);});
 window.addEventListener('online',refresh);
 return {attach(nextTour,loader){tour=nextTour;loadModel=loader;refresh();},refresh};
}
