/* Native scroll; public demo only. No login, storage or API calls. */
(() => {
  const root = document.getElementById('performance-hub');
  if (!root?.classList.contains('jt-hub-reel')) return;
  const stage = root.querySelector('.hub-reel-stage');
  const stories = [...root.querySelectorAll('[data-hub-scene]')];
  const screens = [...root.querySelectorAll('[data-hub-screen]')];
  const chapters = [...root.querySelectorAll('[data-hub-chapter]')];
  const motion = root.querySelector('.hub-reel-motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 760px)');
  let paused = false, visible = true, frame = 0, scene = -1, manualScene = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const enabled = () => !reduced.matches && !paused && !document.body.classList.contains('jt-motion-paused') && stage.offsetHeight <= innerHeight - (narrow.matches ? 64 : 74) + 2;
  function setScene(next) {
    if (scene === next) return;
    scene = next;
    [...stories, ...screens].forEach(panel => {
      const active = Number(panel.dataset.hubScene ?? panel.dataset.hubScreen) === next;
      panel.hidden = !active;
      panel.inert = !active;
    });
    chapters.forEach((button, index) => button.setAttribute('aria-pressed', String(index === next)));
    root.dataset.scene = String(next);
  }
  function draw() {
    frame = 0;
    const active = root.classList.contains('is-scroll-enabled');
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const distance = root.offsetHeight - stage.offsetHeight;
    const progress = active && distance > 0 ? clamp((top - root.getBoundingClientRect().top) / distance) : manualScene / 2;
    const stageBox = stage.getBoundingClientRect();
    const inView = stageBox.top < innerHeight && stageBox.bottom > 0;
    document.body.classList.toggle('jt-hub-reel-in-view', inView);
    const next = active ? (progress < .3 ? 0 : progress < .65 ? 1 : 2) : manualScene;
    root.style.setProperty('--hub-progress', String(progress));
    root.style.setProperty('--hub-reveal', String(active ? .45 + clamp((progress - [0,.3,.65][next]) / .22) * .55 : 1));
    setScene(next);
  }
  function requestFrame() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function configure() {
    const active = enabled();
    if (!active && root.classList.contains('is-scroll-enabled')) manualScene = Math.max(0, scene);
    root.classList.toggle('is-scroll-enabled', active);
    motion.setAttribute('aria-pressed', String(active));
    motion.textContent = active ? 'Motion on' : 'Motion off';
    root.querySelector('.hub-reel-scroll').textContent = active ? 'Scroll to explore' : 'Choose a chapter';
    draw();
  }
  chapters.forEach((button, index) => button.addEventListener('click', () => {
    manualScene = index;
    if (root.classList.contains('is-scroll-enabled')) {
      const top = parseFloat(getComputedStyle(stage).top) || 0;
      const distance = root.offsetHeight - stage.offsetHeight;
      const offset = [0, .45, .82][index] * distance;
      window.scrollTo({top: window.scrollY + root.getBoundingClientRect().top - top + offset, behavior:'instant'});
    }
    draw();
  }));
  motion.hidden = false;
  motion.addEventListener('click', () => {
    const preserve = root.getBoundingClientRect().top < 0 && root.getBoundingClientRect().bottom > stage.offsetHeight;
    manualScene = Math.max(0, scene);
    paused = !paused;
    configure();
    if (preserve) root.scrollIntoView({block:'start', behavior:'instant'});
  });
  reduced.addEventListener('change', configure);
  narrow.addEventListener('change', configure);
  window.addEventListener('scroll', requestFrame, {passive:true});
  window.addEventListener('resize', configure, {passive:true});
  document.addEventListener('visibilitychange', requestFrame);
  let wasGloballyPaused = document.body.classList.contains('jt-motion-paused');
  new MutationObserver(() => {
    const globallyPaused = document.body.classList.contains('jt-motion-paused');
    if (wasGloballyPaused !== globallyPaused) { wasGloballyPaused = globallyPaused; configure(); }
  }).observe(document.body, {attributes:true, attributeFilter:['class']});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) document.body.classList.remove('jt-hub-reel-in-view');
    if (visible) requestFrame();
  }, {rootMargin:'150px'}).observe(root);
  configure();
})();
