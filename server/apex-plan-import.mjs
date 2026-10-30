import {createHash} from 'node:crypto';
export const APEX_BASE='appfxqoZZWAqFgaIu',APEX_TABLE='tblQyxPWcKJJsygAu';
export const APEX_FIELDS={name:'fldpwimL9Z92yC6ep',players:'fldA7OmRsAM16wGE5',date:'fld1tBg1hC4q4Dewz',content:'fldlY3LddPUYjE10H',booking:'fldqVWUwcjQXM9uSt'};
// Explicit coach labels only. Never infer a coach from a player's name.
export function sourceCalendar(content){
  const header=content.split('\n').slice(0,9).join('\n').replace(/\*\*/g,'');
  const named=header.match(/\bCoach:\s*(JT|James Taylor|George(?: Bellis)?|Charlie(?: Rogers)?|Billy)\b/i)||header.match(/\|\s*(JT|George|Charlie|Billy)\s*\|/i)||header.match(/\|\s*(JT|George|Charlie|Billy)\s*$/im)||header.match(/\bBooking:\s*(JT|George|Charlie|Billy)\s*\|/i);
  if(!named)return null;
  return named[1].toLowerCase().startsWith('j')?'jt':named[1].toLowerCase().split(' ')[0];
}
export function importPlan(record,{links=[],sessions=[],calendars=[]}){
  const f=record.cellValuesByFieldId||record.fields||{},content=String(f[APEX_FIELDS.content]||'').trim(),date=f[APEX_FIELDS.date];
  if(!content||content.length>40000||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
  const uri=/^https:\/\/api\.calendly\.com\/scheduled_events\/[a-f0-9-]{36}$/i.test(f[APEX_FIELDS.booking]||'')?f[APEX_FIELDS.booking]:null;
  const sourcePlayers=(f[APEX_FIELDS.players]||[]).map(x=>typeof x==='string'?x:x.id);
  const matchedPlayers=sourcePlayers.map(id=>links.find(l=>l.airtable_record_id===id)?.player_user_id).filter(Boolean);
  // A shared sheet remains JT-only until individually reviewed; never expose another child's background.
  const player=sourcePlayers.length===1&&matchedPlayers.length===1?matchedPlayers[0]:null;
  const candidates=uri?sessions.filter(s=>s.external_event_uri===uri&&(!player||s.player_user_id===player)):[];
  const session=sourcePlayers.length<=1&&candidates.length===1?candidates[0]:null;
  const named=sourceCalendar(content),calendar=session?calendars.find(c=>c.coach_user_id===session.coach_user_id)?.id:named;
  const sessionLink=session?links.find(l=>l.player_user_id===session.player_user_id):null;
  const mismatch=!!(named&&calendar&&named!==calendar)||!!(player&&session&&player!==session.player_user_id)||!!(sourcePlayers.length===1&&sessionLink&&!sourcePlayers.includes(sessionLink.airtable_record_id));
  const resolvedPlayer=!mismatch?(player||session?.player_user_id||null):null;
  const resolvedCalendar=!mismatch&&calendars.some(c=>c.id===calendar)?calendar:null;
  return{session_id:!mismatch?session?.id||null:null,player_user_id:resolvedPlayer,calendar_id:resolvedCalendar,session_date:date,booking_uri:uri,title:`${String(f[APEX_FIELDS.name]||'Player').slice(0,130)} · Apex session plan`,objective:'',content,status:resolvedPlayer&&resolvedCalendar?'published':'draft',source_record_id:record.id,source_name:'Apex · Airtable session log',source_hash:createHash('sha256').update(content).digest('hex')};
}
