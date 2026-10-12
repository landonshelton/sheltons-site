/* core.js: the live layer for sheltonspremiumdetail.com, loaded by sitewire.js.
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
  var me = document.querySelector('script[src*="sitewire.js"]') || document.currentScript;
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

  function fmt(k, v) { return k === 'rating' ? Number(v).toFixed(1) : Math.round(Number(v)).toLocaleString('en-US'); }
  // the rating's decimal point sits in .sw-dot so each page can tighten it
  function put(el, k, txt) {
    if (k === 'rating') el.innerHTML = esc(txt).replace('.', '<span class="sw-dot">.</span>');
    else el.textContent = txt;
  }

  function numbers() {
    return get('numbers.json').then(function (d) {
      document.querySelectorAll('[data-live]').forEach(function (el) {
        var k = el.getAttribute('data-live'), v = d[k];
        if (v == null) return;
        if (el.getAttribute('data-sw-counting')) el.setAttribute('data-sw-to', v);
        else put(el, k, fmt(k, v));
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

  // Scroll reveals: anything starting below the fold rises in when it scrolls into view;
  // grid and flex rows stagger their items; live stat numbers count up. Nothing already
  // on screen is hidden, so the first paint never flickers. Styles live in each page.
  function motion() {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var fold = innerHeight;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('sw-in');
        io.unobserve(e.target);
        e.target.querySelectorAll ? [e.target].concat([].slice.call(e.target.querySelectorAll('[data-live]'))).forEach(count) : 0;
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    function prep(el, d) {
      if (el.classList.contains('sw-rv') || el.getBoundingClientRect().top < fold) return;
      el.style.setProperty('--swd', d + 'ms');
      el.classList.add('sw-rv');
      io.observe(el);
    }
    document.querySelectorAll('.spd section:not(.hero), .spd footer').forEach(function (sec) {
      [].slice.call(sec.children).forEach(function (c, i) {
        var d = getComputedStyle(c).display, kids = c.children;
        if ((d === 'grid' || d === 'flex') && kids.length > 1 && kids.length <= 12 && !c.querySelector('.adroll') && !c.classList.contains('adroll')) {
          [].slice.call(kids).forEach(function (k, j) { prep(k, j * 80); });
        } else prep(c, Math.min(i, 3) * 60);
      });
    });
    document.querySelectorAll('.spd [data-live]').forEach(function (el) {
      if (el.getBoundingClientRect().top < fold) count(el);
    });
  }

  function count(el) {
    if (!el.hasAttribute || !el.hasAttribute('data-live') || el.closest('.hero')) return;
    var k = el.getAttribute('data-live'), to = parseFloat(el.textContent.replace(/,/g, ''));
    if (!isFinite(to) || to <= 0) return;
    el.setAttribute('data-sw-counting', '1'); el.setAttribute('data-sw-to', to);
    var t0 = performance.now(), dur = 1300;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3), target = Number(el.getAttribute('data-sw-to'));
      put(el, k, k === 'rating' ? (target * e).toFixed(1) : fmt(k, target * e));
      if (p < 1) requestAnimationFrame(step);
      else { put(el, k, fmt(k, target)); el.removeAttribute('data-sw-counting'); }
    })(t0);
  }

  function all() { swap().then(function () { motion(); numbers(); prices(); reviews(); }); }
  ga4();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
  setInterval(numbers, 15 * 60 * 1000);
})();
