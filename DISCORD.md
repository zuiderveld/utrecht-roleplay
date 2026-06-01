# Discord status-bericht (hoofdwebsite)

Eén vast bericht in je Discord-kanaal, elke **5 minuten** automatisch bijgewerkt (websites + FiveM + spelersbalk 🟩⬛).

---

## Stap 1: Webhook

1. Discord (ook **Canary** / PTB) → status-kanaal → **Kanaalinstellingen** → **Integraties** → **Webhooks**
2. **Nieuwe webhook** → naam bijv. `URP Status`
3. **Webhook-URL kopiëren**

**Canary:** als je URL begint met `https://canary.discord.com/api/webhooks/...` — plak die **zo in Vercel**. Dat wordt ondersteund. De server praat daarna gewoon met `discord.com` (API); dat is normaal.

**Niet** het kanaal-ID gebruiken — alleen de webhook-URL.

---

## Stap 2: Vercel (hoofdwebsite-project)

| Variabele | Waarde |
|-----------|--------|
| `DISCORD_STATUS_WEBHOOK_URL` | Volledige webhook-URL |
| `DISCORD_STATUS_MESSAGE_ID` | *(eerst leeg)* |
| `CRON_SECRET` | Lang willekeurig wachtwoord |
| `BLOB_READ_WRITE_TOKEN` | *(aanbevolen)* Vercel → Storage → Blob |
| `DISCORD_ALERT_PING` | *(optioneel)* `@here` bij uitval |
| `STATUS_PAGE_URL` | *(optioneel)* default: `https://www.utrechtroleplay.eu/status.html` |

Webhook **nooit** in GitHub. Na wijzigingen: **redeploy**.

---

## Stap 3: Eerste bericht aanmaken

**Gebruik `www`** (apex `utrechtroleplay.eu` redirect wel, maar altijd `www` is het duidelijkst):

```
https://www.utrechtroleplay.eu/api/discord-status?secret=JOUW_SECRET
```

Of (zelfde functie):

```
https://www.utrechtroleplay.eu/api/status?discord=1&secret=JOUW_SECRET
```

### 404 NOT_FOUND?

Dan staan de **nieuwe API-bestanden nog niet** op Vercel. Upload en redeploy eerst (zie hieronder).  
Test: `https://www.utrechtroleplay.eu/api/status?discord=1` — krijg je nog gewone JSON met `sites`/`fivem`? → oude deploy, Discord-code ontbreekt nog.

In het JSON-antwoord staat **`messageId`**. Zet in Vercel:

```
DISCORD_STATUS_MESSAGE_ID=1234567890123456789
```

Redeploy. Daarna wordt **hetzelfde bericht** geüpdatet (geen spam).

---

## Wat zit er in het embed?

- Groen/geel/rood overzicht + tijdstip
- Hoofdwebsite, Overheid, Staff (online/offline)
- FiveM: ONLINE/OFFLINE, spelers **5 / 128**, balk, spelerslijst
- Knoppen: Statuspagina, Website, FiveM join

---

## Offline-meldingen

Als iets **net** offline gaat → extra bericht in het kanaal (`🔴 FiveM server offline`, enz.).

Werkt betrouwbaar met **`BLOB_READ_WRITE_TOKEN`**. Zonder Blob onthoudt Vercel tussen runs niets.

---

## Automatisch (cron)

**Vercel Hobby:** maximaal **1× per dag**. In `vercel.json` staat `0 8 * * *` (08:00 UTC).

Voor **elke 5 minuten** op Hobby: gebruik een externe cron (bijv. [cron-job.org](https://cron-job.org)) die aanroept:

`GET https://www.utrechtroleplay.eu/api/discord-status?secret=JOUW_CRON_SECRET`

Of upgrade naar **Vercel Pro** en zet in `vercel.json` weer `*/5 * * * *`.

Met Vercel Cron (Pro of dagelijks op Hobby): `/api/discord-status` — Vercel stuurt `Authorization: Bearer` + `CRON_SECRET` mee.

**Problemen?**

| Probleem | Oplossing |
|----------|-----------|
| `401 Unauthorized` | Verkeerd `?secret=` |
| `DISCORD_STATUS_WEBHOOK_URL ontbreekt` | Env in Vercel + redeploy |
| Geen bericht | Eén keer stap 3 in browser |
| Oud bericht blijft hangen | `DISCORD_STATUS_MESSAGE_ID` goed zetten |

---

## Upload naar GitHub (verplicht bij 404)

Zonder deze bestanden blijft `/api/discord-status` **404**:

```
api/status.js
api/discord-status.js
server/lib/status-core.js
server/lib/discord-embed.js
server/lib/discord-webhook.js
server/lib/discord-alerts.js
server/lib/status-state.js
server/lib/player-bar.js
vercel.json
package.json
data/status-sites.json
data/fivem.json
```

Daarna in Vercel: **Deployments → Redeploy** (of push naar GitHub en wacht op groene build).
