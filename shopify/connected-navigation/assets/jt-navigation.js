(() => {
  const initialise = (header, menu) => {
    if (!header || !menu || header.dataset.jtReady) return;
    header.dataset.jtReady = 'true';
    const area = header.dataset.jtArea || 'website';
    for (const root of [header, menu]) {
      root.querySelectorAll('[data-jt-area-link]').forEach(link => {
        if (link.dataset.jtAreaLink === area) {
          link.dataset.jtCurrent = 'true';
          link.setAttribute('aria-current', 'location');
        }
      });
    }
    const toggle = header.querySelector('.jt-global-toggle');
    const closeButton = menu.querySelector('.jt-global-close');
    const motion = menu.querySelector('[data-jt-nav-motion]');
    const close = () => { if (menu.open) menu.close(); };
    const setMotion = paused => {
      menu.toggleAttribute('data-motion-paused', paused);
      motion.setAttribute('aria-pressed', String(paused));
      motion.textContent = paused ? (motion.dataset.resumeLabel || 'Resume motion') : (motion.dataset.pauseLabel || 'Pause motion');
    };
    try { setMotion(localStorage.getItem('jt-navigation-motion') === 'paused'); } catch {}
    toggle.addEventListener('click', () => {
      menu.showModal();
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('jt-global-menu-open');
    });
    closeButton.addEventListener('click', close);
    menu.addEventListener('close', () => {
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('jt-global-menu-open');
      toggle.focus({preventScroll:true});
    });
    menu.addEventListener('click', event => {
      const action = event.target.closest('a,button');
      if (action && !action.matches('[data-jt-nav-motion]')) close();
    }, true);
    motion.addEventListener('click', () => {
      const paused = !menu.hasAttribute('data-motion-paused');
      setMotion(paused);
      try { localStorage.setItem('jt-navigation-motion', paused ? 'paused' : 'running'); } catch {}
    });
    window.addEventListener('pagehide', close);
    return {header, menu, close};
  };
  const template = "<header class=\"jt-global-header\" data-jt-navigation data-jt-area=\"website\">\n  <nav class=\"jt-global-bar\" aria-label=\"JT navigation\">\n    <div class=\"jt-global-left\"><a href=\"/\" data-jt-area-link=\"website\">Coaching</a><a href=\"/performance-hub-portal.html\" data-jt-area-link=\"hub\"><span class=\"jt-global-long\">Performance </span>Hub</a></div>\n    <a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a>\n    <div class=\"jt-global-right\"><a href=\"https://jtmindbodybalance.myshopify.com/\" data-jt-area-link=\"store\">Store</a><button class=\"jt-global-toggle\" type=\"button\" aria-label=\"Open JT menu\" aria-expanded=\"false\" aria-controls=\"jtGlobalMenu\"><span></span><span></span></button></div>\n  </nav>\n</header>\n<dialog class=\"jt-global-menu\" id=\"jtGlobalMenu\" aria-labelledby=\"jtGlobalMenuTitle\">\n  <div class=\"jt-global-menu-top\"><p id=\"jtGlobalMenuTitle\">Explore JT</p><a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a><button class=\"jt-global-close\" type=\"button\" aria-label=\"Close JT menu\"><span aria-hidden=\"true\">×</span></button></div>\n  <div class=\"jt-global-menu-inner\">\n    <nav class=\"jt-global-destinations\" aria-label=\"Explore JT\">\n      <a href=\"/\" data-jt-area-link=\"website\"><span class=\"jt-global-number\">01</span><span>Coaching</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">↗</span></a>\n      <a href=\"/performance-hub-portal.html\" data-jt-area-link=\"hub\"><span class=\"jt-global-number\">02</span><span>Performance Hub</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">↗</span></a>\n      <a href=\"https://jtmindbodybalance.myshopify.com/\" data-jt-area-link=\"store\"><span class=\"jt-global-number\">03</span><span>JT Store</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">↗</span></a>\n    </nav>\n    <div class=\"jt-global-tools\" data-jt-tools hidden><p class=\"jt-global-eyebrow\">Your Hub</p><nav class=\"jt-global-tool-links\" aria-label=\"Hub tools\" data-jt-tool-links></nav><div class=\"jt-global-account\" data-jt-account></div></div>\n    <nav class=\"jt-global-explore\" aria-label=\"Discover JT\"><a href=\"/#pricing\">Book a session</a><a href=\"/#pathway\">The pathway</a><a href=\"/#team\">The coaches</a><a href=\"/#reviews\">Reviews</a><a href=\"/#about\">About us</a><a href=\"/#findus\">Find us</a><a href=\"/#contact\">Contact</a><a href=\"/performance-hub-coach-access.html\">Coach login</a></nav>\n    <div class=\"jt-global-menu-footer\"><p>Mind. Body. Balance.</p><button type=\"button\" data-jt-nav-motion aria-pressed=\"false\">Pause motion</button></div>\n  </div>\n  <div class=\"jt-global-orbit\" aria-hidden=\"true\"><i></i><i></i></div>\n</dialog>\n";
  const create = (area = "hub") => {
    const fragment = document.createElement("template");
    fragment.innerHTML = template;
    const header = fragment.content.querySelector("header");
    const menu = fragment.content.querySelector("dialog");
    header.dataset.jtArea = area;
    return {header, menu};
  };
  window.JTNavigation = {initialise, create};
  document.querySelectorAll('[data-jt-navigation]').forEach(header => {
    initialise(header, document.getElementById(header.querySelector('[aria-controls]')?.getAttribute('aria-controls')));
  });
})();
