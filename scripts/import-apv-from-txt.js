/**
 * Importeer APV uit Google Docs plain-text export.
 *
 * 1. Open het doc → Bestand → Downloaden → Platte tekst (.txt)
 * 2. Sla op als: data/apv-export.txt
 * 3. Run: node scripts/import-apv-from-txt.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TXT = path.join(__dirname, '..', 'data', 'apv-export.txt');
const OUT_DATA = path.join(__dirname, 'apv-articles-data.js');

const HEADER = `/**
 * APV artikelen — geïmporteerd uit Google Doc
 * https://docs.google.com/document/d/1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo/edit
 */
module.exports = `;

function parseArticles(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const articles = [];
  let current = null;

  const artRe = /^Artikel\s+(\d+[A-Za-z]?)\s*[–-]\s*(.+)$/i;
  const catRe = /^Straf\s+Categorie\s+(.+)$/i;

  function flush() {
    if (current) {
      if (!current.paragraphs.length && !current.list.length) {
        current.paragraphs.push('(Geen inhoud in export)');
      }
      articles.push(current);
      current = null;
    }
  }

  for (const line of lines) {
    const am = line.match(artRe);
    if (am) {
      flush();
      current = {
        id: am[1],
        title: am[2].trim(),
        cat: '1',
        paragraphs: [],
        list: [],
      };
      continue;
    }
    const cm = line.match(catRe);
    if (cm && current) {
      current.cat = cm[1].trim();
      continue;
    }
    if (!current) continue;
    if (/^[-•*]\s+/.test(line) || line.startsWith('·')) {
      current.list.push(line.replace(/^[-•*·]\s+/, '').trim());
    } else if (/^\d+[.)]\s+/.test(line)) {
      current.list.push(line.replace(/^\d+[.)]\s+/, '').trim());
    } else {
      current.paragraphs.push(line);
    }
  }
  flush();
  return articles;
}

if (!fs.existsSync(TXT)) {
  console.error('Bestand ontbreekt:', TXT);
  console.error('Download het Google Doc als .txt en plaats het daar.');
  process.exit(1);
}

const raw = fs.readFileSync(TXT, 'utf8');
const articles = parseArticles(raw);
if (!articles.length) {
  console.error('Geen artikelen gevonden. Controleer of regels beginnen met "Artikel 1 – ..."');
  process.exit(1);
}

const body = JSON.stringify(articles, null, 2)
  .replace(/"paragraphs": \[\]/g, '"paragraphs": []')
  .replace(/"list": \[\]/g, '"list": []')
  .replace(/"afterList": \[\]/g, '"afterList": []');

fs.writeFileSync(OUT_DATA, HEADER + body + ';\n', 'utf8');
console.log('Geïmporteerd:', articles.length, 'artikelen →', OUT_DATA);

execSync('node scripts/build-apv-html.js', {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
