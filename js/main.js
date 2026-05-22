// Particle canvas (hero background)
function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
  }

  function createParticles() {
    const count = Math.floor((canvas.width * canvas.height) / 12000);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(58, 128, 85, ${p.opacity})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(58, 128, 85, ${0.08 * (1 - dist / 120)})`;
          ctx.stroke();
        }
      }
    });

    animId = requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  return () => cancelAnimationFrame(animId);
}

// Scroll animations
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach((el) => observer.observe(el));
}

// Mobile menu
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

function initFiveMLinks() {
  const url = GRPConfig.fivem.connectUrl;
  document.querySelectorAll('[data-fivem-connect]').forEach((el) => {
    el.href = url;
  });
  const ipEl = document.getElementById('fivem-ip');
  if (ipEl) ipEl.textContent = GRPConfig.fivem.connectCommand;
}

async function fetchFiveMJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
}

/** Haalt dynamic.json op via CORS-proxy (browser kan IP-server niet direct benaderen) */
async function fetchFiveMDynamic() {
  const target = GRPConfig.fivem.dynamicUrl;
  const proxies = [
    (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  for (const wrap of proxies) {
    try {
      const data = await fetchFiveMJson(wrap(target));
      if (data && (data.clients !== undefined || data.sv_maxclients !== undefined)) {
        return data;
      }
    } catch {
      /* volgende proxy */
    }
  }
  throw new Error('FiveM unreachable');
}

async function fetchFiveMFromCfx() {
  const code = GRPConfig.fivem.cfxJoinCode?.trim();
  if (!code) return null;
  const res = await fetch(
    `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(code)}`
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.Data || json.data || null;
}

function formatStatNum(n) {
  return Number(n).toLocaleString('nl-NL');
}

function applyFiveMStats({ clients, max, hostname }) {
  const playersEl = document.getElementById('fivem-players');
  const maxEl = document.getElementById('fivem-progress-max');
  const fillEl = document.getElementById('fivem-progress-fill');
  const statusLabel = document.getElementById('fivem-status-label');
  const card = document.getElementById('fivem-stat-card');
  if (!playersEl) return;

  const online = Number(clients) || 0;
  const cap = Number(max) || Number(GRPConfig.fivem.defaultMaxClients) || 128;
  const pct = cap > 0 ? Math.min(100, (online / cap) * 100) : 0;

  playersEl.innerHTML = `${formatStatNum(online)} <span class="stat-slash">/</span> ${formatStatNum(cap)}`;
  if (maxEl) maxEl.textContent = formatStatNum(cap);
  if (fillEl) fillEl.style.width = `${pct}%`;

  const progressMin = card?.querySelector('.stat-progress-labels span:first-child');
  if (progressMin) progressMin.textContent = formatStatNum(online);

  if (statusLabel) {
    statusLabel.classList.remove('stat-card-label--offline');
    statusLabel.classList.add('stat-card-label--green');
    statusLabel.querySelector('span').textContent = 'ONLINE';
  }
  card?.classList.remove('is-offline');
  card?.setAttribute('title', hostname || 'FiveM server');

  document.dispatchEvent(
    new CustomEvent('grp-fivem-stats', {
      detail: { clients: online, max: cap, hostname },
    })
  );
}

function setFiveMOffline() {
  const playersEl = document.getElementById('fivem-players');
  const maxEl = document.getElementById('fivem-progress-max');
  const fillEl = document.getElementById('fivem-progress-fill');
  const statusLabel = document.getElementById('fivem-status-label');
  const card = document.getElementById('fivem-stat-card');

  if (playersEl) {
    playersEl.innerHTML = '— <span class="stat-slash">/</span> —';
  }
  if (maxEl) maxEl.textContent = '—';
  if (fillEl) fillEl.style.width = '0%';

  if (statusLabel) {
    statusLabel.classList.remove('stat-card-label--green');
    statusLabel.classList.add('stat-card-label--offline');
    statusLabel.querySelector('span').textContent = 'OFFLINE';
  }
  card?.classList.add('is-offline');
  document.dispatchEvent(
    new CustomEvent('grp-fivem-stats', { detail: { clients: 0, max: 0 } })
  );
}

// FiveM server status (live spelers)
async function loadFiveMStats() {
  const playersEl = document.getElementById('fivem-players');
  if (!playersEl) return;

  playersEl.innerHTML = '… <span class="stat-slash">/</span> …';

  try {
    const cfx = await fetchFiveMFromCfx();
    if (cfx) {
      applyFiveMStats({
        clients: cfx.clients,
        max: cfx.sv_maxclients,
        hostname: cfx.hostname,
      });
      return;
    }

    const data = await fetchFiveMDynamic();
    applyFiveMStats({
      clients: data.clients,
      max: data.sv_maxclients ?? data.svMaxclients,
      hostname: data.hostname,
    });
  } catch {
    setFiveMOffline();
  }
}

// Discord stats
async function loadDiscordStats() {
  const membersEl = document.getElementById('discord-members');
  const onlineEl = document.getElementById('discord-online');
  if (!membersEl || !onlineEl) return;

  // Discord invite widget doesn't expose member count without bot API.
  // Show placeholder until configured with your guild ID via backend.
  try {
    const res = await fetch(
      `https://discord.com/api/invites/${GRPConfig.discord.inviteCode}?with_counts=true`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.approximate_member_count) {
        membersEl.textContent = data.approximate_member_count.toLocaleString('nl-NL');
      }
      if (data.approximate_presence_count) {
        onlineEl.textContent = data.approximate_presence_count.toLocaleString('nl-NL');
      }
    }
  } catch {
    membersEl.textContent = '—';
    onlineEl.textContent = '—';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  initScrollAnimations();
  initMobileMenu();
  if (typeof Cart !== 'undefined') Cart.init();
  await DiscordAuth.init();
  if (typeof AuthUI !== 'undefined') AuthUI.init();
  else CfxAuth?.init();
  if (typeof PlayerWallets !== 'undefined') PlayerWallets.init();
  initFiveMLinks();
  loadFiveMStats();
  setInterval(loadFiveMStats, 60000);
  loadDiscordStats();
  if (typeof StoreApp !== 'undefined') StoreApp.init();

  // Trigger hero animation immediately
  const heroContent = document.querySelector('.hero-content.fade-in');
  if (heroContent) {
    requestAnimationFrame(() => heroContent.classList.add('visible'));
  }
});
