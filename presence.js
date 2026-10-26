/* =====================================================================
   Live visitor count: "N online now - M filling the form".

   Separate from app.js on purpose: if anything here fails, the page simply hides the counter and the form works exactly as before.
   It stays switched off until PRESENCE.DB_URL in config.js is filled in.

   How it works (no personal data is stored):
   - Each open tab makes a random id and writes {t: server time, f: 0 or 1} to  <DB_URL>/presence/<id>.json  every HEARTBEAT_MS.
     f is 1 if the visitor typed or chose something in the last 60 seconds ("filling").
   - Each tab also reads the latest entries and counts those whose time is within STALE_MS of the newest one.
     Using the database's own clock means different phones with wrong clocks still count correctly.
   - One browser = one id (kept 12 hours), so refreshes and extra tabs do not add to the count. A closed page drops out within about a minute.
   ===================================================================== */
(function () {
  "use strict";
  var C = (window.PI_CONFIG || {}).PRESENCE || {};
  var DB = String(C.DB_URL || "").replace(/\/+$/, "");
  if (!DB || !/^https:\/\//.test(DB) || !window.fetch) return;

  var BEAT = Math.max(15000, C.HEARTBEAT_MS || 30000);
  var STALE = C.STALE_MS || BEAT * 2 + 10000;
  var LIMIT = C.MAX_READ || 500;
  var T = window.PI_T || function (k) { return k; };
  var host = document.getElementById("presence");
  if (!host) return;

  /* One id per visitor (browser), kept for 12 hours: refreshing the page or opening more tabs is still ONE person.
     Only a random string is saved; if storage is blocked, the id lives for this tab only. */
  var KEY = "pi_presence_" + location.pathname, TYPED = KEY + "_typed", TTL = 12 * 3600 * 1000;
  function rnd() {
    try { var a = new Uint8Array(9); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
    catch (e) { return String(Date.now()) + Math.random().toString(16).slice(2, 10); }
  }
  function getId() {
    var st = null; try { st = window.localStorage; } catch (e) {}
    if (!st) try { st = window.sessionStorage; } catch (e) {}
    try {
      var v = st && JSON.parse(st.getItem(KEY) || "null");
      if (v && v.id && Date.now() - v.ts < TTL) return v.id;
      v = { id: rnd(), ts: Date.now() }; if (st) st.setItem(KEY, JSON.stringify(v)); return v.id;
    } catch (e) { return rnd(); }
  }
  var id = getId();

  var timer = 0, gone = false;
  /* "last typed" is shared between this visitor's tabs, so two tabs never disagree about "filling" */
  function markTyped() { try { localStorage.setItem(TYPED, String(Date.now())); } catch (e) { markTyped.m = Date.now(); } }
  function lastTyped() { try { return Number(localStorage.getItem(TYPED)) || 0; } catch (e) { return markTyped.m || 0; } }
  ["input", "change"].forEach(function (ev) { document.addEventListener(ev, markTyped, true); });

  function url(path, q) { return DB + path + ".json" + (q ? "?" + q : ""); }

  function beat() {
    var lt = lastTyped(), filling = lt && Date.now() - lt < 60000 ? 1 : 0;
    return fetch(url("/presence/" + id), { method: "PUT", body: JSON.stringify({ t: { ".sv": "timestamp" }, f: filling }), keepalive: true, cache: "no-store" });
  }

  function show(n, f) {
    host.hidden = false;
    var online = host.querySelector(".pr-n"), fill = host.querySelector(".pr-f");
    online.textContent = T("presence.online", { n: n >= LIMIT ? LIMIT + "+" : n });
    fill.textContent = f > 0 ? T("presence.filling", { f: f }) : "";
    fill.hidden = f <= 0;
  }

  function read() {
    return fetch(url("/presence", 'orderBy=%22t%22&limitToLast=' + LIMIT), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("read " + r.status); return r.json(); })
      .then(function (d) {
        var rows = Object.keys(d || {}).map(function (k) { return d[k]; }).filter(function (v) { return v && typeof v.t === "number"; });
        if (!rows.length) return;
        var newest = rows.reduce(function (m, v) { return v.t > m ? v.t : m; }, 0);
        var live = rows.filter(function (v) { return newest - v.t <= STALE; });
        show(live.length, live.filter(function (v) { return v.f === 1; }).length);
      });
  }

  function tick() {
    if (gone) return;
    if (document.hidden) { timer = setTimeout(tick, BEAT); return; }           /* background tabs stay quiet */
    beat().then(read).catch(function () { host.hidden = true; }).then(function () { timer = setTimeout(tick, BEAT + Math.round(Math.random() * 4000)); });
  }

  /* On close we do NOT delete: a refresh or a second tab would otherwise make the visitor blink out and back in.
     The entry simply stops being refreshed and drops out of the count within STALE_MS. */
  function leave() { gone = true; clearTimeout(timer); }
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !gone) { clearTimeout(timer); tick(); } });
  window.addEventListener("pageshow", function (e) { if (e.persisted && gone) { gone = false; tick(); } });
  tick();
})();
