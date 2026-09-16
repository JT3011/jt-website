import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const db=createClient("https://hunrekcnmtabowiivmrk.supabase.co","sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ",{auth:{persistSession:true,autoRefreshToken:true}});
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money=pence=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format((pence||0)/100);
const moneyExact=pence=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2}).format((pence||0)/100);
const when=value=>value?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"Never";
let connections=[];
let activeDetailType=null;
const sourceLinks={
  calendly:"https://calendly.com/app/scheduled_events/user/me",
  airtable:"https://airtable.com/appfxqoZZWAqFgaIu",
  buffer:"https://publish.buffer.com/",
  whatsapp:"https://business.facebook.com/wa/manage/home/",
  monzo:"https://business.monzo.com/"
};
const sourcePanels={calendly:"bookings",airtable:"payments",buffer:"content",whatsapp:"messages"};

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
  $("connections").innerHTML=connections.map(c=>`<article class="card"><div class="connection-top"><strong>${esc(c.label)}</strong><span class="status ${esc(c.status)}">${esc(c.status.replace("_"," "))}</span></div><p>${esc(c.status_detail)}</p><span class="muted">Last sync: ${esc(when(c.last_synced_at))}</span><div class="connection-actions">${sourcePanels[c.id]?`<button class="mini-btn gold" type="button" data-detail="${esc(sourcePanels[c.id])}">View in Hub</button>`:""}${sourceLinks[c.id]?`<a class="mini-btn" href="${esc(sourceLinks[c.id])}" target="_blank" rel="noreferrer">Open source</a>`:""}</div></article>`).join("");
  $("connections").querySelectorAll("[data-detail]").forEach(button=>button.addEventListener("click",()=>openDetails(button.dataset.detail)));
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
    db.from("session_connect_booking_queue").select("id",{count:"exact",head:true}).gte("start_at",day.toISOString()).lt("start_at",end.toISOString()).neq("booking_status","canceled"),
    db.from("jt_ops_payments").select("amount_pence").gte("paid_at",start).in("status",["matched","confirmed"]),
    db.from("jt_ops_message_tasks").select("id",{count:"exact",head:true}).in("status",["open","prepared"]),
    db.from("jt_ops_content_queue").select("id",{count:"exact",head:true}).in("status",["ready","scheduled"])
  ]);
  $("todaySessions").textContent=sessions.count??0;$("monthRevenue").textContent=money((payments.data||[]).reduce((s,p)=>s+p.amount_pence,0));$("openMessages").textContent=messages.count??0;$("contentReady").textContent=content.count??0;
}

async function loadActions(){const {data,error}=await db.from("jt_ops_message_tasks").select("*").in("status",["open","prepared"]).order("due_at",{ascending:true,nullsFirst:false}).limit(8);if(error)throw error;if(!data?.length){$("actions").className="empty";$("actions").textContent="No open actions.";return}$("actions").className="";$("actions").innerHTML=data.map(a=>`<div class="row"><div><strong>${esc(a.contact_name)}</strong><div class="muted">${esc(a.summary)}</div></div><span class="status">${esc(a.status)}</span></div>`).join("")}
async function loadActivity(){const {data,error}=await db.from("jt_ops_activity_log").select("*").order("created_at",{ascending:false}).limit(10);if(error)throw error;$("activity").innerHTML=data?.length?data.map(a=>`<li><span>${esc(a.summary)}</span><span class="muted">${esc(when(a.created_at))}</span></li>`).join(""):`<li class="empty">Activity will appear here.</li>`}

function detailValue(row,...keys){for(const key of keys){if(row?.[key]!==null&&row?.[key]!==undefined&&row[key]!=="")return row[key]}return ""}
function renderDetailRows(type,rows){
  if(!rows?.length){$("detailList").innerHTML=`<div class="detail-empty">No ${esc({bookings:"synced Calendly bookings",payments:"payment records",messages:"message actions",content:"content records"}[type]||"records")} found.</div>`;return}
  if(type === "bookings"){
    $("detailList").innerHTML=rows.map(row=>{
      const name=detailValue(row,"invitee_name","name")||"Unnamed invitee";
      const event=detailValue(row,"event_name","name")||"Booking";
      const timing=detailValue(row,"start_at","starts_at","start_time");
      const status=detailValue(row,"booking_status","source_status","status")||"—";
      const contact=detailValue(row,"invitee_email","email")||detailValue(row,"invitee_phone","phone")||"No contact details";
      const coach=detailValue(row,"coach_email","coach_name","host_name","host_identity")||"Coach not listed";
      return `<div class="detail-row"><div><strong>${esc(name)}</strong><span>${esc(event)}</span></div><span>${esc(timing?when(timing):"Time not listed")}<br>${esc(contact)}</span><span>${esc(coach)}<br>Status: ${esc(status)}</span><span class="detail-value">${esc(detailValue(row,"venue")||"Venue TBC")}</span></div>`;
    }).join("");
    return;
  }
  if(type === "payments"){
    $("detailList").innerHTML=rows.map(row=>{
      const client=detailValue(row,"client_name","name")||"Unnamed client";
      const paid=detailValue(row,"paid_at","payment_date","created_at");
      const method=detailValue(row,"method","payment_method")||"other";
      const status=detailValue(row,"status")||"confirmed";
      const isExternal=Boolean(row.external_record_id);
      return `<div class="detail-row"><div><strong>${esc(client)}</strong><span>${esc(detailValue(row,"player_name")||"No player linked")}</span></div><span>${esc(paid?when(paid):"Date not listed")}<br>${esc(detailValue(row,"reference","notes")||"No reference")}</span><span>${esc(method)}<br>Status: ${esc(status)}</span><div class="detail-actions"><span class="detail-value">${esc(moneyExact(Number(detailValue(row,"amount_pence","amount")||0)))}</span>${isExternal?"":`<button class="mini-btn" type="button" data-record-action="payment-status" data-record-id="${esc(row.id)}" data-value="${status==="confirmed"?"refunded":"confirmed"}">${status==="confirmed"?"Mark refunded":"Confirm"}</button>`}</div></div>`;
    }).join("");
    return;
  }
  if(type === "messages"){
    $("detailList").innerHTML=rows.map(row=>`<div class="detail-row"><div><strong>${esc(row.contact_name||"Unnamed contact")}</strong><span>${esc(row.player_name||row.task_type||"Follow-up")}</span></div><span>${esc(row.summary||"No summary")}<br>${esc(row.due_at?when(row.due_at):"No due date")}</span><span>${esc(row.channel||"other")}<br>Status: ${esc(row.status)}</span><div class="detail-actions">${row.status!=="prepared"?`<button class="mini-btn gold" type="button" data-record-action="message-status" data-record-id="${esc(row.id)}" data-value="prepared">Prepared</button>`:""}${row.status!=="closed"?`<button class="mini-btn" type="button" data-record-action="message-status" data-record-id="${esc(row.id)}" data-value="closed">Close</button>`:`<button class="mini-btn" type="button" data-record-action="message-status" data-record-id="${esc(row.id)}" data-value="open">Reopen</button>`}</div></div>`).join("");
    $("detailList").insertAdjacentHTML("beforeend",`<div class="detail-note">This controls the Hub task workflow only. It does not send a WhatsApp, email or SMS unless that service is separately authorised.</div>`);
    return;
  }
  $("detailList").innerHTML=rows.map(row=>{
    const external=Boolean(row.external_post_id);
    const canReady=!external&&["draft","ready"].includes(row.status);
    return `<div class="detail-row"><div><strong>${esc(row.title||"Untitled content")}</strong><span>${esc((row.caption||"No caption").slice(0,140))}</span></div><span>${esc(row.scheduled_for?when(row.scheduled_for):"Not scheduled")}</span><span>${esc(row.platform||"all")}<br>Status: ${esc(row.status)}</span><div class="detail-actions">${canReady?`<button class="mini-btn gold" type="button" data-record-action="content-status" data-record-id="${esc(row.id)}" data-value="${row.status==="draft"?"ready":"draft"}">${row.status==="draft"?"Approve ready":"Return draft"}</button>`:`<span class="detail-value">${external?"Buffer synced":"Managed"}</span>`}</div></div>`;
  }).join("");
  $("detailList").insertAdjacentHTML("beforeend",`<div class="detail-note">Buffer-synced posts are source-protected. Hub-created drafts can be approved as ready; publishing still requires the authorised Buffer workflow.</div>`);
}
async function openDetails(type){
  const config={bookings:{title:"Calendly bookings",table:"session_connect_booking_queue",order:"start_at"},payments:{title:"Payment records",table:"jt_ops_payments",order:"paid_at"},messages:{title:"Message actions",table:"jt_ops_message_tasks",order:"created_at"},content:{title:"Content queue",table:"jt_ops_content_queue",order:"updated_at"}}[type];
  if(!config)return;
  activeDetailType=type;
  $("detailTitle").textContent=config.title;
  $("detailSummary").innerHTML=`<span class="detail-chip">Loading latest synced records</span>`;
  $("detailList").innerHTML=`<div class="detail-loading">Loading details…</div>`;
  $("detailModal").classList.remove("hidden");
  const {data,error}=await db.from(config.table).select("*").order(config.order,{ascending:false}).limit(60);
  if(error){$("detailSummary").innerHTML=`<span class="detail-chip">Could not load synced data</span>`;$("detailList").innerHTML=`<div class="detail-empty">${esc(error.message)}</div>`;return}
  const rows=data||[];
  const mode=type==="bookings"?"Source-protected":type==="content"?"Safe approvals":"Owner controls";
  $("detailSummary").innerHTML=`<span class="detail-chip">${rows.length} record${rows.length===1?"":"s"}</span><span class="detail-chip">${mode}</span>`;
  renderDetailRows(type,rows);
}
function closeDetails(){$("detailModal").classList.add("hidden");activeDetailType=null}
async function log(event_type,source,summary,outcome="success"){await db.from("jt_ops_activity_log").insert({event_type,source,summary,outcome})}

async function updateRecordAction(button){
  const action=button.dataset.recordAction,id=button.dataset.recordId,value=button.dataset.value;
  const config={
    "payment-status":{table:"jt_ops_payments",allowed:["confirmed","refunded"],event:"payment_status_changed"},
    "message-status":{table:"jt_ops_message_tasks",allowed:["open","prepared","closed"],event:"message_status_changed"},
    "content-status":{table:"jt_ops_content_queue",allowed:["draft","ready"],event:"content_status_changed"}
  }[action];
  if(!config||!config.allowed.includes(value)||!id)return;
  button.disabled=true;
  let query=db.from(config.table).update({status:value,updated_at:new Date().toISOString()}).eq("id",id);
  if(action==="content-status")query=query.is("external_post_id",null);
  const {error}=await query;
  if(error){button.disabled=false;return toast(error.message,true)}
  await log(config.event,"command_centre",`One ${activeDetailType||"record"} status updated`);
  toast("Status updated");
  await Promise.all([loadMetrics(),loadActions(),loadActivity(),openDetails(activeDetailType)]);
}

$("paymentForm").addEventListener("submit",async e=>{e.preventDefault();const amount=Math.round(Number($("amount").value)*100);const record={client_name:$("clientName").value.trim(),player_name:$("playerName").value.trim()||null,amount_pence:amount,method:$("method").value,status:"confirmed",reference:$("reference").value.trim()||null};const {error}=await db.from("jt_ops_payments").insert(record);if(error)return toast(error.message,true);await log("payment_logged","command_centre",`One manual payment logged`);e.target.reset();toast("Payment logged");await Promise.all([loadMetrics(),loadActivity()])});
document.querySelectorAll("[data-detail]").forEach(button=>button.addEventListener("click",()=>openDetails(button.dataset.detail)));
$("closeDetails").addEventListener("click",closeDetails);
$("detailModal").addEventListener("click",event=>{const action=event.target.closest("[data-record-action]");if(action){updateRecordAction(action);return}if(event.target.id==="detailModal")closeDetails()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeDetails()});
$("refresh").addEventListener("click",()=>loadAll());
$("signOut").addEventListener("click",async()=>{await db.auth.signOut();location.href="/performance-hub-login.html"});

async function loadAll(){try{await loadConnections();await Promise.all([loadAutomations(),loadMetrics(),loadActions(),loadActivity()])}catch(error){toast(error.message||"Command Centre could not load",true)}}
if(await requireOwner()){$("loading").classList.add("hidden");$("app").classList.remove("hidden");await loadAll()}
