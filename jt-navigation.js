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
    const close = () => { if (menu.open) menu.close(); };
    toggle.addEventListener('click', () => {
      menu.querySelectorAll('.jt-global-section').forEach(group => { group.open = false; });
      menu.showModal();
      menu.scrollTop = 0;
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
    const groups = [...menu.querySelectorAll('.jt-global-section')];
    groups.forEach(group => group.addEventListener('toggle', () => {
      if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
    }));
    const motion = menu.querySelector('[data-jt-nav-motion]');
    const setMotion = paused => {
      [header, menu].forEach(root => root.toggleAttribute('data-jt-nav-paused', paused));
      motion.setAttribute('aria-pressed', String(paused));
      motion.setAttribute('aria-label', paused ? motion.dataset.resumeLabel : motion.dataset.pauseLabel);
    };
    if (motion) {
      try { setMotion(localStorage.getItem('jt-navigation-motion') === 'paused'); } catch { setMotion(false); }
      motion.addEventListener('click', () => {
        const paused = !menu.hasAttribute('data-jt-nav-paused');
        setMotion(paused);
        try { localStorage.setItem('jt-navigation-motion', paused ? 'paused' : 'running'); } catch {}
      });
    }
    window.addEventListener('pagehide', close);
    return {header, menu, close};
  };
  const template = "<header class=\"jt-global-header\" data-jt-navigation data-jt-area=\"website\">\n  <nav class=\"jt-global-bar\" aria-label=\"JT navigation\">\n    <div class=\"jt-global-leading\" aria-hidden=\"true\"></div>\n    <a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a>\n    <div class=\"jt-global-actions\"><button class=\"jt-global-toggle\" type=\"button\" aria-label=\"Open JT menu\" aria-expanded=\"false\" aria-controls=\"jtGlobalMenu\"><span></span><span></span></button></div>\n  </nav>\n</header>\n<dialog class=\"jt-global-menu\" id=\"jtGlobalMenu\" aria-labelledby=\"jtGlobalMenuTitle\">\n  <h2 class=\"jt-global-sr\" id=\"jtGlobalMenuTitle\">Explore JT</h2>\n  <div class=\"jt-global-menu-top\"><div aria-hidden=\"true\"></div><a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a><button class=\"jt-global-close\" type=\"button\" aria-label=\"Close JT menu\" autofocus><span aria-hidden=\"true\"></span></button></div>\n  <div class=\"jt-global-menu-inner\">\n    <nav class=\"jt-global-destinations\" aria-label=\"Explore JT\">\n      <a href=\"/\" data-jt-area-link=\"website\">Coaching</a>\n      <a href=\"/performance-hub-portal.html\" data-jt-area-link=\"hub\">Performance Hub</a>\n      <a href=\"https://jtmindbodybalance.myshopify.com/\" data-jt-area-link=\"store\">Store</a>\n    </nav>\n    <div class=\"jt-global-sections\">\n      <details name=\"jt-menu-sections\" class=\"jt-global-section\" data-jt-tools hidden><summary>Hub tools</summary><nav class=\"jt-global-tool-links\" aria-label=\"Hub tools\" data-jt-tool-links></nav></details>\n      <details name=\"jt-menu-sections\" class=\"jt-global-section\"><summary>Explore JT</summary><nav class=\"jt-global-explore\" aria-label=\"Discover JT\"><a href=\"/#pricing\">Book a session</a><a href=\"/#pathway\">The pathway</a><a href=\"/#team\">The coaches</a><a href=\"/#reviews\">Reviews</a><a href=\"/#about\">About us</a><a href=\"/#findus\">Find us</a><a href=\"/#contact\">Contact</a><a href=\"/performance-hub-coach-access.html\">Coach login</a></nav></details>\n      <details name=\"jt-menu-sections\" class=\"jt-global-section\" data-jt-account-panel hidden><summary>Account</summary><div class=\"jt-global-account\" data-jt-account></div></details>\n    </div>\n    <div class=\"jt-global-menu-footer\"><p>Mind. Body. Balance.</p><button class=\"jt-global-motion\" type=\"button\" data-jt-nav-motion data-pause-label=\"Pause animation\" data-resume-label=\"Resume animation\" aria-label=\"Pause animation\" aria-pressed=\"false\"><svg viewBox=\"0 0 20 20\" aria-hidden=\"true\"><path class=\"jt-global-pause\" d=\"M7 5v10M13 5v10\"/><path class=\"jt-global-play\" d=\"m7 5 8 5-8 5Z\"/></svg></button></div>\n  </div>\n  <div class=\"jt-global-ambient\" aria-hidden=\"true\"><i></i><i></i><i></i></div>\n</dialog>\n";
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
