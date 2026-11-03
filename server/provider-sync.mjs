import {createHash} from 'node:crypto';
import {fail} from './hub-integrations.mjs';
import {syncHost} from './calendly-sync.mjs';
import {syncAirtable} from './airtable-credits.mjs';

export function syncBounds(selectedStart,now=Date.now()){
  const recent=new Date(now-7*86400000).toISOString().slice(0,10)+'T00:00:00.000Z';
  return{start:selectedStart&&selectedStart<recent?selectedStart:recent};
}
export function providerContext({env=process.env,fetchImpl=fetch}={}){
  const secret=env.SUPABASE_SECRET_KEY,url=(env.SUPABASE_URL||'').replace(/\/$/,'');
  if(!secret||!url)fail(503,'Hub server settings are incomplete.');
  return{env,secret,fetchImpl,db:async(table,query={},method='GET',body)=>{
    const target=new URL(`${url}/rest/v1/${table}`);for(const[k,v]of Object.entries(query))target.searchParams.set(k,v);
    const response=await fetchImpl(target,{method,headers:{apikey:secret,...(secret.startsWith('eyJ')?{Authorization:`Bearer ${secret}`} : {}),'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)fail(503,'Provider sync storage is unavailable.');
    const text=await response.text();return text?JSON.parse(text):[];
  }};
}
export async function syncProviders(ctx){
  const outcomes=[];
  const hosts=await ctx.db('session_connect_calendly_hosts',{enabled:'eq.true',select:'calendly_user_uri,coach_user_id,organization_uri'});
  for(const host of hosts){
    try{const result=await syncHost(ctx,host,syncBounds());outcomes.push({provider:'calendly',connected:result.connected,stale:result.stale||false});}
    catch{outcomes.push({provider:'calendly',connected:false,stale:true});}
  }
  try{const result=await syncAirtable(ctx);outcomes.push({provider:'airtable',connected:result.connected,stale:result.stale||false});}
  catch{outcomes.push({provider:'airtable',connected:false,stale:true});}
  return outcomes;
}
export function createSyncJob({env=process.env,fetchImpl=fetch,run=syncProviders}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');let ctx,job;
    try{
      if(req.method!=='POST')fail(405,'Method not allowed.');
      const ticket=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
      if(!ticket)fail(401,'Invalid sync ticket.');
      ctx=providerContext({env,fetchImpl});
      [job]=await ctx.db('hub_provider_sync_jobs',{ticket_hash:`eq.${createHash('sha256').update(ticket).digest('hex')}`,status:'eq.queued',expires_at:`gt.${new Date().toISOString()}`},'PATCH',{status:'running'});
      if(!job)fail(401,'Expired or used sync ticket.');
      const outcomes=await run(ctx),ok=outcomes.length>0&&outcomes.every(x=>x.connected&&!x.stale);
      await ctx.db('hub_provider_sync_jobs',{id:`eq.${job.id}`},'PATCH',{status:ok?'complete':'failed',finished_at:new Date().toISOString(),detail:ok?'Providers refreshed.':'One or more connections need attention.'});
      return res.status(ok?200:503).json({ok,outcomes});
    }catch(error){
      if(ctx&&job)try{await ctx.db('hub_provider_sync_jobs',{id:`eq.${job.id}`},'PATCH',{status:'failed',finished_at:new Date().toISOString(),detail:'Provider sync unavailable.'});}catch{}
      return res.status(error.status||503).json({error:error.status?error.message:'Provider sync unavailable.'});
    }
  };
}
