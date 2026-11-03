// Shared database leases prevent every open Hub tab from polling each provider.
export async function withProviderSync(ctx,key,seconds,work){
  const state=await ctx.db('rpc/hub_claim_provider_sync',{},'POST',{p_key:key});
  if(!state.acquired)return{connected:true,synced_at:state.last_success||null,stale:!!state.last_error||!state.last_success,pending:!!state.running};
  try{
    const result=await work(state.cache||{});
    const success=result.connected!==false;
    await ctx.db('rpc/hub_finish_provider_sync',{},'POST',{p_key:key,p_lease:state.lease_id,p_success:success,p_seconds:seconds,p_cache:result.cache||{},p_error:success?null:'Connection unavailable.'});
    const {cache,...publicResult}=result;
    return{...publicResult,stale:!success};
  }catch(error){
    await ctx.db('rpc/hub_finish_provider_sync',{},'POST',{p_key:key,p_lease:state.lease_id,p_success:false,p_seconds:Math.max(60,Number(error.retryAfter)||60),p_cache:state.cache||{},p_error:'Provider refresh unavailable.'});
    throw error;
  }
}
