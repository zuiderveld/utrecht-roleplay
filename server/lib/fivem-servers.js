const fs = require('fs');
const path = require('path');
const { checkFivem } = require('./status-core');

const ROOT = path.join(__dirname, '..', '..');

const DEFAULT_LIST = {
  servers: [
    {
      id: 'utrecht',
      name: 'Utrecht Roleplay',
      description: 'Professionele Nederlandse FiveM roleplay — realisme, structuur en kwaliteit.',
      host: '45.116.104.215',
      port: 30120,
      tags: ['roleplay', 'nl', 'esx', 'realism'],
      locale: 'nl',
      logo: 'assets/images/logo.png',
      featured: true,
    },
  ],
};

function readJson(relPath, fallback) {
  const candidates = [path.join(process.cwd(), relPath), path.join(ROOT, relPath)];
  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      /* volgende */
    }
  }
  return fallback;
}

function loadServerConfigs() {
  const raw = readJson('data/fivem-servers.json', DEFAULT_LIST);
  const list = Array.isArray(raw.servers) ? raw.servers : DEFAULT_LIST.servers;
  return list
    .map((s, i) => ({
      id: (s.id || `srv-${i}`).toString().trim(),
      name: (s.name || 'FiveM Server').trim(),
      description: (s.description || '').trim(),
      host: (s.host || '').trim(),
      port: Number(s.port) || 30120,
      tags: Array.isArray(s.tags) ? s.tags.map((t) => String(t).toLowerCase()) : [],
      locale: (s.locale || 'nl').toLowerCase(),
      logo: s.logo || 'assets/images/logo.png',
      featured: !!s.featured,
      enabled: s.enabled !== false,
    }))
    .filter((s) => s.enabled && s.host);
}

async function checkConfiguredServer(cfg) {
  const live = await checkFivem({
    enabled: true,
    host: cfg.host,
    port: cfg.port,
    name: cfg.name,
  });
  return {
    id: cfg.id,
    name: cfg.name,
    description: cfg.description,
    tags: cfg.tags,
    locale: cfg.locale,
    logo: cfg.logo,
    featured: cfg.featured,
    status: live.status,
    clients: live.clients,
    maxClients: live.maxClients,
    hostname: live.hostname || cfg.name,
    host: cfg.host,
    port: cfg.port,
    connectUrl: live.connectUrl,
    mapname: live.mapname,
    latencyMs: live.latencyMs,
    error: live.error,
  };
}

async function getServersList() {
  const configs = loadServerConfigs();
  const servers = await Promise.all(configs.map(checkConfiguredServer));
  servers.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (b.clients || 0) - (a.clients || 0);
  });
  return {
    servers,
    checkedAt: new Date().toISOString(),
  };
}

function getPrimaryServerConfig() {
  const list = loadServerConfigs();
  return list.find((s) => s.featured) || list[0] || null;
}

module.exports = {
  loadServerConfigs,
  getServersList,
  getPrimaryServerConfig,
};
