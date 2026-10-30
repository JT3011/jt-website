import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
export const STORE_DOMAIN='xtkzjd-5g.myshopify.com';
export const STORE_URL='https://jtmindbodybalance.myshopify.com';
export const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function seal(token,key,context) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(`jt-integrations-v1:${key}`).digest(),iv);
  cipher.setAAD(Buffer.from(context));
  const bytes=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64');
}
export function unseal(value,key,context) {
  const b=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',createHash('sha256').update(`jt-integrations-v1:${key}`).digest(),b.subarray(0,12));
  cipher.setAAD(Buffer.from(context));cipher.setAuthTag(b.subarray(12,28));
  return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');
}
export function endpoint(work,{env=process.env,fetchImpl=fetch}={}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if(!['GET','POST'].includes(req.method))fail(405,'Method not allowed.');
      const token=req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
      if(!token)fail(401,'Sign in to the Performance Hub first.');
      if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail(403,'Use the Performance Hub website.');
      const url=(env.SUPABASE_URL||'').replace(/\/$/,''),publicKey=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;
      if(!url||!publicKey||!secret)fail(503,'Hub server settings are incomplete.');
      const auth=await fetchImpl(`${url}/auth/v1/user`,{headers:{apikey:publicKey,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
      if(!auth.ok)fail(401,'Your session expired. Sign in again.');
      const user=await auth.json();if(!user.id||!user.email_confirmed_at||user.is_anonymous)fail(403,'Confirm your email before continuing.');
      const db=async(table,query={},method='GET',body,asUser=false,prefer='return=representation,resolution=merge-duplicates')=>{
        const target=new URL(`${url}/rest/v1/${table}`);for(const[k,v]of Object.entries(query))target.searchParams.set(k,v);
        const headers={apikey:asUser?publicKey:secret,'Content-Type':'application/json',Prefer:prefer};
        if(asUser||secret.startsWith('eyJ'))headers.Authorization=`Bearer ${asUser?token:secret}`;
        const response=await fetchImpl(target,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
        if(!response.ok){
          if(asUser&&['rpc/hub_link_booking','rpc/hub_set_coach_calendar_email'].includes(table)){
            let detail;try{detail=await response.json();}catch{}
            const messages=['Only the CEO can assign coach logins','Enter a valid coach email','Coach calendar not found','This calendar already has a coach login','This email already belongs to another coach calendar','Manager access required','Active booking not found','Choose an approved coach','Shared family email: link this booking only','This booking identity is already linked to a different player'];
            if(messages.includes(detail?.message))fail(400,detail.message+'.');
          }
          fail(response.status===409?409:502,response.status===409?'This request is already being processed. Try again.':'Hub data could not be loaded or saved.');
        }
        const text=await response.text();return text?JSON.parse(text):[];
      };
      const staff=(await db('hub_staff',{user_id:`eq.${user.id}`,select:'role'}))[0];
      let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{fail(400,'Invalid request.');}
      if(JSON.stringify(body).length>20000)fail(413,'Request is too large.');
      const params=new URL(req.url,'https://hub.local').searchParams;
      const ctx={user,role:staff?.role||'client',owner:staff?.role==='owner',manager:['owner','admin'].includes(staff?.role),db,body,params,method:req.method,action:req.method==='POST'?body.action:params.get('action')||'overview',env,fetchImpl,secret};
      const result=await work(ctx);return res.status(200).json(result);
    }catch(error){return res.status(error.status||500).json({error:error.status?error.message:'Unable to complete this request. Please try again.'});}
  };
}
export async function saveConnection(ctx,provider,token,metadata) {
  await ctx.db('hub_provider_connections',{on_conflict:'provider,user_id'},'POST',{provider,user_id:ctx.user.id,encrypted_token:seal(token,ctx.secret,`${provider}:${ctx.user.id}`),metadata,updated_at:new Date().toISOString()});
}
export async function connectionToken(ctx,provider,userId) {
  const row=(await ctx.db('hub_provider_connections',{provider:`eq.${provider}`,user_id:`eq.${userId}`,select:'*'}))[0];
  if(!row)return null;
  try{return{token:unseal(row.encrypted_token,ctx.secret,`${provider}:${userId}`),metadata:row.metadata};}catch{fail(503,`Reconnect ${provider} in the Hub.`);}
}
