# GRP Store Bridge

Koppelt de **website** (coins + ingame store) aan **FiveM `ehrp_store`**.

## Starten

```bash
cd api
npm install
npm start
```

Standaard: `http://127.0.0.1:3847`

## Configuratie

| Plek | Instelling |
|------|------------|
| `website/js/config.js` | `GRPConfig.bridge` — `apiUrl`, `apiKey`, `enabled` |
| `ehrp_store/config/config.lua` | `Config.WebsiteBridge` — zelfde `apiUrl` + `apiKey` |

**Belangrijk:** De FiveM-server moet de API kunnen bereiken. Draait FXServer op dezelfde PC als de bridge → `http://127.0.0.1:3847`. Anders het LAN-IP van de bridge-machine.

Optioneel environment:

```bash
set GRP_BRIDGE_PORT=3847
set GRP_BRIDGE_API_KEY=jouw-geheime-key
npm start
```

## Hoe het werkt

### Coins

1. Speler logt in op de website (Discord + FiveM) → bridge registreert `discordId` + `fivemId`.
2. **Ingame** aankoop / `/givecoins` / Tebex → MySQL `player_coins` → bridge krijgt nieuw saldo.
3. **Website admin** coins geven → bridge markeert sync → FiveM haalt elke ~15s op en zet MySQL.
4. Website toont saldo uit bridge (niet alleen localStorage).

Koppeling loopt via **FiveM ID** (Cfx) en **license** (als speler ooit ingame is geweest).

### Ingame store producten

1. Admin → **Ingame store** → producten bewerken → **Opslaan & sync naar FiveM**.
2. FiveM `ehrp_store` haalt catalogus van `/api/fivem/catalog` en vervangt `Config.StoreItems`.
3. `/store` in-game toont dezelfde producten/prijzen als de website.

Voor **voertuigen**: vul `model` in (spawn naam). Voor **wapens**: `item` (bijv. `WEAPON_PISTOL`).

## Discord rollen (automatisch)

1. Maak een bot in [Discord Developer Portal](https://discord.com/developers/applications)
2. Bot → **Reset Token** → kopieer token (komt **alleen** in `api/.env`, nooit in de website-JS)
3. OAuth2 → URL Generator: `bot` + permissie **Manage Roles**
4. Nodig de bot uit op je Discord server
5. Server Instellingen → rollen → sleep de bot **boven** de rollen die hij moet geven
6. Kopieer `api/.env.example` naar `api/.env` en vul in:

```env
DISCORD_BOT_TOKEN=jouw_bot_token_hier
DISCORD_GUILD_ID=jouw_server_id
DISCORD_ROLE_INGAME_BUYER=1502448723152605256
DISCORD_ROLE_REVIVEMIJ=1502448733537959956
```

| Rol | Wanneer |
|-----|---------|
| `1502448723152605256` | Elke ingame-store aankoop (website of `/store`) |
| `1502448733537959956` | Bij aankoop **/Revivemij** (product-id `revivemij`) |

Spelers moeten in je Discord server zitten — anders kan de bot de rol niet geven.

## Website checkout + /claimproduct

1. Speler koopt op **Ingame store** met coins (winkelwagen → Afrekenen)
2. Items staan klaar op de bridge
3. In-game: `/claimproduct` — levert voertuigen/wapens/items af

## Eerste test

1. `npm start` in `api/`
2. Website: `npx serve .. -l 3000`
3. Bridge aan in `config.js` + `config.lua` (zelfde API key)
4. `ensure ehrp_store` op FiveM-server
5. Inloggen website → coins in admin geven → join server → `/store` checken
