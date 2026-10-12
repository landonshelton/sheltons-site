/* sitewire.js: the tiny loader every pasted page includes. It never needs to change.
 * It pulls core.js (the real live layer) fresh from the repo, so a push reaches the
 * site in minutes instead of waiting out jsDelivr's 12-hour cache. If GitHub is
 * unreachable it falls back to the jsDelivr copy of core.js.
 */
(function () {
  var me = document.currentScript;
  var base = ((me && me.getAttribute('data-base')) || 'https://raw.githubusercontent.com/landonshelton/sheltons-site/main/live/').replace(/live\/$/, '');
  function cdn() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/gh/landonshelton/sheltons-site@main/core.js';
    document.head.appendChild(s);
  }
  fetch(base + 'core.js?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw r.status; return r.text(); })
    .then(function (t) { var s = document.createElement('script'); s.text = t; document.head.appendChild(s); })
    .catch(cdn);
})();
