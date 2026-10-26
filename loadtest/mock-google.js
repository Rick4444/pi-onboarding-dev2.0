/* =====================================================================
   Local stand-in for Google Forms, used ONLY for load testing.
   It answers POST /formResponse like Google would, can be made slow or flaky, and counts what it receives
   so you can compare "customers who clicked Submit" with "responses that arrived".
   Never point load tests at the real Google Forms: it is not allowed and it would fill your response sheets.

   Run:   node mock-google.js            (listens on http://localhost:9090)
   Options (environment variables):
     LATENCY_MS=800     typical delay before answering
     JITTER_MS=1500     extra random delay on top
     FAIL_PERCENT=10    percent of requests that are dropped like a bad network
     SLOW_PERCENT=2     percent of requests that never answer (timeout test)
   Stats:  http://localhost:9090/stats      Reset: http://localhost:9090/reset
   ===================================================================== */
const http = require("http");
const LATENCY = +process.env.LATENCY_MS || 800, JITTER = +process.env.JITTER_MS || 1500;
const FAIL = +process.env.FAIL_PERCENT || 0, SLOW = +process.env.SLOW_PERCENT || 0;
let received = 0, dropped = 0, hung = 0, peak = 0, inflight = 0;
const seen = new Map();            /* body hash -> count, to spot duplicate submissions */

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/stats") { res.end(JSON.stringify({ received, dropped, hung, peakConcurrent: peak, duplicates: [...seen.values()].filter(n => n > 1).length })); return; }
  if (req.url === "/reset") { received = dropped = hung = peak = 0; seen.clear(); res.end("ok"); return; }
  if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Headers": "*" }); res.end(); return; }
  inflight++; peak = Math.max(peak, inflight);
  let body = ""; req.on("data", d => body += d);
  req.on("end", () => {
    const r = Math.random() * 100;
    if (r < FAIL) { inflight--; dropped++; req.socket.destroy(); return; }       /* connection dropped */
    if (r < FAIL + SLOW) { hung++; return; }                                     /* never answers */
    setTimeout(() => {
      inflight--; received++; seen.set(body, (seen.get(body) || 0) + 1);
      res.writeHead(200, { "Content-Type": "text/html" }); res.end("ok");
    }, LATENCY + Math.random() * JITTER);
  });
}).listen(9090, () => console.log("mock Google listening on http://localhost:9090"));
