import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,canView,canEdit,summariseCredits} from '../api/hub-portal.mjs';
const self='11111111-1111-4111-8111-111111111111', child='22222222-2222-4222-8222-222222222222', stranger='33333333-3333-4333-8333-333333333333';
const context=(role='client')=>({user:{id:self},role,coachPlayers:[child],parentPlayers:[]});
test('clients cannot use stale coach assignments to read or edit another player',()=>{
  assert.equal(canView(context(),stranger),false); assert.equal(canView(context(),child),false);
  assert.equal(canView(context(),self),true); assert.equal(canEdit(context(),self),false);
});
test('parents read linked children only; coaches edit assigned players only; owner manages all',()=>{
  const parent={...context(),parentPlayers:[child]}; assert.equal(canView(parent,child),true); assert.equal(canEdit(parent,child),false);
  assert.equal(canEdit(context('coach'),child),true); assert.equal(canEdit(context('coach'),stranger),false);
  assert.equal(canView(context('owner'),stranger),true);
});
test('credit records require reciprocal Airtable links, preserve negative balances and unknown formula values',()=>{
  const player={id:'rec11111111111111',fields:{fldl736fChLtnfnqk:['rec22222222222222','rec33333333333333','rec44444444444444']}};
  const payment=(id,remaining,links=[player.id])=>({id,fields:{fldYD8bKUXRQ8vAK8:links,fldvc8djsV6LKeug4:remaining,fldG76Un7xQtO4CYV:10,fld5t8zvFBWPjrdoF:12,fldb6f65wjltrsZZf:'1:1 football'}});
  const result=summariseCredits(player,[payment('rec22222222222222',-2),payment('rec33333333333333',{error:'#ERROR!'}),payment('rec44444444444444',100,['rec99999999999999'])]);
  assert.equal(result.length,2); assert.equal(result[0].remaining,-2); assert.equal(result[1].remaining,null);
});
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'sb_secret_test'};
async function run({action='player',method='GET',role='client',metadataRole='owner',player=stranger,token='test',body={}}={}) {
  const calls=[];const fetchImpl=async(input,options)=>{
    const u=new URL(input);calls.push({path:u.pathname,options});
    const json=data=>new Response(JSON.stringify(data),{status:200});
    if(u.pathname==='/auth/v1/user')return json({id:self,email_confirmed_at:'2026-01-01',user_metadata:{role:metadataRole}});
    if(u.pathname.endsWith('/hub_staff'))return json(role==='client'?[]:[{role}]);
    if(u.pathname.endsWith('/session_connect_coach_players')||u.pathname.endsWith('/session_connect_parent_players'))return json([]);
    throw new Error('Unexpected downstream call: '+u.pathname);
  };
  let status,payload;const res={setHeader(){},status(v){status=v;return this;},json(v){payload=v;}};
  await createHandler({env,fetchImpl})({method,url:`/api/hub-portal?action=${action}&player=${player}`,headers:{...(token?{authorization:`Bearer ${token}`}:{})},body:{action,player,...body}},res);
  return {status,payload,calls};
}
test('unauthenticated API requests are rejected before touching any provider',async()=>{const r=await run({token:''});assert.equal(r.status,401);assert.equal(r.calls.length,0);});
test('forged user metadata never grants access to another player',async()=>{const r=await run();assert.equal(r.status,403);assert.equal(r.calls.length,4);});
test('clients cannot change their own programmes, staff, links, or sync data through direct API calls',async()=>{
  for(const action of ['save-programme','grant-coach','link-access','link-airtable','sync-airtable']) {
    const r=await run({method:'POST',player:self,action});assert.equal(r.status,403,action);assert.equal(r.calls.length,4,action);
  }
});
test('a coach cannot list the owner account directory',async()=>{const r=await run({action:'access',role:'coach'});assert.equal(r.status,403);});
test('unsupported methods do not access providers',async()=>{const r=await run({method:'PUT'});assert.equal(r.status,405);assert.equal(r.calls.length,0);});
