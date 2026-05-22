/**
 * Express app — bridge API (Vercel serverless + lokaal)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { grantPurchaseRoles } = require('./discord');
const { loadState, saveState } = require('./state');

const API_KEY = process.env.GRP_BRIDGE_API_KEY || 'grp-bridge-change-me';

const WEBSITE_CAT_TO_FIVEM = {
  autos: 'vehicles',
  nieuw: 'vehicles',
  wapens: 'weapons',
  'vip-features': 'items',
  'vip-ranks': 'items',
  chip: 'items',
  season: 'items',
  loodsen: 'items',
  organisaties: 'packages',
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

function ensureOrders(state) {
  if (!state.orders) state.orders = {};
  return state.orders;
}

function createOrderId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function findCatalogItem(state, itemId) {
  const items = state.ingameCatalog?.items || [];
  return items.find((i) => String(i.id) === String(itemId));
}

function orderItemToFivem(item) {
  const converted = websiteItemToFivem(item);
  const category = item.fivemCategory || WEBSITE_CAT_TO_FIVEM[item.cat] || 'items';
  delete converted.websiteCat;
  return { category, item: converted };
}

function requireKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Ongeldige API key' });
  }
  next();
}

function findPlayer(state, { license, fivemId, discordId }) {
  const players = Object.values(state.players || {});
  return players.find(
    (p) =>
      (license && p.license === license) ||
      (fivemId && String(p.fivemId) === String(fivemId)) ||
      (discordId && String(p.discordId) === String(discordId))
  );
}

function upsertPlayer(state, data) {
  const existing = findPlayer(state, data);
  const id = existing?.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const player = {
    id,
    license: data.license || existing?.license || null,
    fivemId: data.fivemId != null ? String(data.fivemId) : existing?.fivemId || null,
    discordId: data.discordId || existing?.discordId || null,
    discordUsername: data.discordUsername || existing?.discordUsername || null,
    cfxUsername: data.cfxUsername || existing?.cfxUsername || null,
    balance: existing?.balance ?? 0,
    pendingFivemSync: existing?.pendingFivemSync || false,
    updatedAt: new Date().toISOString(),
  };
  if (!state.players) state.players = {};
  state.players[id] = player;
  return player;
}

function websiteItemToFivem(item) {
  const fivemCat = item.fivemCategory || WEBSITE_CAT_TO_FIVEM[item.cat] || 'items';
  const slug = (item.slug || item.name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40);

  const base = {
    name: item.name,
    price: Number(item.coins) || 0,
    description: item.desc || item.description || '',
    image: item.image || '',
    stock: item.stock != null ? Number(item.stock) : 10,
    featured: !!item.featured,
    websiteId: item.id || slug,
    websiteCat: item.cat,
  };

  if (fivemCat === 'vehicles' || fivemCat === 'helicopters') {
    return { ...base, model: item.model || slug };
  }
  if (fivemCat === 'weapons') {
    return {
      ...base,
      item: item.item || item.weapon || `WEAPON_${slug.toUpperCase()}`,
      ammo: item.ammo || 100,
    };
  }
  if (fivemCat === 'moneybags') {
    return { ...base, money: item.money || 1000000 };
  }
  if (fivemCat === 'packages') {
    return { ...base, contents: item.contents || [] };
  }
  return { ...base, item: item.item || slug, count: item.count || 1 };
}

function buildFivemCatalog(catalog) {
  const categories = catalog.categories || [];
  const items = catalog.items || [];
  const storeItems = {
    vehicles: [],
    helicopters: [],
    weapons: [],
    items: [],
    moneybags: [],
    packages: [],
  };

  const fivemCategories = [];
  const seen = new Set();

  categories.forEach((c) => {
    const fid = c.fivemCategory || WEBSITE_CAT_TO_FIVEM[c.id] || 'items';
    if (!seen.has(fid)) {
      seen.add(fid);
      const icons = {
        vehicles: 'car',
        helicopters: 'helicopter',
        weapons: 'gun',
        items: 'box',
        moneybags: 'money',
        packages: 'gift',
      };
      fivemCategories.push({
        id: fid,
        label: c.fivemLabel || c.label || fid,
        icon: icons[fid] || 'box',
      });
    }
  });

  items.forEach((item) => {
    const fid = item.fivemCategory || WEBSITE_CAT_TO_FIVEM[item.cat] || 'items';
    const converted = websiteItemToFivem(item);
    delete converted.websiteCat;
    if (storeItems[fid]) storeItems[fid].push(converted);
  });

  return { categories: fivemCategories, items: storeItems };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'grp-store-bridge',
    vercel: !!process.env.VERCEL,
  });
});

app.get('/api/catalog', (req, res) => {
  const state = loadState();
  res.json({
    ok: true,
    catalog: state.ingameCatalog || { categories: [], items: [] },
    version: state.catalogVersion || 0,
  });
});

app.put('/api/catalog', requireKey, (req, res) => {
  const state = loadState();
  const catalog = req.body?.catalog;
  if (!catalog?.items) {
    return res.status(400).json({ ok: false, error: 'catalog.items ontbreekt' });
  }
  state.ingameCatalog = catalog;
  state.catalogVersion = (state.catalogVersion || 0) + 1;
  state.lastCatalogPush = new Date().toISOString();
  saveState(state);
  res.json({ ok: true, version: state.catalogVersion, fivem: buildFivemCatalog(catalog) });
});

app.get('/api/fivem/catalog', requireKey, (req, res) => {
  const state = loadState();
  if (!state.ingameCatalog?.items?.length) {
    return res.json({ ok: true, version: state.catalogVersion || 0, categories: [], items: {} });
  }
  const fivem = buildFivemCatalog(state.ingameCatalog);
  res.json({
    ok: true,
    version: state.catalogVersion || 0,
    categories: fivem.categories,
    items: fivem.items,
  });
});

app.get('/api/fivem/player-balance', requireKey, (req, res) => {
  const state = loadState();
  const player = findPlayer(state, {
    license: req.query.license,
    fivemId: req.query.fivemId || req.query.fivem_id,
  });
  res.json({ ok: true, balance: player?.balance ?? 0, found: !!player });
});

app.post('/api/player/link-license', requireKey, (req, res) => {
  const state = loadState();
  const license = req.body?.license;
  const fivemId = req.body?.fivem_id || req.body?.fivemId;
  if (!license && !fivemId) {
    return res.status(400).json({ ok: false, error: 'license of fivemId vereist' });
  }
  let player = findPlayer(state, { license, fivemId });
  if (!player && (license || fivemId)) {
    player = upsertPlayer(state, { license, fivemId });
  }
  if (player) {
    if (license) player.license = license;
    if (fivemId) player.fivemId = String(fivemId);
    player.updatedAt = new Date().toISOString();
  }
  Object.values(ensureOrders(state)).forEach((o) => {
    if (o.status !== 'pending') return;
    if (fivemId && String(o.fivemId) === String(fivemId) && license && !o.license) {
      o.license = license;
    }
  });
  saveState(state);
  res.json({ ok: true, found: !!player, linked: !!license });
});

app.post('/api/player/register', (req, res) => {
  const state = loadState();
  const { discordId, discordUsername, fivemId, cfxUsername, license } = req.body || {};
  if (!discordId && !fivemId) {
    return res.status(400).json({ ok: false, error: 'discordId of fivemId vereist' });
  }
  const player = upsertPlayer(state, {
    discordId,
    discordUsername,
    fivemId,
    cfxUsername,
    license,
  });
  saveState(state);
  res.json({ ok: true, player: { balance: player.balance, id: player.id } });
});

app.get('/api/player/balance', (req, res) => {
  const state = loadState();
  const player = findPlayer(state, {
    license: req.query.license,
    fivemId: req.query.fivemId,
    discordId: req.query.discordId,
  });
  res.json({ ok: true, balance: player?.balance ?? 0, found: !!player });
});

app.post('/api/player/balance', requireKey, (req, res) => {
  const state = loadState();
  const { license, fivemId, discordId, balance, discordUsername, cfxUsername } = req.body || {};
  let player = findPlayer(state, { license, fivemId, discordId });
  if (!player && (discordId || fivemId)) {
    player = upsertPlayer(state, { discordId, fivemId, license, discordUsername, cfxUsername });
  }
  if (!player) {
    return res.status(404).json({ ok: false, error: 'Speler niet gevonden in bridge' });
  }
  player.balance = Math.max(0, Math.floor(Number(balance) || 0));
  player.pendingFivemSync = true;
  player.updatedAt = new Date().toISOString();
  saveState(state);
  res.json({ ok: true, balance: player.balance });
});

app.post('/api/fivem/coins', requireKey, (req, res) => {
  const state = loadState();
  const license = req.body?.license;
  const fivemId = req.body?.fivem_id || req.body?.fivemId;
  const coins = Math.max(0, Math.floor(Number(req.body?.coins) || 0));
  if (!license && !fivemId) {
    return res.status(400).json({ ok: false, error: 'license of fivem_id vereist' });
  }
  let player = findPlayer(state, { license, fivemId });
  if (!player) player = upsertPlayer(state, { license, fivemId });
  player.license = license || player.license;
  player.fivemId = fivemId != null ? String(fivemId) : player.fivemId;
  player.balance = coins;
  player.pendingFivemSync = false;
  player.updatedAt = new Date().toISOString();
  saveState(state);
  res.json({ ok: true, balance: player.balance });
});

app.get('/api/fivem/coin-deltas', requireKey, (req, res) => {
  const state = loadState();
  const deltas = Object.values(state.players || {})
    .filter((p) => p.pendingFivemSync && (p.license || p.fivemId))
    .map((p) => ({
      license: p.license,
      fivem_id: p.fivemId,
      coins: p.balance,
    }));
  res.json({ ok: true, deltas });
});

app.post('/api/fivem/coin-delta-ack', requireKey, (req, res) => {
  const state = loadState();
  const player = findPlayer(state, {
    license: req.body?.license,
    fivemId: req.body?.fivem_id || req.body?.fivemId,
  });
  if (player) {
    player.pendingFivemSync = false;
    saveState(state);
  }
  res.json({ ok: true });
});

app.post('/api/checkout', async (req, res) => {
  const state = loadState();
  const {
    discordId,
    fivemId,
    license,
    items,
    balance: bodyBalance,
    discordUsername,
    cfxUsername,
    catalog,
  } = req.body || {};

  if (!discordId || !fivemId) {
    return res.status(400).json({ ok: false, error: 'Log in met Discord én FiveM' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok: false, error: 'Winkelwagen is leeg' });
  }

  let player = findPlayer(state, { discordId, fivemId, license });
  if (!player) {
    player = upsertPlayer(state, {
      discordId,
      fivemId,
      license,
      discordUsername,
      cfxUsername,
    });
  }

  const websiteBalance = Math.max(0, Math.floor(Number(bodyBalance) || 0));
  if (websiteBalance > (player.balance || 0)) {
    player.balance = websiteBalance;
  }

  if (catalog?.items?.length && (!state.ingameCatalog?.items?.length || req.body.forceCatalog)) {
    state.ingameCatalog = catalog;
    state.catalogVersion = (state.catalogVersion || 0) + 1;
  }

  const orderItems = [];
  let totalCoins = 0;

  for (const line of items) {
    let catalogItem = findCatalogItem(state, line.id);
    if (!catalogItem && line.name != null && line.coins != null) {
      catalogItem = {
        id: line.id,
        name: line.name,
        coins: Number(line.coins),
        cat: line.cat || 'items',
      };
    }
    if (!catalogItem) {
      return res.status(400).json({ ok: false, error: `Product niet gevonden: ${line.id}` });
    }
    const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
    const unitPrice = Math.floor(Number(catalogItem.coins) || 0);
    totalCoins += unitPrice * qty;
    for (let q = 0; q < qty; q++) {
      orderItems.push({ ...catalogItem });
    }
  }

  if (player.balance < totalCoins) {
    return res.status(400).json({
      ok: false,
      error: `Onvoldoende coins (nodig: ${totalCoins}, saldo: ${player.balance})`,
    });
  }

  player.balance -= totalCoins;
  player.pendingFivemSync = true;
  player.updatedAt = new Date().toISOString();

  const orders = ensureOrders(state);
  const orderId = createOrderId();
  const fivemLines = orderItems.map(orderItemToFivem);

  orders[orderId] = {
    id: orderId,
    discordId: String(discordId),
    fivemId: String(fivemId),
    license: license || player.license || null,
    items: orderItems,
    fivemLines,
    totalCoins,
    status: 'pending',
    source: 'website',
    createdAt: new Date().toISOString(),
  };

  saveState(state);

  const roles = await grantPurchaseRoles(discordId, orderItems);

  res.json({
    ok: true,
    orderId,
    balance: player.balance,
    totalCoins,
    claimCommand: '/claimproduct',
    rolesGranted: roles.granted,
    rolesErrors: roles.errors,
    message:
      'Aankoop gelukt! Join de server en typ /claimproduct om je items te ontvangen.',
  });
});

app.post('/api/fivem/purchase-notify', requireKey, async (req, res) => {
  const state = loadState();
  const license = req.body?.license;
  const fivemId = req.body?.fivem_id || req.body?.fivemId;
  const item = req.body?.item;
  const player = findPlayer(state, { license, fivemId });
  const discordId = player?.discordId || req.body?.discordId;
  if (!discordId) {
    return res.json({
      ok: true,
      rolesSkipped: true,
      hint: 'Speler nog niet gekoppeld aan Discord op de website',
    });
  }
  const items = item ? [item] : [];
  const roles = await grantPurchaseRoles(discordId, items);
  res.json({ ok: true, rolesGranted: roles.granted, rolesErrors: roles.errors });
});

app.get('/api/fivem/pending-orders', requireKey, (req, res) => {
  const state = loadState();
  const license = req.query.license;
  const fivemId = req.query.fivemId || req.query.fivem_id;
  const orders = Object.values(ensureOrders(state)).filter((o) => {
    if (o.status !== 'pending') return false;
    if (license && o.license && o.license === license) return true;
    if (fivemId && o.fivemId && String(o.fivemId) === String(fivemId)) return true;
    return false;
  });
  res.json({
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      totalCoins: o.totalCoins,
      items: o.fivemLines || o.items.map(orderItemToFivem),
      createdAt: o.createdAt,
    })),
  });
});

app.post('/api/fivem/claim-order', requireKey, (req, res) => {
  const state = loadState();
  const orderId = req.body?.orderId;
  const license = req.body?.license;
  const order = ensureOrders(state)[orderId];
  if (!order) {
    return res.status(404).json({ ok: false, error: 'Order niet gevonden' });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ ok: false, error: 'Order al opgehaald' });
  }
  const fivemId = req.body?.fivem_id || req.body?.fivemId;
  if (license && order.license && order.license !== license) {
    return res.status(403).json({ ok: false, error: 'Geen toegang tot deze order' });
  }
  if (fivemId && order.fivemId && String(order.fivemId) !== String(fivemId)) {
    return res.status(403).json({ ok: false, error: 'Geen toegang tot deze order' });
  }
  order.status = 'claimed';
  order.claimedAt = new Date().toISOString();
  if (license) order.license = license;
  saveState(state);
  res.json({
    ok: true,
    items: order.fivemLines || order.items.map(orderItemToFivem),
  });
});

app.post('/api/import/site-data', requireKey, (req, res) => {
  const state = loadState();
  const wallets = req.body?.playerWallets || [];
  wallets.forEach((w) => {
    const p = upsertPlayer(state, {
      discordId: w.discordId,
      discordUsername: w.discordUsername,
      fivemId: w.cfxId,
      cfxUsername: w.cfxUsername,
      license: w.license,
    });
    p.balance = Math.max(0, Number(w.balance) || 0);
    p.pendingFivemSync = true;
  });
  if (req.body?.ingameCatalog) {
    state.ingameCatalog = req.body.ingameCatalog;
    state.catalogVersion = (state.catalogVersion || 0) + 1;
  }
  saveState(state);
  res.json({ ok: true, count: wallets.length });
});

module.exports = app;
