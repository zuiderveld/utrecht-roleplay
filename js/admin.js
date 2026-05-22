let currentData = SiteData.get();
let currentUser = SiteData.getCurrentUser();
let selectedStoreCatId = 'coins';
let storeCatalogSubview = 'overview';

function toast(msg) {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function requirePerm(perm) {
  if (!SiteData.hasPermission(perm)) {
    toast('Geen toegang tot deze actie');
    return false;
  }
  return true;
}

function showPanel(id) {
  if (id !== 'settings') {
    const perm = {
      products: null,
      general: 'general',
      staff: 'staff',
      coins: 'coins',
      'store-catalog': 'store',
      spin: 'spin',
      wallets: 'wallets',
      ingame: 'ingame',
      rules: 'rules',
      users: 'users',
    }[id];
    if (id === 'products') {
      if (!['staff', 'coins', 'store', 'spin', 'ingame', 'wallets'].some((p) => SiteData.hasPermission(p))) return;
    } else if (perm && !SiteData.hasPermission(perm)) return;
  }

  document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav button').forEach((b) => b.classList.remove('active'));
  document.getElementById(`panel-${id}`)?.classList.add('active');
  const navBtn = document.querySelector(`[data-panel="${id}"]`);
  navBtn?.classList.add('active');

  const titleEl = document.getElementById('admin-page-title');
  const descEl = document.getElementById('admin-page-desc');
  if (navBtn && titleEl) titleEl.textContent = navBtn.dataset.title || id;
  if (navBtn && descEl) descEl.textContent = navBtn.dataset.desc || '';

  if (id === 'store-catalog' && storeCatalogSubview === 'products') {
    renderStoreProductsAdmin();
  }
}

function applyPermissionsUI() {
  const panelPermMap = {
    general: 'general',
    products: 'staff',
    staff: 'staff',
    coins: 'coins',
    'store-catalog': 'store',
    spin: 'spin',
    wallets: 'wallets',
    ingame: 'ingame',
    rules: 'rules',
    settings: 'settings',
    users: 'users',
  };

  function canAccessPanel(panel) {
    if (panel === 'settings') return true;
    if (panel === 'products') {
      return ['staff', 'coins', 'store', 'spin', 'ingame', 'wallets'].some((p) =>
        SiteData.hasPermission(p)
      );
    }
    const perm = panelPermMap[panel];
    return perm ? SiteData.hasPermission(perm) : false;
  }

  Object.entries(panelPermMap).forEach(([panel, perm]) => {
    const navBtn = document.querySelector(`[data-panel="${panel}"]`);
    const panelEl = document.getElementById(`panel-${panel}`);
    const allowed = canAccessPanel(panel);
    if (navBtn) navBtn.style.display = allowed ? '' : 'none';
    if (panelEl) panelEl.dataset.allowed = allowed ? '1' : '0';
  });

  document.querySelectorAll('[data-require="settings"]').forEach((el) => {
    el.style.display = SiteData.hasPermission('settings') ? '' : 'none';
  });

  if (!SiteData.isOwner()) {
    document.getElementById('new-all-perms')?.closest('label')?.remove();
    document.querySelector('#new-user-preset option[value="owner"]')?.remove();
  }

  const nameEl = document.getElementById('current-user-name');
  const roleEl = document.getElementById('current-user-role');
  if (currentUser) {
    const roleLabel = currentUser.permissions.includes('*')
      ? 'Eigenaar'
      : currentUser.role || 'Team';
    if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.username;
    if (roleEl) roleEl.textContent = roleLabel;
    const badge = document.getElementById('current-user-badge');
    if (badge) badge.title = `${currentUser.username} · ${roleLabel}`;
  }

  const panelOrder = [
    'general',
    'products',
    'store-catalog',
    'spin',
    'staff',
    'coins',
    'wallets',
    'ingame',
    'rules',
    'users',
    'settings',
  ];
  const firstAllowed = panelOrder.find((p) => {
    if (p === 'settings') return true;
    if (p === 'products')
      return ['staff', 'coins', 'store', 'spin', 'ingame', 'wallets'].some((x) =>
        SiteData.hasPermission(x)
      );
    return SiteData.hasPermission(p);
  });
  if (firstAllowed) showPanel(firstAllowed);
}

function persist() {
  SiteData.save(currentData);
  toast('Opgeslagen!');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderPermCheckboxes(selected, prefix, disabled = false) {
  return SiteData.ALL_PERMS.map((perm) => {
    const checked =
      selected.includes('*') || selected.includes(perm) ? 'checked' : '';
    const dis = disabled || selected.includes('*') ? 'disabled' : '';
    return `
      <label class="perm-chip">
        <input type="checkbox" ${dis} ${checked} data-perm="${perm}" data-prefix="${prefix}" value="${perm}">
        <span>${SiteData.PERMISSIONS[perm]}</span>
      </label>`;
  }).join('');
}

function getPermsFromForm(prefix) {
  const allStar = document.querySelector(`[data-prefix="${prefix}"][data-all-perms]`);
  if (allStar?.checked) return ['*'];
  const perms = [];
  document.querySelectorAll(`[data-prefix="${prefix}"][data-perm]:checked`).forEach((cb) => {
    perms.push(cb.value);
  });
  return perms;
}

function renderUsersList() {
  const list = document.getElementById('users-list');
  if (!list) return;

  list.innerHTML = currentData.users
    .map((user) => {
      const isSelf = user.id === SiteData.getCurrentUserId();
      const permLabels =
        user.permissions.includes('*')
          ? '<span class="perm-tag owner">Volledige toegang</span>'
          : user.permissions
              .map((p) => `<span class="perm-tag">${SiteData.PERMISSIONS[p] || p}</span>`)
              .join('');

      return `
      <div class="admin-item user-card ${user.active === false ? 'inactive' : ''}" data-user-id="${user.id}">
        <div class="admin-item-header">
          <div>
            <strong>${escapeHtml(user.displayName)}</strong>
            <span class="user-meta">@${escapeHtml(user.username)}${isSelf ? ' · jij' : ''}${user.active === false ? ' · inactief' : ''}</span>
          </div>
          <div style="display:flex;gap:0.35rem">
            <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-edit-user="${user.id}">Bewerken</button>
            ${!isSelf ? `<button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-delete-user="${user.id}">Verwijder</button>` : ''}
          </div>
        </div>
        <div class="user-perms-preview">${permLabels}</div>
        <div class="user-edit-form" id="edit-user-${user.id}" style="display:none">
          <div class="admin-row">
            <div class="admin-field"><label>Weergavenaam</label><input data-edit-field="displayName" data-user="${user.id}" value="${escapeHtml(user.displayName)}"></div>
            <div class="admin-field"><label>Gebruikersnaam</label><input data-edit-field="username" data-user="${user.id}" value="${escapeHtml(user.username)}"></div>
          </div>
          <div class="admin-field"><label>Nieuw wachtwoord (leeg = ongewijzigd)</label><input type="password" data-edit-field="password" data-user="${user.id}" placeholder="••••••••"></div>
          <div class="admin-field">
            <label>Rol preset</label>
            <select data-edit-field="preset" data-user="${user.id}">
              <option value="custom">Aangepast</option>
              ${Object.entries(SiteData.ROLE_PRESETS)
                .map(
                  ([k, v]) =>
                    `<option value="${k}" ${user.role === k ? 'selected' : ''}>${v.label}</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="admin-field">
            <label>Permissies</label>
            ${
              SiteData.isOwner()
                ? `<label class="checkbox-field" style="margin-bottom:0.5rem">
              <input type="checkbox" data-prefix="edit-${user.id}" data-all-perms ${user.permissions.includes('*') ? 'checked' : ''}>
              Volledige toegang (eigenaar)
            </label>`
                : ''
            }
            <div class="perm-grid">
              ${renderPermCheckboxes(user.permissions, `edit-${user.id}`, user.permissions.includes('*'))}
            </div>
          </div>
          <label class="checkbox-field">
            <input type="checkbox" data-edit-field="active" data-user="${user.id}" ${user.active !== false ? 'checked' : ''}>
            Account actief
          </label>
          <div class="admin-actions">
            <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" data-save-user="${user.id}">Opslaan</button>
            <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-cancel-edit="${user.id}">Annuleren</button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  list.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editUser;
      const form = document.getElementById(`edit-user-${id}`);
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  });

  list.querySelectorAll('[data-cancel-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(`edit-user-${btn.dataset.cancelEdit}`).style.display = 'none';
      renderUsersList();
    });
  });

  list.querySelectorAll('[data-all-perms]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const prefix = cb.dataset.prefix;
      document.querySelectorAll(`[data-prefix="${prefix}"][data-perm]`).forEach((inp) => {
        inp.disabled = cb.checked;
        if (cb.checked) inp.checked = false;
      });
    });
  });

  list.querySelectorAll('[data-edit-field="preset"]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const userId = sel.dataset.user;
      const preset = SiteData.ROLE_PRESETS[sel.value];
      if (!preset) return;
      const prefix = `edit-${userId}`;
      const allCb = document.querySelector(`[data-prefix="${prefix}"][data-all-perms]`);
      if (preset.permissions.includes('*')) {
        allCb.checked = true;
        allCb.dispatchEvent(new Event('change'));
      } else {
        allCb.checked = false;
        allCb.dispatchEvent(new Event('change'));
        document.querySelectorAll(`[data-prefix="${prefix}"][data-perm]`).forEach((inp) => {
          inp.checked = preset.permissions.includes(inp.value);
        });
      }
    });
  });

  list.querySelectorAll('[data-save-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.saveUser;
      const prefix = `edit-${userId}`;
      const displayName = document.querySelector(`[data-edit-field="displayName"][data-user="${userId}"]`)?.value;
      const username = document.querySelector(`[data-edit-field="username"][data-user="${userId}"]`)?.value;
      const password = document.querySelector(`[data-edit-field="password"][data-user="${userId}"]`)?.value;
      const active = document.querySelector(`[data-edit-field="active"][data-user="${userId}"]`)?.checked;
      const preset = document.querySelector(`[data-edit-field="preset"][data-user="${userId}"]`)?.value;
      const permissions = getPermsFromForm(prefix);

      const result = SiteData.updateUser(userId, {
        displayName,
        username,
        password: password || undefined,
        active,
        permissions,
        role: preset || 'custom',
      });
      if (result.ok) {
        currentData = SiteData.get();
        toast('Gebruiker bijgewerkt');
        renderUsersList();
      } else toast(result.error);
    });
  });

  list.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Gebruiker definitief verwijderen?')) return;
      const result = SiteData.deleteUser(btn.dataset.deleteUser);
      if (result.ok) {
        currentData = SiteData.get();
        toast('Gebruiker verwijderd');
        renderUsersList();
      } else toast(result.error);
    });
  });
}

function renderStaffList() {
  const list = document.getElementById('staff-list');
  if (!list) return;
  list.innerHTML = currentData.staffPackages
    .map(
      (pkg, i) => `
    <div class="admin-item" data-index="${i}">
      <div class="admin-item-header">
        <strong>${escapeHtml(pkg.name)}</strong>
        <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-staff="${i}">Verwijder</button>
      </div>
      <div class="admin-row">
        <div class="admin-field"><label>Naam</label><input data-staff="${i}" data-field="name" value="${escapeHtml(pkg.name)}"></div>
        <div class="admin-field"><label>Afbeelding URL</label><input data-staff="${i}" data-field="image" value="${escapeHtml(pkg.image)}"></div>
        <div class="admin-field"><label>Oude prijs (€)</label><input type="number" step="0.01" data-staff="${i}" data-field="priceOld" value="${pkg.priceOld}"></div>
        <div class="admin-field"><label>Nieuwe prijs (€)</label><input type="number" step="0.01" data-staff="${i}" data-field="priceNew" value="${pkg.priceNew}"></div>
        <div class="admin-field"><label>Korting %</label><input type="number" data-staff="${i}" data-field="discount" value="${pkg.discount}"></div>
      </div>
      <label class="checkbox-field"><input type="checkbox" data-staff="${i}" data-field="popular" ${pkg.popular ? 'checked' : ''}> Populair badge</label>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-staff]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.staff;
      const field = input.dataset.field;
      if (field === 'popular') currentData.staffPackages[i].popular = input.checked;
      else if (['priceOld', 'priceNew', 'discount'].includes(field))
        currentData.staffPackages[i][field] = parseFloat(input.value) || 0;
      else currentData.staffPackages[i][field] = input.value;
    });
  });

  list.querySelectorAll('[data-remove-staff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.staffPackages.splice(+btn.dataset.removeStaff, 1);
      renderStaffList();
    });
  });
}

function formatCoinAmount(n) {
  return new Intl.NumberFormat('nl-NL').format(Math.max(0, Number(n) || 0));
}

const INGAME_CATS = [
  'autos',
  'nieuw',
  'wapens',
  'vip-features',
  'vip-ranks',
  'chip',
  'season',
  'loodsen',
  'organisaties',
];

function ensureIngameStore() {
  if (!currentData.ingameStore?.items?.length) {
    currentData.ingameStore = SiteData.getIngameStore();
  }
}

function renderProductHub() {
  const hub = document.getElementById('admin-product-hub');
  if (!hub) return;

  const sections = [
    {
      perm: 'staff',
      panel: 'staff',
      title: 'Staff pakketten',
      desc: 'Homepage & store staff rangen',
      count: currentData.staffPackages?.length || 0,
    },
    {
      perm: 'store',
      panel: 'store-catalog',
      title: 'Webstore',
      desc: 'Categorieën & producten (sidebar)',
      count: currentData.storeCategories?.length || 0,
    },
    {
      perm: 'spin',
      panel: 'spin',
      title: 'Draai & Win',
      desc: 'Cadeau-rad prijzen',
      count: currentData.spinWheel?.prizes?.length || 0,
    },
    {
      perm: 'coins',
      panel: 'coins',
      title: 'Coins (webshop)',
      desc: 'Tebex coin-pakketten',
      count: currentData.coins?.length || 0,
    },
    {
      perm: 'ingame',
      panel: 'ingame',
      title: 'Ingame store',
      desc: 'Coin shop — sync FiveM',
      count: currentData.ingameStore?.items?.length || SiteData.getIngameStore()?.items?.length || 0,
    },
    {
      perm: 'wallets',
      panel: 'wallets',
      title: 'Speler coins',
      desc: 'Saldi & bridge sync',
      count: currentData.playerWallets?.length || 0,
    },
  ];

  hub.innerHTML = sections
    .filter((s) => SiteData.hasPermission(s.perm))
    .map(
      (s) => `
    <div class="admin-hub-card">
      <div>
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
        <span class="admin-hub-count">${s.count} items</span>
      </div>
      <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" data-hub-go="${s.panel}">Beheren →</button>
    </div>`
    )
    .join('');

  hub.querySelectorAll('[data-hub-go]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.hubGo));
  });
}

function ensureStoreCatalogData() {
  if (!currentData.storeCategories?.length) {
    const cat = SiteData.getStoreCatalog();
    currentData.storeCategories = cat.categories;
    currentData.storeProducts = cat.products;
    currentData.storeRecentPayments = cat.recentPayments;
  }
  if (!currentData.spinWheel?.prizes?.length) {
    currentData.spinWheel = SiteData.getSpinWheel();
  }
  if (!selectedStoreCatId || !currentData.storeCategories.find((c) => c.id === selectedStoreCatId)) {
    selectedStoreCatId = currentData.storeCategories[0]?.id || 'coins';
  }
}

function showStoreCatalogSubview(view) {
  storeCatalogSubview = view;
  const overview = document.getElementById('store-catalog-overview');
  const products = document.getElementById('store-catalog-products');
  if (overview) overview.hidden = view !== 'overview';
  if (products) products.hidden = view !== 'products';
}

function openStoreCategoryEditor(catId) {
  selectedStoreCatId = catId;
  showStoreCatalogSubview('products');
  renderStoreProductsAdmin();
}

function closeStoreCategoryEditor() {
  showStoreCatalogSubview('overview');
  renderStoreCatalogAdmin();
}

function productCountForCategory(catId) {
  return (currentData.storeProducts || []).filter((p) => p.categoryId === catId).length;
}

function renderStoreCatalogAdmin() {
  const list = document.getElementById('store-cat-list');
  if (!list) return;
  ensureStoreCatalogData();
  showStoreCatalogSubview(storeCatalogSubview);

  list.innerHTML = (currentData.storeCategories || [])
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((c, i) => {
      const count = productCountForCategory(c.id);
      return `
    <div class="admin-item store-cat-card">
      <div class="store-cat-card-head">
        <strong class="store-cat-card-title">${escapeHtml(c.label)}</strong>
        <span class="admin-hub-count">${count} product${count === 1 ? '' : 'en'}</span>
      </div>
      <div class="store-cat-card-fields">
        <div class="admin-field" style="margin:0">
          <label>Label</label>
          <input type="text" data-store-cat="${i}" data-field="label" value="${escapeHtml(c.label)}">
        </div>
        <div class="admin-field" style="margin:0">
          <label>Beschrijving</label>
          <input type="text" data-store-cat="${i}" data-field="description" value="${escapeHtml(c.description || '')}">
        </div>
        <div class="admin-field store-cat-sort-field" style="margin:0">
          <label>Sort</label>
          <input type="number" data-store-cat="${i}" data-field="sort" value="${c.sort ?? i}">
        </div>
      </div>
      <div class="store-cat-card-actions">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" data-edit-store-cat="${escapeHtml(c.id)}">Bewerken</button>
        <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-store-cat="${i}" title="Categorie verwijderen">×</button>
      </div>
    </div>`;
    })
    .join('');

  list.querySelectorAll('[data-edit-store-cat]').forEach((btn) => {
    btn.addEventListener('click', () => openStoreCategoryEditor(btn.dataset.editStoreCat));
  });

  list.querySelectorAll('[data-store-cat]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.storeCat;
      const field = input.dataset.field;
      const cats = [...currentData.storeCategories].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      if (field === 'sort') cats[i].sort = parseInt(input.value, 10) || 0;
      else cats[i][field] = input.value;
      currentData.storeCategories = cats;
    });
  });

  list.querySelectorAll('[data-remove-store-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cats = [...currentData.storeCategories].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      const cat = cats[+btn.dataset.removeStoreCat];
      if (!confirm(`Categorie "${cat.label}" en alle producten verwijderen?`)) return;
      currentData.storeCategories = cats.filter((_, idx) => idx !== +btn.dataset.removeStoreCat);
      currentData.storeProducts = (currentData.storeProducts || []).filter(
        (p) => p.categoryId !== cat.id
      );
      if (selectedStoreCatId === cat.id) closeStoreCategoryEditor();
      else renderStoreCatalogAdmin();
    });
  });

  if (storeCatalogSubview === 'overview') renderStoreRecentAdmin();
}

function renderStoreProductsAdmin() {
  const list = document.getElementById('store-product-list');
  const heading = document.getElementById('store-products-heading');
  const sub = document.getElementById('store-products-sub');
  if (!list) return;
  ensureStoreCatalogData();

  const cat = currentData.storeCategories.find((c) => c.id === selectedStoreCatId);
  if (heading) {
    heading.textContent = cat ? `Producten — ${cat.label}` : 'Producten';
  }
  if (sub) {
    sub.textContent = cat?.description
      ? cat.description
      : 'Beheer alle pakketten die in deze categorie op de store staan.';
  }

  const products = (currentData.storeProducts || []).filter(
    (p) => p.categoryId === selectedStoreCatId
  );

  if (!selectedStoreCatId) {
    list.innerHTML = '<p>Voeg eerst een categorie toe.</p>';
    return;
  }

  const isCoins = selectedStoreCatId === 'coins';

  list.innerHTML = products.length
    ? products
        .map((p, i) => {
          const globalIdx = currentData.storeProducts.indexOf(p);
          return `
    <div class="admin-item" style="display:grid;gap:0.5rem;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-items:end">
      <div class="admin-field" style="margin:0"><label>Naam</label><input type="text" data-store-prod="${globalIdx}" data-field="name" value="${escapeHtml(p.name)}"></div>
      ${isCoins ? `<div class="admin-field" style="margin:0"><label>Coins</label><input type="number" data-store-prod="${globalIdx}" data-field="coinAmount" value="${p.coinAmount ?? ''}"></div>` : ''}
      <div class="admin-field" style="margin:0"><label>Prijs (€)</label><input type="number" step="0.01" data-store-prod="${globalIdx}" data-field="price" value="${p.price ?? ''}"></div>
      ${!isCoins ? `<div class="admin-field" style="margin:0"><label>Oude prijs</label><input type="number" step="0.01" data-store-prod="${globalIdx}" data-field="priceOld" value="${p.priceOld ?? ''}"></div>` : ''}
      <div class="admin-field" style="margin:0;grid-column:1/-1"><label>Afbeelding URL</label><input type="text" data-store-prod="${globalIdx}" data-field="image" value="${escapeHtml(p.image || '')}"></div>
      <label style="display:flex;align-items:center;gap:0.35rem"><input type="checkbox" data-store-prod="${globalIdx}" data-field="popular" ${p.popular ? 'checked' : ''}> Populair</label>
      <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-store-prod="${globalIdx}">×</button>
    </div>`;
        })
        .join('')
    : '<p>Geen producten in deze categorie.</p>';

  list.querySelectorAll('[data-store-prod]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.storeProd;
      const field = input.dataset.field;
      const prod = currentData.storeProducts[i];
      if (!prod) return;
      if (field === 'popular') prod.popular = input.checked;
      else if (field === 'coinAmount' || field === 'price' || field === 'priceOld')
        prod[field] = parseFloat(input.value) || 0;
      else prod[field] = input.value;
      if (field === 'coinAmount' && prod.categoryId === 'coins') {
        prod.name = `${prod.coinAmount} coins`;
        prod.id = `coin-${prod.coinAmount}`;
      }
    });
  });

  list.querySelectorAll('[data-remove-store-prod]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.storeProducts.splice(+btn.dataset.removeStoreProd, 1);
      renderStoreProductsAdmin();
    });
  });
}

function renderStoreRecentAdmin() {
  const list = document.getElementById('store-recent-admin-list');
  if (!list) return;
  ensureStoreCatalogData();
  list.innerHTML = (currentData.storeRecentPayments || [])
    .map(
      (p, i) => `
    <div class="admin-item" style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end">
      <div class="admin-field" style="margin:0"><label>User</label><input type="text" data-store-recent="${i}" data-field="user" value="${escapeHtml(p.user)}"></div>
      <div class="admin-field" style="margin:0;width:50px"><label>Init</label><input type="text" maxlength="2" data-store-recent="${i}" data-field="initial" value="${escapeHtml(p.initial)}"></div>
      <div class="admin-field" style="margin:0;width:90px"><label>Kleur</label><input type="text" data-store-recent="${i}" data-field="color" value="${escapeHtml(p.color || '#6366f1')}"></div>
      <div class="admin-field" style="margin:0;width:70px"><label>Badge</label><input type="text" data-store-recent="${i}" data-field="badge" value="${escapeHtml(p.badge || '')}"></div>
      <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-store-recent="${i}">×</button>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-store-recent]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.storeRecent;
      currentData.storeRecentPayments[i][input.dataset.field] = input.value;
    });
  });

  list.querySelectorAll('[data-remove-store-recent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.storeRecentPayments.splice(+btn.dataset.removeStoreRecent, 1);
      renderStoreRecentAdmin();
    });
  });
}

function renderSpinAdmin() {
  ensureStoreCatalogData();
  const sw = currentData.spinWheel || SiteData.defaultSpinWheel();
  document.getElementById('spin-enabled').checked = sw.enabled !== false;
  document.getElementById('spin-title').value = sw.title || 'Draai & Win!';
  document.getElementById('spin-subtitle').value = sw.subtitle || '';
  document.getElementById('spin-cooldown').value = sw.cooldownHours ?? 24;

  const list = document.getElementById('spin-prizes-list');
  if (!list) return;
  list.innerHTML = (sw.prizes || [])
    .map(
      (p, i) => `
    <div class="admin-item" style="display:grid;gap:0.5rem;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));align-items:end">
      <div class="admin-field" style="margin:0"><label>Label</label><input type="text" data-spin-prize="${i}" data-field="label" value="${escapeHtml(p.label)}"></div>
      <div class="admin-field" style="margin:0"><label>Type</label>
        <select data-spin-prize="${i}" data-field="type">
          <option value="coins" ${p.type === 'coins' ? 'selected' : ''}>Coins</option>
          <option value="discount" ${p.type === 'discount' ? 'selected' : ''}>Korting %</option>
          <option value="nothing" ${p.type === 'nothing' ? 'selected' : ''}>Geen prijs</option>
        </select>
      </div>
      <div class="admin-field" style="margin:0"><label>Waarde</label><input type="number" data-spin-prize="${i}" data-field="value" value="${p.value ?? 0}"></div>
      <div class="admin-field" style="margin:0"><label>Gewicht</label><input type="number" min="1" data-spin-prize="${i}" data-field="weight" value="${p.weight ?? 10}"></div>
      <div class="admin-field" style="margin:0"><label>Kleur</label><input type="text" data-spin-prize="${i}" data-field="color" value="${escapeHtml(p.color || '#475569')}"></div>
      <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-spin-prize="${i}">×</button>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-spin-prize]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.spinPrize;
      const field = input.dataset.field;
      if (!currentData.spinWheel.prizes[i]) return;
      if (field === 'value' || field === 'weight')
        currentData.spinWheel.prizes[i][field] = Number(input.value) || 0;
      else currentData.spinWheel.prizes[i][field] = input.value;
    });
  });

  list.querySelectorAll('[data-remove-spin-prize]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.spinWheel.prizes.splice(+btn.dataset.removeSpinPrize, 1);
      renderSpinAdmin();
    });
  });
}

function initAdminNavGroups() {
  document.querySelectorAll('.admin-nav-group-toggle').forEach((toggle) => {
    const group = toggle.closest('.admin-nav-group');
    const sub = group?.querySelector('.admin-nav-sub');
    toggle.addEventListener('click', () => {
      const open = group.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (sub) sub.hidden = !open;
    });
  });
}

function renderIngameList() {
  const list = document.getElementById('ingame-list');
  if (!list) return;
  ensureIngameStore();
  const items = currentData.ingameStore.items || [];

  if (!items.length) {
    list.innerHTML = '<div class="admin-card"><p>Geen producten. Voeg een product toe.</p></div>';
    return;
  }

  list.innerHTML = items
    .map((item, i) => {
      const catOpts = INGAME_CATS.map(
        (c) =>
          `<option value="${c}" ${item.cat === c ? 'selected' : ''}>${c}</option>`
      ).join('');
      return `
    <div class="admin-card admin-ingame-card" data-ingame-index="${i}">
      <div class="admin-row">
        <div class="admin-field"><label>Naam</label><input type="text" data-ingame-field="name" value="${escapeHtml(item.name || '')}"></div>
        <div class="admin-field"><label>Coins</label><input type="number" data-ingame-field="coins" min="0" value="${Number(item.coins) || 0}"></div>
        <div class="admin-field"><label>Categorie</label><select data-ingame-field="cat">${catOpts}</select></div>
      </div>
      <div class="admin-field"><label>Beschrijving</label><textarea data-ingame-field="desc" rows="2">${escapeHtml(item.desc || '')}</textarea></div>
      <div class="admin-row">
        <div class="admin-field"><label>Afbeelding URL</label><input type="text" data-ingame-field="image" value="${escapeHtml(item.image || '')}"></div>
        <div class="admin-field"><label>Model (voertuig)</label><input type="text" data-ingame-field="model" value="${escapeHtml(item.model || '')}" placeholder="bijv. adder"></div>
        <div class="admin-field"><label>Item (wapen/item)</label><input type="text" data-ingame-field="item" value="${escapeHtml(item.item || '')}" placeholder="WEAPON_..."></div>
      </div>
      <label class="checkbox-field"><input type="checkbox" data-ingame-field="featured" ${item.featured ? 'checked' : ''}> Featured</label>
      <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-ingame="${i}" style="margin-top:0.75rem">Verwijderen</button>
    </div>`;
    })
    .join('');

  list.querySelectorAll('[data-ingame-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const card = el.closest('[data-ingame-index]');
      const idx = +card.dataset.ingameIndex;
      const field = el.dataset.ingameField;
      if (field === 'featured') currentData.ingameStore.items[idx].featured = el.checked;
      else if (field === 'coins') currentData.ingameStore.items[idx].coins = Number(el.value) || 0;
      else currentData.ingameStore.items[idx][field] = el.value;
    });
    el.addEventListener('input', () => el.dispatchEvent(new Event('change')));
  });

  list.querySelectorAll('[data-remove-ingame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.ingameStore.items.splice(+btn.dataset.removeIngame, 1);
      renderIngameList();
    });
  });
}

function renderWalletsList(filter = '') {
  const list = document.getElementById('wallets-list');
  if (!list) return;

  currentData = SiteData.get();
  let players = SiteData.listPlayerWallets();
  const q = filter.trim().toLowerCase();

  if (q) {
    players = players.filter(
      (p) =>
        p.discordUsername?.toLowerCase().includes(q) ||
        p.cfxUsername?.toLowerCase().includes(q) ||
        p.discordId?.includes(q) ||
        String(p.balance).includes(q)
    );
  }

  if (!players.length) {
    list.innerHTML = `
      <div class="admin-card admin-wallets-empty">
        <p>Nog geen spelers. Laat iemand op de website inloggen met <strong>Discord + FiveM</strong> — daarna verschijnt hij hier.</p>
      </div>`;
    return;
  }

  list.innerHTML = players
    .map(
      (p) => `
    <div class="admin-wallet-card" data-wallet-id="${escapeHtml(p.id)}">
      <div class="admin-wallet-head">
        <div>
          <strong>${escapeHtml(p.discordUsername)}</strong>
          <span class="user-meta">Discord · ${escapeHtml(p.discordId)}</span>
        </div>
        <div class="admin-wallet-balance">
          <span class="admin-wallet-balance-label">Saldo</span>
          <span class="admin-wallet-balance-val" data-balance-display="${escapeHtml(p.id)}">${formatCoinAmount(p.balance)}</span>
        </div>
      </div>
      <p class="user-meta" style="margin:0.35rem 0 0.75rem">FiveM: ${escapeHtml(p.cfxUsername)} · ${escapeHtml(p.cfxId)}</p>
      <p class="user-meta" style="margin:0 0 0.75rem">Laatst online: ${p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString('nl-NL') : '—'}</p>
      <div class="admin-wallet-actions">
        <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-wallet-add="${escapeHtml(p.id)}" data-add="10">+10</button>
        <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-wallet-add="${escapeHtml(p.id)}" data-add="50">+50</button>
        <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-wallet-add="${escapeHtml(p.id)}" data-add="100">+100</button>
        <input type="number" class="admin-wallet-custom" data-wallet-custom="${escapeHtml(p.id)}" min="1" step="1" placeholder="Aantal" aria-label="Custom coins">
        <button type="button" class="btn-admin btn-admin-primary btn-admin-sm" data-wallet-give="${escapeHtml(p.id)}">Geven</button>
        <input type="number" class="admin-wallet-custom" data-wallet-set="${escapeHtml(p.id)}" min="0" step="1" placeholder="Saldo" value="${p.balance}" aria-label="Nieuw saldo">
        <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-wallet-save="${escapeHtml(p.id)}">Saldo zetten</button>
        <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-wallet-remove="${escapeHtml(p.id)}">Verwijderen</button>
      </div>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-wallet-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!requirePerm('wallets')) return;
      const result = SiteData.addPlayerCoins(btn.dataset.walletAdd, btn.dataset.add);
      if (result.ok) {
        currentData = SiteData.get();
        toast(`+${btn.dataset.add} coins → ${formatCoinAmount(result.player.balance)}`);
        renderWalletsList(document.getElementById('wallet-search')?.value || '');
      } else toast(result.error);
    });
  });

  list.querySelectorAll('[data-wallet-give]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!requirePerm('wallets')) return;
      const input = list.querySelector(`[data-wallet-custom="${btn.dataset.walletGive}"]`);
      const result = SiteData.addPlayerCoins(btn.dataset.walletGive, input?.value);
      if (result.ok) {
        currentData = SiteData.get();
        if (input) input.value = '';
        toast(`+${result.added} coins → ${formatCoinAmount(result.player.balance)}`);
        renderWalletsList(document.getElementById('wallet-search')?.value || '');
      } else toast(result.error);
    });
  });

  list.querySelectorAll('[data-wallet-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!requirePerm('wallets')) return;
      const input = list.querySelector(`[data-wallet-set="${btn.dataset.walletSave}"]`);
      const result = SiteData.setPlayerBalance(btn.dataset.walletSave, input?.value);
      if (result.ok) {
        currentData = SiteData.get();
        toast(`Saldo: ${formatCoinAmount(result.player.balance)} coins`);
        renderWalletsList(document.getElementById('wallet-search')?.value || '');
      } else toast(result.error);
    });
  });

  list.querySelectorAll('[data-wallet-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!requirePerm('wallets')) return;
      if (!confirm('Speler uit de lijst verwijderen? Saldo gaat verloren.')) return;
      const result = SiteData.removePlayerWallet(btn.dataset.walletRemove);
      if (result.ok) {
        currentData = SiteData.get();
        toast('Speler verwijderd');
        renderWalletsList(document.getElementById('wallet-search')?.value || '');
      } else toast(result.error);
    });
  });
}

function renderCoinsList() {
  const list = document.getElementById('coins-list');
  if (!list) return;
  list.innerHTML = currentData.coins
    .map(
      (c, i) => `
    <div class="admin-item" style="display:flex;gap:0.75rem;align-items:flex-end;flex-wrap:wrap">
      <div class="admin-field" style="flex:1;min-width:100px;margin:0"><label>Coins</label><input type="number" data-coin="${i}" data-field="amount" value="${c.amount}"></div>
      <div class="admin-field" style="flex:1;min-width:100px;margin:0"><label>Prijs (€)</label><input type="number" step="0.01" data-coin="${i}" data-field="price" value="${c.price}"></div>
      <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-coin="${i}">×</button>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-coin]').forEach((input) => {
    input.addEventListener('change', () => {
      const i = +input.dataset.coin;
      currentData.coins[i][input.dataset.field] = parseFloat(input.value) || 0;
    });
  });

  list.querySelectorAll('[data-remove-coin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.coins.splice(+btn.dataset.removeCoin, 1);
      renderCoinsList();
    });
  });
}

function ensureRulesData() {
  if (!currentData.ruleArticles?.length && window.__GRP_RULE_DEFAULTS__) {
    currentData.ruleArticles = structuredClone(
      window.__GRP_RULE_DEFAULTS__.ruleArticles
    );
    currentData.rulesMeta = structuredClone(window.__GRP_RULE_DEFAULTS__.rulesMeta);
  }
  if (!currentData.rulesMeta) {
    currentData.rulesMeta = structuredClone(
      window.__GRP_RULE_DEFAULTS__?.rulesMeta || {
        title: 'Algemene Plaatselijke',
        titleAccent: 'Verordening',
        subtitle: '',
      }
    );
  }
  currentData.ruleArticles = currentData.ruleArticles || [];
}

function renderRulesList() {
  const list = document.getElementById('rules-list');
  if (!list) return;
  ensureRulesData();

  const meta = currentData.rulesMeta;
  const stats = SiteData.computeRulesMeta(currentData.ruleArticles);

  const metaBlock = `
    <div class="admin-card admin-rules-meta">
      <h3>Hero &amp; statistieken</h3>
      <div class="admin-row">
        <div class="admin-field"><label>Titel (wit)</label><input data-rules-meta="title" value="${escapeHtml(meta.title || '')}"></div>
        <div class="admin-field"><label>Titel (groen)</label><input data-rules-meta="titleAccent" value="${escapeHtml(meta.titleAccent || '')}"></div>
      </div>
      <div class="admin-field"><label>Ondertitel</label><textarea data-rules-meta="subtitle" rows="2">${meta.subtitle || ''}</textarea></div>
      <p class="admin-rules-stats-hint">Live telling: <strong>${stats.total}</strong> regels · <strong>${stats.articles}</strong> artikelen · <strong>${stats.heavy}</strong> zwaar</p>
    </div>`;

  const articlesBlock = currentData.ruleArticles
    .map((article, ai) => {
      const rulesHtml = (article.rules || [])
        .map(
          (rule, ri) => `
        <div class="admin-rule-row">
          <div class="admin-row">
            <div class="admin-field admin-field--sm"><label>ID</label><input data-article="${ai}" data-rule="${ri}" data-field="id" value="${escapeHtml(rule.id)}"></div>
            <div class="admin-field admin-field--sm"><label>Ernst</label>
              <select data-article="${ai}" data-rule="${ri}" data-field="severity">
                <option value="licht" ${rule.severity === 'licht' ? 'selected' : ''}>Licht</option>
                <option value="zwaar" ${rule.severity === 'zwaar' ? 'selected' : ''}>Zwaar</option>
              </select>
            </div>
            <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-rule="${ai}" data-rule-index="${ri}">×</button>
          </div>
          <div class="admin-field"><label>Tekst</label><textarea data-article="${ai}" data-rule="${ri}" data-field="text" rows="2">${rule.text || ''}</textarea></div>
        </div>`
        )
        .join('');

      return `
      <div class="admin-item admin-article-item">
        <div class="admin-item-header">
          <strong>Artikel ${article.num || ai + 1}: ${escapeHtml(article.title)}</strong>
          <button type="button" class="btn-admin btn-admin-danger btn-admin-sm" data-remove-article="${ai}">Artikel verwijderen</button>
        </div>
        <div class="admin-row">
          <div class="admin-field"><label>Artikel titel</label><input data-article="${ai}" data-article-field="title" value="${escapeHtml(article.title)}"></div>
          <div class="admin-field admin-field--sm"><label>Nummer</label><input type="number" min="1" data-article="${ai}" data-article-field="num" value="${article.num ?? ai + 1}"></div>
          <div class="admin-field admin-field--sm"><label>Code (prefix)</label><input data-article="${ai}" data-article-field="code" value="${escapeHtml(article.code || '')}" placeholder="A, RP, C…"></div>
        </div>
        <div class="admin-rules-in-article">
          <p class="admin-sub-label">Regels in dit artikel (${(article.rules || []).length})</p>
          ${rulesHtml}
          <button type="button" class="btn-admin btn-admin-secondary btn-admin-sm" data-add-rule="${ai}">+ Regel toevoegen</button>
        </div>
      </div>`;
    })
    .join('');

  list.innerHTML = metaBlock + articlesBlock;

  list.querySelectorAll('[data-rules-meta]').forEach((el) => {
    el.addEventListener('input', () => {
      currentData.rulesMeta[el.dataset.rulesMeta] = el.value;
    });
  });

  list.querySelectorAll('[data-article-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const ai = +el.dataset.article;
      const field = el.dataset.articleField;
      currentData.ruleArticles[ai][field] =
        field === 'num' ? parseInt(el.value, 10) || 1 : el.value;
    });
  });

  list.querySelectorAll('[data-article][data-rule][data-field]').forEach((el) => {
    el.addEventListener('input', () => {
      const ai = +el.dataset.article;
      const ri = +el.dataset.rule;
      currentData.ruleArticles[ai].rules[ri][el.dataset.field] = el.value;
    });
  });

  list.querySelectorAll('[data-remove-article]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentData.ruleArticles.splice(+btn.dataset.removeArticle, 1);
      renderRulesList();
    });
  });

  list.querySelectorAll('[data-remove-rule]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ai = +btn.dataset.removeRule;
      currentData.ruleArticles[ai].rules.splice(+btn.dataset.ruleIndex, 1);
      renderRulesList();
    });
  });

  list.querySelectorAll('[data-add-rule]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ai = +btn.dataset.addRule;
      const art = currentData.ruleArticles[ai];
      const n = (art.rules?.length || 0) + 1;
      const prefix = art.code || 'R';
      art.rules = art.rules || [];
      art.rules.push({
        id: `${prefix}${n}`,
        text: 'Nieuwe regel',
        severity: 'licht',
      });
      renderRulesList();
    });
  });
}

function loadForms() {
  currentUser = SiteData.getCurrentUser();
  applyPermissionsUI();

  if (SiteData.hasPermission('general')) {
    document.getElementById('input-promo').value = currentData.promoBanner;
    document.getElementById('input-hero').value = currentData.heroSubtitle;
    document.getElementById('input-sale-title').value = currentData.saleBannerTitle;
    document.getElementById('input-sale-text').value = currentData.saleBannerText;
  }
  if (
    SiteData.hasPermission('staff') ||
    SiteData.hasPermission('coins') ||
    SiteData.hasPermission('store') ||
    SiteData.hasPermission('spin') ||
    SiteData.hasPermission('ingame') ||
    SiteData.hasPermission('wallets')
  ) {
    renderProductHub();
  }
  if (SiteData.hasPermission('store')) renderStoreCatalogAdmin();
  if (SiteData.hasPermission('spin')) renderSpinAdmin();
  if (SiteData.hasPermission('staff')) renderStaffList();
  if (SiteData.hasPermission('coins')) renderCoinsList();
  if (SiteData.hasPermission('wallets')) renderWalletsList();
  if (SiteData.hasPermission('ingame')) renderIngameList();
  if (SiteData.hasPermission('rules')) renderRulesList();
  if (SiteData.hasPermission('users')) renderUsersList();
}

function initNewUserForm() {
  const prefix = 'new';
  const permsBox = document.getElementById('new-user-perms');
  if (permsBox) {
    permsBox.innerHTML = renderPermCheckboxes(['general'], prefix);

    document.getElementById('new-all-perms')?.addEventListener('change', (e) => {
      document.querySelectorAll(`[data-prefix="${prefix}"][data-perm]`).forEach((inp) => {
        inp.disabled = e.target.checked;
        if (e.target.checked) inp.checked = false;
      });
    });

    document.getElementById('new-user-preset')?.addEventListener('change', (e) => {
      const preset = SiteData.ROLE_PRESETS[e.target.value];
      if (!preset) return;
      const allCb = document.getElementById('new-all-perms');
      if (preset.permissions.includes('*')) {
        allCb.checked = true;
        allCb.dispatchEvent(new Event('change'));
      } else {
        allCb.checked = false;
        allCb.dispatchEvent(new Event('change'));
        document.querySelectorAll(`[data-prefix="${prefix}"][data-perm]`).forEach((inp) => {
          inp.checked = preset.permissions.includes(inp.value);
        });
      }
    });
  }

  document.getElementById('btn-add-user')?.addEventListener('click', () => {
    if (!requirePerm('users')) return;
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const displayName = document.getElementById('new-displayname').value;
    const preset = document.getElementById('new-user-preset').value;
    const permissions = getPermsFromForm(prefix);

    const result = SiteData.addUser({
      username,
      password,
      displayName,
      permissions,
      role: preset === 'custom' ? 'custom' : preset,
    });

    if (result.ok) {
      currentData = SiteData.get();
      document.getElementById('new-username').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('new-displayname').value = '';
      toast('Gebruiker toegevoegd');
      renderUsersList();
    } else toast(result.error);
  });
}

function initLogin() {
  const form = document.getElementById('login-form');
  const err = document.getElementById('login-error');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const pw = document.getElementById('login-password').value;
    const result = SiteData.login(username, pw);
    if (result.ok) {
      currentUser = result.user;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-app').style.display = 'flex';
      currentData = SiteData.get();
      loadForms();
      if (err) {
        err.textContent = '';
        err.hidden = true;
      }
    } else if (err) {
      err.textContent = result.error;
      err.hidden = false;
    }
  });
}

function initDashboard() {
  initAdminNavGroups();
  document.querySelectorAll('.admin-nav button[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel));
  });

  document.getElementById('btn-save-general')?.addEventListener('click', () => {
    if (!requirePerm('general')) return;
    const promo = document.getElementById('input-promo')?.value?.trim() || '';
    const hero = document.getElementById('input-hero')?.value?.trim() || '';
    const saleTitle = document.getElementById('input-sale-title')?.value?.trim() || '';
    const saleText = document.getElementById('input-sale-text')?.value?.trim() || '';
    const errEl = document.getElementById('general-save-error');

    if (!promo || !hero || !saleTitle || !saleText) {
      if (errEl) {
        errEl.textContent = 'Vul alle velden in — lege content wordt niet opgeslagen.';
        errEl.hidden = false;
      }
      toast('Vul alle verplichte velden in');
      return;
    }

    if (errEl) errEl.hidden = true;
    currentData.promoBanner = promo;
    currentData.heroSubtitle = hero;
    currentData.saleBannerTitle = saleTitle;
    currentData.saleBannerText = saleText;
    persist();
  });

  document.getElementById('btn-save-staff')?.addEventListener('click', () => {
    if (!requirePerm('staff')) return;
    SiteData.syncStoreProductsFromLegacy(currentData);
    currentData = SiteData.get();
    persist();
  });
  document.getElementById('btn-save-coins')?.addEventListener('click', () => {
    if (!requirePerm('coins')) return;
    SiteData.syncStoreProductsFromLegacy(currentData);
    currentData = SiteData.get();
    persist();
  });

  document.getElementById('btn-store-cat-back')?.addEventListener('click', () => {
    closeStoreCategoryEditor();
  });

  document.getElementById('btn-save-store-catalog-products')?.addEventListener('click', () => {
    if (!requirePerm('store')) return;
    ensureStoreCatalogData();
    SiteData.saveStoreCatalog({
      categories: currentData.storeCategories,
      products: currentData.storeProducts,
      recentPayments: currentData.storeRecentPayments,
    });
    currentData = SiteData.get();
    toast('Producten opgeslagen!');
    closeStoreCategoryEditor();
  });

  document.getElementById('btn-add-store-cat')?.addEventListener('click', () => {
    if (!requirePerm('store')) return;
    ensureStoreCatalogData();
    const id = 'cat-' + Date.now();
    currentData.storeCategories.push({
      id,
      label: 'Nieuwe categorie',
      description: '',
      sort: currentData.storeCategories.length,
    });
    renderStoreCatalogAdmin();
    openStoreCategoryEditor(id);
  });

  document.getElementById('btn-add-store-product')?.addEventListener('click', () => {
    if (!requirePerm('store')) return;
    ensureStoreCatalogData();
    if (!selectedStoreCatId) {
      toast('Selecteer eerst een categorie');
      return;
    }
    const isCoins = selectedStoreCatId === 'coins';
    currentData.storeProducts.push({
      id: 'prod-' + Date.now(),
      categoryId: selectedStoreCatId,
      name: isCoins ? '10 coins' : 'Nieuw product',
      coinAmount: isCoins ? 10 : undefined,
      price: isCoins ? 9.99 : 49.99,
      priceOld: isCoins ? undefined : 59.99,
      image: '',
      popular: false,
    });
    renderStoreProductsAdmin();
  });

  document.getElementById('btn-add-store-recent')?.addEventListener('click', () => {
    if (!requirePerm('store')) return;
    ensureStoreCatalogData();
    if (!currentData.storeRecentPayments) currentData.storeRecentPayments = [];
    currentData.storeRecentPayments.push({
      user: 'Speler',
      initial: 'S',
      color: '#6366f1',
      badge: '',
    });
    renderStoreRecentAdmin();
  });

  document.getElementById('btn-save-store-catalog')?.addEventListener('click', () => {
    if (!requirePerm('store')) return;
    ensureStoreCatalogData();
    SiteData.saveStoreCatalog({
      categories: currentData.storeCategories,
      products: currentData.storeProducts,
      recentPayments: currentData.storeRecentPayments,
    });
    currentData = SiteData.get();
    toast('Webstore opgeslagen!');
  });

  document.getElementById('btn-add-spin-prize')?.addEventListener('click', () => {
    if (!requirePerm('spin')) return;
    ensureStoreCatalogData();
    if (!currentData.spinWheel.prizes) currentData.spinWheel.prizes = [];
    currentData.spinWheel.prizes.push({
      id: 'sw-' + Date.now(),
      label: '10 coins',
      type: 'coins',
      value: 10,
      weight: 10,
      color: '#0ea5e9',
    });
    renderSpinAdmin();
  });

  document.getElementById('btn-save-spin')?.addEventListener('click', () => {
    if (!requirePerm('spin')) return;
    ensureStoreCatalogData();
    currentData.spinWheel = {
      enabled: document.getElementById('spin-enabled').checked,
      title: document.getElementById('spin-title').value.trim() || 'Draai & Win!',
      subtitle: document.getElementById('spin-subtitle').value.trim(),
      cooldownHours: Math.max(1, parseInt(document.getElementById('spin-cooldown').value, 10) || 24),
      prizes: currentData.spinWheel.prizes || [],
    };
    SiteData.saveStoreCatalog({ spinWheel: currentData.spinWheel });
    currentData = SiteData.get();
    toast('Draai & Win opgeslagen!');
  });
  document.getElementById('btn-save-rules')?.addEventListener('click', () => {
    if (!requirePerm('rules')) return;
    ensureRulesData();
    const computed = SiteData.computeRulesMeta(currentData.ruleArticles);
    currentData.rulesMeta = {
      ...currentData.rulesMeta,
      total: computed.total,
      articles: computed.articles,
      heavy: computed.heavy,
    };
    persist();
  });

  document.getElementById('btn-add-staff')?.addEventListener('click', () => {
    if (!requirePerm('staff')) return;
    currentData.staffPackages.push({
      id: 'pkg-' + Date.now(),
      name: 'Nieuw pakket',
      image: 'https://i.postimg.cc/765PrFZC/groningen.png',
      priceOld: 99.99,
      priceNew: 89.99,
      discount: 10,
      popular: false,
    });
    renderStaffList();
  });

  document.getElementById('btn-add-coin')?.addEventListener('click', () => {
    if (!requirePerm('coins')) return;
    currentData.coins.push({ amount: 10, price: 9.99 });
    renderCoinsList();
  });

  document.getElementById('wallet-search')?.addEventListener('input', (e) => {
    renderWalletsList(e.target.value);
  });

  function addIngameProduct() {
    if (!requirePerm('ingame')) return;
    ensureIngameStore();
    currentData.ingameStore.items.push({
      id: 'item-' + Date.now(),
      cat: 'autos',
      name: 'Nieuw product',
      desc: 'Beschrijving',
      coins: 10,
      image: 'assets/urp-logo.png',
      featured: false,
      model: '',
      item: '',
    });
    renderIngameList();
    toast('Product toegevoegd — klik Opslaan & sync');
  }

  async function saveIngameStore() {
    if (!requirePerm('ingame')) return;
    ensureIngameStore();
    if (!currentData.ingameStore.categories?.length) {
      currentData.ingameStore.categories = SiteData.getIngameStore().categories;
    }
    SiteData.saveIngameStore(currentData.ingameStore);
    currentData = SiteData.get();
    if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
      const res = await StoreBridge.pushSiteCatalog();
      if (res.ok) toast(`Opgeslagen & gesync naar FiveM (v${res.version || '?'})`);
      else toast(res.offline ? 'Opgeslagen — bridge API offline' : res.error || 'Sync mislukt');
    } else {
      toast('Opgeslagen lokaal — zet bridge API aan voor FiveM sync');
    }
  }

  document.getElementById('btn-add-ingame')?.addEventListener('click', addIngameProduct);
  document.querySelectorAll('[data-ingame-add]').forEach((btn) => {
    btn.addEventListener('click', addIngameProduct);
  });

  document.getElementById('btn-save-ingame')?.addEventListener('click', saveIngameStore);
  document.querySelectorAll('[data-ingame-save]').forEach((btn) => {
    btn.addEventListener('click', saveIngameStore);
  });

  document.getElementById('btn-wallet-bulk')?.addEventListener('click', () => {
    if (!requirePerm('wallets')) return;
    const amount = document.getElementById('wallet-bulk-amount')?.value;
    const result = SiteData.addCoinsToAllPlayers(amount);
    if (result.ok) {
      currentData = SiteData.get();
      toast(`+${result.added} coins aan ${result.count} speler(s)`);
      renderWalletsList(document.getElementById('wallet-search')?.value || '');
    } else toast(result.error);
  });

  document.getElementById('btn-add-article')?.addEventListener('click', () => {
    if (!requirePerm('rules')) return;
    ensureRulesData();
    const num = currentData.ruleArticles.length + 1;
    currentData.ruleArticles.push({
      id: 'artikel-' + Date.now(),
      title: 'Nieuw artikel',
      num,
      code: 'N',
      rules: [{ id: 'N1', text: 'Nieuwe regel', severity: 'licht' }],
    });
    renderRulesList();
  });

  document.getElementById('btn-save-own-password')?.addEventListener('click', () => {
    const pw = document.getElementById('input-own-password').value;
    if (pw.length < 4) {
      toast('Wachtwoord min. 4 tekens');
      return;
    }
    const result = SiteData.updateUser(SiteData.getCurrentUserId(), { password: pw });
    if (result.ok) {
      document.getElementById('input-own-password').value = '';
      toast('Je wachtwoord is bijgewerkt');
    } else toast(result.error);
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    if (!requirePerm('settings')) return;
    const blob = new Blob([SiteData.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grp-site-data.json';
    a.click();
    toast('Export gedownload');
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    if (!requirePerm('settings')) return;
    const json = document.getElementById('import-json').value;
    try {
      currentData = SiteData.importJson(json);
      loadForms();
      toast('Import gelukt');
    } catch {
      toast('Ongeldige JSON');
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (!requirePerm('settings')) return;
    if (confirm('Alle content én gebruikers terugzetten? Je wordt uitgelogd.')) {
      SiteData.logout();
      currentData = SiteData.reset();
      location.reload();
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    SiteData.logout();
    location.reload();
  });

  initNewUserForm();
}

function bootAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';
  currentData = SiteData.get();
  currentUser = SiteData.getCurrentUser();
  loadForms();
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initDashboard();

  if (SiteData.isLoggedIn()) bootAdmin();
});
