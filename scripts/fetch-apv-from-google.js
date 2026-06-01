/**
 * Importeert volledige APV van Google Docs (mobilebasic, publiek met link).
 * Run: node scripts/fetch-apv-from-google.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOC_ID = '1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo';
const MOBILE_URL = `https://docs.google.com/document/d/${DOC_ID}/mobilebasic`;
const OUT_TXT = path.join(__dirname, '..', 'data', 'apv-export.txt');

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Alleen echte artikelen (niet "Artikel 1-5:" sectiekoppen, niet midden in zin) */
function splitArticles(text) {
  let normalized = text.replace(
    /Artikel\s+(\d+-\d+:[^\n]*?)(?=Artikel\s+\d+[A-Z]?:)/gi,
    '\n$1\n'
  );
  normalized = normalized.replace(/([^\n])(Artikel\s+\d+[A-Z]?:)/gi, '$1\n$2');
  const parts = normalized.split(/\n(?=Artikel\s+\d+[A-Z]?:\s)/i);
  return parts
    .map((p) => p.trim())
    .filter((p) => /^Artikel\s+\d+[A-Z]?:/i.test(p));
}

function isValidArticle(a) {
  if (!a || !a.title) return false;
  if (a.title.length < 2) return false;
  if (/^[)\].,;]+$/.test(a.title)) return false;
  // Valse split midden in zin, bv. "Exploits)." zonder openingshaakje
  if (/\)\.?$/.test(a.title) && !/\(/.test(a.title)) return false;
  return true;
}

function parseArticleBlock(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const head = lines[0];
  const headRe = /^Artikel\s+(\d+[A-Z]?):\s*(.+)$/i;
  const m = head.match(headRe);
  if (!m) return null;

  let title = m[2].trim();
  let cat = '';

  const catInTitle = title.match(/\s+Categorie\s+(.+)$/i);
  if (catInTitle) {
    cat = catInTitle[1].trim();
    title = title.replace(/\s+Categorie\s+.+$/i, '').trim();
  }

  const paragraphs = [];
  const list = [];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (/^Categorie\s+\d/i.test(line) && !cat) {
      cat = line.replace(/^Categorie\s+/i, '').trim();
      continue;
    }
    if (/^Straf:\s*/i.test(line)) {
      paragraphs.push(line);
      continue;
    }
    if (/^Categorie\s+\d/i.test(line)) {
      paragraphs.push(`<strong>${line}</strong>`);
      continue;
    }
    if (/^•\s*/.test(line) || line.startsWith('•')) {
      list.push(line.replace(/^•\s*/, '').trim());
      continue;
    }
    if (/^\d+\.\d+\s/.test(line)) {
      paragraphs.push(`<strong>${line}</strong>`);
      continue;
    }
    paragraphs.push(line);
  }

  if (!cat) cat = 'Variabel';

  return {
    id: m[1],
    title,
    cat,
    paragraphs,
    list,
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function bodyHtml(a) {
  let html = '';
  (a.paragraphs || []).forEach((p) => {
    if (p.startsWith('<strong>')) {
      html += `<p>${p}</p>\n`;
    } else {
      html += `<p>${esc(p)}</p>\n`;
    }
  });
  if (a.list && a.list.length) {
    html += '<ul>\n';
    a.list.forEach((li) => {
      html += `<li>${esc(li)}</li>\n`;
    });
    html += '</ul>\n';
  }
  return html;
}

function buildApvHtml(articles) {
  const DOC =
    'https://docs.google.com/document/d/1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo/edit?tab=t.0';
  const items = articles.map((a) => {
    return `<!-- Artikel ${a.id} -->
<div class="apv-item">
<button class="apv-header">
<span>Artikel ${esc(a.id)} – ${esc(a.title)}</span><small>Straf Categorie ${esc(a.cat)}</small><i class="chevron"></i>
</button>
<div class="apv-body">
${bodyHtml(a)}
</div>
</div>
`;
  });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <title>Utrecht Roleplay | Regels & APV</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Lees hier alle regels en de APV van Utrecht Roleplay — ${articles.length} artikelen.">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon.png">
    <meta property="og:url" content="https://www.utrechtroleplay.eu/apv.html">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="bg-overlay"></div>
<header class="topbar">
    <div class="brand">
        <img src="assets/images/logo.png" class="logo" alt="Utrecht Roleplay">
        <span>Utrecht Roleplay</span>
    </div>
    <nav class="nav">
        <a href="index.html">Home</a>
        <a href="servers.html">Servers</a>
        <a href="status.html">Status</a>
        <a href="apv.html" class="active">APV</a>
        <a href="${DOC}" target="_blank" rel="noopener">Google Doc</a>
        <a href="https://docs.google.com/document/d/1qfrcfnsyI-__ufqnPlb56kWgw-W60IqPYoCM7Wxf-Zw/edit?tab=t.0" target="_blank" rel="noopener">WETBOEK</a>
        <a href="index.html#join">Meedoen</a>
    </nav>
    <div class="nav-buttons">
        <a href="index.html" class="btn-outline">← Terug</a>
    </div>
</header>
<section class="apv-hero">
    <h1>Regels & Algemene Plaatselijke Verordening</h1>
    <p>${articles.length} artikelen — gesynchroniseerd met <a href="${DOC}" target="_blank" rel="noopener">Google Docs</a>. Klik op een artikel voor de volledige tekst.</p>
</section>
<div class="apv-tools">
  <div class="apv-search">
    <input type="text" id="apvSearch" placeholder="Zoek op artikel, onderwerp of tekst..." autocomplete="off" spellcheck="false">
  </div>
</div>
<section class="apv-wrapper">
${items.join('\n')}
</section>
<footer class="footer">© 2026 Utrecht Roleplay — Regels & APV</footer>
<script src="assets/js/script.js"></script>
</body>
</html>
`;
}

async function main() {
  console.log('Downloaden:', MOBILE_URL);
  const res = await fetch(MOBILE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UtrechtRP-APV/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = stripHtml(await res.text());
  fs.writeFileSync(OUT_TXT, text, 'utf8');

  const blocks = splitArticles(text);
  const articles = blocks.map(parseArticleBlock).filter(isValidArticle);
  console.log('Artikelen gevonden:', articles.length);

  if (articles.length < 50) {
    console.warn('Verwacht ~62 artikelen — controleer parser.');
  }

  const outData = path.join(__dirname, 'apv-articles-data.js');
  fs.writeFileSync(
    outData,
    `/** APV uit Google Doc — ${articles.length} artikelen — ${new Date().toISOString().slice(0, 10)} */\nmodule.exports = ${JSON.stringify(articles, null, 2)};\n`,
    'utf8'
  );

  const outHtml = path.join(__dirname, '..', 'apv.html');
  fs.writeFileSync(outHtml, buildApvHtml(articles), 'utf8');
  console.log('Geschreven:', outHtml);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
