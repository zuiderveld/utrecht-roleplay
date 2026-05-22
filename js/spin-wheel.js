/**
 * Draai & Win — cadeau-knop op store & regels
 */
const SpinWheel = (() => {
  const STORAGE_PREFIX = 'grp_spin_last_';
  let modalEl = null;
  let spinning = false;

  function config() {
    return typeof SiteData !== 'undefined'
      ? SiteData.getSpinWheel()
      : { enabled: true, prizes: [], cooldownHours: 24 };
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function getPlayerKey() {
    const discord = typeof DiscordAuth !== 'undefined' ? DiscordAuth.getStoredUser() : null;
    const cfx = typeof CfxAuth !== 'undefined' ? CfxAuth.getStored() : null;
    if (!discord?.id || !cfx?.id) return null;
    return `${discord.id}_${cfx.id}`;
  }

  function getCooldownMs() {
    const hrs = Number(config().cooldownHours) || 24;
    return Math.max(1, hrs) * 3600000;
  }

  function canSpin() {
    const key = getPlayerKey();
    if (!key) return { ok: false, reason: 'login' };
    const cfg = config();
    if (cfg.enabled === false) return { ok: false, reason: 'disabled' };
    const last = Number(localStorage.getItem(STORAGE_PREFIX + key) || 0);
    const left = getCooldownMs() - (Date.now() - last);
    if (left > 0) return { ok: false, reason: 'cooldown', leftMs: left };
    return { ok: true };
  }

  function formatCooldown(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}u ${m}m`;
    return `${m} minuten`;
  }

  function pickPrize(prizes) {
    const list = (prizes || []).filter((p) => (p.weight ?? 1) > 0);
    if (!list.length) return null;
    const total = list.reduce((s, p) => s + (Number(p.weight) || 1), 0);
    let r = Math.random() * total;
    for (const p of list) {
      r -= Number(p.weight) || 1;
      if (r <= 0) return p;
    }
    return list[list.length - 1];
  }

  function buildWheelGradient(prizes) {
    const n = prizes.length;
    if (!n) return '#334155';
    const step = 360 / n;
    const parts = prizes.map((p, i) => {
      const start = (i * step).toFixed(2);
      const end = ((i + 1) * step).toFixed(2);
      return `${p.color || '#475569'} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${parts.join(', ')})`;
  }

  function renderLabels(prizes) {
    const n = prizes.length;
    if (!n) return '';
    const step = 360 / n;
    return prizes
      .map((p, i) => {
        const rot = i * step + step / 2 - 90;
        return `<span class="spin-wheel-label" style="transform: rotate(${rot}deg) translateY(-38%)">${escapeHtml(p.label)}</span>`;
      })
      .join('');
  }

  function ensureModal() {
    if (modalEl) return modalEl;
    const cfg = config();
    modalEl = document.createElement('div');
    modalEl.className = 'spin-modal';
    modalEl.id = 'spin-modal';
    modalEl.innerHTML = `
      <div class="spin-modal-backdrop" data-spin-close></div>
      <div class="spin-modal-box" role="dialog" aria-labelledby="spin-title">
        <button type="button" class="spin-modal-close" data-spin-close aria-label="Sluiten">×</button>
        <h2 id="spin-title" class="spin-modal-title">${escapeHtml(cfg.title || 'Draai & Win!')}</h2>
        <p class="spin-modal-sub">${escapeHtml(cfg.subtitle || '')}</p>
        <div class="spin-wheel-stage">
          <div class="spin-wheel-pointer" aria-hidden="true"></div>
          <div class="spin-wheel-disk-wrap">
            <div class="spin-wheel-disk" id="spin-wheel-disk"></div>
            <div class="spin-wheel-labels" id="spin-wheel-labels"></div>
          </div>
        </div>
        <p class="spin-modal-status" id="spin-status"></p>
        <button type="button" class="spin-modal-btn" id="spin-btn">DRAAI!</button>
      </div>`;
    document.body.appendChild(modalEl);

    modalEl.querySelectorAll('[data-spin-close]').forEach((el) => {
      el.addEventListener('click', close);
    });

    document.getElementById('spin-btn')?.addEventListener('click', onSpin);
    return modalEl;
  }

  function updateWheelVisual() {
    const cfg = config();
    const prizes = cfg.prizes || [];
    const disk = document.getElementById('spin-wheel-disk');
    const labels = document.getElementById('spin-wheel-labels');
    if (disk) {
      disk.style.background = buildWheelGradient(prizes);
      disk.style.transform = 'rotate(0deg)';
    }
    if (labels) labels.innerHTML = renderLabels(prizes);
  }

  function updateStatus() {
    const status = document.getElementById('spin-status');
    const btn = document.getElementById('spin-btn');
    if (!status || !btn) return;

    const check = canSpin();
    if (check.reason === 'login') {
      status.textContent = 'Log in met Discord én FiveM om te draaien.';
      btn.disabled = true;
      return;
    }
    if (check.reason === 'disabled') {
      status.textContent = 'Draai & Win is tijdelijk uitgeschakeld.';
      btn.disabled = true;
      return;
    }
    if (check.reason === 'cooldown') {
      status.textContent = `Je kunt over ${formatCooldown(check.leftMs)} weer draaien.`;
      btn.disabled = true;
      return;
    }
    status.textContent = '';
    btn.disabled = spinning;
  }

  function open() {
    const cfg = config();
    if (cfg.enabled === false) {
      alert('Draai & Win is momenteel uitgeschakeld.');
      return;
    }
    ensureModal();
    const title = modalEl.querySelector('.spin-modal-title');
    const sub = modalEl.querySelector('.spin-modal-sub');
    if (title) title.textContent = cfg.title || 'Draai & Win!';
    if (sub) sub.textContent = cfg.subtitle || '';
    updateWheelVisual();
    updateStatus();
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modalEl?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function applyPrize(prize) {
    const key = getPlayerKey();
    if (key) localStorage.setItem(STORAGE_PREFIX + key, String(Date.now()));

    if (prize.type === 'coins' && prize.value > 0) {
      const playerKey = getPlayerKey();
      if (!playerKey || typeof SiteData === 'undefined') {
        return 'Log in om coins te ontvangen.';
      }
      const id = SiteData.makePlayerId(
        DiscordAuth.getStoredUser().id,
        CfxAuth.getStored().id
      );
      let player = SiteData.getPlayerWallet(id);
      if (!player) {
        SiteData.upsertPlayer({
          discordId: DiscordAuth.getStoredUser().id,
          discordUsername: DiscordAuth.getStoredUser().username,
          cfxId: CfxAuth.getStored().id,
          cfxUsername: CfxAuth.getStored().username,
        });
      }
      const result = SiteData.addPlayerCoins(id, prize.value);
      if (result.ok) {
        if (typeof PlayerWallets !== 'undefined') PlayerWallets.updateBalanceUI();
        return `Gefeliciteerd! Je hebt ${prize.value} coins gewonnen!`;
      }
      return result.error || 'Coins konden niet worden toegevoegd.';
    }

    if (prize.type === 'discount' && prize.value > 0) {
      const code = `URP${prize.value}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const expires = Date.now() + 3600000;
      const codes = JSON.parse(localStorage.getItem('grp_spin_codes') || '[]');
      codes.push({ code, percent: prize.value, expires });
      localStorage.setItem('grp_spin_codes', JSON.stringify(codes.slice(-20)));
      return `Je wint ${prize.value}% korting!\nCode: ${code}\n(Geldig 1 uur — gebruik bij checkout/Tebex)`;
    }

    if (prize.type === 'nothing') {
      return 'Helaas, geen prijs deze keer. Probeer later opnieuw!';
    }

    return `Je wint: ${prize.label}`;
  }

  function onSpin() {
    if (spinning) return;
    const check = canSpin();
    if (!check.ok) {
      updateStatus();
      return;
    }

    const cfg = config();
    const prizes = cfg.prizes || [];
    if (!prizes.length) {
      alert('Geen prijzen geconfigureerd in het adminpanel.');
      return;
    }

    const prize = pickPrize(prizes);
    const index = prizes.findIndex((p) => p.id === prize.id);
    const n = prizes.length;
    const step = 360 / n;
    const targetAngle = 360 * 6 + (360 - index * step - step / 2);

    const disk = document.getElementById('spin-wheel-disk');
    const labels = document.getElementById('spin-wheel-labels');
    const btn = document.getElementById('spin-btn');
    const status = document.getElementById('spin-status');

    spinning = true;
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Draaien…';

    if (disk) {
      disk.style.transition = 'none';
      disk.style.transform = 'rotate(0deg)';
      if (labels) labels.style.transform = 'rotate(0deg)';
      void disk.offsetWidth;
      disk.style.transition = 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      disk.style.transform = `rotate(${targetAngle}deg)`;
      if (labels) {
        labels.style.transition = disk.style.transition;
        labels.style.transform = `rotate(${targetAngle}deg)`;
      }
    }

    setTimeout(() => {
      spinning = false;
      const msg = applyPrize(prize);
      if (status) status.textContent = msg.split('\n')[0];
      alert(msg);
      updateStatus();
      if (btn && canSpin().ok) btn.disabled = false;
    }, 4300);
  }

  function init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-spin-open], .regels-gift-fab, .store-gift-fab');
      if (!btn) return;
      e.preventDefault();
      open();
    });
  }

  return { init, open, close, canSpin };
})();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SpinWheel.init());
  } else {
    SpinWheel.init();
  }
}
