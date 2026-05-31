# Statuspagina (hoofdwebsite)

Alles zit nu in **utrecht-roleplay-main** — geen apart `utrecht-status` project meer nodig.

## Bestanden

| Bestand | Functie |
|---------|---------|
| `status.html` | Statuspagina (FiveM-kaart + websites) |
| `assets/css/status.css` | Styling |
| `assets/js/status.js` | Live data van API |
| `api/status.js` | Server checks (Vercel) |
| `data/status-sites.json` | URLs websites |
| `data/fivem.json` | FiveM IP/poort |

## URL

- Pagina: `https://www.utrechtroleplay.eu/status.html`
- API: `https://www.utrechtroleplay.eu/api/status`

## Vercel deploy

Upload **hele** map naar je **hoofdwebsite** GitHub-repo (niet alleen HTML):

- `status.html`, `assets/css/status.css`, `assets/js/status.js`
- `api/status.js`
- `data/status-sites.json`, `data/fivem.json`
- `vercel.json` (optioneel; static root)

Na deploy: `https://www.utrechtroleplay.eu/api/status` moet JSON geven.

## Staff-URL aanpassen

In `data/status-sites.json` → staff `url` naar je echte staff-domein (bijv. `*.vercel.app`).

Optioneel in Vercel: `STATUS_URL_STAFF`, `FIVEM_HOST`, `FIVEM_PORT`.

## Discord (optioneel later)

Discord webhook kan later apart; focus nu op website status.
