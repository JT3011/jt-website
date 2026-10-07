/* Clothing controls progressively enhance working HTML product links. */
(() => {
  const shop = document.getElementById('shop');
  if (!shop) return;
  const cards = [...shop.querySelectorAll('.collection-card')];
  const filters = shop.querySelector('.collection-filters');
  const count = shop.querySelector('#collection-count');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function filterCollection(value) {
    let visible = 0;
    cards.forEach(card => {
      card.hidden = value !== 'all' && card.dataset.category !== value;
      if (!card.hidden) { visible++; card.classList.add('is-visible'); }
    });
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
    count.textContent = visible + (visible === 1 ? ' piece' : ' pieces');
  }
  if (filters && count) {
    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (button) filterCollection(button.dataset.filter);
    });
    shop.querySelectorAll('[data-collection-select]').forEach(link => {
      link.addEventListener('click', () => {
        filterCollection(link.dataset.collectionSelect);
        // Preserve the real #collection-pieces link and move keyboard focus to it.
        shop.querySelector('#collection-pieces').focus({preventScroll:true});
      });
    });
  }
  shop.querySelectorAll('.collection-views').forEach(group => {
    group.hidden = false;
    group.addEventListener('click', event => {
      const button = event.target.closest('button[data-image]');
      if (!button) return;
      const img = document.getElementById(button.getAttribute('aria-controls'));
      if (!img) return;
      img.src = button.dataset.image;
      img.alt = button.dataset.alt;
      group.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
  });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold:.06});
    shop.querySelectorAll('.wear-reveal').forEach(item => observer.observe(item));
    shop.classList.add('wear-reveal-ready');
  }
  // A small editorial drift, not a simulated 360-degree garment rotation.
  const hero = shop.querySelector('.collection-hero-photo');
  const image = hero?.querySelector('img');
  let frame = 0, heroVisible = false;
  function requestFrame() {
    if (!frame && heroVisible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(() => {
      frame = 0;
      const box = hero.getBoundingClientRect();
      const distance = (window.innerHeight / 2 - box.top - box.height / 2) / window.innerHeight;
      image.style.setProperty('--wear-shift', Math.max(-14, Math.min(14, distance * 28)).toFixed(2) + 'px');
    });
  }
  if (image && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; requestFrame(); }).observe(hero);
    window.addEventListener('scroll', requestFrame, {passive:true});
    window.addEventListener('resize', requestFrame, {passive:true});
    reduced.addEventListener('change', () => {
      if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; image.style.removeProperty('--wear-shift'); }
      requestFrame();
    });
  }
})();
