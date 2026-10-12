/* sitewire.js: the live layer for sheltonspremiumdetail.com.
 * Every page element pastes once; this script keeps its numbers current.
 *
 *  <span data-live="rating">5.0</span>         rating | reviews | vehicles | jobs
 *  <span data-price="bBm4hssJTOVp3PsH9DPN" data-tier="Coupe/Sedan">$300</span>
 *       optional data-mult="2" (e.g. monthly = 2 visits), data-from (prefix "from ")
 *  <div data-reviews="6" data-min-words="8"></div>  newest text reviews, 5 stars only
 *  <script src=".../sitewire.js" data-ga4="G-XXXXXXX" defer></script>  GA4 site visits
 *
 * Inline text is the fallback: if the data can't load, the page keeps what was pasted.
 *
 * Live code: the pasted element is wrapped in <div id="spd-live" data-page="home" data-v="HASH">.
 * On load this fetches pages/<page>.html from the repo; if its data-v differs, the
 * wrapper's contents are swapped for the new version and its scripts re-run. So a push
 * to sheltons-site reaches the site in minutes with no re-paste. The pasted copy stays
 * as the fallback and as what search engines read first.
 */
(function () {
  var me = document.currentScript || document.querySelector('script[src*="sitewire.js"]');
  var DATA = (me && me.getAttribute('data-base')) ||
    'https://raw.githubusercontent.com/landonshelton/sheltons-site/main/live/';
  var GA4 = me && me.getAttribute('data-ga4');
  var PAGES = DATA.replace(/live\/$/, 'pages/');

  function get(name) {
    return fetch(DATA + name + '?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw r.status; return r.json(); });
  }
  function money(n) {
    return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : Math.round(n).toLocaleString('en-US'));
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function numbers() {
    return get('numbers.json').then(function (d) {
      document.querySelectorAll('[data-live]').forEach(function (el) {
        var k = el.getAttribute('data-live'), v = d[k];
        if (v == null) return;
        el.textContent = k === 'rating' ? Number(v).toFixed(1) : Number(v).toLocaleString('en-US');
      });
    }).catch(function () {});
  }

  function prices() {
    if (!document.querySelector('[data-price]')) return Promise.resolve();
    return get('prices.json').then(function (d) {
      document.querySelectorAll('[data-price]').forEach(function (el) {
        var p = d.products && d.products[el.getAttribute('data-price')];
        if (!p) return;
        var tiers = p.tiers || {}, t = el.getAttribute('data-tier');
        var v = t ? tiers[t] : (tiers.flat != null ? tiers.flat : Math.min.apply(null, Object.values(tiers)));
        if (v == null || !isFinite(v)) return;
        v = v * Number(el.getAttribute('data-mult') || 1);
        el.textContent = (el.hasAttribute('data-from') ? 'from ' : '') + money(v);
      });
    }).catch(function () {});
  }

  function reviews() {
    var slots = document.querySelectorAll('[data-reviews]');
    if (!slots.length) return Promise.resolve();
    return get('reviews.json').then(function (d) {
      slots.forEach(function (slot) {
        var n = Number(slot.getAttribute('data-reviews') || 6), min = Number(slot.getAttribute('data-min-words') || 6);
        var items = (d.items || []).filter(function (r) {
          return r.stars === 5 && r.text && r.text.split(/\s+/).length >= min;
        }).slice(0, n);
        if (!items.length) return;
        slot.innerHTML = items.map(function (r) {
          var when = r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
          return '<div class="sw-review"><div class="sw-rhead">' +
            (r.avatar ? '<img class="sw-av" src="' + esc(r.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
            '<div><b>' + esc(r.name) + '</b><small>' + esc(when) + '</small></div></div>' +
            '<div class="sw-stars" aria-label="5 stars">★★★★★</div><p>' + esc(r.text) + '</p>' +
            (r.photos && r.photos[0] ? '<img class="sw-photo" src="' + esc(r.photos[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
            '</div>';
        }).join('');
        slot.classList.add('sw-filled');
      });
    }).catch(function () {});
  }

  function ga4() {
    if (!GA4 || window.gtag) return;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', GA4);
    // booking clicks count as conversions
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && (a.href.indexOf('urable.com') > -1 || a.getAttribute('href') === '#book')) {
        window.gtag('event', 'book_click', { page: location.pathname, label: (a.textContent || '').trim().slice(0, 60) });
      }
    }, true);
  }

  function swap() {
    var w = document.getElementById('spd-live');
    if (!w || !w.getAttribute('data-page')) return Promise.resolve();
    return fetch(PAGES + w.getAttribute('data-page') + '.html?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw r.status; return r.text(); })
      .then(function (t) {
        var n = new DOMParser().parseFromString(t, 'text/html').getElementById('spd-live');
        if (!n || !n.getAttribute('data-v') || n.getAttribute('data-v') === w.getAttribute('data-v')) return;
        w.innerHTML = n.innerHTML;
        w.setAttribute('data-v', n.getAttribute('data-v'));
        w.querySelectorAll('script').forEach(function (old) {
          var s = document.createElement('script');
          for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
          s.text = old.text;
          old.replaceWith(s);
        });
      }).catch(function () {});
  }

  function all() { swap().then(function () { numbers(); prices(); reviews(); }); }
  ga4();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
  setInterval(numbers, 15 * 60 * 1000);
})();
