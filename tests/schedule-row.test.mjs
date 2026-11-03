import test from 'node:test';
import assert from 'node:assert/strict';
import {creditSummary,renderCoachSessionRow,wireSessionActions} from '../performance-hub-schedule-row.js';
const event={id:'booking-id',session_id:'session-id',player_id:'player-id',name:'Football session',players:['Sample player'],coach:'Sample coach',start:'2026-11-03T17:00:00Z',end:'2026-11-03T18:00:00Z',status:'scheduled',source:'Calendly'};
test('credits preserve separate payment balances, including zero and negative values',()=>{
 const model=creditSummary({...event,credit:{credits:[{service:'Football',remaining:3},{service:'Football',remaining:2},{service:'Gym',remaining:0}]}});
 assert.equal(model.label,'View balances');
 assert.deepEqual(model.balances.map(b=>b.remaining),[3,2,0]);
 assert.equal(creditSummary({...event,credit:{credits:[{service:'Football',remaining:0}]}}).label,'0 left');
 assert.equal(creditSummary({...event,credit:{credits:[{service:'Football',remaining:-1}]}}).label,'-1 left');
});
test('missing, partial and invalid balances never become a fabricated zero',()=>{
 assert.equal(creditSummary(event).label,'Balance pending');
 assert.equal(creditSummary({...event,player_id:null}).label,'Not linked');
 for(const remaining of [null,undefined,'4',NaN,Infinity]){
  assert.equal(creditSummary({...event,credit:{credits:[{service:'Football',remaining}]}}).label,'Under review');
 }
});
test('linked booking opens its exact plan and session log with its player credit',()=>{
 const html=renderCoachSessionRow({...event,credit:{credits:[{service:'Football',remaining:4}],synced_at:'2026-11-03T08:00:00Z'}});
 assert.match(html,/performance-hub-plans\.html\?booking=booking-id/);
 assert.match(html,/performance-hub-coach-dashboard\.html\?day=2026-11-03&amp;session=session-id/);
 assert.match(html,/<span>Session log<\/span>/);
 assert.match(html,/<span>Session credits<\/span><strong>4 left<\/strong>/);
 assert.doesNotMatch(html,/data-cal-log-pending/);
});
test('unlinked and account-pending bookings retain all controls without false links or credits',()=>{
 for(const account_pending of [false,true]){
  const html=renderCoachSessionRow({...event,session_id:null,player_id:null,account_pending,needs_link:!account_pending});
  assert.match(html,/Session plan/);assert.match(html,/Session log/);assert.match(html,/Session credit/);
  assert.match(html,/data-cal-log-pending aria-expanded="false"/);
  assert.match(html,account_pending?/Balance pending/:/Not linked/);
  assert.doesNotMatch(html,/coaching-dashboard|coach-dashboard\.html|player=null|0 left/);
  assert.match(html,/data-cal-log-help role="status" hidden/);
 }
});
test('Hub sessions use session IDs and UK dates across daylight saving',()=>{
 const html=renderCoachSessionRow({...event,source:'Hub',start:'2026-07-01T23:30:00Z',end:'2026-07-02T00:30:00Z'});
 assert.match(html,/plans\.html\?session=session-id/);assert.match(html,/day=2026-07-02/);
});
test('external names and service text are escaped and links encode identifiers',()=>{
 const html=renderCoachSessionRow({...event,id:'" onmouseover="bad',players:['<img src=x onerror=bad>'],credit:{credits:[{service:'<script>bad</script>',remaining:2}]}});
 assert.doesNotMatch(html,/<img|<script>|onmouseover="bad/);
 assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/booking=%22%20onmouseover%3D%22bad/);
});
test('pending log explains the missing connection and can be closed without writes',()=>{
 let click,removed=false;const help={hidden:true},attrs={};
 const button={closest:()=>({querySelector:()=>help}),setAttribute:(k,v)=>attrs[k]=v};
 const root={addEventListener:(name,fn)=>click=fn,removeEventListener:(name,fn)=>removed=fn===click,contains:b=>b===button};
 const detach=wireSessionActions(root),input={target:{closest:()=>button}};
 click(input);assert.equal(help.hidden,false);assert.equal(attrs['aria-expanded'],'true');
 click(input);assert.equal(help.hidden,true);assert.equal(attrs['aria-expanded'],'false');
 detach();assert.equal(removed,true);
});
