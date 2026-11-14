import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteEmail,quoteInput,quotesWork} from '../server/programmes/quotes.mjs';
import {plansWork} from '../api/hub-session-plans.mjs';

const id='11111111-1111-4111-8111-111111111111';
const input={client_name:'Example client',client_email:'client@example.test',price:'65.25',billing:'one_off',description:'Personal meal plan and one review',active:true};
const row={id,...quoteInput(input),revision:2,updated_at:'2026-11-14T12:00:00Z'};
const ctx=(overrides={})=>({owner:true,user:{id,email:'client@example.test',email_confirmed_at:'2026-11-14T00:00:00Z'},params:new URLSearchParams(),method:'GET',action:'prices',db:async()=>[],...overrides});

test('prices use exact pence, preserve email identity and validate the payment basis',()=>{
 assert.equal(quoteInput(input).amount_pence,6525);assert.equal(quoteInput({...input,price:'0'}).amount_pence,0);assert.equal(quoteInput({...input,price:'12.99',billing:'monthly'}).amount_pence,1299);
 assert.equal(quoteEmail(' Client+plan@Example.Test '),'client+plan@example.test');
 for(const price of ['-1','NaN','Infinity','1e2','1.999','10001','£80',''])assert.throws(()=>quoteInput({...input,price}));
 assert.throws(()=>quoteInput({...input,billing:'weekly'}));assert.throws(()=>quoteInput({...input,active:'true'}));assert.throws(()=>quoteInput({...input,description:''}));
});
test('only the owner can list, search or change a quote',async()=>{
 for(const [method,action] of [['GET','prices'],['GET','find-price'],['POST','save-price']]){
  let called=false;await assert.rejects(quotesWork(ctx({owner:false,method,action,body:input,db:async()=>{called=true;return[];}})),{status:403});assert.equal(called,false);
 }
});
test('client price lookup uses only the verified account email and returns no contact details',async()=>{
 let query;const result=await quotesWork(ctx({owner:false,action:'my-price',params:new URLSearchParams({email:'victim@example.test'}),user:{id,email:'CLIENT@EXAMPLE.TEST',email_confirmed_at:'confirmed',user_metadata:{email:'victim@example.test'}},db:async(t,q)=>{query=q;return[row];}}));
 assert.equal(query.client_email,'eq.client@example.test');assert.equal(query.active,'eq.true');assert.equal(query.limit,'1');assert.equal(result.quote.amount_pence,6525);assert.equal(result.quote.client_email,undefined);assert.equal(result.quote.id,undefined);assert.equal(result.can_manage,false);
 await assert.rejects(quotesWork(ctx({owner:false,action:'my-price',user:{email:'client@example.test'}})),{status:403});
});
test('unknown and hidden quotes return no price without accepting a fallback or caller amount',async()=>{
 const result=await quotesWork(ctx({owner:false,action:'my-price',params:new URLSearchParams({price:'1'}),db:async()=>[]}));assert.equal(result.quote,null);
});
test('saving a new quote creates no payment or subscription and never overwrites an existing email',async()=>{
 const writes=[];const result=await quotesWork(ctx({method:'POST',action:'save-price',body:input,db:async(t,q,m,b)=>{assert.equal(t,'hub_nutrition_quotes');if(m==='POST'){writes.push(b);return[{...b,id}];}return[];}}));
 assert.equal(result.saved,true);assert.equal(writes[0].revision,1);assert.equal(writes[0].amount_pence,6525);assert.equal(writes[0].billing,'one_off');
 await assert.rejects(quotesWork(ctx({method:'POST',action:'save-price',body:input,db:async()=>[row]})),{status:409});
});
test('edits use a revision guard, cannot move quotes between emails, and support hiding',async()=>{
 let patchQuery,patch;const db=async(t,q,m,b)=>{if(m==='PATCH'){patchQuery=q;patch=b;return[{id,...b}];}return[row];};
 const result=await quotesWork(ctx({method:'POST',action:'save-price',body:{...input,id,revision:2,price:'90',active:false},db}));assert.equal(patchQuery.revision,'eq.2');assert.equal(patch.revision,3);assert.equal(patch.active,false);assert.equal(result.quote.amount_pence,9000);
 await assert.rejects(quotesWork(ctx({method:'POST',action:'save-price',body:{...input,id,revision:1},db})),{status:409});
 await assert.rejects(quotesWork(ctx({method:'POST',action:'save-price',body:{...input,id,revision:2,client_email:'different@example.test'},db})),{status:400});
 await assert.rejects(quotesWork(ctx({method:'POST',action:'save-price',body:{...input,id,revision:2},db:async(t,q,m)=>m==='PATCH'?[]:[row]})),{status:409});
});
test('the shared endpoint routes pricing through its owner checks',async()=>{
 await assert.rejects(plansWork(ctx({owner:false,method:'POST',action:'save-price',body:{...input,programme:'nutrition-pricing'}})),{status:403});
 const result=await plansWork(ctx({owner:false,params:new URLSearchParams({programme:'nutrition-pricing'}),action:'my-price'}));assert.equal(result.quote,null);
});
test('pagination includes a next page only when another row exists',async()=>{
 const result=await quotesWork(ctx({params:new URLSearchParams({offset:'50'}),db:async(t,q)=>{assert.equal(q.offset,'50');assert.equal(q.limit,'51');return Array.from({length:51},()=>row);}}));assert.equal(result.quotes.length,50);assert.equal(result.next_offset,100);
 await assert.rejects(quotesWork(ctx({params:new URLSearchParams({offset:'-1'})})),{status:400});
});
