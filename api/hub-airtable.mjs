import {endpoint,fail,saveConnection} from '../server/hub-integrations.mjs';
export default endpoint(async ctx=>{
  if(!ctx.owner)fail(403,'Only JT can connect Airtable.');
  if(ctx.method!=='POST'||ctx.action!=='connect')fail(404,'Action not found.');
  const token=String(ctx.body.token||'').trim();if(token.length<20||token.length>5000)fail(400,'Enter an Airtable personal access token.');
  for(const table of ['tblLqAsqaegQarJwG','tblbALLdCCcML7lHG']){
    const response=await ctx.fetchImpl(`https://api.airtable.com/v0/appfxqoZZWAqFgaIu/${table}?maxRecords=1`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
    if(!response.ok)fail(400,'This token needs data.records:read access to the JT coaching base.');
  }
  await saveConnection(ctx,'airtable',token,{base:'appfxqoZZWAqFgaIu'});
  return{connected:true};
});
