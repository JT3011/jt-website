import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {endpoint,fail,STORE_DOMAIN,STORE_URL,saveConnection,connectionToken} from '../server/hub-integrations.mjs';
const queries={
  shop:readFileSync(new URL('../server/graphql/shop.graphql',import.meta.url),'utf8'),
  'reward-lookup':readFileSync(new URL('../server/graphql/reward-lookup.graphql',import.meta.url),'utf8'),
  'reward-create':readFileSync(new URL('../server/graphql/reward-create.graphql',import.meta.url),'utf8')
};
export function validateSettings(input){
  const type=input.discount_type,value=input.discount_value==null||input.discount_value===''?null:Number(input.discount_value),minimum=Number(input.minimum_subtotal),days=Number(input.valid_days);
  if(!['percentage','fixed'].includes(type)||value!==null&&(!Number.isFinite(value)||value<=0||value>999999||type==='percentage'&&value>100)||!Number.isFinite(minimum)||minimum<0||minimum>999999||!Number.isInteger(days)||days<1||days>365)fail(400,'Enter a valid discount, minimum spend and expiry.');
  if(input.active&&(value===null||input.terms_accepted!==true))fail(400,'Set a discount and accept its terms before activating it.');
  return{discount_type:type,discount_value:value,minimum_subtotal:minimum,valid_days:days,active:input.active===true,terms_accepted:input.terms_accepted===true,updated_at:new Date().toISOString()};
}
async function graphql(ctx,token,name,variables={}){
  let response;try{response=await ctx.fetchImpl(`https://${STORE_DOMAIN}/admin/api/2026-07/graphql.json`,{method:'POST',headers:{'X-Shopify-Access-Token':token,'Content-Type':'application/json'},body:JSON.stringify({query:queries[name],variables}),signal:AbortSignal.timeout(15000)});}catch{fail(503,'Shopify could not be reached. Your points are safe; try again.');}
  if([401,403].includes(response.status))fail(503,'JT needs to reconnect Shopify before issuing codes.');
  if(!response.ok)fail(503,'Shopify is temporarily unavailable. Please try again.');
  const result=await response.json();if(result.errors?.length)fail(503,'Shopify could not verify this request. Check the store connection and permissions.');return result.data;
}
async function storeConnection(ctx){
  if(ctx.env.SHOPIFY_ADMIN_ACCESS_TOKEN)return{token:ctx.env.SHOPIFY_ADMIN_ACCESS_TOKEN};
  const owners=await ctx.db('hub_staff',{role:'eq.owner',select:'user_id'});
  for(const owner of owners){const c=await connectionToken(ctx,'shopify',owner.user_id);if(c)return c;}return null;
}
async function verifyShop(ctx,token){
  const data=await graphql(ctx,token,'shop');
  if(data.shop.id!=='gid://shopify/Shop/106145481052'||data.shop.currencyCode!=='GBP')fail(400,'Connect the JT Shopify store in GBP.');
  if(!data.currentAppInstallation.accessScopes.some(s=>s.handle==='write_discounts'))fail(400,'The Shopify connection needs write_discounts permission.');
  return data.shop;
}
export function discountInput(claim){
  const s=claim.discount_snapshot;
  return{title:`JT Hub · ${s.tier_name} · ${claim.id}`,code:claim.code,startsAt:claim.created_at,endsAt:claim.expires_at,context:{all:'ALL'},customerGets:{items:{all:true},appliesOnOneTimePurchase:true,appliesOnSubscription:false,value:s.discount_type==='percentage'?{percentage:Number(s.discount_value)/100}:{discountAmount:{amount:String(s.discount_value),appliesOnEachItem:false}}},usageLimit:1,appliesOncePerCustomer:true,combinesWith:{orderDiscounts:false,productDiscounts:false,shippingDiscounts:false},...(Number(s.minimum_subtotal)>0?{minimumRequirement:{subtotal:{greaterThanOrEqualToSubtotal:String(s.minimum_subtotal)}}}:{})};
}
function publicClaim(claim){return{tier_code:claim.tier_code,status:claim.status,expires_at:claim.expires_at,discount_snapshot:claim.discount_snapshot,...(claim.status==='issued'?{code:claim.code,url:`${STORE_URL}/discount/${encodeURIComponent(claim.code)}?redirect=/collections/all`}:{})};}
export async function storeWork(ctx){
  const {action,method,body,db,user}=ctx;
  if(method==='POST'&&action==='connect'){
    if(!ctx.owner)fail(403,'Only JT can connect the store.');
    const token=String(body.token||'').trim();if(token.length<20||token.length>4000)fail(400,'Enter the Shopify Admin API access token.');
    const shop=await verifyShop(ctx,token);await saveConnection(ctx,'shopify',token,{shop});return{connected:true,shop};
  }
  if(method==='POST'&&action==='settings'){
    if(!ctx.owner)fail(403,'Only JT can change shop rewards.');
    const settings=validateSettings(body);
    if(settings.active){const c=await storeConnection(ctx);if(!c)fail(409,'Connect Shopify before activating rewards.');await verifyShop(ctx,c.token);}
    const row=await db('hub_store_reward_settings',{tier_code:`eq.${String(body.tier_code)}`},'PATCH',settings);if(!row.length)fail(404,'Reward milestone not found.');return{saved:true};
  }
  if(method==='GET'&&action==='overview'){
    const [ladder,settings,claims,account]=await Promise.all([db('rpc/get_my_reward_ladder',{},'POST',{},true),db('hub_store_reward_settings',{select:'*'}),db('hub_store_reward_claims',{user_id:`eq.${user.id}`,select:'*'}),db('player_performance_accounts',{user_id:`eq.${user.id}`,select:'lifetime_points,points_balance'})]);
    const connection=await storeConnection(ctx);let connected=!!connection,connectionError=null;
    if(ctx.owner&&connection){try{await verifyShop(ctx,connection.token);}catch(error){connected=false;connectionError=error.message;}}
    return{store_url:STORE_URL,currency:'GBP',owner:ctx.owner,connected,connection_error:connectionError,ladder,settings,claims:claims.map(publicClaim),points:account[0]||{lifetime_points:0,points_balance:0}};
  }
  if(method==='POST'&&action==='claim'){
    const tier=String(body.tier_code||'');if(!/^[a-z0-9_]{1,80}$/.test(tier))fail(400,'Choose a reward milestone.');
    let claim=(await db('hub_store_reward_claims',{user_id:`eq.${user.id}`,tier_code:`eq.${tier}`}))[0];
    if(claim?.status==='issued')return{claim:publicClaim(claim)};
    const ladder=await db('rpc/get_my_reward_ladder',{},'POST',{},true),entry=ladder.find(t=>t.tier_code===tier);
    if(!entry?.eligible)fail(403,'Keep building your points and training standards to unlock this milestone.');
    if(entry.claimed&&!['rejected','cancelled'].includes(entry.claim_status))fail(409,'This milestone already has a reward claim. Contact JT if you need help.');
    const settings=(await db('hub_store_reward_settings',{tier_code:`eq.${tier}`}))[0];
    if(!settings?.active||!settings.terms_accepted)fail(409,'JT is preparing this shop reward. Please check back soon.');
    const connection=await storeConnection(ctx);if(!connection)fail(503,'JT needs to connect Shopify before issuing codes.');
    await verifyShop(ctx,connection.token);
    if(!claim){
      const now=new Date(),record={user_id:user.id,tier_code:tier,code:`JT-${randomBytes(12).toString('hex').toUpperCase()}`,discount_snapshot:{...settings,tier_name:entry.tier_name,currency:'GBP'},created_at:now.toISOString(),expires_at:new Date(now.getTime()+settings.valid_days*86400000).toISOString()};
      try{await db('hub_store_reward_claims',{},'POST',record,false,'return=representation');}catch(error){if(error.status!==409)throw error;}
      claim=(await db('hub_store_reward_claims',{user_id:`eq.${user.id}`,tier_code:`eq.${tier}`}))[0];
    }
    if(!claim)fail(503,'Your reward is being prepared. Please try again.');
    // Always recover by the reserved code. A failed network response must never issue a second reward.
    let id=(await graphql(ctx,connection.token,'reward-lookup',{code:claim.code})).codeDiscountNodeByCode?.id;
    if(!id){
      if(new Date(claim.expires_at)<=new Date())fail(409,'This pending reward has expired. Contact JT.');
      const result=await graphql(ctx,connection.token,'reward-create',{input:discountInput(claim)});
      id=result.discountCodeBasicCreate?.codeDiscountNode?.id;
      if(!id)id=(await graphql(ctx,connection.token,'reward-lookup',{code:claim.code})).codeDiscountNodeByCode?.id;
      if(!id)fail(503,'Shopify has not issued the code yet. Your points are unchanged. Please retry or contact JT.');
    }
    const saved=(await db('hub_store_reward_claims',{id:`eq.${claim.id}`},'PATCH',{status:'issued',shopify_discount_id:id,issued_at:new Date().toISOString()}))[0];
    return{claim:publicClaim(saved)};
  }
  fail(404,'Action not found.');
}
export default endpoint(storeWork);
