/**
 * Geünificeerde winkelwagen — coins-pakketten, staff én ingame store in één mandje
 */
const Cart = (() => {
  const STORAGE_KEY = 'grp_cart';
  const BAG_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
  const TRASH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function migrateStorage() {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const old = localStorage.getItem('grp_ingame_cart');
      if (!old) return;
      const parsed = JSON.parse(old);
      const migrated = parsed.map((i) => ({
        ...i,
        type: 'ingame',
        priceCoins: Number(i.coins) || 0,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      /* ignore */
    }
  }

  function load() {
    migrateStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    render();
    document.dispatchEvent(new CustomEvent('grp-cart-updated'));
  }

  function lineKey(item) {
    return `${item.type}_${item.id}`;
  }

  function formatEur(n) {
    return typeof SiteData !== 'undefined'
      ? SiteData.formatPrice(n)
      : '€' + Number(n).toFixed(2).replace('.', ',');
  }

  function formatCoins(n) {
    return new Intl.NumberFormat('nl-NL').format(Math.max(0, Number(n) || 0));
  }

  function displayPrice(line) {
    if (line.type === 'ingame') {
      return `${formatCoins(line.priceCoins)} coins`;
    }
    return formatEur(line.priceEur);
  }

  function lineTotalEur(line) {
    return (Number(line.priceEur) || 0) * (line.qty || 1);
  }

  function lineTotalCoins(line) {
    return (Number(line.priceCoins) || 0) * (line.qty || 1);
  }

  function totals() {
    const items = load();
    let eur = 0;
    let coins = 0;
    items.forEach((l) => {
      if (l.type === 'ingame') coins += lineTotalCoins(l);
      else eur += lineTotalEur(l);
    });
    return { eur, coins, count: items.reduce((n, i) => n + (i.qty || 1), 0) };
  }

  function add(item) {
    const cart = load();
    const entry = {
      type: item.type || 'ingame',
      id: String(item.id),
      name: item.name,
      image: item.image || '',
      qty: 1,
      priceEur: item.priceEur != null ? Number(item.priceEur) : undefined,
      priceCoins: item.priceCoins != null ? Number(item.priceCoins) : undefined,
      cat: item.cat,
      desc: item.desc,
    };
    const key = lineKey(entry);
    const existing = cart.find((c) => lineKey(c) === key);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cart.push(entry);
    save(cart);
    openSidebar();
  }

  function remove(key) {
    save(load().filter((c) => lineKey(c) !== key));
  }

  function setQty(key, qty) {
    const cart = load();
    const line = cart.find((c) => lineKey(c) === key);
    if (!line) return;
    if (qty <= 0) remove(key);
    else {
      line.qty = qty;
      save(cart);
    }
  }

  function clear() {
    save([]);
  }

  function ensureSidebarDOM() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar || sidebar.dataset.cartReady) return;

    sidebar.innerHTML = `
      <div class="cart-header">
        <div class="cart-header-left">
          <span class="cart-header-icon">${BAG_ICON}</span>
          <h2>Winkelwagen</h2>
          <span class="cart-header-badge" data-cart-count hidden>0</span>
        </div>
        <button type="button" class="cart-close-btn" data-cart-close aria-label="Sluiten">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="cart-login-strip" id="cart-login-strip" hidden></div>
      <div class="cart-empty" id="cart-empty">Je winkelwagen is leeg</div>
      <div class="cart-body" id="cart-body"></div>
      <div class="cart-footer" id="cart-footer" hidden>
        <button type="button" class="cart-coupon-btn" id="cart-coupon-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Couponcode?
        </button>
        <div class="cart-summary" id="cart-summary"></div>
        <button type="button" class="cart-checkout-btn" id="cart-checkout-btn">AFREKENEN</button>
      </div>`;

    sidebar.dataset.cartReady = '1';
    document.getElementById('cart-coupon-btn')?.addEventListener('click', () => {
      alert('Couponcodes komen binnenkort beschikbaar.');
    });
    document.getElementById('cart-checkout-btn')?.addEventListener('click', () => openCheckout());
  }

  function updateLoginStrip() {
    const strip = document.getElementById('cart-login-strip');
    if (!strip) return;
    const loggedIn = typeof AuthUI !== 'undefined' && AuthUI.canCheckout();
    if (loggedIn) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    strip.innerHTML = `
      <p>Log in met <strong>Discord</strong> en <strong>FiveM</strong> om af te rekenen.</p>
      <button type="button" class="cart-login-strip-btn" data-cart-open-login>Inloggen</button>`;
    strip.querySelector('[data-cart-open-login]')?.addEventListener('click', () => AuthUI?.openModal());
  }

  function render() {
    ensureSidebarDOM();
    const items = load();
    const sidebar = document.getElementById('cart-sidebar');
    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    const summary = document.getElementById('cart-summary');
    const { eur, coins, count } = totals();

    sidebar?.classList.toggle('cart-has-items', items.length > 0);

    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = count > 0 ? String(count) : '';
      badge.hidden = count === 0;
    });

    updateLoginStrip();

    if (!items.length) {
      if (body) body.innerHTML = '';
      if (footer) footer.hidden = true;
      return;
    }

    if (footer) footer.hidden = false;

    if (body) {
      body.innerHTML = items
        .map((line) => {
          const key = lineKey(line);
          return `
        <article class="cart-item-card" data-line="${escapeHtml(key)}">
          <button type="button" class="cart-item-remove" data-cart-remove="${escapeHtml(key)}" aria-label="Verwijderen">${TRASH_ICON}</button>
          <h3 class="cart-item-name">${escapeHtml(line.name)}</h3>
          <p class="cart-item-price">${escapeHtml(displayPrice(line))}</p>
          <div class="cart-item-qty">
            <button type="button" class="cart-qty-btn" data-qty-minus="${escapeHtml(key)}" aria-label="Minder">−</button>
            <span class="cart-qty-val">${line.qty || 1}</span>
            <button type="button" class="cart-qty-btn" data-qty-plus="${escapeHtml(key)}" aria-label="Meer">+</button>
          </div>
        </article>`;
        })
        .join('');

      body.querySelectorAll('[data-cart-remove]').forEach((btn) => {
        btn.addEventListener('click', () => remove(btn.dataset.cartRemove));
      });
      body.querySelectorAll('[data-qty-minus]').forEach((btn) => {
        const line = items.find((c) => lineKey(c) === btn.dataset.qtyMinus);
        btn.addEventListener('click', () => setQty(btn.dataset.qtyMinus, (line?.qty || 1) - 1));
      });
      body.querySelectorAll('[data-qty-plus]').forEach((btn) => {
        const line = items.find((c) => lineKey(c) === btn.dataset.qtyPlus);
        btn.addEventListener('click', () => setQty(btn.dataset.qtyPlus, (line?.qty || 1) + 1));
      });
    }

    if (summary) {
      let html = '';
      if (eur > 0) {
        html += `<div class="cart-summary-row"><span>Subtotaal (webshop)</span><span>${formatEur(eur)}</span></div>`;
        html += `<div class="cart-summary-row cart-summary-total"><span>Totaal</span><span class="cart-summary-green">${formatEur(eur)}</span></div>`;
      }
      if (coins > 0) {
        html += `<div class="cart-summary-row"><span>Ingame (coins)</span><span>${formatCoins(coins)} coins</span></div>`;
        html += `<div class="cart-summary-row cart-summary-total"><span>Totaal coins</span><span class="cart-summary-green">${formatCoins(coins)} coins</span></div>`;
      }
      summary.innerHTML = html;
    }
  }

  function ensurePageDOM() {
    if (!document.getElementById('cart-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'cart-overlay';
      overlay.className = 'cart-overlay';
      overlay.setAttribute('data-cart-close', '');
      document.body.appendChild(overlay);
    }
    if (!document.getElementById('cart-sidebar')) {
      const sidebar = document.createElement('aside');
      sidebar.id = 'cart-sidebar';
      sidebar.className = 'cart-sidebar';
      document.body.appendChild(sidebar);
    }
  }

  function openSidebar() {
    ensurePageDOM();
    ensureSidebarDOM();
    render();
    document.getElementById('cart-overlay')?.classList.add('open');
    document.getElementById('cart-sidebar')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-sidebar')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  let listenersBound = false;

  function setupListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-open]')) {
        e.preventDefault();
        e.stopPropagation();
        openSidebar();
        return;
      }
      if (e.target.closest('[data-cart-close]')) {
        e.preventDefault();
        closeSidebar();
      }
    });
  }

  function openCheckout() {
    const items = load();
    if (!items.length) return;

    if (!AuthUI?.canCheckout()) {
      AuthUI.openModal();
      return;
    }

    const ingame = items.filter((i) => i.type === 'ingame');
    const eurItems = items.filter((i) => i.type !== 'ingame');
    const { coins, eur } = totals();

    let modal = document.getElementById('checkout-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'checkout-modal';
      modal.className = 'checkout-modal';
      modal.innerHTML = `
        <div class="checkout-backdrop" data-checkout-close></div>
        <div class="checkout-box">
          <button type="button" class="icon-btn checkout-close" data-checkout-close aria-label="Sluiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <h2>Checkout</h2>
          <div id="checkout-summary"></div>
          <p id="checkout-balance" class="checkout-balance"></p>
          <p id="checkout-error" class="checkout-error" hidden></p>
          <button type="button" class="cart-checkout-btn" id="checkout-confirm">BEVESTIGEN</button>
          <p class="checkout-hint" id="checkout-hint"></p>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-checkout-close]').forEach((el) => {
        el.addEventListener('click', () => modal.classList.remove('open'));
      });
      document.getElementById('checkout-confirm')?.addEventListener('click', () => confirmCheckout());
    }

    const summary = document.getElementById('checkout-summary');
    const hint = document.getElementById('checkout-hint');
    const errEl = document.getElementById('checkout-error');
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = '';
    }

    if (summary) {
      summary.innerHTML = items
        .map(
          (l) =>
            `<div class="checkout-line"><span>${escapeHtml(l.name)} × ${l.qty || 1}</span><span>${escapeHtml(l.type === 'ingame' ? `${formatCoins(lineTotalCoins(l))} coins` : formatEur(lineTotalEur(l)))}</span></div>`
        )
        .join('');
    }

    const balanceEl = document.getElementById('checkout-balance');
    if (balanceEl && ingame.length && typeof PlayerWallets !== 'undefined') {
      balanceEl.textContent = `Saldo: ${PlayerWallets.formatBalance(PlayerWallets.getBalance())} coins · Nodig: ${formatCoins(coins)} coins`;
      balanceEl.hidden = false;
    } else if (balanceEl) {
      balanceEl.hidden = true;
    }

    if (hint) {
      let hints = [];
      if (ingame.length) hints.push('Ingame items: betaal met coins, daarna <code>/claimproduct</code> op de server.');
      if (eurItems.length) hints.push('Webshop pakketten: betaling via Tebex (koppel je Tebex-winkel).');
      hint.innerHTML = hints.join('<br>');
    }

    modal.classList.add('open');
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-sidebar')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function confirmCheckout() {
    const btn = document.getElementById('checkout-confirm');
    const errEl = document.getElementById('checkout-error');
    const items = load();
    const ingame = items.filter((i) => i.type === 'ingame');
    const eurItems = items.filter((i) => i.type !== 'ingame');

    const discord = DiscordAuth?.getStoredUser();
    const cfx = CfxAuth?.getStored();
    if (!discord?.id || !cfx?.id) {
      if (errEl) {
        errEl.textContent = 'Log in met Discord én FiveM';
        errEl.hidden = false;
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Bezig…';
    }

    if (eurItems.length && !ingame.length) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'BEVESTIGEN';
      }
      alert(
        `Webshop totaal: ${formatEur(totals().eur)}\n\nKoppel Tebex voor echte betalingen. Items staan in je winkelwagen.`
      );
      return;
    }

    if (ingame.length) {
      const localBalance =
        typeof PlayerWallets !== 'undefined' ? PlayerWallets.getBalance() : 0;

      let result;
      if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
        const prep = await StoreBridge.prepareCheckout(discord, cfx);
        const payload = {
          discordId: discord.id,
          fivemId: cfx.id,
          discordUsername: discord.username,
          cfxUsername: cfx.username,
          balance: localBalance,
          catalog: prep?.catalog,
          items: ingame.map((l) => ({
            id: l.id,
            qty: l.qty || 1,
            name: l.name,
            coins: l.priceCoins,
            cat: l.cat,
          })),
        };
        result = await StoreBridge.checkout(payload);
      } else {
        result = {
          ok: false,
          error: 'Bridge API staat uit — open terminal: cd api → npm start',
        };
      }

      if (!result.ok) {
        if (errEl) {
          errEl.textContent = result.error || 'Checkout mislukt';
          errEl.hidden = false;
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'BEVESTIGEN';
        }
        return;
      }

      const keysToRemove = new Set(ingame.map((i) => lineKey(i)));
      const remaining = items.filter((i) => !keysToRemove.has(lineKey(i)));
      save(remaining);

      if (typeof StoreBridge !== 'undefined') await StoreBridge.syncPlayerFromAuth();
      if (typeof PlayerWallets !== 'undefined') PlayerWallets.updateBalanceUI();

      document.getElementById('checkout-modal')?.classList.remove('open');

      let msg = result.message || 'Ingame aankoop gelukt! Gebruik /claimproduct in-game.';
      if (eurItems.length) {
        msg += `\n\nWebshop (${formatEur(totals().eur)}): nog te betalen via Tebex.`;
      }
      alert(msg);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'BEVESTIGEN';
    }
  }

  function bindAddButtons() {
    document.addEventListener('click', (e) => {
      const coinBtn = e.target.closest('[data-add-coin]');
      if (coinBtn) {
        e.preventDefault();
        Cart.add({
          type: 'coin',
          id: `coin-${coinBtn.dataset.addCoin}`,
          name: `${coinBtn.dataset.addCoin} coins`,
          priceEur: Number(coinBtn.dataset.price),
          image:
            (typeof GRPConfig !== 'undefined' && GRPConfig.store?.coinImage) ||
            (typeof GRPConfig !== 'undefined' && GRPConfig.brand?.logo) || 'assets/urp-logo.png',
        });
        return;
      }

      const storeBtn = e.target.closest('[data-add-store]');
      if (storeBtn) {
        e.preventDefault();
        const type = storeBtn.dataset.storeType || 'eur';
        const name = storeBtn.dataset.storeName || 'Product';
        const price = Number(storeBtn.dataset.storePrice) || 0;
        const image = storeBtn.dataset.storeImage || '';
        if (type === 'coin') {
          Cart.add({
            type: 'coin',
            id: storeBtn.dataset.addStore || `coin-${storeBtn.dataset.coinAmount}`,
            name: name,
            priceEur: price,
            image: image || (GRPConfig?.store?.coinImage) || 'assets/urp-logo.png',
          });
        } else if (type === 'staff') {
          Cart.add({
            type: 'staff',
            id: storeBtn.dataset.addStore,
            name: name,
            priceEur: price,
            image: image,
          });
        } else {
          Cart.add({
            type: 'eur',
            id: storeBtn.dataset.addStore,
            name: name,
            priceEur: price,
            image: image,
          });
        }
        return;
      }

      const staffBtn = e.target.closest('[data-add-staff]');
      if (staffBtn) {
        e.preventDefault();
        const data = typeof SiteData !== 'undefined' ? SiteData.get() : { staffPackages: [] };
        const pkg = data.staffPackages?.find((p) => p.id === staffBtn.dataset.addStaff);
        if (pkg) {
          Cart.add({
            type: 'staff',
            id: pkg.id,
            name: pkg.name,
            priceEur: pkg.priceNew,
            image: pkg.image,
          });
        }
        return;
      }

      const pkgCard = e.target.closest('[data-add-package]');
      if (pkgCard) {
        e.preventDefault();
        const data = typeof SiteData !== 'undefined' ? SiteData.get() : { staffPackages: [] };
        const pkg = data.staffPackages?.find((p) => p.id === pkgCard.dataset.addPackage);
        if (pkg) {
          Cart.add({
            type: 'staff',
            id: pkg.id,
            name: pkg.name,
            priceEur: pkg.priceNew,
            image: pkg.image,
          });
        }
      }
    });
  }

  function init() {
    ensurePageDOM();
    ensureSidebarDOM();
    setupListeners();
    render();
    bindAddButtons();
    document.addEventListener('grp-auth-updated', () => {
      updateLoginStrip();
      render();
    });
    document.addEventListener('grp-cart-updated', render);
  }

  return {
    init,
    add,
    remove,
    clear,
    load,
    render,
    openSidebar,
    closeSidebar,
    openCheckout,
    totals,
    formatEur,
    setupListeners,
  };
})();

/** Alias voor oude code */
const IngameCart = Cart;
