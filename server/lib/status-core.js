const fs = require('fs');
const path = require('path');

const CHECK_TIMEOUT_MS = 15000;
const ROOT = path.join(__dirname, '..', '..');

const DEFAULT_SITES = {
  sites: [
    {
      id: 'main',
      name: 'Hoofdwebsite',
      description: 'Utrecht Roleplay',
      url: 'https://www.utrechtroleplay.eu',
      checkPath: '/',
      link: 'https://www.utrechtroleplay.eu',
      icon: 'globe',
    },
    {
      id: 'overheid',
      name: 'Overheid portaal',
      description: 'Politie, KMar, Ambulance, Pechhulp',
      url: 'https://overheid.utrechtroleplay.eu',
      checkPath: '/api/maintenance',
      fallbackPath: '/',
      link: 'https://overheid.utrechtroleplay.eu/',
      icon: 'landmark',
    },
    {
      id: 'staff',
      name: 'Staff portaal',
      description: 'Staff dashboard',
      url: 'https://staff.utrechtroleplay.eu',
      checkPath: '/api/site-data',
      fallbackPath: '/',
      link: 'https://staff.utrechtroleplay.eu/',
      icon: 'shield',
    },
  ],
};

const DEFAULT_FIVEM = {
  enabled: true,
  host: '45.116.104.215',
  port: 30120,
  name: 'FiveM server',
};

function readJson(relPath, fallback) {
  const candidates = [
    path.join(process.cwd(), relPath),
    path.join(ROOT, relPath),
  ];
  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      /* volgende pad */
    }
  }
  return fallback;
}

function loadSites() {
  const raw = readJson('data/status-sites.json', DEFAULT_SITES);
  const sites = Array.isArray(raw.sites) ? raw.sites : DEFAULT_SITES.sites;
  return sites.map((site) => {
    const key = `STATUS_URL_${(site.id || '').toUpperCase().replace(/-/g, '_')}`;
    const override = process.env[key];
    if (override) return { ...site, url: override.replace(/\/$/, '') };
    return site;
  });
}

function loadFivemConfig() {
  const file = readJson('data/fivem.json', DEFAULT_FIVEM);
  const enabled = process.env.FIVEM_ENABLED !== 'false' && file.enabled !== false;
  const host = (process.env.FIVEM_HOST || file.host || '').trim();
  const port = Number(process.env.FIVEM_PORT || file.port || 30120);
  return {
    enabled: enabled && !!host,
    host,
    port: Number.isFinite(port) ? port : 30120,
    name: file.name || 'FiveM server',
  };
}

async function probeUrl(fullUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json, text/html;q=0.9' },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    let body = null;
    const up = res.status >= 200 && res.status < 400;
    if (up) {
      try {
        const text = await res.text();
        if (text) body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    return { up, latencyMs, httpStatus: res.status, body, error: null };
  } catch (err) {
    clearTimeout(timer);
    return {
      up: false,
      latencyMs: Date.now() - started,
      httpStatus: 0,
      body: null,
      error: err.name === 'AbortError' ? 'Timeout' : err.message || 'Onbereikbaar',
    };
  }
}

async function checkSite(site) {
  const base = (site.url || '').replace(/\/$/, '');
  if (!base) {
    return { id: site.id, name: site.name, status: 'unknown', error: 'Geen URL' };
  }
  const paths = [site.checkPath, site.fallbackPath].filter(Boolean);
  let last = null;
  for (const p of paths) {
    const usedPath = p.startsWith('/') ? p : `/${p}`;
    last = await probeUrl(base + usedPath);
    if (last.up) break;
  }
  const maintenance =
    site.id === 'overheid' && last?.body && typeof last.body.global === 'boolean'
      ? { global: !!last.body.global, diensten: last.body.diensten || null }
      : null;
  return {
    id: site.id,
    name: site.name,
    description: site.description || '',
    link: site.link || base,
    icon: site.icon || 'globe',
    status: last.up ? 'up' : 'down',
    latencyMs: last.latencyMs,
    error: last.up ? null : last.error || `HTTP ${last.httpStatus}`,
    maintenance,
  };
}

async function checkFivem(cfg) {
  if (!cfg.enabled) return { enabled: false };
  const base = `http://${cfg.host}:${cfg.port}`;
  const dynamicRes = await probeUrl(`${base}/dynamic.json`);
  const up = dynamicRes.up && dynamicRes.body;
  const dynamic = dynamicRes.body || {};
  const maxClients = parseInt(dynamic.sv_maxclients, 10) || 128;
  const clients = Number(dynamic.clients) || 0;
  return {
    enabled: true,
    status: up ? 'up' : 'down',
    name: cfg.name,
    latencyMs: dynamicRes.latencyMs || 0,
    host: cfg.host,
    port: cfg.port,
    connectUrl: `fivem://connect/${cfg.host}:${cfg.port}`,
    error: up ? null : dynamicRes.error || 'Offline',
    hostname: dynamic.hostname || 'Utrecht Roleplay',
    clients,
    maxClients,
    mapname: dynamic.mapname || null,
  };
}

function summarize(sites, fivem) {
  const down = sites.filter((s) => s.status === 'down').length;
  if (down > 0) return 'outage';
  if (fivem?.enabled && fivem.status === 'down') return 'degraded';
  return 'operational';
}

async function getFullStatus() {
  const [sites, fivem] = await Promise.all([
    Promise.all(loadSites().map(checkSite)),
    checkFivem(loadFivemConfig()),
  ]);
  const fivemOut = fivem.enabled ? fivem : null;
  return {
    overall: summarize(sites, fivem),
    checkedAt: new Date().toISOString(),
    sites,
    fivem: fivemOut,
    meta: {
      apiVersion: 3,
      discordReady: true,
      sitesConfigured: sites.length,
      fivemConfigured: !!fivem.enabled,
    },
  };
}

module.exports = { getFullStatus };
