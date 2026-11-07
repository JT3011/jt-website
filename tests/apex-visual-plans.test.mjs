import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBookingPlan} from '../server/apex-booking-plans.mjs';
import {displaySheet,parseTextPlan,LADDER_PATTERNS,diagramType} from '../apex-plan-model.mjs';
import {renderPlanSheet} from '../performance-hub-plan-sheet.js';
const booking={invitee_name:'Example player',start_at:'2026-11-09T17:00:00Z',end_at:'2026-11-09T18:00:00Z',event_name:'Football',venue:'Portway RDC'};
test('new football plans follow JT order, keep all minutes and give every block a graphic',()=>{
 for(const minutes of [30,45,60,90,120]){
  const end=new Date(Date.parse(booking.start_at)+minutes*60000).toISOString();
  const p=makeBookingPlan({...booking,end_at:end},{state:'unmatched',note:'Check identity'});
  assert.equal(p.plan_sheet.version,2);assert.deepEqual(p.plan_sheet.blocks.slice(0,3).map(b=>b.diagram),['ladders','sprint','hurdles']);
  assert.equal(p.plan_sheet.blocks.at(-1).end,minutes);assert.equal(p.plan_sheet.blocks[0].start,0);
  for(let i=1;i<p.plan_sheet.blocks.length;i++)assert.equal(p.plan_sheet.blocks[i].start,p.plan_sheet.blocks[i-1].end);
  for(const pattern of LADDER_PATTERNS)assert.ok(p.content.includes(pattern));
  assert.ok(p.plan_sheet.blocks.every(b=>b.diagram&&b.end>b.start));
 }
});
test('young players retain no-resistance and no-forced-jumping adaptations',()=>{
 const p=makeBookingPlan(booking,{row:{context:{age:4}}});
 assert.match(p.plan_sheet.blocks[1].steps,/No parachute/);
 assert.match(p.plan_sheet.blocks[2].steps,/No forced jumping/);
 assert.equal(p.plan_sheet.blocks[2].diagram,'sequence');
});
test('gym sessions retain exercise structure and receive graphics',()=>{
 const p=makeBookingPlan({...booking,event_name:'Gym'},{row:{context:{gym_split:true}}});
 assert.doesNotMatch(p.plan_sheet.blocks[0].title,/Ladder/);assert.ok(p.plan_sheet.blocks.every(b=>b.diagram));
});
test('legacy text headings and inline instructions produce one graphic per drill without invented positions',()=>{
 const p={title:'Example',content:'### 0-8 minutes - Warm-up\nEasy movement.\n### 8–20 | Custom drill\nSetup: two gates. Instructions: Scan, receive and pass. Cues: Look early. Work / rest: 4 reps / 30 sec rest.\n20–30 Review — Walk, drink and reflect.'};
 const s=parseTextPlan(p);assert.equal(s.blocks.length,3);assert.equal(s.blocks[1].steps,'Scan, receive and pass.');assert.equal(s.blocks[1].work,'4 reps / 30 sec rest.');assert.equal(s.blocks[1].diagram,'sequence');
 const html=renderPlanSheet(null,p);assert.equal((html.match(/<article class="sheet-block">/g)||[]).length,3);assert.equal((html.split('<section class="drill-details"')[0].match(/<svg /g)||[]).length,3);
});
test('superseded audit plans never become extra coaching drills',()=>{
 const p={title:'Example',content:'0–8: Warm up. Walk and move.\n8–60: Practise the current skill.\n--- SUPERSEDED PLAN RETAINED FOR AUDIT ONLY ---\n0–60 | Wrong player\nOld work.'};
 const s=parseTextPlan(p);assert.equal(s.blocks.length,2);assert.ok(s.blocks.every(b=>!b.steps.includes('Wrong player')));
});
test('custom instructions are preserved and print summaries never replace saved source',()=>{
 const sheet={version:1,service:'football',blocks:[{title:'Recovery only',start:0,end:30,steps:'Walking pace only. No sprints or jumps.',diagram:'sequence'}]};
 const before=JSON.stringify(sheet),out=displaySheet({plan_sheet:sheet});assert.equal(out.blocks[0].steps,sheet.blocks[0].steps);assert.equal(JSON.stringify(sheet),before);
});
test('HTML in player or drill text is escaped, and a still-ball strike uses the correct graphic',()=>{
 const p={title:'<img src=x onerror=alert(1)>',content:'0–10 | <script>alert(1)</script>\nSet up: <img src=x>\nWhat to do: <svg onload=alert(1)>'};
 const html=renderPlanSheet(null,p);assert.ok(!html.includes('<script>alert'));assert.ok(!html.includes('<svg onload'));assert.match(html,/&lt;img/);
 assert.equal(diagramType({title:'Side foot, then laces',diagram:'finish'}),'strike');
});

function assertEveryBlockHasGraphic(plan,expected){
 const sheet=displaySheet(plan),html=renderPlanSheet(plan.plan_sheet,plan);
 assert.equal(sheet.blocks.length,expected);
 assert.equal((html.split('<section class="drill-details"')[0].match(/<svg /g)||[]).length,expected);
 assert.equal((html.match(/<figure class="drill-diagram">/g)||[]).length,expected*2);
 return sheet;
}
test('untimed Markdown drills each get a graphic and numbered instructions stay together',()=>{
 const p={title:'Coach plan',content:'# Session plan\n## Focus\nReceiving detail\n## First-touch gates\nSetup: two gates.\n1. Scan.\n2. Receive.\n3. Pass.\n## Intercept and release\nInstructions: Read the ground pass. Intercept in balance. Pass wide.\n## After delivery\nRecord actual work.'};
 const s=assertEveryBlockHasGraphic(p,2);
 assert.match(s.blocks[0].steps,/Scan.*Receive.*Pass/);
 assert.equal(s.blocks[1].title,'Intercept and release');
 assert.ok(s.blocks.every(b=>b.start===undefined&&b.end===undefined));
});
test('coach-written numbered drills and exercise lists receive separate graphics',()=>{
 for(const prefix of ['1.','-','•']){
  const p={title:'Gym',content:`${prefix} Cable kickbacks — Move with control.\n  Reps: 8 each side.\n${prefix==='1.'?'2.':prefix} Hip thrusts — Pause at the top.\n  Cue: Ribs down.`};
  const s=assertEveryBlockHasGraphic(p,2);
  assert.equal(s.blocks[0].title,'Cable kickbacks');assert.equal(s.blocks[0].work,'8 each side.');
  assert.equal(s.blocks[1].cue,'Ribs down.');
 }
});
test('labelled drills need no timings, headings or particular exercise names',()=>{
 const p={title:'Bespoke',content:'Drill 1: Coach’s colour game\nWatch the cue and choose a gate.\nExercise 2 — New receiving task\nScan and open up.'};
 assertEveryBlockHasGraphic(p,2);
});
test('bold headings keep each drill and its numbered action sequence',()=>{
 const s=assertEveryBlockHasGraphic({title:'Coach plan',content:'**First touch**\n1. Scan\n2. Receive\n3. Pass\n**Pass and move**\n1. Pass\n2. Move'},2);
 assert.equal(s.blocks[0].steps,'1. Scan 2. Receive 3. Pass');
});
test('timed and untimed coaching tables produce one graphic for every row',()=>{
 const timed={title:'Football',content:'| Time | Drill | Setup | Instructions | Cue |\n| --- | --- | --- | --- | --- |\n| 0–10 min | First touch | Two gates | Scan, receive, pass | Open up |\n| 10–20 min | Passing | Triangle | Pass and move | Move early |'};
 const s=assertEveryBlockHasGraphic(timed,2);
 assert.equal(s.blocks[0].end,10);assert.equal(s.blocks[1].start,10);assert.equal(s.blocks[0].steps,'Scan, receive, pass');
 const untimed={title:'Gym',content:'| Exercise | Reps | Instructions |\n| --- | --- | --- |\n| Squat | 8 | Sit under control |\n| Hip thrust | 10 | Pause at the top |'};
 const u=assertEveryBlockHasGraphic(untimed,2);assert.equal(u.blocks[1].work,'10');
});
test('legacy structured blocks with absent or unsupported graphics remain fully visual',()=>{
 const p={plan_sheet:{blocks:[null,{},{title:'Custom task',steps:['Scan','Receive','Pass'],diagram:'unavailable-picture'},'Review']}};
 const before=JSON.stringify(p),s=assertEveryBlockHasGraphic(p,2);
 assert.equal(s.blocks[0].diagram,'sequence');assert.equal(s.blocks[0].steps,'Scan\nReceive\nPass');assert.equal(JSON.stringify(p),before);
});
test('an unusable structured sheet falls back to the coach text with graphics',()=>{
 assertEveryBlockHasGraphic({title:'Old plan',plan_sheet:{blocks:[null,{}]},content:'## Pass and move\nPass, move, receive.\n## Review\nWalk, drink, reflect.'},2);
});
test('unstructured prose and title-only plans always have a graphical fallback',()=>{
 for(const content of ['Receive across the body, then pass into the target.',''])assertEveryBlockHasGraphic({title:'Custom coaching task',content},1);
});
test('untimed graphics never resurrect a superseded audit plan',()=>{
 const s=assertEveryBlockHasGraphic({title:'Current work',content:'## Current drill\nWalk and pass.\n--- SUPERSEDED PLAN RETAINED FOR AUDIT ONLY ---\n## Old drill\nSprint hard.'},1);
 assert.doesNotMatch(s.blocks[0].steps,/Sprint|Old drill/);
});
