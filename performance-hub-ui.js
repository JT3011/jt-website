/* Keep existing auth controls and their listeners when sharing the JT header. */
(() => {
  if (new URLSearchParams(location.search).has('embed')) { document.body.classList.remove('jt-hub-ui'); return; }
  const old = document.querySelector('header.topbar, header.top');
  if (!old || document.querySelector('[data-jt-navigation]') || !window.JTNavigation) return;
  const nodes = [...old.querySelectorAll('a,button')].filter(n => !n.matches('.brand'));
  const take = (href, label, id) => {
    const node = nodes.find(n => n.tagName === 'A' && (id ? n.id === id : n.getAttribute('href') === href));
    const a = node || document.createElement('a');
    if (!node) a.href = href;
    a.textContent = label;
    a.className = a.classList.contains('hidden') ? 'hidden' : '';
    if (node) nodes.splice(nodes.indexOf(node), 1);
    return a;
  };
  const oldHome = old.querySelector('.brand[id]');
  const home = oldHome || take('/performance-hub-portal.html', 'My Hub');
  if (oldHome) { home.className = ''; home.textContent = 'My Hub'; }
  const plans = take('/performance-hub-plans.html', 'Session plans');
  const training = take('/performance-hub-dashboard.html', 'Training', 'trainingLink');
  const locker = take('/performance-hub-avatar.html', 'Player locker');
  const rewards = take('/performance-hub-rewards.html', 'Rewards');
  const primary = [home, plans, training, locker, rewards];
  const {header, menu} = window.JTNavigation.create('hub');
  const tools = menu.querySelector('[data-jt-tools]');
  tools.hidden = false;
  const context = menu.querySelector('[data-jt-tool-links]');
  const accounts = menu.querySelector('[data-jt-account]');
  primary.forEach(a => context.append(a));
  const ownerActions = document.getElementById('ownerActions');
  if (ownerActions) accounts.append(ownerActions);
  for (const n of nodes) {
    if (n.tagName === 'BUTTON') { n.className = 'hub-signout'; n.textContent = 'Sign out'; accounts.append(n); }
    else {
      if (!n.id && primary.some(a => a.getAttribute('href') === n.getAttribute('href'))) continue;
      n.className = n.classList.contains('hidden') ? 'hidden' : '';
      n.textContent = n.textContent.trim().replace(/^←\s*/, '').replace(/^My Coaching$/i,'My Hub');
      context.append(n);
    }
  }
  const quick = document.createElement('nav');
  quick.className = 'hub-quick-nav';
  quick.setAttribute('aria-label','Hub navigation');
  const route = document.body.dataset.hubPage || location.pathname;
  const active = /plans/.test(route) ? 1 : /rewards/.test(route) ? 3 : /portal|coach-dashboard|command-centre|sessions/.test(route) ? 0 : 2;
  [home,plans,training,rewards].forEach((source,i) => {
    const a = document.createElement('a'); a.href = source.href;
    a.textContent = ['My Hub','Plans','Training','Rewards'][i];
    if (i === active) a.setAttribute('aria-current','page');
    quick.append(a);
    new MutationObserver(() => { a.href = source.href; }).observe(source,{attributes:true,attributeFilter:['href']});
  });
  header.append(quick);
  old.remove(); document.body.prepend(header); document.body.append(menu);
  document.body.classList.add('jt-hub-ui');
  window.JTNavigation.initialise(header,menu);
})();
