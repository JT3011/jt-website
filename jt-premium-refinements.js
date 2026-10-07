/* Real, attributed excerpts; user-controlled transitions keep reviews readable. */
(() => {
  const root = document.querySelector('.jt-review-stage');
  if (!root) return;
  const slides = [...root.querySelectorAll('.jt-review-slide')];
  const counter = root.querySelector('.jt-review-position');
  let active = 0;
  function show(next) {
    active = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => { slide.hidden = index !== active; });
    counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  root.querySelectorAll('[data-review-step]').forEach(button => button.addEventListener('click', () => show(active + Number(button.dataset.reviewStep))));
  root.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      show(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchStart = null;
  root.addEventListener('touchstart', event => { touchStart = {x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY}; }, {passive:true});
  root.addEventListener('touchend', event => {
    if (!touchStart || event.target.closest('a,button')) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)*1.4) show(active + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive:true});
})();
