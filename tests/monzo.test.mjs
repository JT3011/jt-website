import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMonzo, seal, unseal, businessAccounts } from '../server/monzo.mjs';

const origin = 'https://jt-website-orpin.vercel.app';
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-test', SUPABASE_SECRET_KEY: 'server-test', MONZO_CLIENT_ID: 'client-test', MONZO_CLIENT_SECRET: 'confidential-test-secret' };
Object.assign(process.env, env);
const owner = '00000000-0000-4000-8000-000000000001';
const response = (body,status=200) => new Response(JSON.stringify(body),{status});
function request(action,method='GET',extra={}) {
  return new Request(`${origin}/api/monzo/${action}`,{method,headers:{Authorization:'Bearer owner-session',Origin:origin,...extra}});
}
function mock(t, route) {
  const original=globalThis.fetch;
  globalThis.fetch=async (url,options={})=>{
    url=String(url);
    if(url.endsWith('/auth/v1/user'))return response({id:owner});
    if(url.endsWith('/rpc/session_connect_get_staff_context'))return response([{role:'owner'}]);
    return route(url,options);
  };
  t.after(()=>{globalThis.fetch=original;Object.assign(process.env,env);});
}
test('tokens are encrypted, authenticated, and bound to an owner',()=>{
  const config={clientSecret:env.MONZO_CLIENT_SECRET};
  const token={access_token:'never-publish',refresh_token:'never-publish-refresh'};
  const sealed=seal(token,config,owner);
  assert(!sealed.includes('never-publish'));
  assert.deepEqual(unseal(sealed,config,owner),token);
  assert.throws(()=>unseal(sealed,config,'different-owner'));
  assert.throws(()=>unseal(sealed,{clientSecret:'wrong'},owner));
});
test('personal, closed, and unknown account types are excluded',()=>{
  assert.deepEqual(businessAccounts([{id:'p',type:'uk_retail',closed:false},{id:'b',type:'uk_business',closed:false},{id:'c',type:'uk_business',closed:true}]).map(a=>a.id),['b']);
});
test('unauthenticated requests cannot read connection status',async()=>{
  const r=await handleMonzo(new Request(`${origin}/api/monzo/status`));assert.equal(r.status,401);
});
test('non-owner is forbidden',async t=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>String(url).endsWith('/user')?response({id:owner}):response([{role:'coach'}]);
  t.after(()=>{globalThis.fetch=original;});
  assert.equal((await handleMonzo(request('start','POST'))).status,403);
});
test('missing configuration is safely reported',async t=>{
  mock(t,()=>{throw new Error('Unexpected request');});
  delete process.env.MONZO_CLIENT_SECRET;
  const r=await handleMonzo(request('status'));
  assert.deepEqual(await r.json(),{configured:false,connected:false});
});
test('cross-origin start is rejected',async t=>{
  mock(t,()=>{throw new Error('Unexpected request');});
  assert.equal((await handleMonzo(request('start','POST',{Origin:'https://evil.example'}))).status,403);
});
test('start generates bound cookie and hashed state without leaking secrets',async t=>{
  let saved;
  mock(t,(url,opts)=>{assert(url.includes('jt_monzo_oauth_states'));if(opts.method==='POST')saved=JSON.parse(opts.body);return response([]);});
  const r=await handleMonzo(request('start','POST')),body=await r.json(),url=new URL(body.url);
  assert.equal(url.origin,'https://auth.monzo.com');
  assert.equal(url.searchParams.get('redirect_uri'),`${origin}/api/monzo/callback`);
  assert.equal(saved.owner_id,owner);assert.notEqual(saved.state_hash,url.searchParams.get('state'));
  assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert(!JSON.stringify(body).includes(env.MONZO_CLIENT_SECRET));
});
test('callback rejects missing or mismatched state before network access',async t=>{
  mock(t,()=>{throw new Error('No callback network access expected');});
  for(const suffix of ['',`?state=${'a'.repeat(64)}&code=secret`]){
    const r=await handleMonzo(new Request(`${origin}/api/monzo/callback${suffix}`));
    assert.equal(r.status,303);assert.match(r.headers.get('location'),/state_error$/);assert(!r.headers.get('location').includes('secret'));
  }
});
test('callback consumes valid state, checks owner, encrypts tokens and requests verification',async t=>{
  let stored,consumed=false;
  mock(t,(url,opts)=>{
    if(url.includes('jt_monzo_oauth_states')){assert.equal(opts.method,'DELETE');consumed=true;return response([{owner_id:owner}]);}
    if(url.includes('hub_staff'))return response([{user_id:owner}]);
    if(url.includes('/oauth2/token')){assert(consumed);return response({access_token:'bank-token',refresh_token:'refresh',expires_in:3600});}
    if(url.includes('jt_monzo_credentials')){stored=JSON.parse(opts.body);return response([stored]);}
    if(url.includes('jt_ops_connections'))return response([]);
    throw new Error('Unexpected URL');
  });
  const state='a'.repeat(64),r=await handleMonzo(new Request(`${origin}/api/monzo/callback?state=${state}&code=code-test`,{headers:{Cookie:`__Secure-jt_monzo_state=${state}`}}));
  assert.match(r.headers.get('location'),/authorised$/);
  assert.equal(stored.account_id,null);assert(!stored.encrypted_tokens.includes('bank-token'));
  assert.equal(unseal(stored.encrypted_tokens,{clientSecret:env.MONZO_CLIENT_SECRET},owner).access_token,'bank-token');
});
test('replayed callback cannot exchange a token',async t=>{
  mock(t,(url)=>{assert(url.includes('jt_monzo_oauth_states'));return response([]);});
  const state='a'.repeat(64),r=await handleMonzo(new Request(`${origin}/api/monzo/callback?state=${state}&code=test`,{headers:{Cookie:`__Secure-jt_monzo_state=${state}`}}));
  assert.match(r.headers.get('location'),/state_error$/);
});
test('verification never connects a personal or differently named account',async t=>{
  const encrypted_tokens=seal({access_token:'bank-token',expires_at:Date.now()+3600000},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  mock(t,(url)=>{
    if(url.includes('jt_monzo_credentials'))return response([{encrypted_tokens}]);
    if(url.endsWith('/accounts'))return response({accounts:[{id:'personal',type:'uk_retail',closed:false}]});
    throw new Error('Must not write connection');
  });
  assert.equal((await handleMonzo(request('verify','POST'))).status,409);
});
test('Monzo app approval errors are actionable and never expose provider body',async t=>{
  const encrypted_tokens=seal({access_token:'bank-token',expires_at:Date.now()+3600000},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  mock(t,(url)=>url.includes('jt_monzo_credentials')?response([{encrypted_tokens}]):response({secret:'provider-internals'},403));
  const r=await handleMonzo(request('verify','POST'));assert.equal(r.status,403);
  const body=await r.text();assert.match(body,/Approve access/);assert(!body.includes('provider-internals'));
});

test('successful verification stores only the Business account and leaves automation off',async t=>{
  const encrypted_tokens=seal({access_token:'bank-token',expires_at:Date.now()+3600000},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  let saved,status;
  mock(t,(url,opts)=>{
    if(url.includes('jt_monzo_credentials')&&opts.method==='GET')return response([{encrypted_tokens}]);
    if(url.includes('jt_monzo_credentials')){saved=JSON.parse(opts.body);return response([saved]);}
    if(url.endsWith('/accounts'))return response({accounts:[{id:'personal',type:'uk_retail',closed:false},{id:'business',type:'uk_business',closed:false,description:'JT Mind & Body Balance'}]});
    if(url.includes('jt_ops_connections')){status=JSON.parse(opts.body);return response([status]);}
    throw new Error('Unexpected request');
  });
  const r=await handleMonzo(request('verify','POST'));assert.equal(r.status,200);
  assert.equal(saved.account_id,'business');assert.equal(status.auto_enabled,false);assert.equal(status.status,'connected');
});
test('cached bank feed is scoped to the authenticated owner',async t=>{
  mock(t,(url)=>{
    assert(url.includes(`owner_id=eq.${owner}`));
    if(url.includes('jt_monzo_transactions'))return response([{id:'tx',amount:4500,reconciliation:'baseline'}]);
    if(url.includes('jt_monzo_feed_settings'))return response([{last_synced_at:'2026-09-16T10:00:00Z'}]);
    throw new Error('Unexpected request');
  });
  const r=await handleMonzo(request('transactions'));assert.equal(r.status,200);
  const body=await r.text();assert(body.includes('4500'));assert(!body.includes('bank-token'));
});
test('job rejects missing and reused tickets before reading bank credentials',async t=>{
  mock(t,(url)=>{assert(url.includes('jt_monzo_sync_jobs'));return response([]);});
  assert.equal((await handleMonzo(request('job','POST'))).status,401);
  assert.equal((await handleMonzo(request('job','POST',{Authorization:'Bearer '+ 'a'.repeat(64)}))).status,401);
});
test('sync paginates and strips private bank metadata before caching',async t=>{
  const encrypted_tokens=seal({access_token:'bank-token',expires_at:Date.now()+3600000},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  let pages=0,ingested=0,fresh=false;
  mock(t,(url,opts)=>{
    if(url.includes('jt_monzo_credentials'))return response([{encrypted_tokens,account_id:'business'}]);
    if(url.endsWith('/accounts'))return response({accounts:[{id:'business',type:'uk_business',closed:false}]});
    if(url.includes('/transactions?')){
      const u=new URL(url);assert.equal(u.searchParams.get('account_id'),'business');
      if(pages++) {assert.equal(u.searchParams.get('since'),'tx99');return response({transactions:[]});}
      return response({transactions:Array.from({length:100},(_,i)=>({id:'tx'+i,amount:4500,currency:'GBP',created:'2026-09-16T09:00:00Z',description:'Payment',settled:'yes',metadata:{secret:'hidden'},account_id:'private'}))});
    }
    if(url.includes('jt_monzo_ingest')) {const body=JSON.parse(opts.body);assert.equal(body.p_owner,owner);assert(!opts.body.includes('private'));assert(!opts.body.includes('hidden'));ingested+=body.p_rows.length;return response(null);}
    if(url.includes('jt_monzo_feed_settings')){fresh=true;return response([]);}
    if(url.includes('jt_ops_connections'))return response([]);
    throw new Error('Unexpected request');
  });
  assert.equal((await handleMonzo(request('sync','POST'))).status,200);
  assert.equal(ingested,100);assert.equal(pages,2);assert(fresh);
});
test('expired token is refreshed under a database lease',async t=>{
  const encrypted_tokens=seal({access_token:'expired',refresh_token:'old-refresh',expires_at:0},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  let writes=[],newToken=false;
  mock(t,(url,opts)=>{
    if(url.includes('jt_monzo_credentials')){
      if(opts.method==='PATCH'){const data=JSON.parse(opts.body);writes.push(data);return response([{encrypted_tokens}]);}
      return response([{encrypted_tokens}]);
    }
    if(url.includes('/oauth2/token')){assert.equal(opts.body.get('refresh_token'),'old-refresh');newToken=true;return response({access_token:'fresh-token',refresh_token:'fresh-refresh',expires_in:3600});}
    if(url.endsWith('/accounts')){assert(newToken);assert.equal(opts.headers.Authorization,'Bearer fresh-token');return response({accounts:[]});}
    throw new Error('Unexpected request');
  });
  assert.equal((await handleMonzo(request('verify','POST'))).status,409);
  assert(writes[0].refresh_lock);assert(writes[1].encrypted_tokens);assert.equal(writes[2].refresh_lock,null);
});
test('concurrent refresh is refused without redeeming refresh token twice',async t=>{
  const encrypted_tokens=seal({access_token:'expired',refresh_token:'old-refresh',expires_at:0},{clientSecret:env.MONZO_CLIENT_SECRET},owner);
  mock(t,(url,opts)=>{assert(url.includes('jt_monzo_credentials'));return response(opts.method==='PATCH'?[]:[{encrypted_tokens}]);});
  const r=await handleMonzo(request('verify','POST'));assert.equal(r.status,409);assert.match(await r.text(),/refreshing/);
});

for (const scenario of [
  {body:{error:'invalid_client',error_description:'DO-NOT-EXPOSE'},status:401,reason:'client_credentials'},
  {body:{access_token:'DO-NOT-EXPOSE',expires_in:3600},status:200,reason:'not_confidential'},
  {body:{error:'invalid_grant'},status:400,reason:'login_expired'}
]) test(`callback reports ${scenario.reason} without exposing secrets`,async t=>{
  let detail;
  mock(t,(url,opts)=>{
    if(url.includes('jt_monzo_oauth_states'))return response([{owner_id:owner}]);
    if(url.includes('hub_staff'))return response([{user_id:owner}]);
    if(url.includes('/oauth2/token'))return response(scenario.body,scenario.status);
    if(url.includes('jt_ops_connections')){detail=JSON.parse(opts.body);return response([]);}
    throw new Error('Unexpected request');
  });
  const state='a'.repeat(64),r=await handleMonzo(new Request(`${origin}/api/monzo/callback?state=${state}&code=DO-NOT-EXPOSE`,{headers:{Cookie:`__Secure-jt_monzo_state=${state}`}}));
  assert(r.headers.get('location').endsWith(scenario.reason));
  assert.equal(detail.status,'error');assert(!JSON.stringify(detail).includes('DO-NOT-EXPOSE'));assert(!r.headers.get('location').includes('DO-NOT-EXPOSE'));
});
