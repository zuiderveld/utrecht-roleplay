(function () {
    var REFRESH_MS = 120000;
    var state = { page: 1, loading: false, firstLoad: true };

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function tagLabel(t) {
        if (t === 'nl') return 'NL';
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function getFilters() {
        var tags = [];
        document.querySelectorAll('.cfx-filter-tag:checked').forEach(function (el) {
            tags.push(el.value);
        });
        return {
            q: document.getElementById('serverSearch').value,
            tags: tags,
            hideEmpty: document.getElementById('hideEmpty').checked,
            locale: document.getElementById('localeFilter').value,
        };
    }

    function matchesClientFilters(srv, f) {
        if (f.tags && f.tags.length) {
            var ok = f.tags.some(function (t) {
                if (t === 'nl') {
                    return (
                        srv.localeRegion === 'NL' ||
                        (srv.locale || '').toLowerCase().indexOf('nl') !== -1 ||
                        (srv.tags || []).indexOf('nl') !== -1
                    );
                }
                return (srv.tags || []).indexOf(t) !== -1;
            });
            if (!ok) return false;
        }
        return true;
    }

    function renderCard(srv) {
        var clients = srv.clients || 0;
        var max = srv.maxClients || 128;
        var title = srv.hostname || srv.name || 'FiveM Server';
        var connect =
            srv.fivemConnect ||
            srv.connectUrl ||
            (srv.host ? 'fivem://connect/' + srv.host + ':' + (srv.port || 30120) : '#');
        var map = srv.mapname ? ' · ' + srv.mapname : '';
        var logo = srv.iconUrl || srv.logo || '';
        var iconHtml = logo
            ? '<img src="' + esc(logo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<span class="cfx-icon-fallback"><i class="fas fa-server"></i></span>';

        var tagHtml = (srv.tags || [])
            .slice(0, 6)
            .map(function (t) {
                var cls = t === 'nl' ? 'cfx-tag lang' : 'cfx-tag';
                return '<span class="' + cls + '">' + esc(tagLabel(t)) + '</span>';
            })
            .join('');
        if (srv.localeRegion) {
            tagHtml += '<span class="cfx-tag lang">' + esc(srv.localeRegion) + '</span>';
        }
        if (srv.featured) {
            tagHtml += '<span class="cfx-tag featured">URP</span>';
        }

        var cfxLink = srv.endpoint
            ? 'https://cfx.re/join/' + encodeURIComponent(srv.endpoint)
            : connect;

        return (
            '<article class="cfx-server' +
            (srv.featured ? ' featured' : '') +
            '" data-id="' +
            esc(srv.id || srv.endpoint) +
            '">' +
            '<div class="cfx-server-accent"></div>' +
            '<div class="cfx-server-inner">' +
            '<div class="cfx-server-icon">' +
            iconHtml +
            '</div>' +
            '<div class="cfx-server-info">' +
            '<h3>' +
            esc(title) +
            '</h3>' +
            '<div class="cfx-server-tags">' +
            tagHtml +
            '</div>' +
            '<p class="cfx-server-desc">' +
            esc(srv.gametype || '') +
            esc(map) +
            '</p></div></div>' +
            '<div class="cfx-server-side">' +
            '<span class="cfx-players"><i class="fas fa-circle"></i> ' +
            clients +
            '/' +
            max +
            '</span>' +
            '<a class="cfx-connect" href="' +
            esc(connect) +
            '">Connect</a>' +
            '<a class="cfx-connect secondary" href="' +
            esc(cfxLink) +
            '" target="_blank" rel="noopener">Cfx.re</a>' +
            '</div></article>'
        );
    }

    function buildQuery(f) {
        var params = new URLSearchParams();
        params.set('page', String(state.page));
        params.set('perPage', '40');
        if (f.q) params.set('q', f.q);
        if (f.locale) params.set('locale', f.locale);
        if (f.hideEmpty) params.set('hideEmpty', '1');
        if (f.tags.length) params.set('tags', f.tags.join(','));
        return params.toString();
    }

    function renderPagination(meta) {
        var el = document.getElementById('serverPagination');
        if (!meta || meta.pages <= 1) {
            el.innerHTML = '';
            return;
        }
        var prev = meta.page > 1 ? meta.page - 1 : 1;
        var next = meta.page < meta.pages ? meta.page + 1 : meta.pages;
        el.innerHTML =
            '<button type="button" class="cfx-page-btn" data-page="' +
            prev +
            '" ' +
            (meta.page <= 1 ? 'disabled' : '') +
            '>Vorige</button>' +
            '<span>Pagina ' +
            meta.page +
            ' / ' +
            meta.pages +
            '</span>' +
            '<button type="button" class="cfx-page-btn" data-page="' +
            next +
            '" ' +
            (meta.page >= meta.pages ? 'disabled' : '') +
            '>Volgende</button>';
        el.querySelectorAll('.cfx-page-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                state.page = parseInt(btn.getAttribute('data-page'), 10) || 1;
                load();
            });
        });
    }

    function load() {
        if (state.loading) return;
        state.loading = true;
        var list = document.getElementById('serverList');
        var count = document.getElementById('serverCount');
        var f = getFilters();

        if (state.firstLoad) {
            list.innerHTML =
                '<div class="cfx-empty"><i class="fas fa-spinner fa-spin"></i> Volledige FiveM-lijst laden (kan 15–30 sec duren)…</div>';
        }

        fetch('/api/cfx-servers?' + buildQuery(f), { cache: 'no-store' })
            .then(function (r) {
                return r.json();
            })
            .then(function (data) {
                state.loading = false;
                state.firstLoad = false;
                if (data.error) throw new Error(data.error);

                var servers = (data.servers || []).filter(function (s) {
                    return matchesClientFilters(s, f);
                });
                var meta = data.meta || {};

                if (!servers.length) {
                    list.innerHTML =
                        '<div class="cfx-empty">Geen servers gevonden. Pas filters aan of probeer een andere pagina.</div>';
                } else {
                    list.innerHTML = servers.map(renderCard).join('');
                }

                count.textContent =
                    (meta.total != null ? meta.total.toLocaleString('nl-NL') : servers.length) +
                    ' servers' +
                    (meta.total != null ? ' (totaal in lijst)' : '');

                document.getElementById('livePing').textContent =
                    'Live · ' +
                    new Date().toLocaleTimeString('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });

                renderPagination(meta);
            })
            .catch(function (err) {
                state.loading = false;
                list.innerHTML =
                    '<div class="cfx-empty">' +
                    esc(err.message || 'Kon serverlijst niet laden') +
                    '. Controleer of <code>/api/cfx-servers</code> gedeployed is.</div>';
                count.textContent = '—';
            });
    }

    function resetAndLoad() {
        state.page = 1;
        load();
    }

    document.getElementById('serverSearch').addEventListener('input', function () {
        clearTimeout(window._srvSearchT);
        window._srvSearchT = setTimeout(resetAndLoad, 400);
    });
    document.querySelectorAll('.cfx-filter-tag, #hideEmpty, #localeFilter').forEach(function (el) {
        el.addEventListener('change', resetAndLoad);
    });

    load();
    setInterval(function () {
        if (!state.loading) load();
    }, REFRESH_MS);
})();
