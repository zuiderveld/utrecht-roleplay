# APV bijwerken

Bron: [Utrecht Roleplay | APV (Google Doc)](https://docs.google.com/document/d/1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo/edit?tab=t.0)

## Status lokaal

`apv.html` bevat **64 artikelen** (Artikel 1 t/m 40 + sub-artikelen). Deploy naar Vercel om live te zetten.

## 100% kopie uit Google Doc (aanbevolen)

Het doc is **privé** — robots kunnen het niet lezen. Jij exporteert één keer:

1. Open het doc → **Bestand** → **Downloaden** → **Platte tekst (.txt)**
2. Sla op als: `data/apv-export.txt` (in deze map)
3. Run:

```bash
node scripts/import-apv-from-txt.js
```

4. Deploy `apv.html`

## Handmatig bewerken

1. Pas `scripts/apv-articles-data.js` aan  
2. `node scripts/build-apv-html.js`  
3. Deploy

## Doc openbaar maken (optioneel)

**Delen** → **Iedereen met de link** → **Viewer** — dan kan de site later het doc embedden.
