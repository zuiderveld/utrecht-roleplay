/** Login modal — FiveM (stap 1) + Discord (stap 2) zoals utrechtroleplay.eu */
const AuthUI = (() => {
  const LOGIN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>`;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function canCheckout() {
    return !!(DiscordAuth?.getStoredUser() && CfxAuth?.isLinked());
  }

  function getStatusText() {
    const discord = DiscordAuth?.getStoredUser();
    const cfx = CfxAuth?.getStored();
    if (discord && cfx) {
      return `${escapeHtml(cfx.username)} · ${escapeHtml(discord.username)}`;
    }
    if (cfx) return `FiveM: ${escapeHtml(cfx.username)}`;
    if (discord) return `Discord: ${escapeHtml(discord.username)}`;
    return 'Niet ingelogd';
  }

  function ensureModal() {
    if (document.getElementById('auth-login-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-login-overlay';
    overlay.className = 'auth-login-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="auth-login-modal" id="auth-login-modal" role="dialog" aria-labelledby="auth-login-title" aria-modal="true">
        <button type="button" class="auth-login-close" data-auth-close aria-label="Sluiten">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <h2 id="auth-login-title" class="auth-login-title">Inloggen</h2>
        <p class="auth-login-desc">Log in met FiveM én Discord om te winkelen.</p>
        <div class="auth-login-body" id="auth-login-body"></div>
        <div class="auth-login-footer">
          <div class="auth-login-footer-main">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span id="auth-login-status">Niet ingelogd</span>
          </div>
          <span id="auth-login-coins" class="auth-login-coins" hidden></span>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('[data-auth-close]')?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function buildModalBody() {
    const discord = DiscordAuth?.getStoredUser();
    const cfx = CfxAuth?.isLinked();
    const fileProto = CfxAuth?.isFileProtocol?.();
    const localDev = CfxAuth?.isLocalDev?.();
    const tebexHere = CfxAuth?.identAllowedHere?.() !== false;

    return `
      <div class="auth-login-step">
        <span class="auth-login-step-label">STAP 1 — FIVEM</span>
        <button type="button" class="auth-login-btn auth-login-btn--fivem ${cfx ? 'is-done' : ''}" data-auth-fivem ${cfx ? 'disabled' : ''} ${!tebexHere && !cfx ? 'data-fivem-manual-only' : ''}>
          ${LOGIN_ICON}
          <span data-fivem-btn-label>${cfx ? 'FiveM gekoppeld ✓' : tebexHere ? 'Inloggen via FiveM' : 'FiveM (lokaal: handmatig)'}</span>
        </button>
        <p class="auth-login-step-hint" id="auth-fivem-hint" ${cfx ? 'hidden' : ''}>
          ${
            fileProto
              ? 'Open de site via een lokale server (niet als los .html-bestand), of koppel handmatig hieronder.'
              : localDev && !tebexHere
                ? 'Op localhost stuurt Tebex geen account terug — vul hieronder je Cfx.re-gebruikersnaam in. Op de live site werkt de echte FiveM-knop.'
                : 'Opent Cfx.re login in een nieuw venster. Geen popup? Sta pop-ups toe of koppel handmatig.'
          }
        </p>
        ${
          cfx
            ? ''
            : `<div class="auth-fivem-manual" id="auth-fivem-manual">
          <label class="auth-fivem-manual-label" for="auth-fivem-username">Of handmatig (Cfx.re gebruikersnaam)</label>
          <div class="auth-fivem-manual-row">
            <input type="text" id="auth-fivem-username" placeholder="bijv. JouwNaam" autocomplete="username">
            <button type="button" class="auth-fivem-manual-btn" data-auth-fivem-manual>Koppelen</button>
          </div>
        </div>`
        }
        <p class="auth-login-feedback" id="auth-fivem-feedback" hidden></p>
      </div>
      <div class="auth-login-step">
        <span class="auth-login-step-label">STAP 2 — DISCORD</span>
        <button type="button" class="auth-login-btn auth-login-btn--discord ${discord ? 'is-done' : ''}" data-auth-discord ${discord ? 'disabled' : ''}>
          ${LOGIN_ICON}
          <span>${discord ? 'Discord gekoppeld ✓' : 'Inloggen via Discord'}</span>
        </button>
      </div>
      ${
        discord && cfx
          ? '<button type="button" class="auth-login-logout" data-auth-logout-all>Uitloggen van beide accounts</button>'
          : ''
      }`;
  }

  function bindModalActions() {
    const body = document.getElementById('auth-login-body');
    if (!body) return;

    body.querySelector('[data-auth-fivem]')?.addEventListener('click', () => {
      if (CfxAuth.isLinked()) return;
      const btn = body.querySelector('[data-auth-fivem]');
      const label = body.querySelector('[data-fivem-btn-label]');
      const feedback = document.getElementById('auth-fivem-feedback');

      if (btn?.dataset.fivemManualOnly) {
        document.getElementById('auth-fivem-username')?.focus();
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = CfxAuth.getLocalDevMessage?.() || 'Vul je Cfx.re-gebruikersnaam hieronder in.';
          feedback.className = 'auth-login-feedback is-info';
        }
        return;
      }

      if (label) label.textContent = 'Venster openen…';
      if (btn) btn.disabled = true;

      const result = CfxAuth.startLogin();

      if (!result.ok) {
        if (label) label.textContent = CfxAuth.identAllowedHere?.() ? 'Inloggen via FiveM' : 'FiveM (lokaal: handmatig)';
        if (btn) btn.disabled = false;
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = result.error || 'Kon FiveM-login niet starten.';
          feedback.className = result.needManual ? 'auth-login-feedback is-info' : 'auth-login-feedback is-error';
        }
        if (result.needManual) document.getElementById('auth-fivem-username')?.focus();
        return;
      }

      if (result.mode === 'popup') {
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent =
            'Log in bij Cfx.re in het popupvenster. Sluit je daarna nog niet — het venster sluit vanzelf.';
          feedback.className = 'auth-login-feedback is-info';
        }
        if (label) label.textContent = 'Wachten op FiveM…';

        const poll = setInterval(() => {
          if (CfxAuth.isLinked()) {
            clearInterval(poll);
            refreshModal();
            update();
            if (feedback) {
              feedback.textContent = 'FiveM gekoppeld ✓';
              feedback.className = 'auth-login-feedback is-success';
            }
          }
        }, 800);

        setTimeout(() => {
          clearInterval(poll);
          if (!CfxAuth.isLinked() && label) label.textContent = 'Inloggen via FiveM';
          if (btn && !CfxAuth.isLinked()) btn.disabled = false;
        }, 120000);
      }
    });

    body.querySelector('[data-auth-fivem-manual]')?.addEventListener('click', () => {
      const input = document.getElementById('auth-fivem-username');
      const feedback = document.getElementById('auth-fivem-feedback');
      const result = CfxAuth.linkManual(input?.value);

      if (!result.ok) {
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = result.error;
          feedback.className = 'auth-login-feedback is-error';
        }
        return;
      }
      if (input) input.value = '';
      refreshModal();
      update();
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'FiveM gekoppeld ✓';
        feedback.className = 'auth-login-feedback is-success';
      }
    });

    document.getElementById('auth-fivem-username')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        body.querySelector('[data-auth-fivem-manual]')?.click();
      }
    });

    body.querySelector('[data-auth-discord]')?.addEventListener('click', async () => {
      if (DiscordAuth.getStoredUser()) return;
      window.location.href = await DiscordAuth.buildLoginUrl();
    });

    body.querySelector('[data-auth-logout-all]')?.addEventListener('click', () => {
      DiscordAuth.clearUser();
      CfxAuth.clear();
      refreshModal();
      update();
    });
  }

  function refreshModal() {
    const body = document.getElementById('auth-login-body');
    const status = document.getElementById('auth-login-status');
    if (body) {
      body.innerHTML = buildModalBody();
      bindModalActions();
    }
    if (status) {
      status.textContent = getStatusText();
      status.classList.toggle('is-logged-in', canCheckout());
    }
  }

  function openModal() {
    ensureModal();
    refreshModal();
    const overlay = document.getElementById('auth-login-overlay');
    if (overlay) {
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const overlay = document.getElementById('auth-login-overlay');
    if (overlay) {
      overlay.hidden = true;
      document.body.style.overflow = '';
    }
  }

  const CART_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;

  function initNavSlot() {
    const slot = document.getElementById('nav-auth');
    if (!slot) return;

    const discord = DiscordAuth?.getStoredUser();
    const cfx = CfxAuth?.isLinked();
    const fullyLogged = discord && cfx;

    const navAvatar =
      discord?.avatar &&
      `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=20`;

    slot.className = 'nav-auth-wrap';
    slot.innerHTML = `
      <button type="button" class="btn-discord nav-auth-trigger" id="nav-auth-trigger">
        ${
          fullyLogged && navAvatar
            ? `<img src="${navAvatar}" alt="" class="nav-auth-avatar"><span>${escapeHtml(discord.username)}</span>`
            : `${LOGIN_ICON}<span>Inloggen</span>`
        }
      </button>
      <button type="button" class="icon-btn nav-cart-btn nav-cart-nav" data-cart-open aria-label="Winkelwagen">
        ${CART_ICON}
        <span class="nav-cart-badge" data-cart-count hidden></span>
      </button>`;

    document.getElementById('nav-auth-trigger')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  function updateCartGate() {
    if (typeof Cart !== 'undefined') Cart.render();
  }

  function updateMobileAuth() {
    const mobile = document.querySelector('[data-nav-auth-mobile]');
    if (!mobile) return;

    mobile.innerHTML = `
      <button type="button" class="btn-discord btn-discord-block" data-mobile-open-login>
        ${LOGIN_ICON}
        <span>Inloggen</span>
      </button>`;

    mobile.querySelector('[data-mobile-open-login]')?.addEventListener('click', () => {
      openModal();
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  }

  function update() {
    ensureModal();
    refreshModal();
    initNavSlot();
    updateMobileAuth();
    updateCartGate();
    if (typeof PlayerWallets !== 'undefined') {
      PlayerWallets.sync();
      PlayerWallets.updateBalanceUI();
    }
    document.dispatchEvent(new CustomEvent('grp-auth-updated'));
  }

  function init() {
    CfxAuth?.init();
    ensureModal();
    update();
    window.addEventListener('grp-cfx-linked', () => {
      refreshModal();
      update();
    });

    if (new URLSearchParams(location.search).get('login') === '1') {
      openModal();
    }
  }

  return { init, update, canCheckout, openModal, closeModal };
})();
