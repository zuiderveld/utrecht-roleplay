/**
 * Past opgeslagen site-data toe op publieke pagina's
 */
(function applySiteData() {
  const data = SiteData.get();
  const checkSvg =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

  document.querySelectorAll('[data-site="promo"]').forEach((el) => {
    el.textContent = data.promoBanner;
  });

  const heroSub = document.querySelector('[data-site="hero-subtitle"]');
  if (heroSub) heroSub.textContent = data.heroSubtitle;

  const saleTitle = document.querySelector('[data-site="sale-title"]');
  const saleText = document.querySelector('[data-site="sale-text"]');
  if (saleTitle) saleTitle.textContent = data.saleBannerTitle;
  if (saleText) saleText.textContent = data.saleBannerText;

  function renderPackageCard(pkg, featured, opts = {}) {
    const oldP = SiteData.formatPrice(pkg.priceOld);
    const newP = SiteData.formatPrice(pkg.priceNew);
    const popular = pkg.popular
      ? '<span class="package-badge badge-popular">Populair</span>'
      : '';
    const tag = opts.cart ? 'div' : 'a';
    const hrefAttr = opts.cart ? '' : ` href="store.html"`;
    const addCartBtn = opts.cart
      ? `<button type="button" class="cart-icon" data-add-package="${pkg.id}" aria-label="In winkelwagen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></button>`
      : `<div class="cart-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></div>`;
    return `
      <${tag}${hrefAttr} class="package-card${featured ? ' featured' : ''} fade-in">
        <div class="package-image">
          <img src="${pkg.image}" alt="${pkg.name}" loading="lazy">
          ${popular}
          <span class="package-badge badge-discount">-${pkg.discount}%</span>
        </div>
        <div class="package-body">
          <h3>${pkg.name}</h3>
          <div class="package-footer">
            <div><span class="price-old">${oldP}</span> <span class="price-new">${newP}</span></div>
            ${addCartBtn}
          </div>
        </div>
      </${tag}>`;
  }

  const featured = document.getElementById('featured-packages');
  if (featured) {
    featured.innerHTML = data.staffPackages
      .map((p, i) => renderPackageCard(p, i === 0 || p.popular))
      .join('');
    requestAnimationFrame(() => {
      featured.querySelectorAll('.fade-in').forEach((el) => el.classList.add('visible'));
    });
  }

  const staffGrid = document.getElementById('staff-packages');
  if (staffGrid) {
    staffGrid.innerHTML = data.staffPackages
      .map((p) => renderPackageCard(p, p.popular, { cart: true }))
      .join('');
  }

  const coinsGrid = document.getElementById('coins-grid');
  if (coinsGrid && !document.getElementById('store-coins-grid')) {
    coinsGrid.innerHTML = data.coins
      .map(
        (c) => `
      <div class="coin-card">
        <h3>${c.amount} coins</h3>
        <div class="price">${SiteData.formatPrice(c.price)}</div>
      </div>`
      )
      .join('');
  }

  const rulesContainer = document.getElementById('rules-container');
  if (rulesContainer) {
    rulesContainer.innerHTML = data.rules
      .map((rule) => {
        if (rule.type === 'list') {
          const items = (rule.items || [])
            .map((item) => `<li>${checkSvg}${item}</li>`)
            .join('');
          return `
          <div class="glass-card" style="margin-bottom:1rem">
            <h3 style="font-weight:700;margin-bottom:0.5rem;color:#3a8055">${rule.title}</h3>
            <ul class="check-list">${items}</ul>
          </div>`;
        }
        const text =
          rule.id === 'meer'
            ? rule.text.replace(
                'Discord',
                `<a href="${typeof GRPConfig !== 'undefined' ? GRPConfig.discord.inviteUrl : 'https://discord.gg/TM5qxjSb'}" target="_blank" style="color:#3a8055">Discord</a>`
              )
            : rule.text;
        return `
        <div class="glass-card" style="margin-bottom:1rem">
          <h3 style="font-weight:700;margin-bottom:0.5rem;color:#3a8055">${rule.title}</h3>
          <p style="font-size:0.875rem;color:rgba(255,255,255,0.45);line-height:1.6">${text}</p>
        </div>`;
      })
      .join('');
  }
})();
