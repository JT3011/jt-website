import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleWork} from '../api/coach-schedule.mjs';
import {plansWork} from '../api/hub-session-plans.mjs';
import {renderCoachSessionRow} from '../performance-hub-schedule-row.js';
const coach='11111111-1111-4111-8111-111111111111',booking='22222222-2222-4222-8222-222222222222';
const row={id:booking,calendar_id:'test',coach_user_id:coach,invitee_name:'Group contact',event_name:'1:1 Football',booking_status:'active',start_at:'2026-11-10T17:00:00Z',end_at:'2026-11-10T18:00:00Z',airtable_participants:['recOne','recTwo','recThree'],matched_player_name:'One & Two & Three'};
const balances=[{airtable_record_id:'recOne',display_name:'One',credits:[{service:'Football',remaining:4}]},{airtable_record_id:'recTwo',display_name:'Two',credits:[{service:'Football',remaining:2}]},{airtable_record_id:'recThree',display_name:'Three',credits:[]}];
const ctx={role:'coach',manager:false,owner:false,user:{id:coach},method:'GET',action:'overview',params:new URLSearchParams({day:'2026-11-10'}),db:async(table,q)=>{
 if(table==='hub_staff')return[{user_id:coach,role:'coach'}];
 if(table==='hub_coach_calendars')return[{id:'test',display_name:'Coach',coach_user_id:coach}];
 if(table==='session_connect_booking_queue'){assert.equal(q.calendar_id,'eq.test');return[row];}
 if(table==='hub_airtable_players'){assert.equal(q.airtable_record_id,'in.(recOne,recTwo,recThree)');return balances;}
 return[];
}};
test('a group stays one booking with three separate player balances and no invented account links',async()=>{
 const result=await scheduleWork(ctx);assert.equal(result.events.length,1);
 const event=result.events[0];assert.deepEqual(event.players,['One','Two','Three']);assert.equal(event.player_id,null);assert.equal(event.credit,null);assert.equal(event.needs_link,false);assert.equal(event.account_pending,true);assert.equal(event.group_players.length,3);assert.deepEqual(result.needs_link,[]);
 const html=renderCoachSessionRow(event);assert.match(html,/One &amp; Two &amp; Three/);assert.match(html,/By player/);assert.match(html,/4 left/);assert.match(html,/2 left/);assert.match(html,/Balance pending/);assert.doesNotMatch(html,/6 left/);assert.equal((html.match(/<article /g)||[]).length,1);
 await assert.rejects(scheduleWork({...ctx,params:new URLSearchParams({coach:'another'})}),{status:403});
});
test('group plans cannot silently generate a single-player plan',async()=>{
 let writes=0;const db=async(table,q,m)=>{if(m==='POST')writes++;if(table==='hub_coach_calendars')return[{id:'test',display_name:'Coach',coach_user_id:coach}];if(table==='session_connect_booking_queue')return[row];return[];};
 await assert.rejects(plansWork({...ctx,owner:true,role:'owner',db,method:'POST',action:'prepare-booking',body:{booking}}),e=>e.status===400&&/shared session plan/.test(e.message));assert.equal(writes,0);
});
