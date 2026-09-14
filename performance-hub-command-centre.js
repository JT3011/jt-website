import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient("https://hunrekcnmtabowiivmrk.supabase.co","sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ",{auth:{persistSession:true,autoRefreshToken:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money=pence=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format((pence||0)/100);
const when=value=>value?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"Never";
let connections=[];

function toast(message,error=false){const el=$("toast");el.textContent=message;el.style.borderColor=error?"var(--bad)":"var(--gold)";el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),3200)}

async function requireOwner(){
  const {data:{user}}=await db.auth.getUser();
  if(!user){location.href="/performance-hub-login.html";return false}
  const {data,error}=await db.rpc("session_connect_get_staff_context");
  if(error||data?.[0]?.role!=="owner"){$("loading").textContent="This Command Centre is restricted to the business owner.";return false}
  return true;
}

async function loadConnections(){
  const {data,error}=await db.from("jt_ops_connections").select("*").order("label");
  if(error)throw error;connections=data||[];
  $("connections").innerHTML=connections.map(c=>`<article class="card"><div class="connection-top"><strong>${esc(c.label)}</strong><span class="status ${esc(c.status)}">${esc(c.status.replace("_"," "))}</span></div><p>${esc(c.status_detail)}</p><span class="muted">Last sync: ${esc(when(c.last_synced_at))}</span></article>`).join("");
}

async function loadAutomations(){
  const {data,error}=await db.from("jt_ops_automation_settings").select("*").order("label");if(error)throw error;
  $("automations").innerHTML=(data||[]).map(a=>{const source={booking_sync:"calendly",payment_matching:"monzo",whatsapp_messages:"whatsapp",social_publishing:"buffer",ai_briefings:"chatgpt"}[a.automation_key];const ready=connections.find(c=>c.id===source)?.status==="connected";return `<div class="row"><div><strong>${esc(a.label)}</strong><div class="muted">${esc(ready?a.description:"Connect the service to activate")}</div></div><button class="toggle ${a.enabled?"on":""}" data-key="${esc(a.automation_key)}" data-enabled="${a.enabled}" ${ready?"":"disabled"} aria-label="Toggle ${esc(a.label)}"></button></div>`}).join("");
  document.querySelectorAll(".toggle").forEach(button=>button.addEventListener("click",()=>toggleAutomation(button)));
}

async function toggleAutomation(button){const enabled=button.dataset.enabled!=="true";const {error}=await db.from("jt_ops_automation_settings").update({enabled,mode:enabled?"automatic":"paused",updated_at:new Date().toISOString()}).eq("automation_key",button.dataset.key);if(error)return toast(error.message,true);await log("automation_changed","command_centre",`${button.dataset.key} ${enabled?"enabled":"paused"}`);await loadAutomations();toast(enabled?"Automation enabled":"Automation paused")}

async function loadMetrics(){
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString(),day=new Date();day.setHours(0,0,0,0);const end=new Date(day);end.setDate(end.getDate()+1);
  const [sessions,payments,messages,content]=await Promise.all([
    db.from("session_connect_sessions").select("id",{count:"exact",head:true}).gte("start_at",day.toISOString()).lt("start_at",end.toISOString()).neq("status","cancelled"),
    db.from("jt_ops_payments").select("amount_pence").gte("paid_at",start).in("status",["matched","confirmed"]),
    db.from("jt_ops_message_tasks").select("id",{count:"exact",head:true}).in("status",["open","prepared"]),
    db.from("jt_ops_content_queue").select("id",{count:"exact",head:true}).in("status",["ready","scheduled"])
  ]);
  $("todaySessions").textContent=sessions.count??0;$("monthRevenue").textContent=money((payments.data||[]).reduce((s,p)=>s+p.amount_pence,0));$("openMessages").textContent=messages.count??0;$("contentReady").textContent=content.count??0;
}

async function loadActions(){const {data,error}=await db.from("jt_ops_message_tasks").select("*").in("status",["open","prepared"]).order("due_at",{ascending:true,nullsFirst:false}).limit(8);if(error)throw error;if(!data?.length){$("actions").className="empty";$("actions").textContent="No open actions.";return}$("actions").className="";$("actions").innerHTML=data.map(a=>`<div class="row"><div><strong>${esc(a.contact_name)}</strong><div class="muted">${esc(a.summary)}</div></div><span class="status">${esc(a.status)}</span></div>`).join("")}
async function loadActivity(){const {data,error}=await db.from("jt_ops_activity_log").select("*").order("created_at",{ascending:false}).limit(10);if(error)throw error;$("activity").innerHTML=data?.length?data.map(a=>`<li><span>${esc(a.summary)}</span><span class="muted">${esc(when(a.created_at))}</span></li>`).join(""):`<li class="empty">Activity will appear here.</li>`}
async function log(event_type,source,summary,outcome="success"){await db.from("jt_ops_activity_log").insert({event_type,source,summary,outcome})}

$("paymentForm").addEventListener("submit",async e=>{e.preventDefault();const amount=Math.round(Number($("amount").value)*100);const record={client_name:$("clientName").value.trim(),player_name:$("playerName").value.trim()||null,amount_pence:amount,method:$("method").value,status:"confirmed",reference:$("reference").value.trim()||null};const {error}=await db.from("jt_ops_payments").insert(record);if(error)return toast(error.message,true);await log("payment_logged","command_centre",`${record.client_name}: ${money(amount)} ${record.method}`);e.target.reset();toast("Payment logged");await Promise.all([loadMetrics(),loadActivity()])});
$("refresh").addEventListener("click",()=>loadAll());
$("signOut").addEventListener("click",async()=>{await db.auth.signOut();location.href="/performance-hub-login.html"});

async function loadAll(){try{await loadConnections();await Promise.all([loadAutomations(),loadMetrics(),loadActions(),loadActivity()])}catch(error){toast(error.message||"Command Centre could not load",true)}}
if(await requireOwner()){$("loading").classList.add("hidden");$("app").classList.remove("hidden");await loadAll()}
