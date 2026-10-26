/* =====================================================================
   Service worker: lets the portal open again when there is no connection (after one successful visit)
   and makes repeat visits fast on slow networks.

   What it does
   - Pages (index.html): network first, but if the network is slower than NAV_TIMEOUT_MS or fails,
     the saved copy is shown instead. Visitors therefore get new releases quickly, and still get a page when offline.
   - Our own files (styles.css, app.js, config.js, messages.js): served from the saved copy at once and refreshed
     in the background. The ?v= number on each link in index.html makes every release a new file name,
     so an old copy is never mixed with new code.
   - Everything else (Google Forms, Apps Script, Google Fonts) is NEVER touched. Submissions always go straight to Google.

   NOTE: this is the "dev" copy. Its cache names start with "pin-dev-" and its browser-storage keys with "pind_", so it never touches the live site.
   RELEASE CHECKLIST: when you publish a new version, change CACHE below to a new name AND the ?v= number in index.html.
   Old caches are deleted automatically.
   ===================================================================== */
var CACHE = "pin-dev-v1";
var NAV_TIMEOUT_MS = 3500;
var CORE = ["./", "index.html", "styles.css", "config.js", "messages.js", "app.js"];

/* Save the core files when the worker is installed. A missing file must not block installation. */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* Remove caches from older releases. */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf("pin-dev-") === 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Store a good response for later. Only complete, same-origin answers are kept. */
function keep(req, res) {
  if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;   /* leave Google and fonts alone */

  /* Page loads: network first with a time limit, then the saved copy. */
  if (req.mode === "navigate") {
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function fallback() { caches.match("index.html", { ignoreSearch: true }).then(function (r) { if (r) { done = true; resolve(r); } }); }
      var timer = setTimeout(fallback, NAV_TIMEOUT_MS);
      fetch(req).then(function (res) { clearTimeout(timer); if (!done) { done = true; resolve(keep(req, res)); } else keep(req, res); })
        .catch(function () { clearTimeout(timer); caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html", { ignoreSearch: true }); }).then(function (r) { if (!done) { done = true; resolve(r || Response.error()); } }); });
    }));
    return;
  }

  /* Our own files: saved copy first, refreshed in the background. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { return keep(req, res); }).catch(function () { return hit || Response.error(); });
      return hit || net;
    })
  );
});
