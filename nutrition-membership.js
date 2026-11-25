import {supabase, getAccessState, UPGRADE_URL} from '/performance-hub-free-access.js';

// This tag selects an experience only. Stripe and the claim API still verify payment.
export const NUTRITION_CHECKOUT_URL = UPGRADE_URL + '?client_reference_id=nutrition&utm_source=jt_nutrition';
export const validCheckoutId = value => /^cs_live_[A-Za-z0-9]+$/.test(value || '');

export async function verifyNutritionCheckout(sessionId) {
  if (!validCheckoutId(sessionId)) throw Error('This checkout link is incomplete. Open the link from your completed checkout.');
  const response = await fetch('/api/verify-checkout?session_id=' + encodeURIComponent(sessionId), {cache:'no-store'});
  const data = await response.json();
  if (!response.ok || !data.verified) throw Error(data.error || 'Your subscription could not be confirmed yet.');
  return data;
}

export async function connectNutritionMembership(sessionId) {
  const {data:{session},error} = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) return false;
  const pending = sessionId || session.user.user_metadata?.nutrition_checkout_session;
  if (!validCheckoutId(pending)) return false;
  const response = await fetch('/api/claim-membership', {method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({session_id:pending})});
  const result = await response.json();
  if (!response.ok || !result.claimed) throw Error(result.error || 'Your membership could not be connected.');
  const updated = await supabase.auth.updateUser({data:{service_focus:'nutrition',nutrition_checkout_session:null}});
  if (updated.error) throw updated.error;
  return true;
}

export async function rememberNutritionCheckout(sessionId) {
  if (!validCheckoutId(sessionId)) return;
  const {error} = await supabase.auth.updateUser({data:{service_focus:'nutrition',nutrition_checkout_session:sessionId}});
  if (error) throw error;
}

export {getAccessState};
