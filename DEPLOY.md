# Deploy op Vercel + GitHub

Alles zit in **één repo**: website + bridge API (`/api/*` op hetzelfde domein).

## GitHub push

```powershell
cd "c:\Users\broed\Desktop\website grp"
git add -A
git commit -m "Vercel: website + bridge API"
git push
```

Geen `node_modules` uploaden (staat in `.gitignore`).

---

## Vercel instellen

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo
2. **Framework:** Other (geen build framework)
3. **Root Directory:** leeg (niet `api`)
4. **Install Command:** `npm install` (of leeg — `vercel.json` regelt dit)
5. **Build Command:** leeg
6. **Output Directory:** `.` (root — HTML/JS/CSS)

> **Fout `api/package.json ENOENT`?** In Vercel staat vaak nog `cd api && npm install` of Root Directory = `api`. Zet Root Directory leeg en Install Command op `npm install`, daarna redeploy.
5. **Environment Variables** (Settings → Environment Variables):

| Naam | Waarde |
|------|--------|
| `GRP_BRIDGE_API_KEY` | Zelfde als `js/config.js` en FiveM `config.lua` |
| `DISCORD_BOT_TOKEN` | (optioneel) Discord bot token |
| `DISCORD_GUILD_ID` | (optioneel) Server ID |
| `DISCORD_ROLE_INGAME_BUYER` | (optioneel) |
| `DISCORD_ROLE_REVIVEMIJ` | (optioneel) |

6. Deploy

Test bridge: `https://jouw-site.vercel.app/api/health` → moet `{"ok":true}` tonen.

---

## FiveM server (`ehrp_store`)

```lua
Config.WebsiteBridge = {
    enabled = true,
    apiUrl = "https://www.utrechtroleplay.eu",  -- jouw live domein (zonder /api)
    apiKey = "grp-bridge-change-me",
    syncIntervalSeconds = 15,
}
```

Herstart `ehrp_store`.

---

## Lokaal testen

| Terminal 1 | Terminal 2 |
|------------|------------|
| `cd api && npm start` | `npx serve . -l 3000` |

Open `http://localhost:3000` — bridge op poort 3847.

---

## Let op (Vercel)

- Spelerdata (coins, orders) staat tijdelijk in **serverless geheugen** (`/tmp`). Bij een cold start kan data resetten.
- Voor permanente opslag later: Vercel KV of database toevoegen.
- **GitHub Pages** ondersteunt geen `/api` — gebruik **Vercel** voor de volledige site.
