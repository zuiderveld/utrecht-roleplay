/**
 * Verbinding met GRP Store Bridge API (coins + ingame catalog ↔ FiveM)
 */
const StoreBridge = (() => {
  function cfg() {
    return typeof GRPConfig !== 'undefined' && GRPConfig.bridge ? GRPConfig.bridge : {};
  }

  function enabled() {
    return !!cfg().enabled;
  }

  function baseUrl() {
    const url = cfg().apiUrl;
    if (url === '' || url == null) return '';
    return String(url || 'http://127.0.0.1:3847').replace(/\/$/, '');
  }

  function headers(withKey = false) {
    const h = { 'Content-Type': 'application/json' };
    if (withKey && cfg().apiKey) h['X-Api-Key'] = cfg().apiKey;
    return h;
  }

  async function request(path, options = {}) {
    if (!enabled()) return { ok: false, offline: true };
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        ...options,
        headers: { ...headers(options.useKey), ...(options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let err = data.error;
        if (!err) {
          if (res.status === 404) {
            err =
              'Checkout niet gevonden — herstart de bridge API (cd api → npm start) en probeer opnieuw.';
          } else if (res.status === 0) {
            err = 'Geen verbinding met bridge API — start: cd api && npm start';
          } else {
            err = res.statusText || `Fout ${res.status}`;
          }
        }
        return { ok: false, error: err, status: res.status };
      }
      return data;
    } catch (e) {
      const isLocal =
        typeof location !== 'undefined' &&
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      const hint = isLocal
        ? 'Start lokaal: cd api → npm start'
        : 'Controleer /api/health op je site en Vercel env GRP_BRIDGE_API_KEY.';
      return {
        ok: false,
        offline: true,
        error: `Bridge API niet bereikbaar — ${hint} (${e.message || e})`,
      };
    }
  }

  async function registerPlayer(payload) {
    return request('/api/player/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function fetchBalance({ fivemId, discordId, license }) {
    const q = new URLSearchParams();
    if (fivemId) q.set('fivemId', fivemId);
    if (discordId) q.set('discordId', discordId);
    if (license) q.set('license', license);
    return request(`/api/player/balance?${q}`);
  }

  async function setBalance({ fivemId, discordId, license, balance }) {
    return request('/api/player/balance', {
      method: 'POST',
      useKey: true,
      body: JSON.stringify({ fivemId, discordId, license, balance }),
    });
  }

  async function pushCatalog(catalog) {
    return request('/api/catalog', {
      method: 'PUT',
      useKey: true,
      body: JSON.stringify({ catalog }),
    });
  }

  async function pullCatalog() {
    return request('/api/catalog');
  }

  async function syncPlayerFromAuth() {
    const discord = typeof DiscordAuth !== 'undefined' ? DiscordAuth.getStoredUser() : null;
    const cfx = typeof CfxAuth !== 'undefined' ? CfxAuth.getStored() : null;
    if (!discord?.id || !cfx?.id) return null;

    await registerPlayer({
      discordId: discord.id,
      discordUsername: discord.username,
      fivemId: cfx.id,
      cfxUsername: cfx.username,
    });

    const bal = await fetchBalance({ fivemId: cfx.id, discordId: discord.id });
    if (bal.ok && typeof SiteData !== 'undefined') {
      const id = SiteData.makePlayerId(discord.id, cfx.id);
      const data = SiteData.get();
      let player = data.playerWallets.find((p) => p.id === id);
      if (!player) {
        player = SiteData.upsertPlayer({
          discordId: discord.id,
          discordUsername: discord.username,
          cfxId: cfx.id,
          cfxUsername: cfx.username,
        });
      } else if (bal.found) {
        player.balance = bal.balance;
        SiteData.save(data);
      }
      return bal.balance ?? player?.balance ?? 0;
    }
    return null;
  }

  async function pushPlayerBalance(player) {
    if (!player) return { ok: false };
    return setBalance({
      fivemId: player.cfxId,
      discordId: player.discordId,
      license: player.license,
      balance: player.balance,
    });
  }

  async function pushSiteCatalog() {
    if (typeof SiteData === 'undefined' || !SiteData.getIngameStore) return { ok: false };
    const catalog = SiteData.getIngameStore();
    return pushCatalog(catalog);
  }

  async function prepareCheckout(discord, cfx) {
    const localBalance =
      typeof PlayerWallets !== 'undefined' ? PlayerWallets.getBalance() : 0;
    const catalog =
      typeof SiteData !== 'undefined' && SiteData.getIngameStore
        ? SiteData.getIngameStore()
        : null;

    await registerPlayer({
      discordId: discord.id,
      discordUsername: discord.username,
      fivemId: cfx.id,
      cfxUsername: cfx.username,
    });

    if (localBalance > 0 && cfg().apiKey) {
      await setBalance({
        discordId: discord.id,
        fivemId: cfx.id,
        balance: localBalance,
      });
    }

    return { localBalance, catalog };
  }

  async function checkout(payload) {
    return request('/api/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  function init() {
    if (!enabled()) return;
    document.addEventListener('grp-auth-updated', () => {
      syncPlayerFromAuth().then(() => {
        if (typeof PlayerWallets !== 'undefined') PlayerWallets.updateBalanceUI();
      });
    });
    syncPlayerFromAuth();
  }

  return {
    enabled,
    registerPlayer,
    fetchBalance,
    setBalance,
    pushCatalog,
    pullCatalog,
    syncPlayerFromAuth,
    pushPlayerBalance,
    pushSiteCatalog,
    prepareCheckout,
    checkout,
    init,
  };
})();
