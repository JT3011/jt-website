import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';

const ORIGIN = 'https://jt-website-orpin.vercel.app';
const CALLBACK = `${ORIGIN}/api/monzo/callback`;
const HUB = `${ORIGIN}/performance-hub-command-centre.html`;
const COOKIE = '__Secure-jt_monzo_state';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
class Failure extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const fail = (message, status) => { throw new Failure(message, status); };
const hash = value => createHash('sha256').update(value).digest('hex');
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', ...extra } });
const cookie = (value, age = 600) => `${COOKIE}=${value}; Path=/api/monzo; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const redirect = result => new Response(null, { status: 303, headers: { ...headers, Location: `${HUB}?monzo=${result}`, 'Set-Cookie': cookie('', 0) } });

function config() {
  return { url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    publicKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    clientId: process.env.MONZO_CLIENT_ID?.trim(), clientSecret: process.env.MONZO_CLIENT_SECRET?.trim() };
}
function configured(c) { return Boolean(c.clientId && c.clientSecret); }
function encryptionKey(c) { return createHash('sha256').update(`jt-monzo-tokens-v1:${c.clientSecret}`).digest(); }
export function seal(value, c, owner) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(c), iv);
  cipher.setAAD(Buffer.from(owner));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
}
export function unseal(value, c, owner) {
  const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', encryptionKey(c), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(owner)); decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}
async function sb(c, path, method = 'GET', body, auth) {
  const key = auth ? c.publicKey : c.secretKey;
  const r = await fetch(`${c.url}/${path}`, { method, signal: AbortSignal.timeout(12000), headers: {
    apikey: key, Authorization: `Bearer ${auth || key}`, 'Content-Type': 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates'
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) fail('The bank connection could not access secure Hub storage. Please try again.', 502);
  return r.status === 204 ? null : r.json();
}
async function requireOwner(request, c) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) fail('Sign in to your owner account first.', 401);
  if (!c.url || !c.publicKey || !c.secretKey) fail('Hub server settings are incomplete.', 503);
  const token = auth.slice(7);
  const r = await fetch(`${c.url}/auth/v1/user`, { signal: AbortSignal.timeout(12000), headers: { apikey: c.publicKey, Authorization: auth } });
  if (!r.ok) fail('Your Hub session expired. Please sign in again.', 401);
  const user = await r.json();
  if (!user.id) fail('Sign in to your owner account first.', 401);
  const staff = await sb(c, 'rest/v1/rpc/session_connect_get_staff_context', 'POST', {}, token);
  if (staff?.[0]?.role !== 'owner') fail('Only the business owner can connect Monzo.', 403);
  return user.id;
}
async function tokenRequest(c, fields) {
  const r = await fetch('https://api.monzo.com/oauth2/token', { method: 'POST', signal: AbortSignal.timeout(12000),
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...fields }) });
  if (!r.ok) fail('Monzo authorisation expired or was refused. Please reconnect.', 401);
  const data = await r.json();
  if (!data.access_token || !data.refresh_token || !(data.expires_in > 0)) fail('Monzo did not return a renewable connection. Check that the client is Confidential.', 502);
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 };
}
async function tokenFor(c, owner) {
  const path = `rest/v1/jt_monzo_credentials?owner_id=eq.${encodeURIComponent(owner)}`;
  const rows = await sb(c, `${path}&select=*`);
  if (!rows?.length) fail('Connect Monzo first.', 409);
  let tokens = unseal(rows[0].encrypted_tokens, c, owner);
  if (tokens.expires_at > Date.now() + 60000) return tokens.access_token;
  // A database lease prevents concurrent requests from reusing a rotating refresh token.
  const lock = randomBytes(16).toString('hex'), now = new Date().toISOString();
  const locked = await sb(c, `${path}&or=(refresh_until.is.null,refresh_until.lt.${encodeURIComponent(now)})`, 'PATCH', {
    refresh_lock: lock, refresh_until: new Date(Date.now() + 45000).toISOString()
  });
  if (!locked?.length) fail('Monzo is refreshing. Please try again in a few seconds.', 409);
  try {
    tokens = unseal(locked[0].encrypted_tokens, c, owner);
    if (tokens.expires_at <= Date.now() + 60000) {
      tokens = await tokenRequest(c, { grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
      await sb(c, `${path}&refresh_lock=eq.${lock}`, 'PATCH', { encrypted_tokens: seal(tokens, c, owner), updated_at: new Date().toISOString() });
    }
    return tokens.access_token;
  } finally {
    await sb(c, `${path}&refresh_lock=eq.${lock}`, 'PATCH', { refresh_until: null, refresh_lock: null });
  }
}
async function monzo(token, path) {
  const r = await fetch(`https://api.monzo.com${path}`, { signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 403) fail('Approve access in the Monzo app, then tap Verify connection.', 403);
  if (r.status === 401) fail('Monzo access expired. Please reconnect.', 401);
  if (!r.ok) fail('Monzo could not return your account data. Please try again.', 502);
  return r.json();
}
export function businessAccounts(accounts) { return (accounts || []).filter(a => a.type === 'uk_business' && a.closed === false); }
async function connection(c, status, detail) {
  await sb(c, 'rest/v1/jt_ops_connections?id=eq.monzo', 'PATCH', { status, status_detail: detail, auto_enabled: false, updated_at: new Date().toISOString() });
}

export async function handleMonzo(request) {
  const c = config(), url = new URL(request.url), action = url.pathname.split('/').pop();
  try {
    if (!['status', 'start', 'callback', 'verify', 'transactions'].includes(action)) return json({ error: 'Not found.' }, 404);
    const expectedMethod = ['start', 'verify'].includes(action) ? 'POST' : 'GET';
    if (request.method !== expectedMethod) return json({ error: 'Method not allowed.' }, 405, { Allow: expectedMethod });
    if (action === 'callback') {
      const state = url.searchParams.get('state') || '';
      const suppliedCookie = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
      if (!/^[a-f0-9]{64}$/.test(state) || suppliedCookie.length !== state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(suppliedCookie))) return redirect('state_error');
      if (!configured(c) || !c.url || !c.secretKey) return redirect('setup_required');
      // Consume once, atomically, even when Monzo declined the request.
      const rows = await sb(c, `rest/v1/jt_monzo_oauth_states?state_hash=eq.${hash(state)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, 'DELETE');
      if (!rows?.length) return redirect('state_error');
      if (url.searchParams.has('error')) return redirect('declined');
      const code = url.searchParams.get('code');
      if (!code || code.length > 2048) return redirect('failed');
      const owner = rows[0].owner_id;
      const staff = await sb(c, `rest/v1/hub_staff?user_id=eq.${encodeURIComponent(owner)}&role=eq.owner&select=user_id`);
      if (!staff?.length) return redirect('failed');
      const tokens = await tokenRequest(c, { grant_type: 'authorization_code', redirect_uri: CALLBACK, code });
      await sb(c, 'rest/v1/jt_monzo_credentials?on_conflict=owner_id', 'POST', {
        owner_id: owner, encrypted_tokens: seal(tokens, c, owner), account_id: null, account_label: null,
        refresh_lock: null, refresh_until: null, updated_at: new Date().toISOString()
      });
      await connection(c, 'action_required', 'Authorisation saved. Approve in the Monzo app, then verify your Business account.');
      return redirect('authorised');
    }
    const owner = await requireOwner(request, c);
    if (request.method === 'POST' && request.headers.get('origin') !== ORIGIN) fail('Open the Command Centre on its main website to connect Monzo.', 403);
    if (action === 'status') {
      if (!configured(c)) return json({ configured: false, connected: false });
      const rows = await sb(c, `rest/v1/jt_monzo_credentials?owner_id=eq.${encodeURIComponent(owner)}&select=account_id,account_label`);
      return json({ configured: true, authorised: Boolean(rows?.length), connected: Boolean(rows?.[0]?.account_id), account: rows?.[0]?.account_label || null });
    }
    if (!configured(c)) fail('Add MONZO_CLIENT_ID and MONZO_CLIENT_SECRET to Vercel Production settings, then redeploy.', 503);
    if (action === 'start') {
      const state = randomBytes(32).toString('hex');
      await sb(c, `rest/v1/jt_monzo_oauth_states?owner_id=eq.${encodeURIComponent(owner)}`, 'DELETE');
      await sb(c, 'rest/v1/jt_monzo_oauth_states', 'POST', { owner_id: owner, state_hash: hash(state), expires_at: new Date(Date.now() + 600000).toISOString() });
      const target = new URL('https://auth.monzo.com/');
      target.search = new URLSearchParams({ client_id: c.clientId, redirect_uri: CALLBACK, response_type: 'code', state }).toString();
      return json({ url: target.href }, 200, { 'Set-Cookie': cookie(state) });
    }
    const token = await tokenFor(c, owner);
    // Always confirm the account is an open Business account before reading its transactions.
    const accounts = businessAccounts((await monzo(token, '/accounts')).accounts);
    if (action === 'verify') {
      if (accounts.length !== 1) fail(accounts.length ? 'More than one Business account was found. Account selection needs configuring before connecting.' : 'No open Monzo Business account was found.', 409);
      const account = accounts[0];
      if (account.description?.trim().toLowerCase() !== 'jt mind & body balance') fail('The Business account name does not match JT Mind & Body Balance. Please check the Monzo login.', 409);
      await sb(c, `rest/v1/jt_monzo_credentials?owner_id=eq.${encodeURIComponent(owner)}`, 'PATCH', { account_id: account.id, account_label: account.description, updated_at: new Date().toISOString() });
      await connection(c, 'connected', 'Business account verified. View recent bank activity here. Automatic payment matching is not enabled.');
      return json({ connected: true, account: account.description });
    }
    const rows = await sb(c, `rest/v1/jt_monzo_credentials?owner_id=eq.${encodeURIComponent(owner)}&select=account_id,account_label`);
    const selected = rows?.[0];
    if (!selected?.account_id || !accounts.some(a => a.id === selected.account_id)) fail('Verify your Business account first.', 409);
    const params = new URLSearchParams({ account_id: selected.account_id, since: new Date(Date.now() - 89 * 86400000).toISOString(), limit: '100' });
    const data = await monzo(token, `/transactions?${params}`);
    const transactions = (data.transactions || []).filter(t => !t.decline_reason).map(t => ({
      id: t.id, amount: t.amount, currency: t.currency, description: t.description || '', created: t.created, settled: Boolean(t.settled)
    })).sort((a, b) => b.created.localeCompare(a.created));
    return json({ account: selected.account_label, transactions, limit: 100, days: 89, possiblyTruncated: (data.transactions || []).length === 100 });
  } catch (error) {
    // Never return provider response bodies, OAuth codes, or tokens to the browser/logs.
    if (action === 'callback') return redirect('failed');
    return json({ error: error instanceof Failure ? error.message : 'The secure Monzo connection could not complete. Please try again.' }, error instanceof Failure ? error.status : 502);
  }
}
