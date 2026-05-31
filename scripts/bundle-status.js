const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function stripExports(code) {
  return code.replace(/module\.exports\s*=\s*\{[^}]*\};?\s*$/gm, '').trim();
}

function stripRequires(code) {
  return code
    .replace(/const fs = require\('fs'\);\r?\n?/g, '')
    .replace(/const path = require\('path'\);\r?\n?/g, '')
    .replace(/const \{ buildPlayerBar \} = require\('\.\/player-bar'\);\r?\n?/g, '')
    .replace(/const \{ postWebhookMessage \} = require\('\.\/discord-webhook'\);\r?\n?/g, '');
}

const parts = [
  "const fs = require('fs');\nconst path = require('path');\nconst API_VERSION = 3;\n",
  stripExports(stripRequires(fs.readFileSync(path.join(root, 'server/lib/status-core.js'), 'utf8'))),
  stripExports(fs.readFileSync(path.join(root, 'server/lib/player-bar.js'), 'utf8')),
  stripExports(fs.readFileSync(path.join(root, 'server/lib/discord-webhook.js'), 'utf8')),
  stripExports(stripRequires(fs.readFileSync(path.join(root, 'server/lib/discord-alerts.js'), 'utf8'))),
  stripExports(fs.readFileSync(path.join(root, 'server/lib/status-state.js'), 'utf8')),
  stripExports(stripRequires(fs.readFileSync(path.join(root, 'server/lib/discord-embed.js'), 'utf8'))),
];

let handler = fs.readFileSync(path.join(root, 'api/status.js'), 'utf8');
handler = handler
  .replace(/const \{ getFullStatus \} = require\([^)]+\);\s*/g, '')
  .replace(/const \{ buildDiscordPayload \} = require\([^)]+\);\s*/g, '')
  .replace(/const \{ upsertStatusMessage, parseWebhookUrl \} = require\([^)]+\);\s*/g, '')
  .replace(/const \{ snapshotFromStatus, loadPreviousState, savePreviousState \} = require\([^)]+\);\s*/g, '')
  .replace(/const \{ sendTransitionAlerts \} = require\([^)]+\);\s*/g, '');

handler = handler.replace(
  'return res.status(200).json(await getFullStatus());',
  `const data = await getFullStatus();
    data.meta = { ...data.meta, apiVersion: API_VERSION, discordReady: true };
    return res.status(200).json(data);`
);

handler = handler.replace(
  `const discord =
    req.query?.discord === '1' ||
    req.query?.discord === 'true' ||
    req.query?.postDiscord === '1';`,
  `const reqUrl = req.url || '';
  const discord =
    req.query?.discord === '1' ||
    req.query?.discord === 'true' ||
    req.query?.postDiscord === '1' ||
    reqUrl.includes('discord=1');`
);

const out = parts.join('\n\n') + '\n\n' + handler;
fs.writeFileSync(path.join(root, 'api/status.js'), out);
console.log('Bundled api/status.js', out.length, 'chars');
