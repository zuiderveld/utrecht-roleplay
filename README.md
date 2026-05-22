# Groningen Roleplay — Website Clone

Statische clone van [groningenrp.store](https://groningenrp.store/), gebouwd met HTML, CSS en JavaScript.

## Starten

Open `index.html` in je browser, of start een lokale server:

```bash
npx serve .
```

Of met Python:

```bash
python -m http.server 8080
```

Ga daarna naar `http://localhost:8080`

## Pagina's

| Bestand | Beschrijving |
|---------|--------------|
| `index.html` | Homepage met hero, features, packs, Discord |
| `store.html` | Store met coins & staff packages |
| `camos.html` | Camo editor preview |
| `regels.html` | Serverregels |
| `ingame-store.html` | Ingame store uitleg |
| `admin/index.html` | **Admin panel** — content beheren |

## Admin panel

Open **`admin/index.html`** (of `/admin/` via een lokale server).

| | |
|---|---|
| **Standaard login** | Gebruiker `admin` · wachtwoord `grp2026` |
| **Beheer** | Promo-banner, hero-tekst, staff-pakketten, coins, regels |
| **Gebruikers** | Teamleden toevoegen met rollen & permissies per sectie |
| **Extra** | Export/import JSON, eigen wachtwoord, reset |

### Permissies

| Permissie | Toegang tot |
|-----------|-------------|
| Algemeen | Banner, hero, sale-teksten |
| Staff pakketten | Staff producten |
| Coins | Coin-pakketten |
| Regels | Regelpagina |
| Gebruikers beheren | Admin-gebruikers & rechten |
| Instellingen | Backup, import, reset |

**Rol presets:** Eigenaar (alles), Editor, Moderator, Store manager, of aangepast per vinkje.

Wijzigingen worden opgeslagen in **localStorage** van de browser en zijn direct zichtbaar op de site (zelfde browser).

> Let op: dit is bedoeld voor lokaal/testgebruik. Voor productie is een echte backend met beveiligde login nodig.

## Wat werkt

- Donkergroen design (#3a8055) zoals het origineel
- Particle-achtergrond in de hero
- Scroll-animaties
- Mobiel menu & winkelwagen sidebar
- Discord ledentelling (via invite API)
- Alle prijzen en afbeeldingen van het origineel

## Nog niet gekoppeld (vereist backend)

- Tebex checkout & echte betalingen
- Discord OAuth inloggen
- Live FiveM server status
- Volledige camo upload/editor

Voor productie: koppel Tebex API, Discord bot en je eigen domein.
