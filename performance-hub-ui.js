/* Shared JT navigation. Existing controls are moved, preserving auth listeners and IDs. */
(() => {
  if (new URLSearchParams(location.search).has('embed')) { document.body.classList.remove('jt-hub-ui'); return; }
  const old = document.querySelector('header.topbar, header.top');
  if (!old || document.querySelector('.hub-masthead')) return;
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
  const home = take('/performance-hub-portal.html', 'My Hub');
  const plans = take('/performance-hub-plans.html', 'Session plans');
  const training = take('/performance-hub-dashboard.html', 'Training', 'trainingLink');
  const locker = take('/performance-hub-avatar.html', 'Player locker');
  const store = take('/performance-hub-rewards.html', 'Store & rewards');
  const primary = [home, plans, training, locker, store];
  const header = document.createElement('header');
  header.className = 'hub-masthead';
  header.innerHTML = `<div class="hub-masthead-inner"><a class="hub-wordmark" href="/performance-hub-portal.html">Performance<span>Hub</span></a><a class="hub-crest" href="/performance-hub-portal.html" aria-label="JT Performance Hub home"><span><img src="/images/jt-crest-transparent-v2.png" alt="" width="1254" height="1254"></span></a><button class="hub-menu-toggle" type="button" aria-label="Open Hub menu" aria-expanded="false" aria-controls="hubMenu"><span>Menu</span><i aria-hidden="true"></i></button></div><nav class="hub-quick-nav" aria-label="Main Hub navigation"></nav>`;
  const dialog = document.createElement('dialog');
  dialog.id = 'hubMenu'; dialog.className = 'hub-menu';
  dialog.setAttribute('aria-labelledby','hubMenuTitle');
  dialog.innerHTML = `<div class="hub-menu-top"><p id="hubMenuTitle">Explore your Hub</p><button class="hub-menu-close" type="button" aria-label="Close Hub menu">Close <span aria-hidden="true">×</span></button></div><nav class="hub-directory" aria-label="Explore the Hub"></nav><nav class="hub-context-links" aria-label="More Hub tools"></nav><div class="hub-menu-footer"><a href="/">JT website ↗</a><span>Mind. Body. Balance.</span><div class="hub-account-actions"></div></div>`;
  const directory = dialog.querySelector('.hub-directory');
  primary.forEach((a,i) => { a.dataset.number = String(i+1).padStart(2,'0'); directory.append(a); });
  const context = dialog.querySelector('.hub-context-links');
  const accounts = dialog.querySelector('.hub-account-actions');
  const ownerActions = document.getElementById('ownerActions');
  if (ownerActions) context.append(ownerActions);
  for (const n of nodes) {
    if (n.tagName === 'BUTTON') { n.className = 'hub-signout'; n.textContent = 'Sign out'; accounts.append(n); }
    else {
      if (!n.id && primary.some(a => a.getAttribute('href') === n.getAttribute('href'))) continue;
      n.className = n.classList.contains('hidden') ? 'hidden' : '';
      n.textContent = n.textContent.trim().replace(/^←\s*/, '').replace(/^My Coaching$/i,'My Hub');
      context.append(n);
    }
  }
  const oldBrand = old.querySelector('.brand[id]');
  if (oldBrand) { const crest = header.querySelector('.hub-crest'); oldBrand.className = 'hub-crest'; oldBrand.innerHTML = crest.innerHTML; oldBrand.setAttribute('aria-label','JT Performance Hub home'); crest.replaceWith(oldBrand); }
  const quick = header.querySelector('.hub-quick-nav');
  const route = document.body.dataset.hubPage || location.pathname;
  const active = /plans/.test(route) ? 1 : /rewards/.test(route) ? 3 : /portal|coach-dashboard|command-centre|sessions/.test(route) ? 0 : 2;
  [home,plans,training,store].forEach((source,i) => {
    const a = document.createElement('a'); a.href = source.href;
    a.textContent = ['My Hub','Plans','Training','Store'][i];
    if (i === active) a.setAttribute('aria-current','page');
    quick.append(a);
    new MutationObserver(() => { a.href = source.href; }).observe(source,{attributes:true,attributeFilter:['href']});
  });
  // Put the full-width masthead outside narrow page wrappers.
  old.remove(); document.body.prepend(header); document.body.append(dialog);
  document.body.classList.add('jt-hub-ui');
  const toggle = header.querySelector('.hub-menu-toggle');
  const close = () => dialog.close();
  toggle.addEventListener('click',() => { dialog.showModal(); toggle.setAttribute('aria-expanded','true'); document.body.classList.add('hub-menu-open'); });
  dialog.querySelector('.hub-menu-close').addEventListener('click',close);
  dialog.addEventListener('close',() => { toggle.setAttribute('aria-expanded','false'); document.body.classList.remove('hub-menu-open'); toggle.focus(); });
  dialog.addEventListener('click',event => { if(event.target===dialog || event.target.closest('a,button')) close(); },true);
})();
