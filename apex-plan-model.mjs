// Shared display model: no account, access, payment or delivery state is changed.
export const JT_STRUCTURE='Ladders → Parachute sprints → Hurdles / agility + small plyometrics → Technical / position work';
export const LADDER_PATTERNS=['1 in each','2 in each','Sideways','2 feet each box','Icky shuffle','2 forward / 1 back'];
const clean=value=>String(value||'').replace(/\*\*/g,'').replace(/^#{1,6}\s*/gm,'').trim();
export function shortText(value,max=170){const text=clean(value).replace(/\s+/g,' ');if(text.length<=max)return text;const end=text.lastIndexOf(' ',max-1);return text.slice(0,end>max/2?end:max-1)+'…';}
export function jtOpening(young=false){return [
 {title:'Ladders · six patterns',diagram:'ladders',setup:'Flat ladder, clear walk-back lane. Check readiness; begin slowly.',steps:LADDER_PATTERNS.map((p,i)=>`${i+1}. ${p}`).join(' · '),work:young?'Walk through 1–2 simple patterns as a copying game; pause often.':'1 controlled pass per pattern; walk back. Demonstrate first. Build rhythm before speed.',cue:'Light feet. Eyes forward. Quality first.',easier:'Walk on flat markers; fewer patterns.',harder:'Quicker rhythm only when accurate.',count:'Clean passes /6.',summary:'One in → two in → sideways → two-foot contacts → icky shuffle → two forward, one back.'},
 {title:young?'Chase game · no resistance':'Parachute sprints',diagram:'sprint',setup:'5–10 m lane + clear stopping space. Check chute fit, footing and wind.',steps:young?'Play a short chase-the-coach game at an easy pace. Walk back together. No parachute.':'1. Ready stance. 2. Accelerate through the lane. 3. Slow down gradually; walk back. Use a parachute only when suitable.',work:young?'15–20 sec play, then 30–40 sec pause.':'Up to 3–4 short runs; 60–90 sec recovery. Use unresisted runs if the chute or readiness is unsuitable.',cue:'Push away. Drive the arms. Slow down smoothly.',easier:'Short relaxed runs or marching; no chute.',harder:'React to the coach’s signal; keep full rest.',count:'Balanced starts and controlled stops.'},
 {title:'Hurdles · agility · small plyos',diagram:young?'sequence':'hurdles',setup:young?'Flat markers, two coloured cones and clear space.':'2–3 low hurdles, left/right exit cones and clear run-off.',steps:young?'Step over flat markers, balance, then follow the coach to a colour. No forced jumping.':'1. Step through low hurdles. 2. Brake and turn to the called cone. 3. Add 2–3 low two-foot hops; stick the last landing.',work:young?'Short copying games with frequent pauses.':'3–4 quality rounds; 45–60 sec rest. Low contacts only; omit jumps if not suitable.',cue:'Quiet landing. Knee follows toes. Stop, then go.',easier:'Flat cones; step instead of jump.',harder:'Later direction signal, without raising hurdles.',count:'Stable landings and balanced turns.'}
 ];}
const exactDiagrams={'Look, receive, play':'receive','Choose a gate and go':'carry','Move, receive, finish':'finish','Side foot, then laces':'strike','Stop, roll, pass':'roll','Treasure gates':'toddler','Pass and find new space':'link','Turn or set it back':'midfield'};
const supportedDiagrams=new Set(['ladders','sprint','hurdles','receive','carry','midfield','finish','strike','roll','link','toddler','sequence']);
export function diagramType(block={}){const type=exactDiagrams[block.title]||block.diagram||(/ladders?/i.test(block.title)&&/icky/i.test(block.steps||'')?'ladders':/parachute/i.test(block.title)?'sprint':/hurdles.*agility/i.test(block.title)?'hurdles':'sequence');return supportedDiagrams.has(type)?type:'sequence';}
const blockText=value=>Array.isArray(value)?value.map(blockText).filter(Boolean).join('\n'):typeof value==='string'||typeof value==='number'?String(value):'';
function visualBlock(value,index){
 const b=typeof value==='string'?{title:value}:value&&typeof value==='object'&&!Array.isArray(value)?{...value}:null;
 if(!b)return null;
 for(const field of ['title','setup','steps','summary','work','cue','easier','harder','count','notes'])b[field]=blockText(b[field]);
 if(!Object.values(b).some(v=>typeof v==='string'&&v.trim()))return null;
 b.title=b.title.trim()||`Coaching block ${index+1}`;b.steps=b.steps||b.summary||b.notes||b.setup||b.title;
 return {...b,diagram:diagramType(b)};
}
export function flowSteps(block){
 const raw=clean(block.steps||block.summary||block.setup||block.title);
 let parts=raw.split(/(?:^|\s)\d+[.)]\s+/).filter(Boolean);
 if(parts.length<2)parts=raw.split(/(?<=[.!?])\s+|;\s*|\s+→\s+/).filter(Boolean);
 return parts.length?parts:[block.title];
}
export function readableVenue(value){let v=String(value||'');try{const parsed=JSON.parse(v);v=parsed.location||parsed.address||v;}catch{}return /hamfield cottages/i.test(v)?'Berkeley, GL13 9TN':v.replace(/\\n|\n/g,', ');}
// Only the previous, unedited automatic football template is upgraded. Bespoke
// coaching / rehab instructions and historical imported plans remain intact.
export function upgradeSheet(sheet){
 if(!sheet||!Array.isArray(sheet.blocks)||!sheet.blocks.length)return null;
 let s={...sheet,venue:readableVenue(sheet.venue),blocks:sheet.blocks.map(visualBlock).filter(Boolean)};
 if(!s.blocks.length)return null;
 const old=s.service==='football'&&s.version===1&&s.blocks[0]?.title==='Arrive, check and warm up'&&s.blocks.length===6;
 if(old){
  const young=/Age [1-5](?:\s|\b)/.test(s.context||''),opening=jtOpening(young);
  const primary=s.blocks[2],secondary=s.blocks[3],apply=s.blocks[4],review=s.blocks[5];
  // Match the challenge graphic to the drill being repeated, including its setup.
  const challenge={...apply,summary:'Repeat the main skill with a new target or feed angle. Finish with 3 min walk, water and feedback.',diagram:diagramType(primary),setup:primary.setup,steps:`Repeat: ${primary.steps} ${apply.steps}`,work:`${apply.work} Keep the final 3 min for walk, water and feedback.`};
  const items=[...opening,primary,secondary,challenge],weights=[8,6,6,16,16,8];let elapsed=0;
  s.blocks=items.map((b,i)=>{const duration=i===items.length-1?s.minutes-elapsed:Math.round(weights[i]/60*s.minutes);const result={...b,start:elapsed,end:elapsed+duration,work:`${b.work} Stay within this ${duration}-minute block; reduce repetitions, never recovery.`};elapsed+=duration;return result;});
  s.feedback=`${review.cue} ${s.feedback||''}`;s.version=2;s.structure=JT_STRUCTURE;
  s.equipment='Ladder, suitable parachute, low hurdles, cones, balls and a secured goal/target. Flat-marker and unresisted options available.';
 }
 return {...s,blocks:s.blocks.map(b=>({...b,diagram:diagramType(b)}))};
}
const metadataHeading=/^(?:APEX(?:\s*\/|\s+COACH|\s+SESSION)|(?:JT\s+)?(?:SESSION|COACHING|FOOTBALL|GYM) PLAN|PLAYER(?: CONTEXT| PROFILE)?|SESSION FOCUS|FOCUS|GOALS?|OBJECTIVES?|WHAT WE ARE IMPROVING|EQUIPMENT|KIT|SET ?UP|SOURCE|BEFORE DELIVERY|AFTER DELIVERY|POST.SESSION|NEXT SESSION|FEEDBACK|COACH(?:ING)? (?:NOTES|CUES|ASSESSMENT)|SAFETY|RESTRICTIONS|READINESS|REVIEW NOTES|RECORD LINKAGE)\s*(?:[:|—–-]|$)/i;
const fieldLine=/^(?:Set\s?up|Equipment|Instructions|What to do|Steps|Work\s*\/\s*rest|Timing|Dose|Work|Reps|Coach says|Coach cue|Say|Cues?|Make it easier|Make it harder|Easier|Harder|Progress|Regress|Count|Observe|Measure|Safety|Mistakes|Watch|Based on|What to count)\s*:/i;
// Convert recognised coaching tables to the same headings/fields as written plans.
// Other tables remain in the original source; no exercise or timing is invented.
function coachingTableLines(source){
 const lines=source.split('\n'),out=[];let columns=null;
 const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(clean);
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(line.includes('|')&&/^\s*\|?\s*:?-{3}/.test(lines[i+1]||'')){
   const labels=cells(line);columns=labels.some(x=>/^(?:drill|exercise|activity|block)$/i.test(x))?labels:null;
   if(columns){i++;continue;}
  }
  if(columns&&line.includes('|')){
   const values=cells(line),get=re=>values[columns.findIndex(x=>re.test(x))]||'';
   const title=get(/^(?:drill|exercise|activity|block)$/i),time=get(/^(?:time|timing|minutes?)$/i);
   if(!title)continue;
   out.push(/^\d+(?::\d{2})?\s*[–—-]\s*\d+/.test(time)?`${time} | ${title}`:`## ${title}`);
   columns.forEach((column,index)=>{if(/^(?:drill|exercise|activity|block)$/i.test(column)||!values[index])return;
    const label=/^(?:what to do|instructions|steps)$/i.test(column)?'Instructions':/^(?:set ?up|equipment)$/i.test(column)?'Setup':/^(?:work\s*\/\s*rest|reps|sets|dose|time|timing|minutes?)$/i.test(column)?'Dose':/^(?:cue|coaching cue)$/i.test(column)?'Cue':column;
    if(label==='Dose'&&values[index]===time&&/^[\d:]+\s*[–—-]/.test(time))return;
    out.push(`${label}: ${values[index]}`);
   });continue;
  }
  columns=null;out.push(line);
 }
 return out.join('\n');
}
function untimedBlocks(source,plan){
 const lines=source.split('\n'),blocks=[];let current=null;
 const topBullet=lines.filter(x=>/^\s*[-*•]\s+/.test(x)).reduce((n,x)=>Math.min(n,x.match(/^\s*/)[0].length),Infinity);
 for(const line of lines){
  const raw=line.trim(),text=clean(raw).replace(/^[-*•]\s+|^\d+[.)]\s+/,'');
  if(!text)continue;
  const markdown=/^#{2,6}\s+/.test(raw)||/^\*\*[^*\n]+\*\*:?$/.test(raw),numbered=/^\d+[.)]\s+/.test(raw),bullet=/^[-*•]\s+/.test(raw)&&line.match(/^\s*/)[0].length===topBullet;
  const labelled=/^(?:Drill|Exercise|Activity|Block)\s*(?:\d+\s*)?[:.—–-]\s*/i.test(text);
  if(metadataHeading.test(text)&&(!fieldLine.test(text)||markdown)){current=null;continue;}
  const isHeading=!fieldLine.test(text)&&(markdown||labelled||(!current?.headingStyle&&(numbered||bullet)));
  if(isHeading){
   const parts=text.replace(/^(?:Drill|Exercise|Activity|Block)\s*(?:\d+\s*)?[:.—–-]\s*/i,'').split(/\s+[—–]\s+|:\s+/);
   const title=parts.shift().replace(/\s*\(\d+\s*min(?:ute)?s?\)\s*$/i,'').replace(/:$/,'').trim();
   const duration=text.match(/\((\d+\s*min(?:ute)?s?)\)/i)?.[1];
   current={title,lines:[...(duration?[`Dose: ${duration}`]:[]),...parts],headingStyle:markdown||labelled};blocks.push(current);
  }else if(current)current.lines.push(numbered&&current.headingStyle?clean(raw):text);
 }
 return blocks.length?blocks:[{title:plan.title||'Coach instructions',lines:[clean(source)]}];
}
// Timed plain-text plans are parsed for presentation only. The full source is
// retained and remains the authority when a coach has supplied custom detail.
export function parseTextPlan(plan,meta={}){
 const source=coachingTableLines(String(plan.content||'').split(/^.*(?:SUPERSEDED PLAN|RETAINED FOR AUDIT ONLY).*$/im)[0]),content=clean(source),lines=content.split('\n');let blocks=[],current=null,clockBase=null;
 const heading=/^(\d{1,3}(?::\d{2})?)\s*[–—-]\s*(\d{1,3}(?::\d{2})?)\s*(?:minutes?|mins?)?\s*(?:[|—–:-]\s*(.*))?$/i;
 for(const line of lines){
  if(/SUPERSEDED PLAN|RETAINED FOR AUDIT ONLY/i.test(line))break;
  const trimmed=line.trim().replace(/^[-*]\s+(?=\d)/,'');
  const match=trimmed.match(heading)||trimmed.match(/^(\d{1,3})\s*[–—-]\s*(\d{1,3})\s+([A-Za-z][^\n]+\s[—–]\s[^\n]+)$/);
  if(match){
   const minute=x=>x.includes(':')?Number(x.split(':')[0])*60+Number(x.split(':')[1]):Number(x);
   const a=minute(match[1]),b=minute(match[2]);if(clockBase===null)clockBase=match[1].includes(':')?a:0;
   const parts=(match[3]||'').split('|').map(clean);let title=(parts.shift()||'').replace(/^\d+[.)]\s*/,'');
   if(title.includes(' — ')){const split=title.indexOf(' — ');parts.unshift(title.slice(split+3));title=title.slice(0,split);}
   else if(title.length>100){parts.unshift(title);title=shortText(title.split(/[.;]/)[0],60);}
   current={start:a-clockBase,end:b-clockBase,title,lines:parts};blocks.push(current);
  }else if(current){if(/^(?:BEFORE DELIVERY|AFTER DELIVERY|POST.SESSION|Next.session|Three (?:coaching )?cues|Coach assessment|Hub (?:record|handoff)|Coaching language|Safety and next|Record linkage|Reply:|Feedback reply:|Success:|Diagram key:)/i.test(line))current=null;else current.lines.push(line);}}
 if(!blocks.length)blocks=untimedBlocks(source,plan);
 for(const b of blocks){
  const list=b.lines.flatMap(x=>clean(x).split(/\s+(?=(?:Instructions|What to do|Work\s*\/\s*rest|Timing|Dose|Coach says|Cues?|Coach cue|Make it easier|Make it harder|Easier|Harder|Progress|Regress|Observe|Measure|Mistakes|Safety):)/i)).filter(Boolean);if(!b.title)b.title=list.shift()||'Coaching block';
  const field=(re)=>list.find(x=>re.test(x))?.replace(re,'')||'';
  b.setup=field(/^(?:Set\s?up|Equipment)\s*:\s*/i);
  b.work=field(/^(?:Work\s*\/\s*rest|Timing|Dose|Work|Reps)\s*:\s*/i);
  b.cue=field(/^(?:Coach says|Say|Cues?|Coach cue)\s*:\s*/i);
  b.easier=field(/^(?:Make it easier|Easier|Regress)\s*:\s*/i);b.harder=field(/^(?:Make it harder|Harder|Progress)\s*:\s*/i);b.count=field(/^(?:What to count|Count|Measure|Observe)\s*:\s*/i);
  b.steps=field(/^(?:What to do|Instructions|Steps)\s*:\s*/i)||list.filter(x=>! /^(?:Set\s?up|Equipment|Work\s*\/\s*rest|Timing|Dose|Coach says|Say|Cues?|Make it easier|Make it harder|Easier|Harder|Progress|Regress|Count|Observe|Measure|Safety|Mistakes|Common mistake|Watch|Based on|What to count)\s*:/i.test(x)).join(' ')||b.setup||b.title;
  b.notes=list.join('\n');delete b.lines;delete b.headingStyle;
 }
 if(!blocks.length)blocks.push({start:0,end:null,title:plan.title||'Coach instructions',steps:content,notes:content});
 const section=label=>content.match(new RegExp(`${label}\\n([^\\n]+)`,'i'))?.[1]||'';
 const service=/consultation|phone call/i.test(content.slice(0,350))?'consultation':/\bGYM\b/i.test(content.slice(0,350))||/gym|core|strength|movement primer/i.test(plan.title)&&! /football|finish/i.test(plan.title)?'gym':'football';
 return {version:2,service,name:meta.player_name||plan.player_name||plan.title,coach:meta.coach||'JT coaching team',start:plan.session_date?plan.session_date+'T12:00:00Z':null,minutes:Math.max(...blocks.map(b=>b.end||0))||null,focus:plan.objective||section('WHAT WE ARE IMPROVING'),context:section('PLAYER CONTEXT'),equipment:section('SET UP'),blocks:blocks.map(b=>({...b,diagram:diagramType(b)})),feedback:section('AFTER DELIVERY'),source_text:true};
}
export function displaySheet(plan,meta={}){return upgradeSheet(plan.plan_sheet)||parseTextPlan(plan,meta);}
