/* =====================================================================
   k6 load test for the STATIC files only (index.html, styles.css, app.js, config.js, messages.js, sw.js).
   This answers "can the web host serve 10,000 visitors opening the page at once?"

   Run:  k6 run -e SITE=https://YOUR-SITE.example.com k6-static.js
   - Test your own staging copy or a CDN you control. GitHub Pages terms do not allow stress-testing github.io,
     so for a real 10,000-visitor rehearsal host a copy on Cloudflare Pages, Netlify or Firebase Hosting and test that.
   - Never aim this at docs.google.com (Google Forms) or script.google.com.
   Stages below ramp to 10,000 virtual visitors in 5 minutes, hold for 5, then ramp down.
   ===================================================================== */
import http from "k6/http";
import { check, sleep } from "k6";
const SITE = (__ENV.SITE || "http://localhost:8080").replace(/\/$/, "");
const FILES = ["/", "/styles.css", "/config.js", "/messages.js", "/app.js"];
export const options = {
  stages: [{ duration: "5m", target: 10000 }, { duration: "5m", target: 10000 }, { duration: "2m", target: 0 }],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<2000"] },
};
export default function () {
  const res = http.batch(FILES.map(f => ["GET", SITE + f + (f === "/" ? "" : "?v=load")]));
  res.forEach(r => check(r, { "status 200": x => x.status === 200 }));
  sleep(5 + Math.random() * 10);   /* a visitor reads the page before the next action */
}
