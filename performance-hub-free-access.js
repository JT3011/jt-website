import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://hunrekcnmtabowiivmrk.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yfi5vW_HTltDcUPAqmqiyQ_qSnckDNJ";
export const UPGRADE_URL = "https://buy.stripe.com/fZucMYcQuaGx2OA3y56Vq05";
export const PREMIUM_STATUSES = ["trialing", "active"];

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

export function isPremiumStatus(status = "") {
  return PREMIUM_STATUSES.includes(String(status || "").toLowerCase());
}

export async function getAccessState() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const session = sessionData?.session || null;
  const user = session?.user || null;

  if (!user) {
    return {
      user: null,
      session: null,
      membership: null,
      tier: "signed-out",
      isPremium: false
    };
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("memberships")
      .select("subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) throw membershipError;

  const isPremium = isPremiumStatus(membership?.subscription_status);

  return {
    user,
    session,
    membership,
    tier: isPremium ? "premium" : "free",
    isPremium
  };
}

export async function routeSignedInUser() {
  const access = await getAccessState();

  if (!access.user) return access;

  window.location.replace(
    access.isPremium
      ? "/performance-hub-dashboard.html"
      : "/performance-hub-free.html"
  );

  return access;
}

export async function requireFreeAccess() {
  const access = await getAccessState();

  if (!access.user) {
    window.location.replace("/performance-hub-login.html");
    return null;
  }

  if (access.isPremium) {
    window.location.replace("/performance-hub-dashboard.html");
    return null;
  }

  return access;
}

export function formatLabel(value = "", fallback = "Not set") {
  const clean = String(value || "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .trim();

  if (!clean) return fallback;

  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length
    ? parts.map((part) => part[0].toUpperCase()).join("")
    : "JT";
}

export function openUpgrade() {
  window.location.href = UPGRADE_URL;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/performance-hub-login.html";
}
