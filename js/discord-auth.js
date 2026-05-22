/** Discord OAuth (PKCE) — sessie blijft bewaard in localStorage */
const DiscordAuth = (() => {
  const SESSION_KEY = 'grp_discord_session';
  const PKCE_KEY = 'grp_discord_pkce';

  function isLocalDev() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }

  function getRedirectUri() {
    if (isLocalDev() && GRPConfig.discord.devRedirectUri) {
      return GRPConfig.discord.devRedirectUri;
    }
    const host = window.location.hostname.replace(/^www\./, '');
    if (host === 'utrechtroleplay.eu') {
      const uri = GRPConfig.discord.redirectUri || 'https://www.utrechtroleplay.eu/';
      return uri.endsWith('/') ? uri : `${uri}/`;
    }
    if (GRPConfig.discord.useAutoRedirect) {
      const origin = window.location.origin.endsWith('/')
        ? window.location.origin.slice(0, -1)
        : window.location.origin;
      return `${origin}/`;
    }
    const uri = GRPConfig.discord.redirectUri || `${window.location.origin}/`;
    return uri.endsWith('/') ? uri : `${uri}/`;
  }

  function randomVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async function challengeFromVerifier(verifier) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return b64;
  }

  function savePkce(verifier, redirectUri) {
    localStorage.setItem(
      PKCE_KEY,
      JSON.stringify({ verifier, redirectUri, ts: Date.now() })
    );
  }

  function loadPkce() {
    try {
      const raw = localStorage.getItem(PKCE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > 10 * 60 * 1000) {
        localStorage.removeItem(PKCE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(token, user) {
    const session = {
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      expires_at: Date.now() + (token.expires_in || 604800) * 1000,
      user: {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar,
        email: user.email || null,
      },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(PKCE_KEY);
    return session.user;
  }

  function clearUser() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PKCE_KEY);
  }

  function getStoredUser() {
    return getSession()?.user || null;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function avatarUrl(user) {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
    }
    const disc = Number((BigInt(user.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${disc}.png`;
  }

  async function fetchDiscordUser(accessToken) {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
      client_id: GRPConfig.discord.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) return null;
    const token = await res.json();
    const user = await fetchDiscordUser(token.access_token);
    if (!user) return null;
    return saveSession(token, user);
  }

  async function restoreSession() {
    const session = getSession();
    if (!session?.access_token || !session.user) return null;

    if (Date.now() >= session.expires_at) {
      if (session.refresh_token) {
        const user = await refreshAccessToken(session.refresh_token);
        if (user) return user;
      }
      clearUser();
      return null;
    }

    try {
      const user = await fetchDiscordUser(session.access_token);
      if (user) {
        session.user = {
          id: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar,
          email: user.email || null,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session.user;
      }
    } catch {
      /* netwerk tijdelijk weg — toon opgeslagen sessie */
    }

    return session.user;
  }

  async function buildLoginUrl() {
    const redirectUri = getRedirectUri();
    const verifier = randomVerifier();
    savePkce(verifier, redirectUri);

    const challenge = await challengeFromVerifier(verifier);
    const params = new URLSearchParams({
      client_id: GRPConfig.discord.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: GRPConfig.discord.scopes,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    return `https://discord.com/api/oauth2/authorize?${params}`;
  }

  async function exchangeCode(code) {
    const pkce = loadPkce();
    if (!pkce?.verifier) {
      throw new Error(
        'Login sessie verlopen. Klik opnieuw op Inloggen (zelfde tabblad/website).'
      );
    }

    const body = new URLSearchParams({
      client_id: GRPConfig.discord.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: pkce.redirectUri,
      code_verifier: pkce.verifier,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      const msg = tokenData.error_description || tokenData.error || 'Token exchange mislukt';
      throw new Error(msg);
    }

    const user = await fetchDiscordUser(tokenData.access_token);
    if (!user) throw new Error('Gebruiker ophalen mislukt');

    return saveSession(tokenData, user);
  }

  function loginHtml() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg><span>Inloggen</span>`;
  }

  function loggedInHtml(user) {
    const name = escapeHtml(user.username);
    return `<img src="${avatarUrl(user)}" alt="" class="nav-user-avatar" width="22" height="22"><span class="nav-user-name">${name}</span><span class="nav-user-badge">Ingelogd</span><button type="button" class="nav-user-logout" data-discord-logout>Uitloggen</button>`;
  }

  function bindLoginEl(el) {
    el.onclick = async (e) => {
      e.preventDefault();
      try {
        window.location.href = await buildLoginUrl();
      } catch (err) {
        console.error(err);
        alert('Kon Discord login niet starten.');
      }
    };
  }

  function bindLogoutEl(el) {
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearUser();
      updateUI();
    };
  }

  function applyToElement(el, user) {
    const isFull = el.classList.contains('btn-discord-full');

    if (user) {
      el.classList.add('is-logged-in', 'nav-user-chip');
      if (!isFull) el.classList.remove('btn-discord');
      el.removeAttribute('href');
      el.setAttribute('aria-label', `Ingelogd als ${user.username}`);
      el.innerHTML = loggedInHtml(user);
      el.onclick = null;
    } else {
      el.classList.remove('is-logged-in', 'nav-user-chip');
      if (!isFull) el.classList.add('btn-discord');
      el.setAttribute('href', '#');
      el.setAttribute('aria-label', 'Inloggen met Discord');
      el.innerHTML = isFull
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg><span>Log in met Discord</span>`
        : loginHtml();
      bindLoginEl(el);
    }
  }

  function updateUI() {
    const user = getStoredUser();
    document.querySelectorAll('[data-discord-login]').forEach((el) => {
      applyToElement(el, user);
    });

    const mobileSlot = document.querySelector('[data-nav-auth-mobile]');
    if (mobileSlot) {
      if (user) {
        mobileSlot.innerHTML = `
          <div class="mobile-auth-user">
            <img src="${avatarUrl(user)}" alt="" width="28" height="28">
            <div>
              <span class="mobile-auth-name">${escapeHtml(user.username)}</span>
              <span class="mobile-auth-status">Ingelogd</span>
            </div>
          </div>
          <button type="button" class="btn-discord mobile-auth-logout" data-discord-logout>Uitloggen</button>`;
      } else {
        mobileSlot.innerHTML = `<a href="#" class="btn-discord btn-discord-block" data-discord-login>${loginHtml()}</a>`;
        const link = mobileSlot.querySelector('[data-discord-login]');
        if (link) bindLoginEl(link);
      }
    }

    document.querySelectorAll('[data-discord-logout]').forEach(bindLogoutEl);
  }

  function stripOAuthParams() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('state');
    const clean = url.pathname + (url.search || '') + url.hash;
    window.history.replaceState({}, '', clean);
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.warn('Discord login:', error, params.get('error_description'));
      stripOAuthParams();
      return;
    }
    if (!code) return;

    try {
      await exchangeCode(code);
      stripOAuthParams();
    } catch (err) {
      console.error('Discord login mislukt:', err);
      stripOAuthParams();
      const hint = isLocalDev()
        ? 'Gebruik http://localhost:3000/ en controleer of die redirect in het Discord Developer Portal staat.'
        : 'Zorg dat de redirect-URI in Discord overeenkomt met deze website.';
      alert(err.message || `Inloggen mislukt. ${hint}`);
    }
  }

  async function init() {
    await handleCallback();
    await restoreSession();
    updateUI();
  }

  return { init, updateUI, getStoredUser, clearUser, buildLoginUrl, restoreSession };
})();
