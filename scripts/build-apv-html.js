const fs = require('fs');
const path = require('path');
const articles = require('./apv-articles-data');

const DOC_URL =
  'https://docs.google.com/document/d/1yobQA-xbQ1G6zbtU6iO67thJlAEMQn3TLP6KeyjmWzo/edit?tab=t.0';

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bodyHtml(a) {
  let html = '';
  (a.paragraphs || []).forEach((p) => {
    html += `<p>${escHtml(p)}</p>\n`;
  });
  if (a.list && a.list.length) {
    html += '<ul>\n';
    a.list.forEach((li) => {
      html += `<li>${escHtml(li)}</li>\n`;
    });
    html += '</ul>\n';
  }
  (a.afterList || []).forEach((p) => {
    html += `<p>${escHtml(p)}</p>\n`;
  });
  if (a.straf) {
    html += `<p><strong>Straf:</strong> ${escHtml(a.straf)}</p>\n`;
  }
  return html;
}

function articleHtml(a) {
  const catLabel = a.cat === 'Variabel' ? 'Variabel' : a.cat;
  return `<!-- Artikel ${a.id} -->
<div class="apv-item">
<button class="apv-header">
<span>Artikel ${escHtml(a.id)} – ${escHtml(a.title)}</span><small>Straf Categorie ${escHtml(catLabel)}</small><i class="chevron"></i>
</button>
<div class="apv-body">
${bodyHtml(a)}
</div>
</div>
`;
}

const head = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <title>Utrecht Roleplay | Regels & APV</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Lees hier alle regels en de APV van Utrecht Roleplay.">
    <meta property="og:title" content="Utrecht Roleplay | Regels & APV">
    <meta property="og:description" content="Bekijk de officiële regels en APV van Utrecht Roleplay.">
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon.png">
    <meta property="og:url" content="https://www.utrechtroleplay.eu/apv.html">
    <meta property="og:type" content="website">
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
        <a href="${DOC_URL}" target="_blank" rel="noopener">Google Doc</a>
        <a href="https://docs.google.com/document/d/1qfrcfnsyI-__ufqnPlb56kWgw-W60IqPYoCM7Wxf-Zw/edit?tab=t.0" target="_blank" rel="noopener">WETBOEK</a>
        <a href="index.html#join">Meedoen</a>
    </nav>
    <div class="nav-buttons">
        <a href="index.html" class="btn-outline">← Terug</a>
    </div>
</header>

<section class="apv-hero">
    <h1>Regels & Algemene Plaatselijke Verordening</h1>
    <p>Klik op een artikel om de volledige inhoud te bekijken. <a href="${DOC_URL}" target="_blank" rel="noopener">Bekijk in Google Docs</a></p>
</section>

<div class="apv-tools">
  <div class="apv-search">
    <input type="text" id="apvSearch" placeholder="Zoek op artikel, onderwerp of tekst..." autocomplete="off" spellcheck="false">
  </div>
</div>

<section class="apv-wrapper">

`;

const foot = `
</section>

<footer class="footer">
© 2026 Utrecht Roleplay — Regels & APV
</footer>

<script src="assets/js/script.js"></script>
</body>
</html>
`;

const out = head + articles.map(articleHtml).join('\n') + foot;
const outPath = path.join(__dirname, '..', 'apv.html');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Geschreven:', outPath, '(' + articles.length + ' artikelen)');
