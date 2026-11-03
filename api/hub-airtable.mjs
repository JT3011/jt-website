import {endpoint,fail,saveConnection} from '../server/hub-integrations.mjs';
import {syncAirtable} from '../server/airtable-credits.mjs';
import {createSyncJob} from '../server/provider-sync.mjs';
export async function airtableWork(ctx){
  if(!ctx.owner)fail(403,'Only JT can connect Airtable.');
  if(ctx.method!=='POST'||ctx.action!=='connect')fail(404,'Action not found.');
  const token=String(ctx.body.token||'').trim();if(token.length<20||token.length>5000)fail(400,'Enter an Airtable personal access token.');
  for(const table of ['tblLqAsqaegQarJwG','tblbALLdCCcML7lHG']){
    const response=await ctx.fetchImpl(`https://api.airtable.com/v0/appfxqoZZWAqFgaIu/${table}?maxRecords=1`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
    if(!response.ok)fail(400,'This token needs data.records:read access to the JT coaching base.');
  }
  await saveConnection(ctx,'airtable',token,{base:'appfxqoZZWAqFgaIu'});
  try{await syncAirtable(ctx);return{connected:true,automatic:true};}
  catch{return{connected:true,automatic:true,warning:'Airtable connected. The first balance update is pending; automatic retries are enabled.'};}
}
export function createAirtableHandler(options={}){
  const connect=endpoint(airtableWork,options),background=createSyncJob(options);
  return(req,res)=>new URL(req.url||'/', 'https://hub.invalid').searchParams.get('job')==='provider-sync'?background(req,res):connect(req,res);
}
export default createAirtableHandler();
