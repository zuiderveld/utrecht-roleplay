# FiveM serverlijst

De pagina `servers.html` haalt live data op via `/api/servers`. Welke servers getoond worden staat in **`data/fivem-servers.json`**.

## Nieuwe server toevoegen

Voeg een object toe aan de array `servers`:

```json
{
  "id": "utrecht-events",
  "name": "Utrecht Events",
  "description": "Event- en testserver van Utrecht Roleplay.",
  "host": "45.116.104.215",
  "port": 30121,
  "tags": ["roleplay", "nl", "events"],
  "locale": "nl",
  "logo": "assets/images/logo.png",
  "featured": false
}
```

| Veld | Verplicht | Uitleg |
|------|-----------|--------|
| `id` | ja | Unieke slug (geen spaties) |
| `name` | ja | Naam op de kaart |
| `host` / `port` | ja | IP en poort voor FiveM `dynamic.json` |
| `description` | nee | Tekst onder de tags |
| `tags` | nee | Filters op de pagina (`roleplay`, `nl`, `esx`, …) |
| `logo` | nee | Pad naar afbeelding (standaard: logo.png) |
| `featured` | nee | `true` = bovenaan in de lijst |
| `enabled` | nee | `false` = tijdelijk verbergen zonder te verwijderen |

Na deploy verschijnt de server automatisch op [servers.html](servers.html) met spelersaantal en Connect-knop.

## Statuspagina

De **status**-pagina gebruikt nog steeds `data/fivem.json` voor één primaire server (Discord + overall status). Zet daar de hoofdserver; extra servers staan alleen op de serverlijst.
