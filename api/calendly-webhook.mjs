import {fail,connectionToken} from '../server/hub-integrations.mjs';
import {UUID,signingKey,validSignature,cal,bookingRow,saveBookings} from '../server/calendly-sync.mjs';
export const config={api:{bodyParser:false}};
export function createWebhook({env=process.env,fetchImpl=fetch}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{
      if(req.method!=='POST')fail(405,'Method not allowed.');
      const id=new URL(req.url,'https://hub.local').searchParams.get('connection');
      if(!UUID.test(id||'')||!env.SUPABASE_SECRET_KEY)fail(401,'Invalid webhook.');
      const chunks=[];let length=0;for await(const chunk of req){const b=Buffer.from(chunk);length+=b.length;if(length>1000000)fail(413,'Payload too large.');chunks.push(b);}const raw=Buffer.concat(chunks);
      if(!validSignature(raw,req.headers['calendly-webhook-signature'],signingKey(env.SUPABASE_SECRET_KEY,id)))fail(401,'Invalid webhook signature.');
      const data=JSON.parse(raw.toString('utf8'));if(!['invitee.created','invitee.canceled'].includes(data.event))return res.status(200).json({ignored:true});
      const ctx={secret:env.SUPABASE_SECRET_KEY,fetchImpl,db:async(table,query={},method='GET',body)=>{
        const target=new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);for(const[k,v]of Object.entries(query))target.searchParams.set(k,v);
        const response=await fetchImpl(target,{method,headers:{apikey:env.SUPABASE_SECRET_KEY,...(env.SUPABASE_SECRET_KEY.startsWith('eyJ')?{Authorization:`Bearer ${env.SUPABASE_SECRET_KEY}`}:{ }),'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
        if(!response.ok)fail(503,'Webhook could not be saved.');const text=await response.text();return text?JSON.parse(text):[];
      }};
      const staff=(await ctx.db('hub_staff',{user_id:`eq.${id}`,select:'role'}))[0];if(!['owner','admin','coach'].includes(staff?.role))fail(403,'Connection is no longer authorised.');
      const connection=await connectionToken(ctx,'calendly',id);if(!connection)fail(503,'Calendly connection unavailable.');
      const uri=data.payload?.uri,eventUri=data.payload?.event;
      if(!/^https:\/\/api\.calendly\.com\/scheduled_events\/[a-z0-9-]+$/i.test(eventUri||'')||!uri?.startsWith(`${eventUri}/invitees/`)||!UUID.test(uri.split('/').at(-1)))fail(400,'Invalid booking.');
      // Re-read current provider state: delayed/retried notifications cannot resurrect cancellations.
      const [{resource:event},{resource:invitee}]=await Promise.all([cal(ctx,connection.token,eventUri.slice('https://api.calendly.com'.length)),cal(ctx,connection.token,uri.slice('https://api.calendly.com'.length))]);
      const hosts=await ctx.db('session_connect_calendly_hosts',{enabled:'eq.true',select:'calendly_user_uri,organization_uri'});
      if(!event.event_memberships?.some(m=>hosts.some(h=>h.calendly_user_uri===m.user&&h.organization_uri===connection.metadata.organization_uri)&& (connection.metadata.team&&staff.role==='owner'||m.user===connection.metadata.user_uri)))fail(403,'Booking is outside this connection.');
      await saveBookings(ctx,[bookingRow(event,invitee)]);
      return res.status(200).json({received:true});
    }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Webhook could not be processed.'});}
  };
}
export default createWebhook();
