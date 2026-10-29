import {supabase} from '/performance-hub-free-access.js';
export {supabase};
export const escapeHtml=(value='')=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function hubApi(path,body,query=''){
  const{data:{session}}=await supabase.auth.getSession();
  if(!session){location.href='/performance-hub-login.html';throw Error('Sign in to continue.');}
  const response=await fetch(`/api/${path}${query}`,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');return data;
}
export const money=(value)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(value);
export const ukDate=(iso,options={dateStyle:'medium'})=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(iso));
