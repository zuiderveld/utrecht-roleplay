/**
 * Discord rollen — token ALLEEN via environment (nooit in frontend)
 * Zet in api/.env → zie .env.example
 */
const DISCORD_API = 'https://discord.com/api/v10';

function getConfig() {
  return {
    token: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    roleBuyer: process.env.DISCORD_ROLE_INGAME_BUYER || '1502448723152605256',
    roleRevive: process.env.DISCORD_ROLE_REVIVEMIJ || '1502448733537959956',
  };
}

function isReviveProduct(item) {
  if (!item) return false;
  const id = String(item.id || item.slug || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  return id.includes('revive') || name.includes('revivemij') || name.includes('revive mij');
}

async function addRoleToMember(discordUserId, roleId) {
  const { token, guildId } = getConfig();
  if (!token || !guildId || !discordUserId || !roleId) {
    return { ok: false, skipped: true, reason: 'Discord niet geconfigureerd (.env)' };
  }

  const url = `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 204 || res.status === 200) {
    return { ok: true, roleId };
  }

  const text = await res.text().catch(() => '');
  if (res.status === 404) {
    return { ok: false, error: 'Gebruiker niet in Discord server (join eerst de server)' };
  }
  return { ok: false, error: `Discord API ${res.status}: ${text.slice(0, 200)}` };
}

/** Rollen na ingame-store aankoop */
async function grantPurchaseRoles(discordUserId, items = []) {
  const cfg = getConfig();
  const granted = [];
  const errors = [];

  const buyer = await addRoleToMember(discordUserId, cfg.roleBuyer);
  if (buyer.ok) granted.push(cfg.roleBuyer);
  else if (!buyer.skipped) errors.push(buyer.error);

  const hasRevive = items.some(isReviveProduct);
  if (hasRevive) {
    const revive = await addRoleToMember(discordUserId, cfg.roleRevive);
    if (revive.ok) granted.push(cfg.roleRevive);
    else if (!revive.skipped) errors.push(revive.error);
  }

  return { granted, errors, skipped: buyer.skipped };
}

module.exports = { grantPurchaseRoles, isReviveProduct, getConfig, addRoleToMember };
