/** Store pagina — dynamische categorieën, producten, zoeken, countdown */
const StoreApp = (() => {
  const COIN_IMG =
    (typeof GRPConfig !== 'undefined' && GRPConfig.store?.coinImage) ||
    (typeof GRPConfig !== 'undefined' && GRPConfig.brand?.logo) ||
    'assets/urp-logo.png';

  let catalog = { categories: [], products: [], recentPayments: [] };
  let activeCat = 'coins';
  let query = '';

  function formatPrice(n) {
    return typeof SiteData !== 'undefined'
      ? SiteData.formatPrice(n)
      : '€' + Number(n).toFixed(2).replace('.', ',');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function productImage(p) {
    if (p.image) return p.image;
    if (p.categoryId === 'coins') return COIN_IMG;
    return COIN_IMG;
  }

  function initCountdown() {
    const el = document.getElementById('sale-countdown');
    if (!el) return;

    let end = sessionStorage.getItem('grp_sale_end');
    if (!end) {
      end = Date.now() + (1 * 3600 + 14 * 60 + 43) * 1000;
      sessionStorage.setItem('grp_sale_end', end);
    }
    end = Number(end);

    function tick() {
      const left = Math.max(0, end - Date.now());
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.innerHTML = `
        <span>${String(h).padStart(2, '0')}</span>
        <span class="sale-countdown-sep">:</span>
        <span>${String(m).padStart(2, '0')}</span>
        <span class="sale-countdown-sep">:</span>
        <span>${String(s).padStart(2, '0')}</span>`;
    }
    tick();
    setInterval(tick, 1000);
  }

  function reloadCatalog() {
    catalog =
      typeof SiteData !== 'undefined'
        ? SiteData.getStoreCatalog()
        : { categories: [], products: [], recentPayments: [] };
    if (!catalog.categories.length && typeof GRPContent !== 'undefined') {
      catalog.categories = (GRPContent.storeCategories || []).map((c, i) => ({
        id: c.id,
        label: c.label,
        description: '',
        sort: i,
      }));
    }
  }

  function renderCategories() {
    const nav = document.getElementById('store-categories');
    if (!nav) return;
    const products = catalog.products || [];
    nav.innerHTML = catalog.categories
      .map((c) => {
        const count =
          typeof SiteData !== 'undefined'
            ? SiteData.countProductsInCategory(products, c.id)
            : products.filter((p) => p.categoryId === c.id).length;
        return `
      <button type="button" class="store-cat ${activeCat === c.id ? 'active' : ''}" data-cat="${escapeHtml(c.id)}">
        <span>${escapeHtml(c.label)}</span>
        <span class="store-cat-count">${count}</span>
      </button>`;
      })
      .join('');
  }

  function renderRecent() {
    const box = document.getElementById('store-recent-payments');
    if (!box) return;
    const list = catalog.recentPayments || [];
    if (!list.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `
      <p class="store-sidebar-label">RECENT PAYMENTS</p>
      ${list
        .map(
          (p) => `
        <div class="store-recent-item">
          <span class="store-recent-avatar" style="background:${escapeHtml(p.color || '#6366f1')}">${escapeHtml(p.initial || '?')}</span>
          <div>
            <strong>${escapeHtml(p.user)}</strong>
            <span>Recente aankoop</span>
          </div>
          ${p.badge ? `<span class="store-recent-badge">${escapeHtml(p.badge)}</span>` : '<span class="store-recent-dot"></span>'}
        </div>`
        )
        .join('')}`;
  }

  function filterProducts(catId) {
    let list = (catalog.products || []).filter((p) => p.categoryId === catId);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          String(p.name || '').toLowerCase().includes(q) ||
          formatPrice(p.price).toLowerCase().includes(q) ||
          String(p.coinAmount || '').includes(q)
      );
    }
    return list;
  }

  function renderProductCard(p) {
    const img = escapeHtml(productImage(p));
    const isStaff = p.categoryId === 'staff' && p.priceOld != null;
    const priceHtml = isStaff
      ? `<p class="store-product-price"><s>${formatPrice(p.priceOld)}</s> ${formatPrice(p.price)}</p>`
      : `<p class="store-product-price">${formatPrice(p.price)}</p>`;
    const cartType = p.categoryId === 'coins' ? 'coin' : p.categoryId === 'staff' ? 'staff' : 'eur';
    const coinAttr =
      p.coinAmount != null ? ` data-coin-amount="${p.coinAmount}"` : '';

    return `
      <article class="store-product-card ${p.categoryId === 'staff' ? 'store-product-card--staff' : ''}">
        <div class="store-product-img">
          <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
          ${p.popular ? '<span class="store-product-popular">Populair</span>' : ''}
        </div>
        <div class="store-product-body">
          <h3>${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="store-product-desc">${escapeHtml(p.description)}</p>` : ''}
          ${priceHtml}
          <button type="button" class="store-product-cart" data-add-store="${escapeHtml(p.id)}" data-store-type="${cartType}" data-store-name="${escapeHtml(p.name)}" data-store-price="${Number(p.price) || 0}" data-store-image="${img}"${coinAttr} aria-label="Toevoegen aan winkelwagen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          </button>
        </div>
      </article>`;
  }

  function renderPanel(catId) {
    const container = document.getElementById('store-panels');
    if (!container) return;

    const cat = catalog.categories.find((c) => c.id === catId) || {
      id: catId,
      label: catId,
      description: '',
    };
    const products = filterProducts(catId);

    container.innerHTML = `
      <div class="store-panel store-panel--active" data-panel="${escapeHtml(catId)}">
        <h2 class="store-panel-title">${escapeHtml(cat.label)}</h2>
        ${cat.description ? `<p class="store-panel-desc">${escapeHtml(cat.description)}</p>` : ''}
        <div class="store-products-grid" id="store-products-grid">
          ${
            products.length
              ? products.map(renderProductCard).join('')
              : '<div class="store-empty">Nog geen producten in deze categorie. Voeg ze toe via het adminpanel.</div>'
          }
        </div>
      </div>`;
  }

  function showPanel(catId) {
    activeCat = catId;
    renderCategories();
    renderPanel(catId);
  }

  function init() {
    if (!document.getElementById('store-categories')) return;

    reloadCatalog();
    activeCat = catalog.categories[0]?.id || 'coins';

    renderRecent();
    renderCategories();
    showPanel(activeCat);

    document.getElementById('store-categories')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.store-cat');
      if (!btn) return;
      showPanel(btn.dataset.cat);
    });

    document.getElementById('store-search')?.addEventListener('input', (e) => {
      query = e.target.value;
      renderPanel(activeCat);
    });

    window.addEventListener('storage', (e) => {
      if (e.key === SiteData?.STORAGE_KEY) {
        reloadCatalog();
        showPanel(activeCat);
      }
    });

    initCountdown();
  }

  return { init, reload: () => { reloadCatalog(); showPanel(activeCat); } };
})();
