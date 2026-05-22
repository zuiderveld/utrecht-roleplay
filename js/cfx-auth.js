/** CFX / FiveM account koppelen (Tebex ident → Cfx.re login) */
const CfxAuth = (() => {
  const KEY = 'grp_cfx_user';
  const RETURN_PAGE_KEY = 'grp_cfx_return_page';

  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  function isLocalDev() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }

  function getOrigin() {
    if (isFileProtocol()) return null;
    return window.location.origin;
  }

  function identAllowedHere() {
    if (isFileProtocol()) return false;
    if (isLocalDev() && GRPConfig.cfx?.allowIdentOnLocalhost === false) return false;
    return true;
  }

  function getLocalDevMessage() {
    return (
      'FiveM-login via Tebex werkt niet op localhost — Tebex stuurt je account niet terug naar http://localhost. ' +
      'Vul hieronder je Cfx.re-gebruikersnaam in (rechtsboven in de FiveM launcher). ' +
      'Op de live website (echt domein + HTTPS) werkt de knop "Inloggen via FiveM" wel.'
    );
  }

  /** Pagina waar de gebruiker na login terugkomt (zelfde venster) */
  function getRedirectReturn() {
    const url = new URL(window.location.href);
    stripAuthParams(url.searchParams);
    return url.toString();
  }

  /** Dedicated callback (popup of fallback) */
  function getCallbackUrl() {
    const origin = getOrigin();
    if (!origin) return null;
    const base = (GRPConfig.cfx?.callbackPath || '/cfx-callback.html').replace(/^\//, '');
    return `${origin}/${base}`;
  }

  function stripAuthParams(params) {
    [
      'fivem',
      'ign',
      'username',
      'cfx',
      'identifier',
      'openid',
      'name',
      'sub',
      'id',
      'license',
      'token',
      'code',
      'state',
    ].forEach((k) => params.delete(k));
  }

  function parseParams(searchOrHash) {
    const raw = (searchOrHash || '').replace(/^[?#]/, '');
    if (!raw) return new URLSearchParams();
    return new URLSearchParams(raw);
  }

  function extractUserFromParams(params) {
    const id =
      params.get('fivem') ||
      params.get('cfx') ||
      params.get('identifier') ||
      params.get('license') ||
      params.get('sub') ||
      params.get('id') ||
      params.get('ign') ||
      params.get('username') ||
      params.get('name') ||
      params.get('openid');

    if (!id?.trim()) return null;

    const username =
      params.get('username') ||
      params.get('ign') ||
      params.get('name') ||
      id;

    return {
      id: decodeURIComponent(id.trim()),
      username: decodeURIComponent(username.trim()),
      linkedAt: Date.now(),
    };
  }

  function extractUserFromUrl(href) {
    const url = new URL(href);
    let user = extractUserFromParams(url.searchParams);
    if (user) return user;

    user = extractUserFromParams(parseParams(url.hash));
    if (user) return user;

    try {
      const hash = url.hash.replace(/^#/, '');
      if (hash.startsWith('{')) {
        const data = JSON.parse(decodeURIComponent(hash));
        const name = data.username || data.ign || data.name || data.identifier;
        if (name) {
          return {
            id: String(name),
            username: String(data.username || data.ign || name),
            linkedAt: Date.now(),
          };
        }
      }
    } catch {
      /* geen JSON hash */
    }

    return null;
  }

  function getStored() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function save(user) {
    localStorage.setItem(KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('grp-cfx-linked', { detail: user }));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function isLinked() {
    return !!getStored()?.id;
  }

  function connectUrl(returnUrl) {
    const base = GRPConfig.cfx?.identUrl || 'https://ident.tebex.io/fivem';
    const ret = encodeURIComponent(returnUrl || getCallbackUrl() || getRedirectReturn());
    return `${base}?return=${ret}`;
  }

  function rememberReturnPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    sessionStorage.setItem(RETURN_PAGE_KEY, path + window.location.search);
  }

  function cleanUrl() {
    const url = new URL(window.location.href);
    stripAuthParams(url.searchParams);
    const hashParams = parseParams(url.hash);
    const hadHashAuth = !!extractUserFromParams(hashParams);
    if (hadHashAuth) url.hash = '';
    const clean = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', clean || url.pathname);
  }

  function handleCallback() {
    const user = extractUserFromUrl(window.location.href);
    if (!user) return false;

    save(user);
    cleanUrl();
    return true;
  }

  function linkManual(username) {
    const name = String(username || '').trim();
    if (!name) return { ok: false, error: 'Vul je Cfx.re gebruikersnaam in.' };

    save({
      id: name,
      username: name,
      linkedAt: Date.now(),
      manual: true,
    });
    return { ok: true };
  }

  /**
   * Start Tebex → Cfx.re login (alleen op live domein).
   * Lokaal: gebruik handmatig koppelen.
   */
  function startLogin() {
    if (isFileProtocol()) {
      return {
        ok: false,
        error:
          'FiveM-login werkt niet via een los HTML-bestand. Start een lokale server (bijv. npx serve) of vul je gebruikersnaam handmatig in.',
        needManual: true,
      };
    }

    if (!identAllowedHere()) {
      return {
        ok: false,
        needManual: true,
        error: getLocalDevMessage(),
      };
    }

    const callback = getCallbackUrl();
    if (!callback) {
      return { ok: false, error: 'Geen geldige callback-URL.', needManual: true };
    }

    rememberReturnPage();
    const url = connectUrl(callback);

    const w = window.open(
      url,
      'grp_cfx_login',
      'width=520,height=720,scrollbars=yes,resizable=yes'
    );

    if (!w || w.closed) {
      window.location.href = connectUrl(getRedirectReturn());
      return { ok: true, mode: 'redirect' };
    }

    return { ok: true, mode: 'popup' };
  }

  function init() {
    handleCallback();
    window.addEventListener('message', (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'grp-cfx-linked') return;
      if (e.data.user) save(e.data.user);
      if (typeof AuthUI !== 'undefined') AuthUI.update();
    });
  }

  return {
    init,
    getStored,
    save,
    clear,
    isLinked,
    connectUrl,
    getCallbackUrl,
    getRedirectReturn,
    manualLink: linkManual,
    linkManual,
    startLogin,
    handleCallback,
    isFileProtocol,
    isLocalDev,
    identAllowedHere,
    getLocalDevMessage,
  };
})();
