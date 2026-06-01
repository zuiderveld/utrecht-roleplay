# APV bijwerken

Bron-Google Doc:  
https://docs.google.com/document/d/1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo/edit

## Automatisch HTML genereren

1. Pas artikelen aan in `scripts/apv-articles-data.js` (of export doc als tekst en werk bij).
2. Run:

```bash
node scripts/build-apv-html.js
```

3. Deploy `apv.html` naar Vercel.

## Google Doc privé?

Het document moet **openbaar** zijn om automatisch te importeren, of je werkt handmatig `apv-articles-data.js` bij.

**Doc openbaar zetten:** Delen → Iedereen met de link → Viewer.
