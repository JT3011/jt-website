import {fail} from '../hub-integrations.mjs';

const TABLE='hub_nutrition_quotes';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS='id,client_email,client_name,amount_pence,billing,description,active,revision,updated_at';

export function quoteEmail(value){
 const email=String(value||'').trim().toLowerCase();
 if(email.length>254||!/^[^\s@,"()\\<>]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email))fail(400,'Enter the email the client will use to sign in.');
 return email;
}

export function quoteInput(body){
 const price=String(body.price??'').trim();
 if(!/^\d{1,5}(?:\.\d{1,2})?$/.test(price))fail(400,'Enter a price in pounds with no more than two decimal places.');
 const amount_pence=Math.round(Number(price)*100);
 if(amount_pence<0||amount_pence>1000000)fail(400,'Enter a price between £0 and £10,000.');
 if(!['one_off','monthly'].includes(body.billing))fail(400,'Choose one-off or monthly.');
 const client_name=String(body.client_name||'').trim(),description=String(body.description||'').trim();
 if(!client_name||client_name.length>100)fail(400,'Enter a client name of up to 100 characters.');
 if(!description||description.length>1000)fail(400,'Describe what the price includes, using up to 1,000 characters.');
 if(typeof body.active!=='boolean')fail(400,'Choose whether to show this price to the client.');
 return{client_email:quoteEmail(body.client_email),client_name,amount_pence,billing:body.billing,description,active:body.active};
}

export async function quotesWork(ctx){
 // endpoint() verifies the Supabase user and confirmed email before this handler.
 // A caller-supplied email or profile metadata is never used for client lookup.
 if(ctx.method==='GET'&&ctx.action==='my-price'){
  if(!ctx.user.email_confirmed_at||ctx.user.is_anonymous)fail(403,'Confirm your email before viewing a price.');
  const email=quoteEmail(ctx.user.email);
  const rows=await ctx.db(TABLE,{client_email:`eq.${email}`,active:'eq.true',select:FIELDS,limit:'1'});
  const row=rows[0];
  return{can_manage:ctx.owner===true,quote:row?{amount_pence:row.amount_pence,billing:row.billing,description:row.description,revision:row.revision,updated_at:row.updated_at}:null};
 }
 if(!ctx.owner)fail(403,'Only JT can set client prices.');
 if(ctx.method==='GET'&&ctx.action==='prices'){
  const offset=Number(ctx.params.get('offset')||0);
  if(!Number.isInteger(offset)||offset<0||offset>100000)fail(400,'Choose a valid page.');
  const rows=await ctx.db(TABLE,{select:FIELDS,order:'updated_at.desc,id.asc',offset:String(offset),limit:'51'});
  return{quotes:rows.slice(0,50),next_offset:rows.length>50?offset+50:null};
 }
 if(ctx.method==='GET'&&ctx.action==='find-price'){
  const email=quoteEmail(ctx.params.get('email'));
  const rows=await ctx.db(TABLE,{client_email:`eq.${email}`,select:FIELDS,limit:'1'});
  return{quote:rows[0]||null};
 }
 if(ctx.method==='POST'&&ctx.action==='save-price'){
  const input=quoteInput(ctx.body),now=new Date().toISOString();
  if(ctx.body.id){
   if(!UUID.test(ctx.body.id)||!Number.isInteger(ctx.body.revision)||ctx.body.revision<1)fail(400,'Reload the client price before saving.');
   const previous=(await ctx.db(TABLE,{id:`eq.${ctx.body.id}`,select:'id,client_email,revision',limit:'1'}))[0];
   if(!previous)fail(404,'This client price was not found.');
   if(previous.client_email!==input.client_email)fail(400,'Start a new price for a different email. Hide the old price if needed.');
   if(previous.revision!==ctx.body.revision)fail(409,'This price changed elsewhere. Reload it before saving.');
   const rows=await ctx.db(TABLE,{id:`eq.${ctx.body.id}`,revision:`eq.${ctx.body.revision}`},'PATCH',{...input,revision:ctx.body.revision+1,updated_by:ctx.user.id,updated_at:now},false,'return=representation');
   if(!rows.length)fail(409,'This price changed elsewhere. Reload it before saving.');
   return{quote:rows[0],saved:true};
  }
  if((await ctx.db(TABLE,{client_email:`eq.${input.client_email}`,select:'id',limit:'1'})).length)fail(409,'This client already has a price. Select Load existing price before editing.');
  const rows=await ctx.db(TABLE,{},'POST',{...input,revision:1,created_by:ctx.user.id,updated_by:ctx.user.id,updated_at:now},false,'return=representation');
  return{quote:rows[0],saved:true};
 }
 fail(404,'Pricing action not found.');
}
