(function () {
    var REFRESH_MS = 60000;

    var LABELS = {
        operational: { title: 'Alle systemen operationeel', sub: 'Websites en game server reageren normaal.' },
        outage: { title: 'Storing gedetecteerd', sub: 'Minstens één dienst is niet bereikbaar.' },
        degraded: { title: 'Beperkte beschikbaarheid', sub: 'Game server of een website heeft problemen.' },
        loading: { title: 'Status laden…', sub: 'Even geduld.' },
    };

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function ms(n) {
        if (n == null || n < 0) return '—';
        return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(1) + ' s';
    }

    function timeNl(iso) {
        try {
            return new Date(iso).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch (e) {
            return iso || '';
        }
    }

    function signalBars(pct, on) {
        var lit = on ? Math.min(5, Math.max(1, Math.ceil(pct / 20))) : 0;
        var h = '<div class="fivem-signal">';
        for (var i = 1; i <= 5; i++) {
            h += '<span class="' + (i <= lit ? 'on' : '') + '"></span>';
        }
        return h + '</div>';
    }

    function renderFivem(f) {
        if (!f) return '';
        var on = f.status === 'up';
        var c = f.clients || 0;
        var m = f.maxClients || 128;
        var pct = Math.min(100, (c / m) * 100);
        var fill = 'width:' + pct + '%';
        if (c > 0 && pct < 2) fill += ';min-width:8px';

        return (
            '<div class="fivem-card">' +
            '<div class="fivem-card-top">' +
            '<div class="fivem-online' +
            (on ? '' : ' off') +
            '"><i class="fas fa-wifi"></i><span class="fivem-online-dot"></span>' +
            (on ? 'ONLINE' : 'OFFLINE') +
            '</div>' +
            signalBars(pct, on) +
            '</div>' +
            (on
                ? '<div class="fivem-count"><span class="n">' +
                  c +
                  '</span><span class="sep">/</span><span class="max">' +
                  m +
                  '</span></div>' +
                  '<p class="fivem-label"><i class="fas fa-users"></i> Spelers online</p>' +
                  '<div class="fivem-bar"><div class="fivem-bar-fill" style="' +
                  fill +
                  '"></div></div>' +
                  '<div class="fivem-scale"><span>0</span><span>' +
                  m +
                  '</span></div>'
                : '<p class="fivem-label" style="color:#f87171">' +
                  esc(f.error || 'Server offline') +
                  '</p>') +
            '<div class="fivem-actions">' +
            '<a class="fivem-connect" href="' +
            esc(f.connectUrl) +
            '"><i class="fas fa-play"></i> Verbinden in FiveM</a>' +
            '<span class="fivem-meta">' +
            esc(f.hostname || '') +
            (f.mapname ? ' · ' + esc(f.mapname) : '') +
            ' · ' +
            ms(f.latencyMs) +
            '</span></div>' +
            '</div>'
        );
    }

    function icon(name) {
        if (name === 'landmark') return 'fa-landmark';
        if (name === 'shield') return 'fa-shield-halved';
        if (name === 'cart') return 'fa-cart-shopping';
        return 'fa-globe';
    }

    function renderSites(sites) {
        if (!sites || !sites.length) return '<p class="fivem-meta">Geen websites geconfigureerd.</p>';
        var html = '<div class="status-sites">';
        for (var i = 0; i < sites.length; i++) {
            var s = sites[i];
            var maint = s.status === 'maintenance' || (s.maintenance && s.maintenance.global);
            var up = s.status === 'up';
            var pill = maint ? 'maint' : up ? 'up' : 'down';
            var pillLabel = maint ? 'Onderhoud' : up ? 'Online' : 'Offline';
            var extra = '';
            if (maint && s.maintenance && s.maintenance.message) {
                extra = '<p class="fivem-meta" style="margin-top:0.35rem">' + esc(s.maintenance.message) + '</p>';
            }
            html +=
                '<a class="status-site" href="' +
                esc(s.link) +
                '" target="_blank" rel="noopener">' +
                '<div class="status-site-icon"><i class="fas ' +
                icon(s.icon) +
                '"></i></div>' +
                '<div><h3>' +
                esc(s.name) +
                '</h3><p>' +
                esc(s.description) +
                '</p>' + extra + '</div>' +
                '<div><span class="status-pill ' +
                pill +
                '"><span class="status-pill-dot"></span>' +
                pillLabel +
                '</span><br><span class="fivem-meta">' +
                ms(s.latencyMs) +
                '</span></div></a>';
        }
        return html + '</div>';
    }

    function renderAlert(overall, checkedAt, fivem) {
        var copy = LABELS[overall] || LABELS.loading;
        var sub = copy.sub;
        if (fivem && fivem.status === 'up') {
            sub = fivem.clients + ' spelers online (max ' + fivem.maxClients + ')';
        }
        return (
            '<div class="status-alert ' +
            esc(overall) +
            '">' +
            '<span class="status-alert-dot"></span>' +
            '<div><strong>' +
            esc(copy.title) +
            '</strong>' +
            '<span>' +
            esc(sub) +
            '</span>' +
            '<time>Laatste check: ' +
            esc(timeNl(checkedAt)) +
            '</time></div></div>'
        );
    }

    function load() {
        var err = document.getElementById('statusErr');
        err.classList.remove('show');
        document.getElementById('statusAlert').innerHTML = renderAlert('loading', null, null);

        fetch('/api/status', { cache: 'no-store' })
            .then(function (r) {
                return r.json().then(function (d) {
                    if (!r.ok) throw new Error(d.error || 'Laden mislukt');
                    return d;
                });
            })
            .then(function (data) {
                if (data.fivem) delete data.fivem.players;
                document.getElementById('statusAlert').innerHTML = renderAlert(
                    data.overall,
                    data.checkedAt,
                    data.fivem
                );
                document.getElementById('fivemHost').innerHTML = renderFivem(data.fivem);
                document.getElementById('sitesHost').innerHTML = renderSites(data.sites);
            })
            .catch(function (e) {
                err.textContent = e.message || 'Kon status niet laden.';
                err.classList.add('show');
            });
    }

    load();
    setInterval(load, REFRESH_MS);
})();
