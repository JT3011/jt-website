import {hubApi,escapeHtml as e,money} from '/performance-hub-integrations.js?v=20261114';
const panel=document.getElementById('clientPrice');
async function loadPrice(){
 try{
  const result=await hubApi('hub-session-plans',null,'?programme=nutrition-pricing&action=my-price');
  if(result.can_manage){panel.innerHTML='<div class="quote-toolbar"><p class="sub">Set a different nutrition price for each client, using the same sign-up link.</p><a class="button secondary small" href="/nutrition-pricing.html">Set client prices</a></div>';panel.hidden=false;return;}
  if(!result.quote){panel.hidden=true;panel.replaceChildren();return;}
  const q=result.quote;
  panel.innerHTML=`<div class="quote-toolbar"><p class="eyebrow">YOUR PERSONAL QUOTE</p><button class="text-button" id="refreshClientPrice">Refresh price</button></div><h2>Your nutrition programme</h2><p class="quote-amount">${money(q.amount_pence/100)}</p><p class="muted">${q.billing==='monthly'?'Per month':'One-off payment'}</p><p class="quote-description">${e(q.description)}</p><p class="small muted">Confirm the details and arrange payment with JT. No payment is taken and no subscription is started on this page.</p>`;
  panel.hidden=false;document.getElementById('refreshClientPrice').onclick=loadPrice;
 }catch{
  panel.innerHTML='<p class="muted">Your saved price could not be loaded. Please refresh or check with JT before arranging payment.</p><button class="text-button" id="retryClientPrice">Try again</button>';panel.hidden=false;document.getElementById('retryClientPrice').onclick=loadPrice;
 }
}
loadPrice();
