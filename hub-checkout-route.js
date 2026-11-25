// Runs before the welcome is painted. A service tag changes presentation, never access.
(async () => {
  const query = new URLSearchParams(location.search), id = query.get('session_id');
  if (!/^cs_live_[A-Za-z0-9]+$/.test(id || '')) return;
  document.documentElement.classList.add('jt-checkout-routing');
  const reveal = () => document.documentElement.classList.remove('jt-checkout-routing');
  try {
    const response = await fetch('/api/verify-checkout?session_id='+encodeURIComponent(id), {cache:'no-store',signal:AbortSignal.timeout(12000)});
    const data = await response.json();
    if (response.ok && data.verified && data.serviceFocus === 'nutrition') {
      location.replace('/nutrition?session_id='+encodeURIComponent(id)+'#signup');
      return;
    }
  } catch {
    // The original signup still performs its own verification and can retry safely.
    if (query.get('utm_source') === 'jt_nutrition') {
      location.replace('/nutrition?session_id='+encodeURIComponent(id)+'#signup');
      return;
    }
  }
  reveal();
})();
