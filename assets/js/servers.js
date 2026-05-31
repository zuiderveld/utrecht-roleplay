(function () {
    var REFRESH_MS = 45000;

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function tagLabel(t) {
        if (t === 'nl') return 'NL';
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function matchesFilters(srv, f) {
        var q = (f.q || '').toLowerCase().trim();
        if (q) {
            var hay =
                (srv.name || '').toLowerCase() +
                ' ' +
                (srv.description || '').toLowerCase() +
                ' ' +
                (srv.hostname || '').toLowerCase() +
                ' ' +
                (srv.tags || []).join(' ');
            if (hay.indexOf(q) === -1) return false;
        }
        if (f.tags && f.tags.length) {
            var ok = f.tags.some(function (t) {
                return (srv.tags || []).indexOf(t) !== -1;
            });
            if (!ok) return false;
        }
        if (f.hideEmpty && srv.status === 'up' && !(srv.clients > 0)) return false;
        return true;
    }

    function renderCard(srv) {
        var on = srv.status === 'up';
        var clients = on ? srv.clients || 0 : 0;
        var max = on ? srv.maxClients || 128 : 128;
        var title = srv.hostname || srv.name;
        var connect =
            srv.connectUrl || 'fivem://connect/' + srv.host + ':' + (srv.port || 30120);
        var map = srv.mapname ? ' · ' + srv.mapname : '';
        var logo = srv.logo || 'assets/images/logo.png';

        var tagHtml = (srv.tags || [])
            .map(function (t) {
                var cls = t === 'nl' ? 'cfx-tag lang' : 'cfx-tag';
                return '<span class="' + cls + '">' + esc(tagLabel(t)) + '</span>';
            })
            .join('');
        if (srv.locale) {
            tagHtml += '<span class="cfx-tag lang">' + esc(String(srv.locale).toUpperCase()) + '</span>';
        }

        return (
            '<article class="cfx-server' +
            (on ? '' : ' offline') +
            '" data-id="' +
            esc(srv.id) +
            '">' +
            '<div class="cfx-server-accent"></div>' +
            '<div class="cfx-server-inner">' +
            '<div class="cfx-server-icon"><img src="' +
            esc(logo) +
            '" alt=""></div>' +
            '<div class="cfx-server-info">' +
            '<h3>' +
            esc(title) +
            '</h3>' +
            '<div class="cfx-server-tags">' +
            tagHtml +
            '</div>' +
            '<p class="cfx-server-desc">' +
            esc(srv.description || '') +
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
            '<a class="cfx-connect secondary" href="status.html">Status</a>' +
            '</div></article>'
        );
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
        };
    }

    function load() {
        var list = document.getElementById('serverList');
        var count = document.getElementById('serverCount');
        var f = getFilters();

        fetch('/api/servers', { cache: 'no-store' })
            .then(function (r) {
                return r.json();
            })
            .then(function (data) {
                var servers = data.servers || [];
                var visible = servers.filter(function (s) {
                    return matchesFilters(s, f);
                });
                if (!visible.length) {
                    list.innerHTML =
                        '<div class="cfx-empty">Geen servers gevonden met deze filters.</div>';
                    count.textContent = '0 servers';
                } else {
                    list.innerHTML = visible.map(renderCard).join('');
                    count.textContent =
                        visible.length + (visible.length === 1 ? ' server' : ' servers');
                }
                document.getElementById('livePing').textContent =
                    'Live · ' +
                    new Date().toLocaleTimeString('nl-NL', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });
            })
            .catch(function () {
                list.innerHTML =
                    '<div class="cfx-empty">Kon serverlijst niet laden. Controleer of /api/servers live staat.</div>';
                count.textContent = '—';
            });
    }

    document.getElementById('serverSearch').addEventListener('input', load);
    document.querySelectorAll('.cfx-filter-tag, #hideEmpty').forEach(function (el) {
        el.addEventListener('change', load);
    });

    load();
    setInterval(load, REFRESH_MS);
})();
