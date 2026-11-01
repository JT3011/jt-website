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
      if (action) close();
    }, true);
    window.addEventListener('pagehide', close);
    return {header, menu, close};
  };
  const template = "<header class=\"jt-global-header\" data-jt-navigation data-jt-area=\"website\">\n  <nav class=\"jt-global-bar\" aria-label=\"JT navigation\">\n    <a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a>\n    <div class=\"jt-global-primary\"><a href=\"/\" data-jt-area-link=\"website\">Coaching</a><a href=\"/performance-hub-portal.html\" data-jt-area-link=\"hub\">Performance Hub</a><a href=\"https://jtmindbodybalance.myshopify.com/\" data-jt-area-link=\"store\">Store</a></div>\n    <p class=\"jt-global-context\">Coaching</p>\n    <div class=\"jt-global-actions\"><button class=\"jt-global-toggle\" type=\"button\" aria-label=\"Open JT menu\" aria-expanded=\"false\" aria-controls=\"jtGlobalMenu\"><span></span><span></span></button></div>\n  </nav>\n</header>\n<dialog class=\"jt-global-menu\" id=\"jtGlobalMenu\" aria-labelledby=\"jtGlobalMenuTitle\">\n  <div class=\"jt-global-menu-top\"><a class=\"jt-global-crest\" href=\"/\" aria-label=\"JT home\"><img src=\"/images/jt-crest-transparent-v2.png\" width=\"1254\" height=\"1254\" alt=\"JT\"></a><p id=\"jtGlobalMenuTitle\">Explore JT</p><button class=\"jt-global-close\" type=\"button\" aria-label=\"Close JT menu\"><span aria-hidden=\"true\"></span></button></div>\n  <div class=\"jt-global-menu-inner\">\n    <nav class=\"jt-global-destinations\" aria-label=\"Explore JT\">\n      <a href=\"/\" data-jt-area-link=\"website\"><span>Coaching</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">\u2197</span></a>\n      <a href=\"/performance-hub-portal.html\" data-jt-area-link=\"hub\"><span>Performance Hub</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">\u2197</span></a>\n      <a href=\"https://jtmindbodybalance.myshopify.com/\" data-jt-area-link=\"store\"><span>JT Store</span><span class=\"jt-global-arrow\" aria-hidden=\"true\">\u2197</span></a>\n    </nav>\n    <div class=\"jt-global-tools\" data-jt-tools hidden><p class=\"jt-global-eyebrow\">Your Hub</p><nav class=\"jt-global-tool-links\" aria-label=\"Hub tools\" data-jt-tool-links></nav><div class=\"jt-global-account\" data-jt-account></div></div>\n    <nav class=\"jt-global-explore\" aria-label=\"Discover JT\"><a href=\"/#pricing\">Book a session</a><a href=\"/#pathway\">The pathway</a><a href=\"/#team\">The coaches</a><a href=\"/#reviews\">Reviews</a><a href=\"/#about\">About us</a><a href=\"/#findus\">Find us</a><a href=\"/#contact\">Contact</a><a href=\"/performance-hub-coach-access.html\">Coach login</a></nav>\n    <div class=\"jt-global-menu-footer\"><p>Mind. Body. Balance.</p></div>\n  </div>\n</dialog>\n";
  const create = (area = "hub") => {
    const fragment = document.createElement("template");
    fragment.innerHTML = template;
    const header = fragment.content.querySelector("header");
    const menu = fragment.content.querySelector("dialog");
    header.dataset.jtArea = area;
    header.querySelector(".jt-global-context").textContent = {website:"Coaching",hub:"Performance Hub",store:"Store"}[area] || "JT";
    return {header, menu};
  };
  window.JTNavigation = {initialise, create};
  document.querySelectorAll('[data-jt-navigation]').forEach(header => {
    initialise(header, document.getElementById(header.querySelector('[aria-controls]')?.getAttribute('aria-controls')));
  });
})();
