/**
 * Site data + admin gebruikers & permissies
 */
const SiteData = (() => {
  const STORAGE_KEY = 'grp_site_data';
  const SESSION_KEY = 'grp_admin_session';
  const USER_KEY = 'grp_admin_user_id';

  const PERMISSIONS = {
    general: 'Algemeen (banner, hero, sale)',
    staff: 'Staff pakketten',
    coins: 'Coins (store pakketten)',
    store: 'Webstore (categorieën & producten)',
    spin: 'Draai & Win (cadeau)',
    wallets: 'Speler coins (saldi)',
    ingame: 'Ingame store (FiveM sync)',
    rules: 'Regels',
    settings: 'Instellingen (backup & reset)',
    users: 'Gebruikers beheren',
  };

  const ALL_PERMS = Object.keys(PERMISSIONS);

  const ROLE_PRESETS = {
    owner: { label: 'Eigenaar (alles)', permissions: ['*'] },
    editor: {
      label: 'Editor',
      permissions: ['general', 'staff', 'coins', 'rules'],
    },
    moderator: {
      label: 'Moderator',
      permissions: ['general', 'rules'],
    },
    store: {
      label: 'Store manager',
      permissions: ['staff', 'coins', 'store', 'spin', 'wallets', 'ingame'],
    },
  };

  const DEFAULT_OWNER = {
    id: 'owner-default',
    username: 'admin',
    passwordHash: null,
    displayName: 'Administrator',
    permissions: ['*'],
    role: 'owner',
    active: true,
    createdAt: new Date().toISOString(),
  };

  const DEFAULTS = {
    promoBanner: '10% korting vanaf 20 coins!',
    saleBannerTitle: 'Sale actief!',
    saleBannerText: 'Pak je korting voordat het te laat is',
    heroSubtitle:
      'De beste FiveM roleplay server van Nederland. Realistische RP, unieke jobs, gangs en een actieve community — welkom bij Utrecht Roleplay.',
    staffPackages: [
      {
        id: 'mede-beheer',
        name: 'Mede Beheer',
        image:
          'https://dunb17ur4ymx4.cloudfront.net/packages/images/8da1c3d7c257e709cc6ed7e29fd794d66e13ca7a.jpg',
        priceOld: 1169.99,
        priceNew: 1052.99,
        discount: 10,
        popular: true,
      },
      {
        id: 'chief-manager',
        name: 'Chief Manager',
        image:
          'https://dunb17ur4ymx4.cloudfront.net/packages/images/2ea8de2462c26d154d42e468c7fbdf9dc5b8a5db.png',
        priceOld: 914.99,
        priceNew: 823.49,
        discount: 10,
        popular: false,
      },
      {
        id: 'chief-executive',
        name: 'Chief Executive',
        image:
          'https://dunb17ur4ymx4.cloudfront.net/packages/images/1504ee2bb8871cc667857a6d0059cb19204ff46f.jpg',
        priceOld: 814.99,
        priceNew: 733.49,
        discount: 10,
        popular: false,
      },
    ],
    coins: [
      { amount: 600, price: 444.99 },
      { amount: 500, price: 399.99 },
      { amount: 300, price: 249.99 },
      { amount: 150, price: 100.0 },
      { amount: 100, price: 89.99 },
      { amount: 75, price: 59.99 },
      { amount: 50, price: 50.0 },
      { amount: 40, price: 40.0 },
      { amount: 30, price: 27.5 },
      { amount: 20, price: 19.0 },
      { amount: 15, price: 14.99 },
      { amount: 5, price: 5.0 },
    ],
    rulesMeta: null,
    ruleArticles: null,
    users: [],
    /** Ingelogde spelers (Discord + FiveM) met coins-saldo */
    playerWallets: [],
    /** Ingame store — sync naar FiveM via bridge API */
    ingameStore: null,
    /** Webstore sidebar + producten */
    storeCategories: null,
    storeProducts: null,
    storeRecentPayments: null,
    /** Draai & Win cadeau */
    spinWheel: null,
  };

  const STORE_CAT_DESCRIPTIONS = {
    coins: 'Type ingame /store om de shop te openen. Hier koop je coin-pakketten met euro.',
    staff: 'Staff packages en donateur rangen.',
    unban: 'Unban pakketten — neem contact op via Discord.',
    org: 'Budget organisatie pakketten via checkout.',
    extra: "Staff extra's beschikbaar na login.",
    orgextra: "Organisatie extra's beschikbaar na login.",
  };

  function defaultSpinWheel() {
    return {
      enabled: true,
      title: 'Draai & Win!',
      subtitle: 'Win coins of een kortingscode (1 uur geldig)!',
      cooldownHours: 24,
      prizes: [
        { id: 'sw-10', label: '10%', type: 'discount', value: 10, weight: 10, color: '#22c55e' },
        { id: 'sw-50c', label: '50 coins', type: 'coins', value: 50, weight: 12, color: '#0ea5e9' },
        { id: 'sw-1', label: '1%', type: 'discount', value: 1, weight: 14, color: '#475569' },
        { id: 'sw-2', label: '2%', type: 'discount', value: 2, weight: 12, color: '#166534' },
        { id: 'sw-25c', label: '25 coins', type: 'coins', value: 25, weight: 14, color: '#06b6d4' },
        { id: 'sw-3', label: '3%', type: 'discount', value: 3, weight: 10, color: '#475569' },
        { id: 'sw-4', label: '4%', type: 'discount', value: 4, weight: 8, color: '#15803d' },
        { id: 'sw-100c', label: '100 coins', type: 'coins', value: 100, weight: 4, color: '#f97316' },
        { id: 'sw-5', label: '5%', type: 'discount', value: 5, weight: 8, color: '#475569' },
        { id: 'sw-0', label: 'Geen prijs', type: 'nothing', value: 0, weight: 8, color: '#334155' },
      ],
    };
  }

  function seedStoreCatalog(merged) {
    if (!merged.storeCategories?.length && typeof GRPContent !== 'undefined') {
      merged.storeCategories = (GRPContent.storeCategories || []).map((c, i) => ({
        id: c.id,
        label: c.label,
        description: STORE_CAT_DESCRIPTIONS[c.id] || '',
        sort: i,
      }));
    }
    if (!Array.isArray(merged.storeCategories)) merged.storeCategories = [];

    if (!merged.storeProducts?.length) {
      const products = [];
      (merged.coins || []).forEach((c) => {
        products.push({
          id: `coin-${c.amount}`,
          categoryId: 'coins',
          name: `${c.amount} coins`,
          coinAmount: c.amount,
          price: c.price,
          image: '',
          popular: false,
        });
      });
      (merged.staffPackages || []).forEach((p) => {
        products.push({
          id: p.id,
          categoryId: 'staff',
          name: p.name,
          image: p.image || '',
          price: p.priceNew,
          priceOld: p.priceOld,
          discount: p.discount,
          popular: !!p.popular,
        });
      });
      merged.storeProducts = products;
    }
    if (!Array.isArray(merged.storeProducts)) merged.storeProducts = [];

    if (!merged.storeRecentPayments?.length && typeof GRPContent !== 'undefined') {
      merged.storeRecentPayments = structuredClone(GRPContent.storeRecentPayments || []);
    }
    if (!Array.isArray(merged.storeRecentPayments)) merged.storeRecentPayments = [];

    if (!merged.spinWheel?.prizes?.length) {
      merged.spinWheel = defaultSpinWheel();
    }
    return merged;
  }

  function syncLegacyStoreArrays(data) {
    const coins = data.storeProducts
      .filter((p) => p.categoryId === 'coins' && p.coinAmount != null)
      .map((p) => ({ amount: Number(p.coinAmount), price: Number(p.price) || 0 }))
      .sort((a, b) => b.amount - a.amount);
    if (coins.length) data.coins = coins;

    const staff = data.storeProducts
      .filter((p) => p.categoryId === 'staff')
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image || '',
        priceOld: Number(p.priceOld) || Number(p.price) * 1.1,
        priceNew: Number(p.price) || 0,
        discount: Number(p.discount) || 10,
        popular: !!p.popular,
      }));
    if (staff.length) data.staffPackages = staff;
  }

  function getStoreCatalog() {
    const data = load();
    return {
      categories: [...(data.storeCategories || [])].sort(
        (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
      ),
      products: data.storeProducts || [],
      recentPayments: data.storeRecentPayments || [],
      spinWheel: data.spinWheel || defaultSpinWheel(),
    };
  }

  function saveStoreCatalog({ categories, products, recentPayments, spinWheel }) {
    const data = load();
    if (categories) data.storeCategories = categories;
    if (products) data.storeProducts = products;
    if (recentPayments) data.storeRecentPayments = recentPayments;
    if (spinWheel) data.spinWheel = spinWheel;
    syncLegacyStoreArrays(data);
    save(data);
    return getStoreCatalog();
  }

  /** Houd webstore-producten gelijk na wijziging in oude coins/staff panels */
  function syncStoreProductsFromLegacy(data) {
    const keep = (data.storeProducts || []).filter(
      (p) => p.categoryId !== 'coins' && p.categoryId !== 'staff'
    );
    const coins = (data.coins || []).map((c) => ({
      id: `coin-${c.amount}`,
      categoryId: 'coins',
      name: `${c.amount} coins`,
      coinAmount: c.amount,
      price: c.price,
      image: '',
      popular: false,
    }));
    const staff = (data.staffPackages || []).map((p) => ({
      id: p.id,
      categoryId: 'staff',
      name: p.name,
      image: p.image || '',
      price: p.priceNew,
      priceOld: p.priceOld,
      discount: p.discount,
      popular: !!p.popular,
    }));
    data.storeProducts = [...keep, ...coins, ...staff];
    save(data);
  }

  function countProductsInCategory(products, categoryId) {
    return (products || []).filter((p) => p.categoryId === categoryId).length;
  }

  function getSpinWheel() {
    return load().spinWheel || defaultSpinWheel();
  }

  function hashPassword(password) {
    return btoa(unescape(encodeURIComponent('grp_v1_' + password)));
  }

  function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
  }

  function createDefaultOwner(password) {
    const owner = { ...DEFAULT_OWNER, passwordHash: hashPassword(password) };
    return [owner];
  }

  function computeRulesMeta(articles) {
    let total = 0;
    let heavy = 0;
    (articles || []).forEach((a) => {
      (a.rules || []).forEach((r) => {
        total += 1;
        if (r.severity === 'zwaar') heavy += 1;
      });
    });
    return { total, articles: articles?.length || 0, heavy };
  }

  function seedRulesFromDefaults(merged) {
    if (!merged.ruleArticles?.length && window.__GRP_RULE_DEFAULTS__) {
      merged.ruleArticles = structuredClone(
        window.__GRP_RULE_DEFAULTS__.ruleArticles
      );
      merged.rulesMeta = structuredClone(window.__GRP_RULE_DEFAULTS__.rulesMeta);
    }
    return merged;
  }

  function getRulesContent() {
    const data = seedRulesFromDefaults(load());
    const articles = data.ruleArticles || [];
    const baseMeta = data.rulesMeta || {};
    const computed = computeRulesMeta(articles);
    return {
      articles,
      meta: { ...baseMeta, ...computed },
      icons: window.__GRP_RULE_DEFAULTS__?.ruleArticleIcons || {},
    };
  }

  function migrate(data) {
    const merged = { ...structuredClone(DEFAULTS), ...data };
    seedRulesFromDefaults(merged);
    if (merged.ruleArticles?.length) delete merged.rules;

    if (!merged.users?.length) {
      const legacyPw = merged.adminPassword || 'grp2026';
      merged.users = createDefaultOwner(legacyPw);
    } else {
      merged.users = merged.users.map((u) => ({
        ...u,
        active: u.active !== false,
        permissions: u.permissions?.length ? u.permissions : ['general'],
      }));
    }

    delete merged.adminPassword;
    if (!Array.isArray(merged.playerWallets)) merged.playerWallets = [];
    if (!merged.ingameStore?.items?.length && typeof GRPContent !== 'undefined') {
      merged.ingameStore = {
        categories: structuredClone(GRPContent.ingameCategories || []),
        items: (GRPContent.ingameItems || []).map((item, i) => ({
          ...item,
          id: item.id || `item-${i}`,
        })),
      };
    }
    seedStoreCatalog(merged);
    return merged;
  }

  function getIngameStore() {
    const data = load();
    if (data.ingameStore?.items?.length) return data.ingameStore;
    if (typeof GRPContent !== 'undefined') {
      return {
        categories: GRPContent.ingameCategories || [],
        items: GRPContent.ingameItems || [],
      };
    }
    return { categories: [], items: [] };
  }

  function saveIngameStore(catalog) {
    const data = load();
    data.ingameStore = catalog;
    save(data);
    return data.ingameStore;
  }

  function makePlayerId(discordId, cfxId) {
    return `${String(discordId).trim()}_${String(cfxId).trim()}`;
  }

  function upsertPlayer({ discordId, discordUsername, cfxId, cfxUsername }) {
    if (!discordId || !cfxId) return null;
    const data = load();
    const id = makePlayerId(discordId, cfxId);
    let player = data.playerWallets.find((p) => p.id === id);
    const now = new Date().toISOString();

    if (!player) {
      player = {
        id,
        discordId: String(discordId),
        discordUsername: discordUsername || 'Discord',
        cfxId: String(cfxId),
        cfxUsername: cfxUsername || String(cfxId),
        balance: 0,
        createdAt: now,
        lastSeenAt: now,
      };
      data.playerWallets.push(player);
    } else {
      player.discordUsername = discordUsername || player.discordUsername;
      player.cfxUsername = cfxUsername || player.cfxUsername;
      player.lastSeenAt = now;
    }

    save(data);
    return player;
  }

  function getPlayerWallet(playerId) {
    return load().playerWallets.find((p) => p.id === playerId) || null;
  }

  function listPlayerWallets() {
    return [...load().playerWallets].sort(
      (a, b) => new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0)
    );
  }

  function setPlayerBalance(playerId, balance) {
    const data = load();
    const player = data.playerWallets.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Speler niet gevonden' };
    player.balance = Math.max(0, Math.floor(Number(balance) || 0));
    save(data);
    if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
      StoreBridge.pushPlayerBalance(player);
    }
    return { ok: true, player };
  }

  function addPlayerCoins(playerId, amount) {
    const data = load();
    const player = data.playerWallets.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Speler niet gevonden' };
    const delta = Math.floor(Number(amount) || 0);
    if (!delta) return { ok: false, error: 'Voer een geldig aantal coins in' };
    player.balance = Math.max(0, (player.balance || 0) + delta);
    save(data);
    if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
      StoreBridge.pushPlayerBalance(player);
    }
    return { ok: true, player, added: delta };
  }

  function addCoinsToAllPlayers(amount) {
    const data = load();
    const delta = Math.floor(Number(amount) || 0);
    if (!delta) return { ok: false, error: 'Voer een geldig aantal coins in' };
    if (!data.playerWallets.length) {
      return { ok: false, error: 'Nog geen ingelogde spelers geregistreerd' };
    }
    data.playerWallets.forEach((p) => {
      p.balance = (p.balance || 0) + delta;
      if (typeof StoreBridge !== 'undefined' && StoreBridge.enabled()) {
        StoreBridge.pushPlayerBalance(p);
      }
    });
    save(data);
    return { ok: true, count: data.playerWallets.length, added: delta };
  }

  function removePlayerWallet(playerId) {
    const data = load();
    const before = data.playerWallets.length;
    data.playerWallets = data.playerWallets.filter((p) => p.id !== playerId);
    if (data.playerWallets.length === before) {
      return { ok: false, error: 'Speler niet gevonden' };
    }
    save(data);
    return { ok: true };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = structuredClone(DEFAULTS);
        fresh.users = createDefaultOwner('grp2026');
        return fresh;
      }
      return migrate(JSON.parse(raw));
    } catch {
      const fresh = structuredClone(DEFAULTS);
      fresh.users = createDefaultOwner('grp2026');
      return fresh;
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function get() {
    return load();
  }

  function update(partial) {
    const data = { ...load(), ...partial };
    save(data);
    return data;
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = structuredClone(DEFAULTS);
    fresh.users = createDefaultOwner('grp2026');
    save(fresh);
    return fresh;
  }

  function formatPrice(n) {
    return '€' + n.toFixed(2).replace('.', ',');
  }

  function getCurrentUserId() {
    return sessionStorage.getItem(USER_KEY);
  }

  function getCurrentUser() {
    const id = getCurrentUserId();
    if (!id) return null;
    return load().users.find((u) => u.id === id && u.active !== false) || null;
  }

  function hasPermission(perm, user = null) {
    const u = user || getCurrentUser();
    if (!u) return false;
    if (u.permissions.includes('*')) return true;
    return u.permissions.includes(perm);
  }

  function isOwner(user = null) {
    const u = user || getCurrentUser();
    return u?.permissions?.includes('*') || u?.role === 'owner';
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function login(username, password) {
    const data = load();
    const user = data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.active !== false
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: 'Onjuiste gebruikersnaam of wachtwoord' };
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem(USER_KEY, user.id);
    return { ok: true, user };
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  function exportJson() {
    return JSON.stringify(load(), null, 2);
  }

  function importJson(json) {
    const parsed = JSON.parse(json);
    const migrated = migrate(parsed);
    save(migrated);
    return migrated;
  }

  function addUser({ username, password, displayName, permissions, role }) {
    const data = load();
    const exists = data.users.some(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (exists) return { ok: false, error: 'Gebruikersnaam bestaat al' };
    if (!username.trim() || password.length < 4) {
      return { ok: false, error: 'Gebruikersnaam en wachtwoord (min. 4 tekens) verplicht' };
    }
    if (permissions?.includes('*') && !isOwner()) {
      return { ok: false, error: 'Alleen eigenaars kunnen volledige toegang geven' };
    }

    const user = {
      id: 'user-' + Date.now(),
      username: username.trim(),
      passwordHash: hashPassword(password),
      displayName: displayName?.trim() || username.trim(),
      permissions: permissions?.length ? permissions : ['general'],
      role: role || 'custom',
      active: true,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    save(data);
    return { ok: true, user };
  }

  function updateUser(userId, updates) {
    const data = load();
    const idx = data.users.findIndex((u) => u.id === userId);
    if (idx === -1) return { ok: false, error: 'Gebruiker niet gevonden' };

    const user = data.users[idx];

    if (updates.username) {
      const taken = data.users.some(
        (u, i) => i !== idx && u.username.toLowerCase() === updates.username.trim().toLowerCase()
      );
      if (taken) return { ok: false, error: 'Gebruikersnaam bestaat al' };
      user.username = updates.username.trim();
    }
    if (updates.displayName !== undefined) user.displayName = updates.displayName.trim();
    if (updates.permissions) {
      if (updates.permissions.includes('*') && !isOwner()) {
        return { ok: false, error: 'Alleen eigenaars kunnen volledige toegang geven' };
      }
      user.permissions = updates.permissions;
    }
    if (updates.role) user.role = updates.role;
    if (updates.active !== undefined) {
      if (!updates.active && isOwner(user)) {
        const owners = data.users.filter((u) => u.permissions.includes('*') && u.active !== false);
        if (owners.length <= 1) {
          return { ok: false, error: 'Kan de laatste eigenaar niet deactiveren' };
        }
      }
      user.active = updates.active;
    }
    if (updates.password && updates.password.length >= 4) {
      user.passwordHash = hashPassword(updates.password);
    }

    data.users[idx] = user;
    save(data);
    return { ok: true, user };
  }

  function deleteUser(userId) {
    const data = load();
    const user = data.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'Gebruiker niet gevonden' };
    if (getCurrentUserId() === userId) {
      return { ok: false, error: 'Je kunt jezelf niet verwijderen' };
    }
    if (isOwner(user)) {
      const owners = data.users.filter((u) => u.permissions.includes('*') && u.active !== false);
      if (owners.length <= 1) {
        return { ok: false, error: 'Kan de laatste eigenaar niet verwijderen' };
      }
    }
    data.users = data.users.filter((u) => u.id !== userId);
    save(data);
    return { ok: true };
  }

  return {
    PERMISSIONS,
    ALL_PERMS,
    ROLE_PRESETS,
    DEFAULTS,
    STORAGE_KEY,
    hashPassword,
    get,
    save,
    update,
    reset,
    formatPrice,
    getCurrentUser,
    getCurrentUserId,
    hasPermission,
    isOwner,
    isLoggedIn,
    login,
    logout,
    exportJson,
    importJson,
    addUser,
    updateUser,
    deleteUser,
    computeRulesMeta,
    getRulesContent,
    makePlayerId,
    upsertPlayer,
    getPlayerWallet,
    listPlayerWallets,
    setPlayerBalance,
    addPlayerCoins,
    addCoinsToAllPlayers,
    removePlayerWallet,
    getIngameStore,
    saveIngameStore,
    getStoreCatalog,
    saveStoreCatalog,
    syncStoreProductsFromLegacy,
    countProductsInCategory,
    getSpinWheel,
    defaultSpinWheel,
  };
})();
