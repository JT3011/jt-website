// Private coaching portal. All provider credentials stay on the server.
const BASE = 'appfxqoZZWAqFgaIu';
const PLAYERS = 'tblLqAsqaegQarJwG';
const PAYMENTS = 'tblbALLdCCcML7lHG';
const F = {
  name: 'fldHywXlmWQrlX6Hf', fallbackName: 'fldwYEJcw0rABz91D', payments: 'fldl736fChLtnfnqk',
  remaining: 'fldvc8djsV6LKeug4', purchased: 'fldG76Un7xQtO4CYV', used: 'fld5t8zvFBWPjrdoF',
  service: 'fldb6f65wjltrsZZf', players: 'fldYD8bKUXRQ8vAK8',
  usageDate: 'fld4CRcM28FoDjKot', paymentDate: 'fldRSgMlW3gCFDm2m'
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECORD = /^rec[A-Za-z0-9]{14}$/;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const ids = (v) => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : x.id) : [];
const number = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;

export function summariseCredits(player, payments) {
  const linked = new Set(ids(player.fields[F.payments]));
  return payments.filter(p => linked.has(p.id) && ids(p.fields[F.players]).includes(player.id)).map(p => ({
    service: typeof p.fields[F.service] === 'string' ? p.fields[F.service] : p.fields[F.service]?.name || 'Coaching sessions',
    remaining: number(p.fields[F.remaining]), purchased: number(p.fields[F.purchased]),
    used: number(p.fields[F.used]) ?? 0,
    source_updated_at: [p.fields[F.usageDate], p.fields[F.paymentDate]].filter(x => typeof x === 'string').sort().at(-1) || null
  }));
}

export function canEdit(context, player) {
  return ['owner','admin'].includes(context.role) || (context.role === 'coach' && context.coachPlayers.includes(player));
}
export function canView(context, player) {
  return context.user.id === player || canEdit(context, player) || context.parentPlayers.includes(player);
}

export function createHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => res.status(status).json(body);
    try {
      if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(405, {error:'Method not allowed.'}); }
      const token = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
      if (!token) fail(401, 'Please sign in to your Performance Hub account.');
      if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) fail(403, 'Please use the Performance Hub website.');
      const url = (env.SUPABASE_URL || '').replace(/\/$/, '');
      const publicKey = env.SUPABASE_PUBLISHABLE_KEY;
      const secret = env.SUPABASE_SECRET_KEY;
      if (!url || !publicKey || !secret) fail(503, 'The coaching portal is being configured. Please try again shortly.');
      const auth = await fetchImpl(`${url}/auth/v1/user`, {headers:{apikey:publicKey, Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(10000)});
      if (!auth.ok) fail(401, 'Your session has expired. Please sign in again.');
      const user = await auth.json();
      if (!user.id || !user.email_confirmed_at || user.is_anonymous) fail(403, 'Please confirm your email before opening your coaching record.');

      async function db(table, query = {}, {method='GET', body, asUser=false, prefer} = {}) {
        const target = new URL(`${url}/rest/v1/${table}`);
        for (const [key,value] of Object.entries(query)) target.searchParams.set(key, value);
        const headers = {apikey:asUser ? publicKey : secret, 'Content-Type':'application/json'};
        // New Supabase secret keys are API keys, not JWTs.
        if (asUser) headers.Authorization = `Bearer ${token}`;
        else if (secret.startsWith('eyJ')) headers.Authorization = `Bearer ${secret}`;
        if (prefer) headers.Prefer = prefer;
        const response = await fetchImpl(target, {method,headers,body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(10000)});
        if (!response.ok) {
          if (response.status === 409) fail(409, 'That record is already linked. Review the existing connection first.');
          if (response.status === 403 && !asUser) fail(503, 'The Hub could not load your account access. Please try again shortly.');
          fail(response.status === 403 ? 403 : 502, response.status === 403 ? 'You do not have permission to make this change.' : 'Your record could not be loaded or saved. Please try again.');
        }
        const text = await response.text();
        return text ? JSON.parse(text) : [];
      }
      const [staff, coachLinks, parentLinks] = await Promise.all([
        db('hub_staff',{user_id:`eq.${user.id}`,select:'role'}),
        db('session_connect_coach_players',{coach_user_id:`eq.${user.id}`,active:'eq.true',select:'player_user_id'}),
        db('session_connect_parent_players',{parent_user_id:`eq.${user.id}`,active:'eq.true',select:'player_user_id'})
      ]);
      const ctx = {user,role:staff[0]?.role || 'client',coachPlayers:coachLinks.map(x=>x.player_user_id),parentPlayers:parentLinks.map(x=>x.player_user_id)};
      const manager = ['owner','admin'].includes(ctx.role);
      const owner = ctx.role === 'owner';
      const requestUrl = new URL(req.url, 'https://portal.local');
      let body = {};
      if (req.method === 'POST') {
        if (Number(req.headers['content-length']) > 40000) fail(413, 'This programme is too long.');
        try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { fail(400,'Invalid request.'); }
        if (JSON.stringify(body).length > 40000) fail(413, 'This programme is too long.');
      }
      const action = req.method === 'GET' ? requestUrl.searchParams.get('action') || 'overview' : body.action;
      const player = req.method === 'GET' ? requestUrl.searchParams.get('player') : body.player;
      const requirePlayer = () => { if (!UUID.test(player || '')) fail(400,'Choose a player first.'); if (!canView(ctx,player)) fail(403,'This player is not connected to your account.'); };
      const requireOwner = () => { if (!owner) fail(403,'Only JT can manage account access.'); };
      const profileFields = 'id,player_name,first_name,primary_position,playing_level,development_goal,account_type';
      const profileName = p => p.player_name || p.first_name || 'Player';
      const airtableConfigured = Boolean(env.AIRTABLE_READ_TOKEN);

      async function verifiedAccounts() {
        const accounts = []; let page = 1;
        while (true) {
          const response = await fetchImpl(`${url}/auth/v1/admin/users?page=${page}&per_page=100`,{headers:{apikey:secret,...(secret.startsWith('eyJ')?{Authorization:`Bearer ${secret}`}:{})},signal:AbortSignal.timeout(10000)});
          if (!response.ok) fail(502,'The account list could not be loaded.');
          const data = await response.json();
          accounts.push(...(data.users||[]).filter(u=>u.email_confirmed_at&&!u.is_anonymous).map(u=>({id:u.id,email:u.email})));
          if ((data.users||[]).length<100) break;
          if (++page>30) fail(502,'Account list is too large.');
        }
        return accounts;
      }
      async function airtable(table, record, fields) {
        if (!airtableConfigured) fail(503, 'Automatic Airtable updates need the read-only connection to be enabled by JT.');
        let offset; const records = [];
        do {
          const target = new URL(`https://api.airtable.com/v0/${BASE}/${table}${record ? `/${record}` : ''}`);
          target.searchParams.set('returnFieldsByFieldId', 'true');
          if (!record) { target.searchParams.set('pageSize','100'); for (const field of fields) target.searchParams.append('fields[]',field); }
          if (offset) target.searchParams.set('offset', offset);
          const response = await fetchImpl(target, {headers:{Authorization:`Bearer ${env.AIRTABLE_READ_TOKEN}`},signal:AbortSignal.timeout(10000)});
          if (!response.ok) fail(502,'Airtable is unavailable. Your last saved balance is shown with its sync date.');
          const data = await response.json();
          if (record) return data;
          records.push(...(data.records || [])); offset = data.offset;
          if (records.length > 3000) fail(502,'The Airtable sync needs a larger batch limit. Please contact JT.');
        } while (offset);
        return records;
      }
      async function saveSnapshot(record, payments) {
        const snapshot = {airtable_record_id:record.id,display_name:record.fields[F.name] || record.fields[F.fallbackName] || 'Player',credits:summariseCredits(record,payments),synced_at:new Date().toISOString()};
        await db('hub_airtable_players',{on_conflict:'airtable_record_id'},{method:'POST',body:snapshot,prefer:'resolution=merge-duplicates'});
        return snapshot;
      }
      if (req.method === 'GET' && action === 'overview') {
        const permitted = [...new Set([user.id,...ctx.parentPlayers,...(ctx.role === 'coach' ? ctx.coachPlayers : [])])];
        const profiles = await db('profiles',{select:profileFields,...(manager ? {} : {id:`in.(${permitted.join(',')})`}),order:'player_name.asc.nullslast'});
        const staffIds = manager ? (await db('hub_staff',{select:'user_id'})).map(s=>s.user_id) : ctx.role==='coach' ? [user.id] : [];
        const membership = await db('memberships',{user_id:`eq.${user.id}`,select:'subscription_status'});
        return send(200,{role:ctx.role,name:user.user_metadata?.full_name || profiles.find(p=>p.id===user.id)?.first_name || 'Welcome',
          trainingUrl:['active','trialing'].includes(membership[0]?.subscription_status) ? '/performance-hub-dashboard.html' : '/performance-hub-free.html',
          players:profiles.filter(p=>p.id===user.id||!staffIds.includes(p.id)).map(p=>({...p,name:profileName(p),isSelf:p.id===user.id,canEdit:canEdit(ctx,p.id)})),airtableConfigured:manager ? airtableConfigured : undefined});
      }
      if (req.method === 'GET' && action === 'player') {
        requirePlayer();
        const [profiles, programmes, links] = await Promise.all([
          db('profiles',{id:`eq.${player}`,select:profileFields}),
          db('hub_player_programmes',{player_user_id:`eq.${player}`,select:'*'},{asUser:true}),
          db('hub_player_airtable_links',{player_user_id:`eq.${player}`,select:'airtable_record_id'},{asUser:true})
        ]);
        if (!profiles.length) fail(404,'Player profile not found.');
        let credit = null; let syncStatus = 'unlinked';
        if (links[0]) {
          credit = (await db('hub_airtable_players',{airtable_record_id:`eq.${links[0].airtable_record_id}`,select:'*'},{asUser:true}))[0] || null;
          syncStatus = airtableConfigured ? 'cached' : 'connection_pending';
          if (airtableConfigured && (!credit || Date.now()-new Date(credit.synced_at).getTime()>300000)) {
            try {
              const record = await airtable(PLAYERS,links[0].airtable_record_id);
              const payments = [];
              for (const id of ids(record.fields[F.payments])) {
                if (!RECORD.test(id)) continue;
                payments.push(await airtable(PAYMENTS,id));
              }
              credit = await saveSnapshot(record,payments); syncStatus = 'live';
            } catch { syncStatus = 'unavailable'; }
          }
        }
        return send(200,{profile:{...profiles[0],name:profileName(profiles[0])},canEdit:canEdit(ctx,player),programmes,
          credit:credit ? {credits:credit.credits,synced_at:credit.synced_at} : null,syncStatus});
      }
      if (req.method === 'POST' && action === 'save-programme') {
        requirePlayer(); if (!canEdit(ctx,player)) fail(403,'Only your connected coach or JT can edit a programme.');
        if (!['gym','nutrition'].includes(body.kind) || !['draft','published'].includes(body.status)) fail(400,'Choose a programme type and status.');
        const title = clean(body.title,150); const content = clean(body.content,20000);
        if (!title || !content) fail(400,'Add a title and programme instructions before saving.');
        for (const date of [body.starts_on,body.review_on]) if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400,'Enter a valid programme date.');
        if (body.starts_on && body.review_on && body.review_on < body.starts_on) fail(400,'The review date must follow the start date.');
        const row = {player_user_id:player,kind:body.kind,title,content,goal:clean(body.goal,1000),status:body.status,starts_on:body.starts_on||null,review_on:body.review_on||null};
        await db('hub_player_programmes',{on_conflict:'player_user_id,kind'},{method:'POST',body:row,asUser:true,prefer:'resolution=merge-duplicates'});
        return send(200,{ok:true});
      }
      if (req.method === 'GET' && action === 'access') {
        requireOwner();
        const [profiles,staffRows,parents,coaches,links,airtablePlayers,invites] = await Promise.all([
          db('profiles',{select:profileFields}),db('hub_staff',{select:'user_id,role'}),
          db('session_connect_parent_players',{active:'eq.true',select:'parent_user_id,player_user_id'}),
          db('session_connect_coach_players',{active:'eq.true',select:'coach_user_id,player_user_id'}),
          db('hub_player_airtable_links',{select:'player_user_id,airtable_record_id'}),
          db('hub_airtable_players',{select:'airtable_record_id,display_name',order:'display_name.asc'}),
          db('session_connect_coach_invites',{active:'eq.true',select:'email,display_name'})
        ]);
        const accounts = await verifiedAccounts();
        return send(200,{accounts:accounts.map(a=>({...a,name:profileName(profiles.find(p=>p.id===a.id)||{}),role:staffRows.find(s=>s.user_id===a.id)?.role||'client'})),parents,coaches,links,airtablePlayers,invites});
      }
      if (req.method === 'POST' && action === 'grant-coach') {
        requireOwner();
        const email = clean(body.email,254).toLowerCase(); const name = clean(body.name,100);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) fail(400,'Enter the coach’s name and email.');
        const existing = (await verifiedAccounts()).find(a=>a.email.toLowerCase()===email);
        if (existing) {
          const currentRole = (await db('hub_staff',{user_id:`eq.${existing.id}`,select:'role'}))[0]?.role;
          if (['owner','admin'].includes(currentRole)) fail(409,'This account already has management access.');
          await db('hub_staff',{on_conflict:'user_id'},{method:'POST',body:{user_id:existing.id,role:'coach'},prefer:'resolution=merge-duplicates'});
          return send(200,{ok:true,message:'Coach access enabled. They can use their existing Hub login.'});
        }
        // A pending invitation activates only after Supabase verifies ownership of the email.
        await db('session_connect_coach_invites',{on_conflict:'email'},{method:'POST',body:{email,display_name:name,role:'coach',active:true,accepted_user_id:null,accepted_at:null},prefer:'resolution=merge-duplicates'});
        return send(200,{ok:true,message:'Coach approved. Share the coach login link with them; no email has been sent.'});
      }
      if (req.method === 'POST' && action === 'link-access') {
        requireOwner();
        if (!UUID.test(body.account || '') || !UUID.test(player || '') || !['coach','parent'].includes(body.kind) || typeof body.active !== 'boolean') fail(400,'Choose an account, player and relationship.');
        if (body.account === player) fail(400,'A player already has access to their own record.');
        if (body.kind === 'coach') {
          const approved = await db('hub_staff',{user_id:`eq.${body.account}`,select:'role'});
          if (!approved.length) fail(400,'Approve this coach before connecting a player.');
        }
        const table = body.kind === 'coach' ? 'session_connect_coach_players' : 'session_connect_parent_players';
        const column = body.kind === 'coach' ? 'coach_user_id' : 'parent_user_id';
        await db(table,{on_conflict:`${column},player_user_id`},{method:'POST',body:{[column]:body.account,player_user_id:player,active:body.active,created_by:user.id},prefer:'resolution=merge-duplicates'});
        return send(200,{ok:true});
      }
      if (req.method === 'POST' && action === 'link-airtable') {
        requireOwner();
        if (!UUID.test(player || '') || !RECORD.test(body.record || '')) fail(400,'Choose a player and an Airtable record.');
        await db('hub_player_airtable_links',{on_conflict:'player_user_id'},{method:'POST',body:{player_user_id:player,airtable_record_id:body.record,linked_by:user.id,linked_at:new Date().toISOString()},prefer:'resolution=merge-duplicates'});
        return send(200,{ok:true});
      }
      if (req.method === 'POST' && action === 'sync-airtable') {
        requireOwner();
        const players = await airtable(PLAYERS,null,[F.name,F.fallbackName,F.payments]);
        const payments = await airtable(PAYMENTS,null,[F.remaining,F.purchased,F.used,F.service,F.players,F.usageDate,F.paymentDate]);
        const now = new Date().toISOString();
        await db('hub_airtable_players',{on_conflict:'airtable_record_id'},{method:'POST',body:players.map(p=>({airtable_record_id:p.id,display_name:p.fields[F.name]||p.fields[F.fallbackName]||'Player',credits:summariseCredits(p,payments),synced_at:now})),prefer:'resolution=merge-duplicates'});
        return send(200,{ok:true,message:`Updated ${players.length} Airtable player records.`});
      }
      fail(400,'Unknown portal action.');
    } catch (error) {
      return send(error.status || 500,{error:error.status ? error.message : 'Something went wrong. Please try again.'});
    }
  };
}
export default createHandler();
