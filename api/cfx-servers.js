const { loadAllServers, queryServers } = require('../server/lib/cfx-stream');
const { getServersList } = require('../server/lib/fivem-servers');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = req.query || {};
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const perPage = Math.min(100, Math.max(10, parseInt(q.perPage, 10) || 40));
  const tags = q.tags ? String(q.tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [];

  try {
    await loadAllServers();

    const result = queryServers({
      search: q.q || q.search || '',
      locale: q.locale || '',
      tags,
      hideEmpty: q.hideEmpty === '1' || q.hideEmpty === 'true',
      game: q.game || 'fivem',
      page,
      perPage,
      sort: q.sort || 'players',
    });

    let featured = [];
    try {
      const ours = await getServersList();
      featured = (ours.servers || []).map((s) => ({
        ...s,
        featured: true,
        connectUrl: s.connectUrl || `fivem://connect/${s.host}:${s.port}`,
        cfxJoin: null,
      }));
    } catch {
      /* optioneel */
    }

    if (page === 1 && !q.q && !q.search && !tags.length && !q.locale) {
      const ids = new Set(featured.map((s) => s.id || s.host));
      result.servers = [
        ...featured,
        ...result.servers.filter((s) => !ids.has(s.endpoint)),
      ].slice(0, perPage);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.status(200).json({
      ...result,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({
      error: e.message || 'Kon FiveM serverlijst niet laden',
      hint: 'Eerste load duurt ~10–30 sec (hele Cfx-stream). Probeer opnieuw.',
    });
  }
};
