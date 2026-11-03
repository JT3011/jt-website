import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCreditSnapshots,F,PLAYERS,PAYMENTS,MASTER,GYM,syncAirtable} from '../server/airtable-credits.mjs';
import {creditSummary,formatCreditBalance} from '../performance-hub-credit-model.js';
const player=(id,name,fields={})=>({id,fields:{[F.name]:name,...fields}});
const payment=(id,left,fields={})=>({id,fields:{[F.remaining]:left,...fields}});
const master=(id,players,payments,gym=[])=>({id,fields:{[F.masterPlayers]:players,[F.masterPayments]:payments,[F.masterGym]:gym}});
test('Master log links supply football and gym balances, including shared payments, exactly once',()=>{
 const players=[player('one','One',{[F.playerMaster]:['m1']}),player('two','Two',{[F.playerMaster]:['m2']})];
 const gym=[{id:'gym',fields:{[F.gymName]:'Gym client',[F.gymMaster]:['mg','mg2']}}];
 const payments=[payment('family',2,{[F.paymentMaster]:['m1','m2']}),payment('gympay',4,{[F.paymentMaster]:['mg','mg2']})];
 const masters=[master('m1',['one'],['family']),master('m2',['two'],['family']),master('mg',[],['gympay'],['gym']),master('mg2',[],['gympay'],['gym'])];
 const result=buildCreditSnapshots(players,payments,masters,gym);
 assert.deepEqual(result.map(p=>p.credits.map(c=>c.remaining)),[[2],[2],[4]]);
 assert.equal(result[0].credits[0].shared,true);assert.equal(result[2].credits[0].shared,false);
 assert.equal(result[0].credits[0].source_payment_id,result[1].credits[0].source_payment_id);
});
test('explicit links win; stale, conflicting, or one-sided Master log links cannot attach another balance',()=>{
 const clients=[player('one','One',{[F.payments]:['p'],[F.playerMaster]:['m']}),player('two','Two',{[F.playerMaster]:['m']})];
 const masters=[master('m',['one','two'],['p','broken'])];
 const result=buildCreditSnapshots(clients,[payment('p',3,{[F.players]:['one'],[F.paymentMaster]:['m']}),payment('broken',99,{[F.paymentMaster]:['elsewhere']})],masters);
 assert.deepEqual(result.map(p=>p.credits.map(c=>c.remaining)),[[3],[]]);
});
test('unlinked payments match unique full names or a corroborated player and parent, never first names alone',()=>{
 const players=[player('one','Child'),player('two','Other'),player('three','Full Name'),player('four','Duplicate'),player('five','Duplicate')];
 const aliases=[{id:'one',aliases:['Parent Surname']},{id:'two',aliases:['Another Parent']}];
 const payments=[payment('p1',0,{[F.paymentName]:'Child (Parent Surname)'}),payment('p2',-1,{[F.paymentName]:'Child (Parent) Surname'}),payment('p3',4,{[F.paymentName]:' full NAME '}),payment('p4',99,{[F.paymentName]:'Child'}),payment('p5',99,{[F.paymentName]:'Child (Another Parent)'}),payment('p6',99,{[F.paymentName]:'Duplicate'})];
 const result=buildCreditSnapshots(players,payments,[],[],aliases);
 assert.deepEqual(result.map(p=>p.credits.map(c=>c.remaining)),[[0,-1],[],[4],[],[]]);
});
test('payments retain their original formula values and separate ledgers, including invalid values',()=>{
 const p=player('one','One',{[F.payments]:['a','b','c']});
 const result=buildCreditSnapshots([p],[payment('a',-1.22222,{[F.players]:['one']}),payment('b',0,{[F.players]:['one']}),payment('c',{error:'#ERROR!'},{[F.players]:['one']})])[0];
 assert.equal(result.credits[0].remaining,-1.22222);
 const summary=creditSummary({credit:result});assert.equal(summary.label,'View balances');assert.equal(summary.balances.length,3);assert.equal(summary.balances[2].unknown,true);
 assert.equal(formatCreditBalance(summary.balances[0].remaining,summary.balances[0].display_precision),'-1');
 assert.equal(formatCreditBalance(-0.2,0),'0');
 assert.equal(creditSummary({account_pending:true,credit:{credits:[]}}).label,'Balance pending');
});
test('duplicate payment ids are shown once and shared ledgers are labelled without multiplying credit',()=>{
 const row={source_payment_id:'family',service:'Football',remaining:2,shared:true};
 const summary=creditSummary({credit:{credits:[row,row]}});
 assert.equal(summary.balances.length,1);assert.equal(summary.label,'2 left · shared');
});
test('an incomplete Master log or Gym table never replaces the last complete cache',async()=>{
 for(const failedTable of [MASTER,GYM]){
  const writes=[];
  const ctx={env:{AIRTABLE_READ_TOKEN:'fixture'},db:async(t,q,m,b)=>{if(t.includes('claim'))return{acquired:true,lease_id:'lease'};writes.push({t,m,b});return[];},fetchImpl:async u=>new Response(JSON.stringify(String(u).includes(failedTable)?{}:{records:[]}),{status:200})};
  await assert.rejects(syncAirtable(ctx));assert.ok(!writes.some(w=>w.t==='hub_airtable_players'));
 }
});
