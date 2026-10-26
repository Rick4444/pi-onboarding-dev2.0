/* =====================================================================
   Live visitor count: "N online now - M filling the form".

   Separate from app.js on purpose: if anything here fails, the page simply hides the counter and the form works exactly as before.
   It stays switched off until PRESENCE.DB_URL in config.js is filled in.

   How it works (no personal data is stored):
   - Each open tab makes a random id and writes {t: server time, f: 0 or 1} to  <DB_URL>/presence/<id>.json  every HEARTBEAT_MS.
     f is 1 if the visitor typed or chose something in the last 60 seconds ("filling").
   - Each tab also reads the latest entries and counts those whose time is within STALE_MS of the newest one.
     Using the database's own clock means different phones with wrong clocks still count correctly.
   - When a tab closes it deletes its entry; entries that are not refreshed simply fall out of the count.
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

  var id = "";
  try { var a = new Uint8Array(9); crypto.getRandomValues(a); id = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  catch (e) { id = String(Date.now()) + Math.random().toString(16).slice(2, 10); }

  var lastTyped = 0, timer = 0, gone = false;
  ["input", "change"].forEach(function (ev) { document.addEventListener(ev, function () { lastTyped = Date.now(); }, true); });

  function url(path, q) { return DB + path + ".json" + (q ? "?" + q : ""); }

  function beat() {
    var filling = lastTyped && Date.now() - lastTyped < 60000 ? 1 : 0;
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

  function leave() {
    if (gone) return; gone = true; clearTimeout(timer);
    try { fetch(url("/presence/" + id), { method: "DELETE", keepalive: true }); } catch (e) {}
  }
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !gone) { clearTimeout(timer); tick(); } });
  window.addEventListener("pageshow", function (e) { if (e.persisted && gone) { gone = false; tick(); } });
  tick();
})();
