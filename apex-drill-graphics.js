import {LADDER_PATTERNS,flowSteps,shortText} from './apex-plan-model.mjs?v=20261107-all-graphics';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${e(s)}</text>`;
const player=(x,y,label='P')=>`<circle class="player-dot" cx="${x}" cy="${y}" r="11"/>${text(x,y+4,label,'center')}`;
const coach=(x,y)=>`<circle class="coach-dot" cx="${x}" cy="${y}" r="11"/>${text(x,y+4,'C','center')}`;
const cone=(x,y)=>`<path class="cone" d="M${x} ${y-5}l5 10h-10Z"/>`;
const ball=(x,y)=>`<circle class="ball-dot" cx="${x}" cy="${y}" r="3"/>`;
const arrow=(d,kind='run')=>`<path class="${kind}" d="${d}"/>`;
function wrap(str,width=23){const words=String(str).split(/\s+/),rows=[''];for(const w of words){if((rows.at(-1)+' '+w).trim().length>width&&rows.at(-1))rows.push(w);else rows[rows.length-1]+=(rows.at(-1)?' ':'')+w;}return rows;}
function ladderGraphic(){
 return LADDER_PATTERNS.map((label,i)=>{const x=(i%3)*100+7,y=Math.floor(i/3)*77+5;let feet='';
  // L/R shows order of contact, not a prescribed foot size or spacing.
  const patterns=[[[21,36,'L'],[44,36,'R'],[67,36,'L']],[[17,31,'L'],[24,43,'R'],[40,31,'L'],[47,43,'R']],[[17,31,'L'],[24,43,'R'],[40,31,'L'],[47,43,'R']],[[21,30,'L'],[21,43,'R'],[44,30,'L'],[44,43,'R']],[[8,53,'L'],[20,31,'R'],[25,42,'L'],[35,20,'R'],[43,31,'L'],[49,42,'R']],[[21,37,'1'],[44,37,'2'],[67,37,'3']]];
  for(const [fx,fy,f] of patterns[i])feet+=`<circle class="foot" cx="${x+fx}" cy="${y+fy}" r="6"/>${text(x+fx,y+fy+2.5,f,'foot-label center')}`;
  const labelRows=wrap(label,20);return `<g>${labelRows.map((r,j)=>text(x+43,y+6+j*10,`${j===0?i+1+'. ':''}${r}`,'center mini')).join('')}<path class="pitch-mark thin" d="M${x+10} ${y+23}h69v26h-69Zm23 0v26m23-26v26"/>${feet}${i===5?arrow(`M${x+20} ${y+57}h47m-2 10h-23`):arrow(`M${x+17} ${y+63}h53`)}${i===2?text(x+77,y+36,'↕','mini'):''}</g>`;
 }).join('');
}
function notebookOpening(b){
 const kind=b.opening_pattern;if(!['jt-ladder-sprint','jt-ladder-pass','jt-hurdle-pass'].includes(kind))return null;
 if(kind==='jt-hurdle-pass'){
  const hurdles=[55,78,101,199,222,245].map(x=>b.flat_hurdles?`<path class="pitch-mark" d="M${x} 77h12"/>`:`<path class="pitch-mark" d="M${x} 91V66h12v25"/>`).join('');
  return {body:hurdles+player(150,78)+coach(150,143)+cone(150,19)+cone(150,111)+arrow('M134 53H62')+arrow('M64 105H132')+arrow('M168 105H249')+arrow('M245 52H171')+arrow('M139 65Q108 26 140 20')+arrow('M163 91Q185 120 157 118')+arrow('M164 89V130','ball')+text(65,35,'1. Side steps','center mini')+text(233,143,'2. Return pass','center mini')+text(233,125,'3. Front loop','center mini')+text(208,13,b.low_impact?'4. Walk rear loop':'4. Backpedal rear loop','center mini'),caption:b.low_impact?'Face coach below · flat markers · comfortable walking loops':'Face coach below · pass between sides · front / rear loop'};
 }
 const ladder='<path class="pitch-mark" d="M28 62H139V92H28Zm18 0v30m19-30v30m19-30v30m19-30v30m18-30v30"/>';
 let body=ladder+player(14,77)+arrow('M32 49H137')+text(82,32,'1. Ladder pattern','center');
 if(kind==='jt-ladder-sprint')body+=cone(245,77)+arrow('M151 77H230')+arrow('M245 94Q239 141 44 130Q15 128 14 99')+text(200,58,b.sprint_label||'2. Sprint','center')+text(136,150,b.low_impact?'3. Walk return':'3. Jog / easy return','center');
 else body+=player(169,77)+coach(272,77)+ball(253,77)+arrow('M249 68H190','ball')+arrow('M189 86H251','ball')+arrow('M169 99Q158 137 51 128Q16 125 14 100')+text(222,43,'2. Return pass','center')+text(139,150,b.low_impact?'3. Walk return':'3. Jog back outside','center');
 return {body,caption:kind==='jt-ladder-sprint'?'One minute per pattern · recovery within each minute':'Four one-minute sets · separate return lane'};
}
export function drillGraphic(b,index=0){
 const id=`apex-arrow-${index}`,type=b.diagram||'sequence';let body='',caption='Setup diagram';
 const notebook=notebookOpening(b);
 if(notebook){body=notebook.body;caption=notebook.caption;}
 else if(type==='ladders'){body=ladderGraphic();caption='L / R = foot contacts · arrows show travel';}
 else if(type==='sprint'){body=cone(66,50)+cone(66,109)+cone(216,50)+cone(216,109)+player(80,80)+arrow('M99 80H218')+arrow('M217 120H82')+text(146,61,'5–10 m','center')+text(255,92,'Slow down','center mini')+text(150,140,'Walk back + full recovery','center');if(!/no resistance/i.test(b.title))body+='<path class="chute" d="M26 59Q-3 80 26 101Z"/><path class="pitch-mark thin" d="M26 59L67 80L26 101"/>';caption='Start → accelerate → controlled stop';}
 else if(type==='hurdles'){body=player(24,80)+[60,92,124].map(x=>`<path class="pitch-mark" d="M${x} 94V65h15v29"/>`).join('')+arrow('M38 50H141Q171 50 186 30')+arrow('M141 50Q170 61 187 91')+cone(195,25)+cone(195,100)+[232,251,270].map(x=>`<ellipse class="landing" cx="${x}" cy="65" rx="7" ry="4"/>`).join('')+arrow('M228 47Q243 22 251 47Q262 22 273 47')+text(80,123,'1. Step through','center')+text(183,143,'2. Brake + turn','center')+text(253,104,'3. Low hops','center mini')+text(253,118,'Stick landing','center mini');caption='Low hurdles · controlled turn · low contacts';}
 else if(['receive','carry','midfield'].includes(type)){body=cone(48,23)+cone(77,23)+cone(223,23)+cone(252,23)+player(150,117)+coach(type==='carry'?150:263,type==='carry'?65:127)+ball(166,111)+arrow(type==='carry'?'M143 101Q111 65 63 35':'M254 116L171 115','ball')+arrow('M137 101L70 38',type==='carry'?'run':'ball')+arrow('M162 100L234 38',type==='carry'?'run':'ball')+text(65,14,'Gate 1','center mini')+text(237,14,'Gate 2','center mini');if(type==='midfield')body+=arrow('M175 134H245','ball');caption=type==='midfield'?'Scan → turn forward or set back':type==='carry'?'Coach closes a gate → carry through the free gate':'Look → receive → play to a gate';}
 else if(type==='finish'||type==='strike'){body='<rect class="pitch-mark" x="125" y="13" width="85" height="16"/>'+player(108,127)+ball(133,111)+arrow('M138 100L168 34','ball')+text(167,10,'Target','center mini');if(type==='finish')body+=coach(259,73)+arrow('M245 77L143 111','ball')+arrow('M94 113Q56 71 127 94');caption=type==='strike'?'Still ball → side-foot / laces → target':'Move away → check back → receive → finish';}
 else if(type==='roll'){body=coach(154,26)+player(154,130)+ball(175,114)+cone(123,73)+cone(184,73)+arrow('M174 112H126L150 43','ball')+text(72,68,'Stop','center')+text(72,89,'Roll','center')+text(72,110,'Pass','center');caption='Stop with sole → roll across → pass';}
 else if(type==='link'){body=coach(250,35)+player(49,35)+cone(150,129)+ball(68,35)+arrow('M75 35H233','ball')+arrow('M60 49L138 119')+arrow('M241 51L164 120','ball');caption='1. Pass → 2. Move → 3. Receive';}
 else if(type==='toddler'){body=[48,150,250].map(x=>cone(x-12,30)+cone(x+12,30)).join('')+player(150,127)+ball(168,122)+arrow('M137 113L49 44')+arrow('M150 109V46')+arrow('M164 111L249 44')+coach(259,123)+text(48,16,'Red','center mini')+text(150,16,'Gold','center mini')+text(250,16,'Blue','center mini');caption='Choose a colour → carry → stop';}
 else{
  // Exact instruction flow for bespoke exercises: never substitute an unrelated
  // pitch diagram or invent player positions from an exercise title.
  const steps=flowSteps(b);const shown=steps.slice(0,6),cols=shown.length>3?3:Math.max(1,shown.length),rows=Math.ceil(shown.length/cols),w=280/cols;
  body=shown.map((step,i)=>{const x=10+(i%cols)*w,y=rows===1?30:12+Math.floor(i/cols)*73;return `<rect class="flow-box" x="${x}" y="${y}" width="${w-10}" height="62" rx="6"/>${text(x+12,y+15,String(i+1),'flow-number')}${wrap(shortText(step,cols===1?110:52),cols===1?42:cols===2?24:16).slice(0,3).map((line,j)=>text(x+(w-10)/2,y+29+j*12,line,'center flow-copy')).join('')}${i%cols<cols-1?arrow(`M${x+w-8} ${y+32}h7`):''}`;}).join('');caption=steps.length>6?'Action sequence · open drill for every step':'Action sequence · follow the numbered steps';
 }
 return `<figure class="drill-diagram"><svg viewBox="0 0 300 160" role="img" aria-label="${e(b.title)}: ${e(caption)}"><title>${e(b.title)}</title><desc>${e(b.setup||'')} ${e(b.steps||'')}</desc><defs><marker id="${id}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="currentColor"/></marker></defs><g style="--arrow:url(#${id})">${body}</g></svg><figcaption>${e(caption)}</figcaption></figure>`;
}

