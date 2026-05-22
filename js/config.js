/** Server- en community-instellingen — Utrecht Roleplay */
const GRPConfig = {
  brand: {
    name: 'Utrecht Roleplay',
    shortName: 'URP',
    logo: 'assets/urp-logo.png',
    logoHero: 'assets/urp-logo-bg.png',
    favicon: 'assets/urp-logo.png',
  },
  fivem: {
    ip: '45.116.104.215',
    port: 30120,
    defaultMaxClients: 128,
    /** Optioneel: cfx.re join-code — sneller dan IP-proxy als de server in de FiveM-lijst staat */
    cfxJoinCode: '',
    get endpoint() {
      return `${this.ip}:${this.port}`;
    },
    get dynamicUrl() {
      return `http://${this.endpoint}/dynamic.json`;
    },
    get connectUrl() {
      return `fivem://connect/${this.endpoint}`;
    },
    get connectCommand() {
      return `connect ${this.ip}`;
    },
  },
  discord: {
    inviteUrl: 'https://discord.gg/TM5qxjSb',
    inviteCode: 'TM5qxjSb',
    clientId: '1426239537897672825',
    scopes: 'identify email',
    /**
     * Lokaal testen — exact zo in Discord Developer Portal → OAuth2 → Redirects:
     * http://localhost:3000/
     */
    devRedirectUri: 'http://localhost:3000/',
    /**
     * Productie — exact zo in Discord Developer Portal → OAuth2 → Redirects:
     * https://www.utrechtroleplay.eu/
     * (zelfde als authorize URL redirect_uri)
     */
    redirectUri: 'https://www.utrechtroleplay.eu/',
    /** utrechtroleplay.eu zonder www → redirect naar www (optioneel) */
    canonicalHost: 'www.utrechtroleplay.eu',
    /** true = redirect = huidige origin + / (alleen als die URL ook in Discord staat) */
    useAutoRedirect: false,
  },
  cfx: {
    /** Tebex FiveM ident → Cfx.re login (werkt op live HTTPS-domein, niet op localhost) */
    identUrl: 'https://ident.tebex.io/fivem',
    /** Pagina na FiveM-login (popup sluit hier) */
    callbackPath: '/cfx-callback.html',
    /**
     * Tebex stuurt accountgegevens meestal niet terug naar localhost.
     * Lokaal: handmatig Cfx.re-gebruikersnaam invullen. Live site: echte Tebex-knop.
     */
    allowIdentOnLocalhost: false,
  },
  store: {
    coinImage:
      'https://dunb17ur4ymx4.cloudfront.net/packages/images/8da1c3d7c257e709cc6ed7e29fd794d66e13ca7a.jpg',
  },
  /**
   * Bridge API — lokaal: npm start in map api/
   * Vercel/GitHub: zelfde domein (/api/...) via serverless in api/index.js
   */
  bridge: {
    /** Optioneel: ander domein voor API. Leeg = zelfde website (aanbevolen op Vercel). */
    productionApiUrl: '',
    apiKey: 'grp-bridge-change-me',
  },
};

/** Bridge-URL: localhost → :3847, live → zelfde origin (Vercel) */
(function applyBridgeConfig() {
  const b = GRPConfig.bridge;
  const host = typeof location !== 'undefined' ? location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (isLocal) {
    b.enabled = true;
    b.apiUrl = 'http://127.0.0.1:3847';
  } else {
    const custom = String(b.productionApiUrl || '').replace(/\/$/, '');
    b.apiUrl = custom;
    b.enabled = true;
  }
})();
