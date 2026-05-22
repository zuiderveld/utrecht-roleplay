/** Pagina-specifieke rendering (regels, ingame store) */
const GRPPages = (() => {
  const ruleIcons = {
    book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
    gavel: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L14 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>',
    mask: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c0-2 1.5-4 4-4s4 2 6 2 2-2 4-2 4 2 4-2 6-2 4 2 4 4"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>',
    car: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-4-2-4 2-4 2-2.7.6-3.5 1.1C4.7 11.3 4 12.1 4 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
    landmark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>',
    radio: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 4.933a10 10 0 0 0 0 14.134"/><path d="M7.753 7.761a6 6 0 0 0 0 8.478"/><circle cx="12" cy="12" r="2"/></svg>',
  };

  function getRegelsData() {
    if (typeof SiteData !== 'undefined' && SiteData.getRulesContent) {
      return SiteData.getRulesContent();
    }
    const articles = GRPContent.ruleArticles;
    let total = 0;
    let heavy = 0;
    articles.forEach((a) => {
      a.rules.forEach((r) => {
        total += 1;
        if (r.severity === 'zwaar') heavy += 1;
      });
    });
    return {
      articles,
      meta: { ...GRPContent.rulesMeta, total, articles: articles.length, heavy },
      icons: GRPContent.ruleArticleIcons,
    };
  }

  function initRegels() {
    const root = document.getElementById('regels-app');
    if (!root) return;

    let { articles, meta, icons } = getRegelsData();
    let activeArticleId = articles[0]?.id || 'algemeen';
    let searchQuery = '';
    let scrollSpy;

    function getArticleIcon(id) {
      const key = icons[id] || 'book';
      return ruleIcons[key] || ruleIcons.book;
    }

    function filterRules(rules) {
      if (!searchQuery.trim()) return rules;
      const q = searchQuery.toLowerCase();
      return rules.filter(
        (r) => r.id.toLowerCase().includes(q) || r.text.toLowerCase().includes(q)
      );
    }

    function renderArticlePanel(article, rulesToShow) {
      const rules = rulesToShow ?? filterRules(article.rules);
      const rows = rules
        .map(
          (r) => `
        <div class="rule-row rule-row--${r.severity}">
          <span class="rule-row-id">${r.id}</span>
          <p class="rule-row-text">${r.text}</p>
          <span class="rule-severity rule-severity--${r.severity}">${r.severity === 'zwaar' ? 'ZWAAR' : 'LICHT'}</span>
        </div>`
        )
        .join('');

      const countLabel = searchQuery.trim()
        ? `${rules.length} van ${article.rules.length} regels`
        : `${article.rules.length} regels`;

      return `
        <section class="rules-panel" id="artikel-${article.id}">
          <div class="rules-panel-head">
            <div class="rules-panel-icon">${getArticleIcon(article.id)}</div>
            <div>
              <p class="rules-panel-label">ARTIKEL ${article.num} · ${countLabel}</p>
              <h2 class="rules-panel-title">${article.title}</h2>
            </div>
          </div>
          <div class="rules-list">
            ${rows || '<p class="rules-empty">Geen regels in dit artikel voor je zoekopdracht.</p>'}
          </div>
        </section>`;
    }

    function renderAllPanels() {
      const panels = articles
        .map((article) => {
          const rules = filterRules(article.rules);
          if (searchQuery.trim() && !rules.length) return '';
          return renderArticlePanel(article, rules);
        })
        .filter(Boolean)
        .join('');

      return (
        panels ||
        '<p class="rules-empty rules-empty--global">Geen regels gevonden voor je zoekopdracht.</p>'
      );
    }

    function renderSidebar() {
      return articles
        .map((a) => {
          const matchCount = searchQuery.trim()
            ? filterRules(a.rules).length
            : a.rules.length;
          const hidden = searchQuery.trim() && !matchCount;
          return `
        <button type="button" class="rules-nav-item ${activeArticleId === a.id ? 'active' : ''} ${hidden ? 'is-hidden' : ''}" data-article="${a.id}">
          <span class="rules-nav-icon">${getArticleIcon(a.id)}</span>
          <span>Art. ${a.num}</span>
          ${searchQuery.trim() ? `<span class="rules-nav-count">${matchCount}</span>` : ''}
          <svg class="rules-nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>`;
        })
        .join('');
    }

    function setActiveNav(id) {
      activeArticleId = id;
      root.querySelectorAll('.rules-nav-item').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.article === id);
      });
    }

    function bindNav() {
      root.querySelectorAll('.rules-nav-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.article;
          setActiveNav(id);
          document
            .getElementById(`artikel-${id}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    function bindScrollSpy() {
      if (scrollSpy) scrollSpy.disconnect();
      const panels = root.querySelectorAll('.rules-panel[id]');
      if (!panels.length) return;
      scrollSpy = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible) {
            const id = visible.target.id.replace('artikel-', '');
            setActiveNav(id);
          }
        },
        { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.15, 0.4] }
      );
      panels.forEach((p) => scrollSpy.observe(p));
    }

    function updateContent() {
      const content = document.getElementById('rules-content');
      const nav = document.getElementById('rules-nav');
      if (content) content.innerHTML = `<div class="rules-content-stack">${renderAllPanels()}</div>`;
      if (nav) nav.innerHTML = renderSidebar();
      bindNav();
      bindScrollSpy();
    }

    function render() {
      ({ articles, meta, icons } = getRegelsData());

      root.innerHTML = `
        <div class="regels-hero">
          <div class="regels-hero-glow"></div>
          <div class="regels-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
          </div>
          <h1 class="regels-title">
            <span class="gradient-white">${meta.title}</span>
            <span class="gradient-green">${meta.titleAccent}</span>
          </h1>
          <p class="regels-sub">${meta.subtitle}</p>
          <div class="regels-stats-pills">
            <div class="regels-pill regels-pill--green">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/></svg>
              <span><strong>${meta.total}</strong> regels</span>
            </div>
            <div class="regels-pill regels-pill--green">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
              <span><strong>${meta.articles}</strong> artikelen</span>
            </div>
            <div class="regels-pill regels-pill--red">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span><strong>${meta.heavy}</strong> zwaar</span>
            </div>
          </div>
        </div>

        <div class="regels-layout">
          <aside class="regels-sidebar">
            <p class="regels-sidebar-title">ARTIKELEN</p>
            <nav class="regels-nav" id="rules-nav">${renderSidebar()}</nav>
            <div class="regels-legend">
              <p class="regels-legend-title">LEGENDA</p>
              <div class="regels-legend-item"><span class="legend-dot legend-dot--licht"></span> Lichte overtreding</div>
              <div class="regels-legend-item"><span class="legend-dot legend-dot--zwaar"></span> Zware overtreding</div>
            </div>
          </aside>

          <div class="regels-main">
            <div class="rules-search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="search" class="rules-search" id="rules-search" placeholder="Zoek op regel ID of tekst..." value="${searchQuery.replace(/"/g, '&quot;')}">
            </div>
            <div id="rules-content"></div>
          </div>
        </div>

        <button type="button" class="regels-gift-fab" data-spin-open aria-label="Draai &amp; Win" title="Draai &amp; Win">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8s3-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>
        </button>`;

      updateContent();

      const searchInput = document.getElementById('rules-search');
      searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateContent();
      });
    }

    render();
  }

  function getIngameCatalog() {
    if (typeof SiteData !== 'undefined' && SiteData.getIngameStore) {
      return SiteData.getIngameStore();
    }
    return {
      categories: GRPContent.ingameCategories || [],
      items: GRPContent.ingameItems || [],
    };
  }

  function initIngameStore() {
    const grid = document.getElementById('ingame-grid');
    const tabs = document.getElementById('ingame-tabs');
    if (!grid || !tabs) return;

    let category = 'all';
    let featuredFirst = true;
    let catalog = getIngameCatalog();

    function renderTabs() {
      const cats = catalog.categories || [];
      tabs.innerHTML = cats
        .map(
          (c) => `
        <button type="button" class="ingame-tab ${category === c.id ? 'active' : ''}" data-cat="${c.id}">
          ${c.label}${c.count ? ` (${c.count})` : ''}
        </button>`
        )
        .join('');

      tabs.querySelectorAll('.ingame-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          category = btn.dataset.cat;
          renderTabs();
          renderGrid();
        });
      });
    }

    function renderGrid() {
      let items = (catalog.items || []).filter(
        (i) => category === 'all' || i.cat === category
      );
      if (featuredFirst) {
        items = [...items.filter((i) => i.featured), ...items.filter((i) => !i.featured)];
      }

      const catInfo = (catalog.categories || []).find((c) => c.id === category);
      const sectionTitle =
        category === 'all' ? 'Alle items' : catInfo?.label || 'Items';
      const sectionDesc =
        category === 'autos' || category === 'nieuw'
          ? "Ontdek een exclusieve collectie auto's in onze shop, zorgvuldig geselecteerd voor de ultieme rijbeleving."
          : 'Besteed je coins in-game via /store.';

      grid.innerHTML = `
        <div class="ingame-section-head">
          <h2>${sectionTitle}</h2>
          <p>${sectionDesc}</p>
        </div>
        <div class="ingame-products">
          ${items
            .map(
              (item, idx) => {
                const itemId = item.id || `item-${item.cat}-${idx}`;
                return `
            <article class="ingame-card ${item.featured ? 'featured' : ''}" data-item-id="${itemId}">
              ${item.featured ? '<span class="ingame-badge">Featured</span>' : ''}
              <div class="ingame-card-img">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
              </div>
              <div class="ingame-card-body">
                <span class="ingame-type">${item.cat === 'wapens' ? 'Wapen' : item.cat === 'vip-features' ? 'VIP' : 'Product'}</span>
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <div class="ingame-card-foot">
                  <div class="ingame-price">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M18 4h1v4"/><path d="m6 14 .866-.5 2 3.464"/></svg>
                    <span class="coins-val">${item.coins}</span>
                    <span class="coins-label">coins</span>
                  </div>
                  <button type="button" class="ingame-add-cart" data-ingame-add="${itemId}" aria-label="In winkelwagen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </button>
                </div>
              </div>
            </article>`;
              }
            )
            .join('')}
        </div>`;
      bindCartButtons();
    }

    function bindCartButtons() {
      grid.querySelectorAll('[data-ingame-add]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemId = btn.dataset.ingameAdd;
          const item = (catalog.items || []).find(
            (i, idx) => (i.id || `item-${i.cat}-${idx}`) === itemId
          );
          if (item && typeof Cart !== 'undefined') {
            Cart.add({
              type: 'ingame',
              ...item,
              id: item.id || itemId,
              priceCoins: Number(item.coins) || 0,
            });
          }
        });
      });
    }

    const sortToggle = document.getElementById('ingame-featured-toggle');
    if (sortToggle) {
      sortToggle.addEventListener('change', (e) => {
        featuredFirst = e.target.checked;
        renderGrid();
      });
    }

    async function refreshCatalog() {
      if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
        const remote = await StoreBridge.pullCatalog();
        if (remote.ok && remote.catalog?.items?.length) {
          catalog = remote.catalog;
        }
      }
      renderTabs();
      renderGrid();
    }

    renderTabs();
    renderGrid();
    refreshCatalog();
  }

  function initStorePage() {
    /* Store layout wordt door store-app.js afgehandeld */
  }

  return { initRegels, initIngameStore, initStorePage };
})();

document.addEventListener('DOMContentLoaded', () => {
  GRPPages.initRegels();
  GRPPages.initIngameStore();
  GRPPages.initStorePage();
});
