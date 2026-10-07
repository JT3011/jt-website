/* Scroll-linked campaign. Native scrolling stays in control. */
(() => {
  const root = document.getElementById('jt-cinema');
  if (!root) return;
  const stage = root.querySelector('.jt-cinema-stage');
  const product = root.querySelector('.jt-cinema-product');
  const light = root.querySelector('.jt-cinema-gold-light');
  const panels = [...root.querySelectorAll('.jt-cinema-panel')];
  const progress = root.querySelector('.jt-cinema-progress span');
  const counter = root.querySelector('.jt-cinema-counter');
  const motionButton = root.querySelector('.jt-cinema-motion');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 600px)');
  let userPaused = false, visible = true, frame = 0;
  const clamp = x => Math.max(0, Math.min(1,x));
  const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
  function draw() {
    frame = 0;
    const enabled = !reduced.matches && !userPaused;
    const box = root.getBoundingClientRect();
    const top = Number.parseFloat(getComputedStyle(stage).top) || 0;
    const distance = root.offsetHeight - stage.offsetHeight;
    const p = enabled && distance > 0 ? clamp((top-box.top)/distance) : 0;
    const detail = smooth((p-.12)/.75);
    const scale = 1 + detail*(mobile.matches ? .18 : .38);
    product.style.transform = `translate(-50%,calc(-50% + ${detail*8}%)) scale(${scale})`;
    light.style.setProperty('--light-position', `${-80 + p*240}%`);
    light.style.opacity = enabled ? String(.15 + Math.sin(p*Math.PI)*.7) : '0';
    const scene = p < .23 ? 0 : p < .6 ? 1 : 2;
    panels.forEach((panel,i) => {
      const active = i === scene;
      panel.style.opacity = active ? '1' : '0';
      panel.style.visibility = active ? 'visible' : 'hidden';
      panel.style.transform = active ? 'translateY(0)' : 'translateY(20px)';
      panel.setAttribute('aria-hidden',String(!active));
      panel.inert = !active;
    });
    progress.style.transform = `scaleX(${p})`;
    counter.textContent = `0${scene+1} — 03`;
  }
  function requestFrame() {
    if (!frame && visible && !document.hidden) frame=requestAnimationFrame(draw);
  }
  function setMotion() {
    const active = !reduced.matches && !userPaused;
    root.classList.toggle('is-scroll-enabled',active);
    motionButton.setAttribute('aria-pressed',String(active));
    motionButton.textContent = active ? 'Motion on' : 'Motion off';
    draw();
  }
  motionButton.hidden = false;
  motionButton.addEventListener('click',() => {
    // Preserve the stage's screen position when collapsing the scroll sequence.
    const wasActive = root.classList.contains('is-scroll-enabled');
    const atStage = root.getBoundingClientRect().top < 0;
    userPaused = !userPaused;
    setMotion();
    if (wasActive && atStage) root.scrollIntoView({block:'start',behavior:'instant'});
  });
  reduced.addEventListener('change',setMotion);
  mobile.addEventListener('change',requestFrame);
  window.addEventListener('scroll',requestFrame,{passive:true});
  window.addEventListener('resize',requestFrame,{passive:true});
  document.addEventListener('visibilitychange',requestFrame);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible) requestFrame();
  },{rootMargin:'150px'}).observe(root);
  panels.forEach(panel=>panel.style.transition = reduced.matches ? 'none' : 'opacity .35s ease, transform .45s ease, visibility .35s');
  setMotion();
})();

