import {connectionToken,fail} from './hub-integrations.mjs';
import {withProviderSync} from './provider-sync-state.mjs';
export const BASE = 'appfxqoZZWAqFgaIu';
export const PLAYERS = 'tblLqAsqaegQarJwG';
export const PAYMENTS = 'tblbALLdCCcML7lHG';
export const MASTER = 'tblTgJcDJ3v34wL2X';
export const GYM = 'tblad61pjFP6jndAJ';
export const F = {
  name: 'fldHywXlmWQrlX6Hf', fallbackName: 'fldwYEJcw0rABz91D', payments: 'fldl736fChLtnfnqk',
  remaining: 'fldvc8djsV6LKeug4', purchased: 'fldG76Un7xQtO4CYV', used: 'fld5t8zvFBWPjrdoF',
  service: 'fldb6f65wjltrsZZf', players: 'fldYD8bKUXRQ8vAK8',
  usageDate: 'fld4CRcM28FoDjKot', paymentDate: 'fldRSgMlW3gCFDm2m',
  paymentName: 'fld5Xt3EuQH4fmI4x', playerMaster: 'fldwzKjKA7VDp7Jjl', paymentMaster: 'fldidHuSMvm5PspAl',
  masterName: 'fldzDc14dEMgNdyO6', masterPlayers: 'fld43Ysq5hUZ7ogU5', masterPayments: 'fldXX54CP1iX3F3z2',
  masterGym: 'fldFMVw2IkewL2hfV', gymName: 'fldBQQDENfDDbp4tO', gymMaster: 'fldmTCkqgRd3hImda'
};
const ids = (v) => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : x.id) : [];
const number = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const normalise = v => typeof v==='string'?v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim():'';
const unique = values => [...new Set(values)];
const validName = v => v && !/^(player|name needed)( |$)/.test(v);

function creditEntry(p, shared=false) {
  return {
    source_payment_id:p.id, payment_name:p.fields[F.paymentName]||'', shared,
    // Keep Airtable's formula value; only its display is rounded to the field's precision.
    display_precision:0,
    service:typeof p.fields[F.service]==='string'?p.fields[F.service]:p.fields[F.service]?.name||'Coaching sessions',
    remaining:number(p.fields[F.remaining]), purchased:number(p.fields[F.purchased]), used:number(p.fields[F.used])??0,
    source_updated_at:[p.fields[F.usageDate],p.fields[F.paymentDate]].filter(x=>typeof x==='string').sort().at(-1)||null
  };
}

export function summariseCredits(player, payments) {
  const linked = new Set(ids(player.fields[F.payments]));
  return payments.filter(p => linked.has(p.id) && ids(p.fields[F.players]).includes(player.id)).map(p=>creditEntry(p,ids(p.fields[F.players]).length>1));
}

export function buildCreditSnapshots(players,payments,masters=[],gym=[],aliases=[],now=new Date().toISOString()) {
  const clients=[...players,...gym.map(p=>({...p,fields:{...p.fields,[F.name]:p.fields[F.gymName],[F.playerMaster]:p.fields[F.gymMaster]},gym:true}))];
  const byId=new Map(clients.map(p=>[p.id,p]));
  const masterMembers=m=>unique([...ids(m.fields[F.masterPlayers]),...ids(m.fields[F.masterGym])]).filter(id=>ids(byId.get(id)?.fields[F.playerMaster]).includes(m.id));
  const names=new Map();
  for(const p of clients){
    const reviewed=aliases.find(a=>a.id===p.id);
    const values=[p.fields[F.name],p.fields[F.fallbackName],reviewed?.player_name,...(reviewed?.aliases||[]),...masters.filter(m=>masterMembers(m).includes(p.id)).map(m=>m.fields[F.masterName])];
    for(const name of unique(values.map(normalise).filter(validName))){
      if(!names.has(name))names.set(name,new Set());
      names.get(name).add(p.id);
    }
  }
  function nameMatch(value){
    const full=normalise(value),exact=names.get(full);
    // Never infer a financial link from a first name alone or a partial/fuzzy match.
    if(full.includes(' ')&&exact?.size===1)return [...exact];
    if(exact?.size>1)return [];
    const parts=typeof value==='string'&&value.match(/^([^()]+)\(([^()]+)\)\s*([^()]*)$/);
    if(!parts)return [];
    const player=names.get(normalise(parts[1]));
    const contactName=normalise(`${parts[2]} ${parts[3]}`),contact=names.get(contactName);
    if(!contactName.includes(' ')||!player||!contact)return [];
    const both=[...player].filter(id=>contact.has(id));
    return both.length===1?both:[];
  }
  const balances=new Map(clients.map(p=>[p.id,[]]));
  for(const payment of new Map(payments.map(p=>[p.id,p])).values()){
    const direct=ids(payment.fields[F.players]);
    let members=[];
    if(direct.length){
      members=direct.filter(id=>ids(byId.get(id)?.fields[F.payments]).includes(payment.id));
    }else{
      const linkedMasters=ids(payment.fields[F.paymentMaster]);
      if(linkedMasters.length)members=unique(masters.filter(m=>linkedMasters.includes(m.id)&&ids(m.fields[F.masterPayments]).includes(payment.id)).flatMap(masterMembers));
      else members=nameMatch(payment.fields[F.paymentName]);
    }
    for(const id of members)balances.get(id)?.push(creditEntry(payment,members.length>1));
  }
  return clients.map(p=>({airtable_record_id:p.id,display_name:p.fields[F.name]||p.fields[F.fallbackName]||'Player',booking_names:unique([p.fields[F.name],p.fields[F.fallbackName]].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim())),credits:balances.get(p.id),synced_at:now}));
}

export async function airtableConnection(ctx){
  if(ctx.env?.AIRTABLE_READ_TOKEN)return ctx.env.AIRTABLE_READ_TOKEN;
  for(const owner of await ctx.db('hub_staff',{role:'eq.owner',select:'user_id'})){
    const saved=await connectionToken(ctx,'airtable',owner.user_id);
    if(saved?.metadata.base===BASE)return saved.token;
  }
  return null;
}
export async function syncAirtable(ctx){
  const token=await airtableConnection(ctx);if(!token)return{connected:false};
  return withProviderSync(ctx,'airtable:credits',300,async()=>{
    let lastCall=0;
    async function records(table,fields){
      const rows=[];let offset;
      for(let page=0;page<100;page++){
        const wait=Math.max(0,520-(Date.now()-lastCall));if(wait)await new Promise(r=>setTimeout(r,wait));
        const url=new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
        url.searchParams.set('returnFieldsByFieldId','true');url.searchParams.set('pageSize','100');
        for(const field of fields)url.searchParams.append('fields[]',field);
        if(offset)url.searchParams.set('offset',offset);
        lastCall=Date.now();
        const response=await ctx.fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
        if(response.status===429)throw Object.assign(new Error('Airtable refresh is temporarily limited.'),{status:503,retryAfter:300});
        if(!response.ok)fail(503,'Airtable updates are unavailable.');
        const data=await response.json();if(!Array.isArray(data.records))fail(503,'Airtable returned an incomplete response.');
        rows.push(...data.records);offset=data.offset;if(!offset)return rows;
      }
      fail(503,'Airtable sync could not load the complete table.');
    }
    const players=await records(PLAYERS,[F.name,F.fallbackName,F.payments,F.playerMaster]);
    const payments=await records(PAYMENTS,[F.paymentName,F.remaining,F.purchased,F.used,F.service,F.players,F.paymentMaster,F.usageDate,F.paymentDate]);
    const masters=await records(MASTER,[F.masterName,F.masterPlayers,F.masterGym,F.masterPayments]);
    const gym=await records(GYM,[F.gymName,F.gymMaster]);
    const aliases=await ctx.db('hub_apex_context',{select:'id,player_name,aliases'});
    const now=new Date().toISOString();
    const snapshots=buildCreditSnapshots(players,payments,masters,gym,aliases,now);
    if(snapshots.length)await ctx.db('hub_airtable_players',{on_conflict:'airtable_record_id'},'POST',snapshots);
    await ctx.db('rpc/hub_reconcile_bookings',{},'POST',{});
    return{connected:true,count:snapshots.length,synced_at:now};
  });
}
