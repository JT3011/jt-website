import {airtableConnection,BASE,PLAYERS} from './airtable-credits.mjs';
import {APEX_TABLE,APEX_FIELDS} from './apex-plan-import.mjs';
import {positionFocus} from './apex-position-drills.mjs';
export const PLAYER_FIELDS={name:'fldHywXlmWQrlX6Hf',fallback:'fldwYEJcw0rABz91D',age:'fld5P9y3hmZvG8G0Y',position:'fld3Qr3nEVxz5jhk5',team:'fldF4xDh2o4xZwYvB',notes:'fldjfGk6P0FmewOBt',logs:'fldCdqudd22PTE1Nq'};
export const LOG_FIELDS={...APEX_FIELDS,status:'fld058f2sr02Llvv9',feedback:'fldfTKn93spHfGDpx'};
const text=v=>typeof v==='string'?v:typeof v?.name==='string'?v.name:'';
const choices=v=>Array.isArray(v)?v.map(text).filter(Boolean).join(' / '):text(v);
const recordIds=v=>(Array.isArray(v)?v:[]).map(x=>typeof x==='string'?x:x.id).filter(x=>/^rec[a-zA-Z0-9]+$/.test(x));
const short=(v,n=500)=>{const s=String(v||'').replace(/\s+/g,' ').trim();if(s.length<=n)return s;const end=s.lastIndexOf(' ',n-1);return s.slice(0,end>n/2?end:n-1)+'…';};
export function nextFocusFrom(notes) {
 const matches=[...String(notes||'').matchAll(/(?:PROPOSED NEXT SESSION[^\n]*|NEXT SESSION[^\n]*|NEXT FOCUS|Focus for next time)\s*[:\n]\s*([\s\S]*?)(?=\n\n[A-Z][A-Z /]+\n|SOURCE FILE REFERENCES|$)/gi)];
 return matches.at(-1)?.[1]?.trim()||'';
}
export function mergePlayerContext(match,profile,player,logs=[],completed=[],checkedAt=new Date().toISOString()) {
 const old=match.row?.context||{},fields=player?.fields;
 const livePosition=fields?choices(fields[PLAYER_FIELDS.position]):'';
 const hubPosition=[profile?.primary_position,profile?.secondary_position].filter(Boolean).join(' / ');
 const position=livePosition||hubPosition||(fields?'':old.position)||'';
 const positionSource=livePosition?'Airtable':hubPosition?'Hub profile':position?'saved Airtable context':'not recorded';
 const pastLogs=logs.filter(r=>!/cancel/i.test(text(r.fields[LOG_FIELDS.status])));
 const delivered=pastLogs.filter(r=>/^completed\b/i.test(text(r.fields[LOG_FIELDS.status]))&&text(r.fields[LOG_FIELDS.feedback])).sort((a,b)=>String(b.fields[LOG_FIELDS.date]).localeCompare(String(a.fields[LOG_FIELDS.date])));
 const latestHub=completed[0],latestAirtable=delivered[0];
 const hubNewer=latestHub&&(!latestAirtable||String(latestHub.start_at).slice(0,10)>=String(latestAirtable.fields[LOG_FIELDS.date]));
 const feedback=hubNewer?[latestHub.coach_feedback,latestHub.next_focus].filter(Boolean).join('\n'):text(latestAirtable?.fields[LOG_FIELDS.feedback]);
 const notes=fields?text(fields[PLAYER_FIELDS.notes]):old.notes||'';
 const nextFocus=hubNewer?latestHub.next_focus||nextFocusFrom(feedback):nextFocusFrom(feedback)||nextFocusFrom(notes);
 const date=hubNewer?latestHub.start_at?.slice(0,10):latestAirtable?.fields[LOG_FIELDS.date];
 const c={...old,
   age:fields?(typeof fields[PLAYER_FIELDS.age]==='number'?fields[PLAYER_FIELDS.age]:null):old.age,
   team:fields?text(fields[PLAYER_FIELDS.team]):old.team,
   position,position_source:positionSource,notes,next_focus:short(nextFocus,700),development_goal:profile?.development_goal||'',
   focus:short((nextFocus&&nextFocus.length<=240?nextFocus:'')||profile?.development_goal||(fields?positionFocus(position):old.focus)||positionFocus(position),240),
   evidence:[fields?`Airtable profile and notes checked ${checkedAt.slice(0,10)}.`:`Using saved coaching context${match.row?.checked_at?' from '+match.row.checked_at.slice(0,10):''}.`,
     feedback?`Latest confirmed feedback (${date}): ${short(feedback,650)}`:'No coach-confirmed recent delivery feedback found; previous plans do not prove delivery.',
     nextFocus?`Recorded next focus: ${short(nextFocus,450)}`:'Confirm the next priority with the player.',
     position?`Position source: ${positionSource}.`:'Position is not recorded; confirm before choosing specialist work.'].join(' ')
 };
 return {...match,row:{...(match.row||{}),player_name:text(fields?.[PLAYER_FIELDS.name])||text(fields?.[PLAYER_FIELDS.fallback])||match.row?.player_name||profile?.player_name,context:c,checked_at:fields?checkedAt:match.row?.checked_at}};
}
export async function loadPlanningContext(ctx,booking,match) {
 const checkedAt=new Date().toISOString(),sourceId=match.row?.id?.startsWith('rec')?match.row.id:null;
 const profile=booking.player_user_id?(await ctx.db('profiles',{id:`eq.${booking.player_user_id}`,select:'id,player_name,primary_position,secondary_position,development_goal',limit:'1'}))[0]:null;
 const since=booking.start_at.slice(0,10);
 const identity=sourceId?{airtable_record_id:`eq.${sourceId}`}:(booking.player_user_id?{player_user_id:`eq.${booking.player_user_id}`} :null);
 const [plans,completed]=await Promise.all([
   identity?ctx.db('hub_session_plans',{...identity,select:'id,booking_id,session_date,content,plan_sheet',session_date:`lte.${since}`,order:'session_date.desc,created_at.desc',limit:'12'},'GET',undefined,true):[],
   booking.player_user_id?ctx.db('session_connect_sessions',{player_user_id:`eq.${booking.player_user_id}`,status:'eq.completed',start_at:`lt.${booking.start_at}`,select:'start_at,coach_feedback,next_focus,focus',order:'start_at.desc',limit:'5'},'GET',undefined,true):[]
 ]);
 const recentPlans=plans.filter(p=>p.booking_id!==booking.id&&(!p.plan_sheet?.start||Date.parse(p.plan_sheet.start)<Date.parse(booking.start_at)));
 let player=null,logs=[],warning='';
 if(sourceId){
   try {
     const token=await airtableConnection(ctx);
     if(!token)throw Error('Airtable connection unavailable');
     const read=async url=>{const response=await ctx.fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Airtable refresh unavailable');return response.json();};
     const fresh=await read(`https://api.airtable.com/v0/${BASE}/${PLAYERS}/${sourceId}?returnFieldsByFieldId=true`);
     if(fresh.id!==sourceId||!fresh.fields)throw Error('Airtable player could not be verified');
     player=fresh;
     const ids=recordIds(player.fields[PLAYER_FIELDS.logs]);
     if(ids.length&&ids.length<=200){
       const url=new URL(`https://api.airtable.com/v0/${BASE}/${APEX_TABLE}`);
       url.searchParams.set('returnFieldsByFieldId','true');url.searchParams.set('pageSize','12');url.searchParams.set('maxRecords','12');
       url.searchParams.set('filterByFormula',`AND(OR(${ids.map(id=>`RECORD_ID()='${id}'`).join(',')}),IS_BEFORE({Date},'${since}'))`);
       url.searchParams.set('sort[0][field]','Date');url.searchParams.set('sort[0][direction]','desc');
       for(const id of Object.values(LOG_FIELDS))url.searchParams.append('fields[]',id);
       const result=await read(url);
       if(!Array.isArray(result.records))throw Error('Airtable history could not be read');
       logs=result.records.filter(r=>recordIds(r.fields?.[LOG_FIELDS.players]).includes(sourceId)&&String(r.fields?.[LOG_FIELDS.date]||'')<since);
     }else if(ids.length>200)warning='Long Airtable history needs a coach review; recent Hub history is used.';
   } catch {warning='Live Airtable lookup was unavailable or incomplete. Check the saved details before delivery.';}
 }
 const refreshed=mergePlayerContext(match,profile,player,logs,completed,checkedAt);
 if(warning)refreshed.row.context.evidence+=' '+warning;
 const airtablePlans=logs.filter(r=>text(r.fields[LOG_FIELDS.content])&&!/cancel/i.test(text(r.fields[LOG_FIELDS.status])))
   .map(r=>({session_date:r.fields[LOG_FIELDS.date],content:r.fields[LOG_FIELDS.content]}));
 const history=[...recentPlans,...airtablePlans].sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date))).slice(0,6);
 refreshed.row.context.evidence+=` Reviewed ${history.length} earlier coaching plan${history.length===1?'':'s'} for drill variety; plans are distinct from delivered feedback.`;
 return {match:refreshed,recentPlans:history,checkedAt:player?checkedAt:match.row?.checked_at||checkedAt};
}
