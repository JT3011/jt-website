(() => {
  const nav = document.querySelector('.top-actions');
  if (!nav || nav.querySelector('[href="/performance-hub-portal.html"]')) return;
  const link = document.createElement('a');
  link.href = '/performance-hub-portal.html';
  link.textContent = 'My Coaching';
  link.className = document.querySelector('.pill-btn') ? 'pill-btn gold' : 'top-link';
  link.style.cssText = 'display:inline-flex;align-items:center;white-space:nowrap';
  nav.prepend(link);
})();
