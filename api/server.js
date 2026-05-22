/**
 * Lokaal starten: cd api && npm start
 */
require('dotenv').config();
const app = require('./_lib/app');

const PORT = Number(process.env.PORT || process.env.GRP_BRIDGE_PORT) || 3847;
const API_KEY = process.env.GRP_BRIDGE_API_KEY || 'grp-bridge-change-me';

app.listen(PORT, () => {
  console.log(`GRP Store Bridge → http://localhost:${PORT}`);
  console.log(`API key: ${API_KEY}`);
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('⚠ Discord: zet DISCORD_BOT_TOKEN in api/.env voor automatische rollen');
  }
});
