import {connectionToken,fail} from './hub-integrations.mjs';
import {withProviderSync} from './provider-sync-state.mjs';
export const BASE = 'appfxqoZZWAqFgaIu';
export const PLAYERS = 'tblLqAsqaegQarJwG';
export const PAYMENTS = 'tblbALLdCCcML7lHG';
export const F = {
  name: 'fldHywXlmWQrlX6Hf', fallbackName: 'fldwYEJcw0rABz91D', payments: 'fldl736fChLtnfnqk',
  remaining: 'fldvc8djsV6LKeug4', purchased: 'fldG76Un7xQtO4CYV', used: 'fld5t8zvFBWPjrdoF',
  service: 'fldb6f65wjltrsZZf', players: 'fldYD8bKUXRQ8vAK8',
  usageDate: 'fld4CRcM28FoDjKot', paymentDate: 'fldRSgMlW3gCFDm2m'
};
const ids = (v) => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : x.id) : [];
const number = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;

export function summariseCredits(player, payments) {
  const linked = new Set(ids(player.fields[F.payments]));
  return payments.filter(p => linked.has(p.id) && ids(p.fields[F.players]).includes(player.id)).map(p => ({
    service: typeof p.fields[F.service] === 'string' ? p.fields[F.service] : p.fields[F.service]?.name || 'Coaching sessions',
    remaining: number(p.fields[F.remaining]), purchased: number(p.fields[F.purchased]),
    used: number(p.fields[F.used]) ?? 0,
    source_updated_at: [p.fields[F.usageDate], p.fields[F.paymentDate]].filter(x => typeof x === 'string').sort().at(-1) || null
  }));
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
    const players=await records(PLAYERS,[F.name,F.fallbackName,F.payments]);
    const payments=await records(PAYMENTS,[F.remaining,F.purchased,F.used,F.service,F.players,F.usageDate,F.paymentDate]);
    const now=new Date().toISOString();
    const snapshots=players.map(p=>({airtable_record_id:p.id,display_name:p.fields[F.name]||p.fields[F.fallbackName]||'Player',booking_names:[...new Set([p.fields[F.name],p.fields[F.fallbackName]].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))],credits:summariseCredits(p,payments),synced_at:now}));
    if(snapshots.length)await ctx.db('hub_airtable_players',{on_conflict:'airtable_record_id'},'POST',snapshots);
    await ctx.db('rpc/hub_reconcile_bookings',{},'POST',{});
    return{connected:true,count:players.length,synced_at:now};
  });
}
