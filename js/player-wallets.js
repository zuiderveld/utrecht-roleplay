/** Speler coins — registratie bij login + saldo op de site */
const PlayerWallets = (() => {
  function getAuthPair() {
    const discord = typeof DiscordAuth !== 'undefined' ? DiscordAuth.getStoredUser() : null;
    const cfx = typeof CfxAuth !== 'undefined' ? CfxAuth.getStored() : null;
    if (!discord?.id || !cfx?.id) return null;
    return { discord, cfx };
  }

  async function sync() {
    const pair = getAuthPair();
    if (!pair || typeof SiteData === 'undefined') return null;
    const player = SiteData.upsertPlayer({
      discordId: pair.discord.id,
      discordUsername: pair.discord.username,
      cfxId: pair.cfx.id,
      cfxUsername: pair.cfx.username,
    });
    if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
      await StoreBridge.syncPlayerFromAuth();
    }
    return player;
  }

  function getCurrentPlayer() {
    const pair = getAuthPair();
    if (!pair || typeof SiteData === 'undefined') return null;
    const id = SiteData.makePlayerId(pair.discord.id, pair.cfx.id);
    return SiteData.getPlayerWallet(id);
  }

  function getBalance() {
    return getCurrentPlayer()?.balance ?? 0;
  }

  function formatBalance(n) {
    return new Intl.NumberFormat('nl-NL').format(Math.max(0, Number(n) || 0));
  }

  function coinIconSvg(size = 14) {
    const s = size;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 11h6M9 13h6"/></svg>`;
  }

  function renderBalanceHtml(balance, large = false) {
    const size = large ? 22 : 16;
    const label = large
      ? `<span class="coin-balance-text"><span class="coin-balance-label">Jouw saldo</span><strong>${formatBalance(balance)}</strong> <span class="coin-balance-unit">coins</span></span>`
      : `<span><strong>${formatBalance(balance)}</strong> coins</span>`;
    return `${coinIconSvg(size)}${label}`;
  }

  function updateBalanceUI() {
    const pair = getAuthPair();
    const balance = getBalance();
    const loggedIn = !!pair;

    document.querySelectorAll('[data-player-coin-balance]').forEach((el) => {
      if (!loggedIn) {
        el.hidden = true;
        el.classList.remove('is-visible');
        return;
      }
      el.hidden = false;
      el.classList.add('is-visible');
      const large = el.classList.contains('hero-coin-bar');
      el.innerHTML = renderBalanceHtml(balance, large);
      el.title = `Jouw saldo: ${formatBalance(balance)} coins`;
    });

    const modalStatus = document.getElementById('auth-login-coins');
    if (modalStatus) {
      if (loggedIn) {
        modalStatus.hidden = false;
        modalStatus.innerHTML = `Saldo: <strong>${formatBalance(balance)}</strong> coins`;
      } else {
        modalStatus.hidden = true;
      }
    }
  }

  function ensureBalanceSlots() {
    document.querySelectorAll('#nav-auth').forEach((slot) => {
      const parent = slot.parentElement;
      if (!parent || parent.querySelector('[data-player-coin-balance]')) return;
      const el = document.createElement('span');
      el.className = 'nav-coin-balance';
      el.dataset.playerCoinBalance = '';
      el.hidden = true;
      parent.insertBefore(el, slot);
    });
  }

  function init() {
    ensureBalanceSlots();
    sync().then(() => updateBalanceUI());
    if (typeof StoreBridge !== 'undefined') StoreBridge.init();
    document.addEventListener('grp-auth-updated', () => {
      sync().then(() => updateBalanceUI());
    });
    window.addEventListener('storage', (e) => {
      if (e.key === SiteData?.STORAGE_KEY) updateBalanceUI();
    });
  }

  return {
    init,
    sync,
    getCurrentPlayer,
    getBalance,
    formatBalance,
    updateBalanceUI,
  };
})();
