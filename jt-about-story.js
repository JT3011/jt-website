/* Scroll-controlled portrait and word reveals, with a readable fallback. */
(() => {
  const root = document.querySelector('.jt-about');
  if (!root) return;
  const stage = root.querySelector('.jt-about-stage');
  const chapters = [...root.querySelectorAll('.jt-about-chapter')];
  const buttons = [...root.querySelectorAll('[data-about-chapter]')];
  const motion = root.querySelector('.jt-about-motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width:640px)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const starts = [.17,.44,.71];
  const words = [];
  let paused = false, visible = false, frame = 0, active = -2;
  let width = innerWidth, height = innerHeight;
  const clamp = n => Math.max(0,Math.min(1,n));
  const ease = n => 1 - Math.pow(1-clamp(n),3);
  chapters.forEach(chapter => {
    const heading = chapter.querySelector('h3');
    const accessibleHeading = heading.cloneNode(true);
    accessibleHeading.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    heading.setAttribute('aria-label', accessibleHeading.textContent);
    const walker = document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const spans = [];
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part.trim()) { fragment.append(document.createTextNode(part)); return; }
        const word = document.createElement('span');
        word.className = 'jt-story-word';
        word.setAttribute('aria-hidden','true');
        word.textContent = part;
        spans.push(word);
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    words.push(spans);
  });
  function setChapter(index) {
    if (active === index) return;
    active = index;
    const animated = root.classList.contains('is-animated');
    chapters.forEach((chapter,i) => {
      chapter.classList.toggle('is-current',i === index);
      chapter.inert = animated && i !== index;
      if (animated && i !== index) chapter.setAttribute('aria-hidden','true');
      else chapter.removeAttribute('aria-hidden');
    });
    buttons.forEach((button,i) => button.setAttribute('aria-pressed',String(index === i)));
  }
  function draw() {
    frame = 0;
    const stageBox = stage.getBoundingClientRect();
    document.body.classList.toggle('jt-about-in-view',stageBox.top < innerHeight-60 && stageBox.bottom > 150);
    if (!root.classList.contains('is-animated')) return;
    const top = narrow.matches ? 64 : 74;
    const distance = root.offsetHeight-stage.offsetHeight;
    const progress = clamp((top-root.getBoundingClientRect().top)/distance);
    const shift = ease((progress-.07)/.17);
    root.style.setProperty('--story-progress',progress.toFixed(4));
    root.style.setProperty('--story-shift',shift.toFixed(4));
    root.style.setProperty('--intro-opacity',(1-ease((progress-.06)/.11)).toFixed(4));
    const index = progress < starts[0] ? -1 : progress < starts[1] ? 0 : progress < starts[2] ? 1 : 2;
    setChapter(index);
    if (index >= 0) {
      const phase = clamp((progress-starts[index])/.13);
      words[index].forEach((word,i,list) => {
        const reveal = ease((phase-i/(list.length+2)) * 3);
        word.style.setProperty('--word-opacity',(.18 + reveal*.82).toFixed(3));
        word.style.setProperty('--word-y',`${(1-reveal)*12}px`);
        word.style.setProperty('--word-blur',`${(1-reveal)*3}px`);
      });
    }
  }
  function requestFrame() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function configure() {
    const wasAnimated = root.classList.contains('is-animated');
    const before = root.getBoundingClientRect();
    const userInStage = before.top < 80 && before.bottom > 80;
    // Short screens and high zoom keep the complete story in normal document flow.
    const enabled = !paused && !reduced.matches && !document.body.classList.contains('jt-motion-paused') && innerHeight >= (narrow.matches ? 650 : 720);
    root.classList.toggle('is-animated',enabled);
    motion.hidden = reduced.matches || innerHeight < (narrow.matches ? 650 : 720);
    motion.setAttribute('aria-pressed',String(!enabled));
    motion.textContent = enabled ? 'Pause motion' : 'Resume motion';
    active = -2;
    setChapter(enabled ? -1 : 0);
    if (wasAnimated !== enabled && userInStage) {
      window.scrollTo({top:root.getBoundingClientRect().top + scrollY - (narrow.matches ? 64 : 74),behavior:'instant'});
    }
    draw();
  }
  motion.hidden = false;
  motion.addEventListener('click',() => {paused = !paused;configure();});
  root.querySelector('a[href="#jt-about-full-story"]').addEventListener('click',() => {
    const details = document.querySelector('#jt-about-full-story details');
    details.open = true;
    details.querySelector('summary').focus({preventScroll:true});
  });
  buttons.forEach((button,index) => button.addEventListener('click',() => {
    const top = root.getBoundingClientRect().top + scrollY - (narrow.matches ? 64 : 74);
    const destination = top + (root.offsetHeight-stage.offsetHeight)*(starts[index]+.135);
    window.scrollTo({top:destination,behavior:reduced.matches ? 'instant' : 'smooth'});
  }));
  stage.addEventListener('pointermove',event => {
    if (!fine.matches || !root.classList.contains('is-animated')) return;
    const rect = stage.getBoundingClientRect();
    root.style.setProperty('--portrait-x',`${((event.clientX-rect.left)/rect.width-.5)*12}px`);
    root.style.setProperty('--portrait-y',`${((event.clientY-rect.top)/rect.height-.5)*8}px`);
  });
  stage.addEventListener('pointerleave',() => {
    root.style.setProperty('--portrait-x','0px');
    root.style.setProperty('--portrait-y','0px');
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) requestFrame();
    else document.body.classList.remove('jt-about-in-view');
  },{rootMargin:'150px'}).observe(root);
  addEventListener('scroll',requestFrame,{passive:true});
  addEventListener('resize',() => {
    // Ignore the small height changes caused by mobile browser chrome.
    if (innerWidth !== width || Math.abs(innerHeight-height)>100) {
      width = innerWidth;height = innerHeight;configure();
    }
    requestFrame();
  },{passive:true});
  reduced.addEventListener('change',configure);
  narrow.addEventListener('change',configure);
  let globallyPaused = document.body.classList.contains('jt-motion-paused');
  new MutationObserver(() => {
    const next = document.body.classList.contains('jt-motion-paused');
    if (next !== globallyPaused) {globallyPaused = next;configure();}
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',requestFrame);
  addEventListener('pageshow',requestFrame);
  configure();
})();
