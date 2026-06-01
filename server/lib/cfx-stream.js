const STREAM_URL = 'https://frontend.cfx-services.net/api/servers/stream/';
const ICON_BASE = 'https://frontend.cfx-services.net/api/servers/icon';
const CACHE_MS = 5 * 60 * 1000;

let cache = { at: 0, servers: null, promise: null };

function cleanHostname(hostname) {
  return String(hostname || '')
    .replace(/\^[0-9]/g, '')
    .replace(/~[a-zA-Z]~/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, '')
    .trim();
}

function readVarint(data, pos) {
  let val = 0;
  let shift = 0;
  while (pos < data.length) {
    const b = data[pos++];
    val |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [val, pos];
}

function readLengthDelimited(data, pos) {
  const [len, p] = readVarint(data, pos);
  return [data.subarray(p, p + len), p + len];
}

function readString(data, pos) {
  const [bytes, newPos] = readLengthDelimited(data, pos);
  return [Buffer.from(bytes).toString('utf8'), newPos];
}

function parseVar(data) {
  let pos = 0;
  let key = '';
  let value = '';
  while (pos < data.length) {
    const tag = data[pos++];
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;
    if (wireType !== 2) break;
    const [str, np] = readString(data, pos);
    pos = np;
    if (fieldNum === 1) key = str;
    else if (fieldNum === 2) value = str;
  }
  return [key, value];
}

function parseServerData(data) {
  const vars = {};
  let maxClients = 0;
  let clients = 0;
  let hostname = '';
  let gametype = '';
  let mapname = '';
  let gamename = 'gta5';
  let upvotePower = 0;
  let iconVersion = 0;
  let isPrivate = false;

  let pos = 0;
  while (pos < data.length) {
    const tag = data[pos];
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;
    pos++;

    if (fieldNum === 0 || fieldNum > 30) break;

    if (wireType === 0) {
      const [val, np] = readVarint(data, pos);
      pos = np;
      if (fieldNum === 1) maxClients = val;
      else if (fieldNum === 2) clients = val;
      else if (fieldNum === 14) iconVersion = val;
      else if (fieldNum === 15) isPrivate = val !== 0;
      else if (fieldNum === 16) upvotePower = val;
    } else if (wireType === 2) {
      const [bytes, np] = readLengthDelimited(data, pos);
      pos = np;
      if (fieldNum === 4) hostname = Buffer.from(bytes).toString('utf8');
      else if (fieldNum === 5) gametype = Buffer.from(bytes).toString('utf8');
      else if (fieldNum === 6) mapname = Buffer.from(bytes).toString('utf8');
      else if (fieldNum === 12) {
        const [k, v] = parseVar(bytes);
        if (k) vars[k] = v;
      }
    } else if (wireType === 5) {
      pos += 4;
    } else if (wireType === 1) {
      pos += 8;
    } else {
      break;
    }
  }

  if (vars.gamename) gamename = vars.gamename;

  return {
    endpoint: '',
    hostname,
    clients,
    maxClients,
    gametype,
    mapname,
    gamename,
    vars,
    upvotePower,
    iconVersion,
    private: isPrivate,
  };
}

function parseEntry(buf, offset) {
  if (offset + 4 > buf.length) return null;
  const entryLen = buf.readUInt32LE(offset);
  offset += 4;
  if (entryLen === 0 || offset + entryLen > buf.length) return null;

  const entry = buf.subarray(offset, offset + entryLen);
  let pos = 0;
  pos++;
  const [endPoint, p1] = readString(entry, pos);
  pos = p1;
  pos++;
  const [dataBytes] = readLengthDelimited(entry, pos);
  const data = parseServerData(dataBytes);
  data.endpoint = endPoint;

  return { server: normalizeEntry(data), nextOffset: offset + entryLen };
}

function normalizeEntry(data) {
  const vars = data.vars || {};
  const displayName = vars.sv_projectName || vars.sv_projectDesc || data.hostname || '';
  const tags = (vars.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const locale = vars.locale || '';
  const iconVersion = data.iconVersion || 0;
  const id = data.endpoint;

  return {
    id,
    endpoint: id,
    hostname: cleanHostname(displayName || data.hostname),
    hostnameRaw: data.hostname,
    clients: data.clients || 0,
    maxClients: data.maxClients || 0,
    gametype: data.gametype || '',
    mapname: data.mapname || '',
    locale,
    localeRegion: extractRegion(locale),
    tags,
    gamename: data.gamename || 'gta5',
    upvotePower: data.upvotePower || 0,
    private: data.private,
    projectName: vars.sv_projectName || '',
    connectUrl: `https://cfx.re/join/${id}`,
    fivemConnect: `fivem://connect/cfx.re/join/${id}`,
    iconUrl: iconVersion ? `${ICON_BASE}/${id}/${iconVersion}.png` : '',
    status: 'up',
  };
}

function extractRegion(locale) {
  const parts = String(locale).split(/[-_]/);
  let region = (parts[1] || '').toUpperCase();
  if (region === 'UK') region = 'GB';
  return /^[A-Z]{2}$/.test(region) ? region : '';
}

function parseStreamBuffer(buf) {
  const servers = [];
  let offset = 0;
  while (offset < buf.length) {
    const result = parseEntry(buf, offset);
    if (!result) break;
    if (result.server.hostname) servers.push(result.server);
    offset = result.nextOffset;
  }
  return servers;
}

async function downloadStream() {
  const res = await fetch(STREAM_URL, {
    headers: { 'User-Agent': 'UtrechtRoleplay-Status/1.0' },
  });
  if (!res.ok) throw new Error(`CFX stream ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function loadAllServers() {
  if (cache.servers && Date.now() - cache.at < CACHE_MS) return cache.servers;
  if (cache.promise) return cache.promise;

  cache.promise = downloadStream()
    .then((buf) => {
      const servers = parseStreamBuffer(buf);
      cache.servers = servers;
      cache.at = Date.now();
      cache.promise = null;
      return servers;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

function matchesQuery(srv, q) {
  if (!q) return true;
  const hay = [
    srv.hostname,
    srv.projectName,
    srv.gametype,
    srv.mapname,
    srv.endpoint,
    srv.tags.join(' '),
    srv.locale,
  ]
    .join(' ')
    .toLowerCase();
  return hay.indexOf(q) !== -1;
}

function matchesTags(srv, tagFilters) {
  if (!tagFilters.length) return true;
  return tagFilters.some((t) => srv.tags.indexOf(t) !== -1 || srv.localeRegion === 'NL' && t === 'nl');
}

function queryServers(options) {
  const {
    search = '',
    locale = '',
    tags = [],
    hideEmpty = false,
    game = 'fivem',
    page = 1,
    perPage = 40,
    sort = 'players',
  } = options;

  let list = cache.servers || [];
  const q = search.toLowerCase().trim();
  const region = locale.toUpperCase();

  list = list.filter((s) => {
    if (game === 'fivem' && s.gamename && !s.gamename.includes('gta5')) return false;
    if (region && s.localeRegion !== region) return false;
    if (!matchesQuery(s, q)) return false;
    if (!matchesTags(s, tags)) return false;
    if (hideEmpty && s.clients < 1) return false;
    if (s.private) return false;
    return true;
  });

  if (sort === 'players') {
    list.sort((a, b) => b.clients - a.clients || b.maxClients - a.maxClients);
  } else if (sort === 'name') {
    list.sort((a, b) => a.hostname.localeCompare(b.hostname));
  }

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * perPage;

  return {
    servers: list.slice(start, start + perPage),
    meta: {
      page: p,
      perPage,
      total,
      pages,
      cachedAt: cache.at ? new Date(cache.at).toISOString() : null,
      source: 'cfx-stream',
    },
  };
}

module.exports = {
  loadAllServers,
  queryServers,
  getCacheInfo: () => ({ count: cache.servers?.length || 0, cachedAt: cache.at }),
};
