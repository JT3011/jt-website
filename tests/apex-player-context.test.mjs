import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBookingPlan} from '../server/apex-booking-plans.mjs';
import {positionRoles,POSITION_DRILLS} from '../server/apex-position-drills.mjs';
import {loadPlanningContext,mergePlayerContext,PLAYER_FIELDS as F,LOG_FIELDS as L} from '../server/apex-player-context.mjs';
const booking={id:'11111111-1111-4111-8111-111111111111',invitee_name:'Example',start_at:'2026-11-08T08:00:00Z',end_at:'2026-11-08T09:00:00Z',event_name:'Football',venue:'Berkeley, GL13 9TN',player_user_id:null};
const match={row:{id:'recExample',player_name:'Example',checked_at:'2026-10-30T10:00:00Z',context:{position:'CB / RB',age:13,notes:'Old notes'}},note:'Verified planning connection'};
const tasks=p=>p.plan_sheet.blocks.filter(b=>b.drill_id).map(b=>b.drill_id);

test('each recorded position selects relevant work, with full JT opening and accurate graphics',()=>{
 for(const [position,role] of [['Centre-back','cb'],['RB','fullback'],['CDM / CAM','midfield'],['RW','winger'],['ST','striker'],['GK','goalkeeper']]){
  const p=makeBookingPlan(booking,{row:{context:{position,age:13}}});
  assert.equal(tasks(p).length,2);
  assert.ok(tasks(p).every(id=>POSITION_DRILLS.find(d=>d.id===id).roles.includes(role)));
  assert.deepEqual(p.plan_sheet.blocks.slice(0,3).map(b=>b.diagram),['ladders','sprint','hurdles']);
  assert.ok(p.plan_sheet.blocks.every(b=>b.diagram));
  assert.equal(p.plan_sheet.blocks.at(-1).end,60);
 }
 assert.deepEqual(positionRoles('CB / RB'),['cb','fullback']);
});

test('the next session in the same week changes the actual drills based on history',()=>{
 const first=makeBookingPlan(booking,match);
 const nextBooking={...booking,id:'22222222-2222-4222-8222-222222222222',start_at:'2026-11-09T08:00:00Z',end_at:'2026-11-09T09:00:00Z'};
 const second=makeBookingPlan(nextBooking,match,{recentPlans:[{plan_sheet:first.plan_sheet,content:first.content}]});
 assert.ok(tasks(second).every(id=>!tasks(first).includes(id)));
 assert.notEqual(first.plan_sheet.blocks[3].setup,second.plan_sheet.blocks[3].setup);
 assert.deepEqual(tasks(makeBookingPlan(nextBooking,match,{recentPlans:[{plan_sheet:first.plan_sheet}]})),tasks(second));
});

test('unrecorded positions use general foundations without inventing a specialist role',()=>{
 const p=makeBookingPlan(booking,{row:{context:{age:13}}});
 assert.match(p.plan_sheet.context,/Position to confirm/);
 assert.ok(tasks(p).every(id=>id.startsWith('generic-')));
});

test('live Airtable position and notes replace stale values; a missing position falls back to Hub only',()=>{
 const fresh={id:'recExample',fields:{[F.name]:'Example',[F.position]:['RW'],[F.notes]:'New dribbling focus',[F.age]:14}};
 const p=mergePlayerContext(match,{primary_position:'CB'},fresh);
 assert.equal(p.row.context.position,'RW');assert.equal(p.row.context.age,14);assert.equal(p.row.context.notes,'New dribbling focus');
 fresh.fields[F.position]=[];
 assert.equal(mergePlayerContext(match,{primary_position:'LB'},fresh).row.context.position,'LB');
 assert.equal(mergePlayerContext(match,null,fresh).row.context.position,'');
});

test('planned and cancelled feedback cannot override coach-confirmed delivery',()=>{
 const logs=[
  {fields:{[L.date]:'2026-11-07',[L.status]:'Planned — feedback pending',[L.feedback]:'Invented recent success'}},
  {fields:{[L.date]:'2026-11-06',[L.status]:'Cancelled',[L.feedback]:'Cancelled note'}},
  {fields:{[L.date]:'2026-11-01',[L.status]:'Completed — coach confirmed',[L.feedback]:'Observed receiving.\nNEXT FOCUS:\nFirst touch into a diagonal pass.'}}
 ];
 const result=mergePlayerContext(match,null,{fields:{[F.position]:['CB']}},logs);
 assert.match(result.row.context.evidence,/2026-11-01/);
 assert.match(result.row.context.next_focus,/First touch/);
 assert.doesNotMatch(result.row.context.evidence,/Invented recent success|Cancelled note/);
});

test('live lookup uses only the linked player and their past logs; Hub history uses caller RLS',async()=>{
 const calls=[],reads=[];
 const ctx={env:{AIRTABLE_READ_TOKEN:'test-token'},db:async(t,q,m,b,asUser)=>{
  calls.push({t,q,asUser});
  if(t==='hub_session_plans')return[{booking_id:booking.id,session_date:'2026-11-08'}, {booking_id:'future',session_date:'2026-11-09',plan_sheet:{start:'2026-11-09T10:00:00Z'}},{booking_id:'past',session_date:'2026-11-01',plan_sheet:{blocks:[]}}];
  return[];
 },fetchImpl:async url=>{reads.push(String(url));return{ok:true,json:async()=>reads.length===1?{id:'recExample',fields:{[F.name]:'Example',[F.position]:['CB'],[F.logs]:['recLog']}}:{records:[
   {id:'recLog',fields:{[L.players]:['recExample'],[L.date]:'2026-11-01',[L.status]:'Completed',[L.feedback]:'NEXT FOCUS:\nInterceptions into a pass.',[L.content]:'Earlier planned work'}},
   {id:'recWrong',fields:{[L.players]:['recSomeoneElse'],[L.date]:'2026-11-01',[L.content]:'Other child private plan'}},
   {id:'recFuture',fields:{[L.players]:['recExample'],[L.date]:'2026-11-10',[L.content]:'Future work'}}
 ]}};}};
 const result=await loadPlanningContext(ctx,booking,match);
 assert.match(reads[0],/recExample\?/);assert.match(decodeURIComponent(reads[1]),/recLog/);
 assert.equal(calls.find(x=>x.t==='hub_session_plans').asUser,true);
 assert.equal(calls.find(x=>x.t==='hub_session_plans').q.airtable_record_id,'eq.recExample');
 assert.equal(result.recentPlans.length,2);
 assert.doesNotMatch(JSON.stringify(result),/Other child private plan|Future work/);
 assert.match(result.match.row.context.next_focus,/Interceptions/);
});

test('unavailable live lookup is disclosed and does not pretend stale context was just verified',async()=>{
 const result=await loadPlanningContext({env:{},db:async()=>[]},booking,match);
 assert.equal(result.checkedAt,'2026-10-30T10:00:00Z');
 assert.match(result.match.row.context.evidence,/unavailable or incomplete/);
 assert.equal(result.match.row.context.position,'CB / RB');
});

test('combined sessions use the recorded position for their football blocks',()=>{
 const p=makeBookingPlan({...booking,event_name:'Gym'},{row:{context:{position:'ST',service_override:'combined'}}});
 assert.ok(tasks(p).every(id=>POSITION_DRILLS.find(d=>d.id===id).roles.includes('striker')));
});
