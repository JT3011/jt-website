import {createHash} from 'node:crypto';
import * as webpush from 'web-push';

export const HUB_PAYMENT_LINK = 'https://buy.stripe.com/fZucMYcQuaGx2OA3y56Vq05';
const PAYMENT_LINK_ID = 'plink_1TuwAP2aPmMCWSgwHJpG6jL6';
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const hash = value => createHash('sha256').update(value).digest('hex');
const id = value => typeof value === 'string' ? value : value?.id;

export function validatePushSubscription(input) {
  let url;
  try { url = new URL(input?.endpoint); } catch { fail(400, 'This device could not be registered.'); }
  const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'web.push.apple.com' ||
    url.hostname.endsWith('.push.apple.com') || url.hostname === 'updates.push.services.mozilla.com' ||
    url.hostname.endsWith('.notify.windows.com');
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || input.endpoint.length > 4096)
    fail(400, 'This notification provider is not supported.');
  const keys = input?.keys;
  if (!keys || !/^[A-Za-z0-9_-]{87}$/.test(keys.p256dh || '') || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth || '') ||
      Buffer.from(keys.p256dh, 'base64url')[0] !== 4) fail(400, 'The notification keys are invalid.');
  return {endpoint: input.endpoint, keys: {p256dh: keys.p256dh, auth: keys.auth}};
}

export function signupStore(env, fetchImpl = fetch) {
  return async (table, query = {}, {method = 'GET', body, prefer} = {}) => {
    const secret = env.SUPABASE_SECRET_KEY;
    if (!env.SUPABASE_URL || !secret) throw new Error('Signup storage is not configured.');
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetchImpl(url, {method, headers: {
      apikey: secret, ...(secret.startsWith('eyJ') ? {Authorization: `Bearer ${secret}`} : {}),
      'Content-Type': 'application/json', ...(prefer ? {Prefer: prefer} : {})
    }, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`Signup storage request failed (${response.status}).`);
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  };
}

export function pushReady(env) { return Boolean(env.HUB_PUSH_PUBLIC_KEY && env.HUB_PUSH_PRIVATE_KEY); }
export async function sendPush(subscription, payload, env) {
  if (!pushReady(env)) throw new Error('Push notifications are not configured.');
  validatePushSubscription(subscription);
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: {subject: 'mailto:info@jtmindbodybalance.com', publicKey: env.HUB_PUSH_PUBLIC_KEY, privateKey: env.HUB_PUSH_PRIVATE_KEY},
    TTL: 3600, urgency: 'high', timeout: 8000,
    topic: hash(payload.tag).slice(0, 32)
  });
}

export function signupNotification(row) {
  const name = row.client_name?.split(/\s+/)[0] || 'A client';
  const amount = new Intl.NumberFormat('en-GB', {style: 'currency', currency: row.currency}).format(row.amount_pence / 100);
  return {title: 'Hub subscription confirmed',
    body: row.subscription_status === 'trialing' ? `${name} started their trial. ${amount}/month after the trial.` : `${name} subscribed. Payment confirmed.`,
    tag: `hub-signup-${row.id}`, url: '/performance-hub-signups.html'};
}

// Invoked only after the raw Stripe signature has been verified. Retries share a
// checkout ID and a per-device lease; expired devices are removed, transient
// failures return a non-2xx response so Stripe retries delivery.
export async function processSignupEvent(event, {env = process.env, fetchImpl = fetch, db = signupStore(env, fetchImpl), push = sendPush} = {}) {
  if (event.livemode !== true || !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return {ignored: true};
  const snapshot = event.data?.object;
  if (snapshot?.mode !== 'subscription' || snapshot.payment_link !== PAYMENT_LINK_ID || !/^cs_live_[A-Za-z0-9]+$/.test(snapshot.id || '')) return {ignored: true};
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) throw new Error('Signup verification is not configured.');
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${snapshot.id}`);
  url.searchParams.append('expand[]', 'line_items'); url.searchParams.append('expand[]', 'subscription');
  const response = await fetchImpl(url, {headers: {Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`}, signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Stripe signup verification failed.');
  const session = await response.json(), subscription = session.subscription;
  const item = session.line_items?.data?.find(item => item.price?.id === env.STRIPE_PRICE_ID);
  if (session.livemode !== true || session.status !== 'complete' || session.mode !== 'subscription' || session.payment_link !== PAYMENT_LINK_ID ||
      !item || item.quantity !== 1 || item.price.unit_amount !== 1299 || item.price.currency !== 'gbp' ||
      item.price.recurring?.interval !== 'month' || item.price.recurring.interval_count !== 1 ||
      !['active', 'trialing'].includes(subscription?.status)) return {ignored: true};
  if (session.payment_status !== 'paid' && !(subscription.status === 'trialing' && session.payment_status === 'no_payment_required')) return {ignored: true};
  const row = {id: session.id, stripe_event_id: event.id, stripe_subscription_id: id(subscription), stripe_customer_id: id(session.customer),
    client_name: String(session.customer_details?.name || '').slice(0, 200), client_email: String(session.customer_details?.email || session.customer_email || '').slice(0, 254),
    amount_pence: item.price.unit_amount, currency: item.price.currency, subscription_status: subscription.status,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    confirmed_at: new Date(event.created * 1000).toISOString()};
  await db('hub_signup_alerts', {on_conflict: 'id'}, {method: 'POST', body: row, prefer: 'resolution=ignore-duplicates,return=minimal'});
  const owners = await db('hub_staff', {role: 'eq.owner', select: 'user_id'});
  const ownerIds = new Set(owners.map(owner => owner.user_id));
  const devices = (await db('hub_signup_push_devices', {select: '*'})).filter(device => ownerIds.has(device.user_id));
  const outcomes = await Promise.allSettled(devices.map(async device => {
    const claims = await db('rpc/hub_claim_signup_delivery', {}, {method: 'POST', body: {p_signup: row.id, p_device: device.id}});
    const claim = claims[0];
    if (!claim) {
      const previous = await db('hub_signup_push_deliveries', {signup_id: `eq.${row.id}`, device_id: `eq.${device.id}`, select: 'delivered_at'});
      if (previous[0]?.delivered_at) return;
      throw new Error('Signup delivery is already in progress.');
    }
    try {
      await push(device.subscription, signupNotification(row), env);
      await db('hub_signup_push_deliveries', {signup_id: `eq.${row.id}`, device_id: `eq.${device.id}`, lease_token: `eq.${claim.lease_token}`},
        {method: 'PATCH', body: {delivered_at: new Date().toISOString()}, prefer: 'return=minimal'});
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        await db('hub_signup_push_devices', {id: `eq.${device.id}`}, {method: 'DELETE'}); return;
      }
      await db('hub_signup_push_deliveries', {signup_id: `eq.${row.id}`, device_id: `eq.${device.id}`, lease_token: `eq.${claim.lease_token}`},
        {method: 'PATCH', body: {leased_until: new Date(0).toISOString()}, prefer: 'return=minimal'});
      throw new Error('Push provider did not accept the notification.');
    }
  }));
  if (outcomes.some(outcome => outcome.status === 'rejected')) throw new Error('A signup notification needs retrying.');
  return {recorded: true};
}

export async function handleSignupAlerts({role, user, action, method, body, db, env = process.env, push = sendPush}) {
  if (role !== 'owner') fail(403, 'Only JT can view subscription signups.');
  if (method === 'GET' && action === 'signup-alerts') {
    const [signups, devices] = await Promise.all([
      db('hub_signup_alerts', {select: 'id,client_name,client_email,amount_pence,currency,subscription_status,trial_end,confirmed_at,stripe_subscription_id', order: 'confirmed_at.desc,id.desc', limit: '100'}),
      db('hub_signup_push_devices', {user_id: `eq.${user.id}`, select: 'id'})
    ]);
    const ids = signups.map(row => row.id);
    const linked = ids.length ? await db('memberships', {stripe_checkout_session_id: `in.(${ids.join(',')})`, select: 'stripe_checkout_session_id'}) : [];
    const accounts = new Set(linked.map(row => row.stripe_checkout_session_id));
    return {ready: pushReady(env), public_key: env.HUB_PUSH_PUBLIC_KEY || null, device_count: devices.length, checkout_url: HUB_PAYMENT_LINK, nutrition_url: "https://jt-website-orpin.vercel.app/nutrition",
      signups: signups.map(row => ({...row, account_connected: accounts.has(row.id)}))};
  }
  if (method !== 'POST') fail(405, 'Method not allowed.');
  if (!['signup-enable', 'signup-disable', 'signup-device-status', 'signup-test'].includes(action)) fail(400, 'Unknown notification action.');
  if (action === 'signup-enable') {
    if (!pushReady(env)) fail(503, 'Notifications are being configured. Please try again shortly.');
    const subscription = validatePushSubscription(body.subscription), endpoint_hash = hash(subscription.endpoint);
    const devices = await db('hub_signup_push_devices', {user_id: `eq.${user.id}`, select: 'endpoint_hash'});
    if (devices.length >= 10 && !devices.some(device => device.endpoint_hash === endpoint_hash)) fail(400, 'Ten devices are already enabled. Turn off an old device first.');
    await db('hub_signup_push_devices', {on_conflict: 'endpoint_hash'}, {method: 'POST', body: {user_id: user.id, endpoint_hash, subscription, updated_at: new Date().toISOString()}, prefer: 'resolution=merge-duplicates,return=minimal'});
    return {enabled: true};
  }
  if (typeof body.endpoint !== 'string' || body.endpoint.length > 4096) fail(400, 'Choose this device first.');
  const query = {user_id: `eq.${user.id}`, endpoint_hash: `eq.${hash(body.endpoint)}`};
  if (action === 'signup-disable') { await db('hub_signup_push_devices', query, {method: 'DELETE'}); return {enabled: false}; }
  const devices = await db('hub_signup_push_devices', {...query, select: '*'});
  if (action === 'signup-device-status') return {enabled: devices.length > 0};
  if (!devices[0]) fail(400, 'Enable notifications on this device first.');
  const device = devices[0];
  const claimed = await db('hub_signup_push_devices', {...query, or: `(last_test_at.is.null,last_test_at.lt.${new Date(Date.now() - 30000).toISOString()})`},
    {method: 'PATCH', body: {last_test_at: new Date().toISOString()}, prefer: 'return=representation'});
  if (!claimed.length) fail(429, 'Wait 30 seconds before sending another test.');
  try { await push(device.subscription, {title: 'JT signup alerts are ready', body: 'Test notification. New subscription confirmations will appear here.', tag: 'jt-signup-test', url: '/performance-hub-signups.html'}, env); }
  catch (error) {
    if ([404, 410].includes(error.statusCode)) { await db('hub_signup_push_devices', query, {method: 'DELETE'}); fail(410, 'This device registration expired. Enable notifications again.'); }
    fail(502, 'The test could not be sent. Please try again.');
  }
  return {sent: true};
}
