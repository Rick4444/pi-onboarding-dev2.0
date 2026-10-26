/* =====================================================================
   Browser load test: N real (headless) visitors fill the WHATSAPP form and press Submit at the same time,
   against a local copy of the site and the mock Google server (mock-google.js). It checks that
   the page copes with slow and failing networks: every visitor ends with either the thank-you or an error that
   keeps their answers, nobody gets stuck on the loading overlay, and retries do not create duplicates.

   Setup (once):   npm install playwright && npx playwright install chromium
   Run:            node mock-google.js                       (terminal 1)
                   node serve.js                              (terminal 2, serves the site on :8080)
                   VISITORS=100 node browser-load.js          (terminal 3)
   Each visitor is a browser tab, so a laptop handles roughly 100-300 at once. For more, run it on several
   machines or use k6-static.js for the page files and rely on the mock for the submit logic.
   ===================================================================== */
const { chromium } = require("playwright");
const N = +process.env.VISITORS || 50, SITE = process.env.SITE || "http://localhost:8080/index.html", MOCK = "http://localhost:9090";
const BI = { pc: "Asha Rao", email: "ceo@acme.com", mob: "9876543210", des: "Director", co: "Acme Pvt Ltd", reg: "Acme Private Limited", web: "https://acme.com", am: "Ravi Kumar" };

(async () => {
  await fetch(MOCK + "/reset").catch(() => { console.error("Start mock-google.js first"); process.exit(1); });
  const browser = await chromium.launch();
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: N }, async (_, i) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript("localStorage.setItem('pi_onboarding_welcome_seen_v1','1')");
    /* send the form to the mock instead of Google (each visitor's answers are unique, so duplicates are detectable) */
    await page.route("**/docs.google.com/forms/**", async r => {
      try {
        const resp = await fetch(MOCK + "/formResponse", { method: "POST", body: r.request().postData() || "" });
        await resp.text(); await r.fulfill({ status: 200, body: "ok" });
      } catch (e) { await r.abort("failed").catch(() => {}); }   /* the mock dropped the connection: the page sees a network failure */
    });
    await page.route("**/config.js*", async r => {
      const body = (await (await r.fetch()).text()).replace("TIMEOUT_MS: 45000", "TIMEOUT_MS: 20000").replace("RETRY_BASE_MS: 1500", "RETRY_BASE_MS: 500");
      r.fulfill({ contentType: "application/javascript", body });
    });
    try {
      await page.goto(SITE);
      for (const [k, v] of Object.entries(BI)) await page.fill("#bi-" + k, k === "co" ? v + " " + i : v);
      await page.click("#bi-go"); await page.click("#tab-whatsapp");
      const P = "#panel-whatsapp ";
      await page.check(P + '[data-id="waba"] input[value="No"]'); await page.check(P + '[data-id="adm"] input');
      await page.check(P + '[data-id="use"] input[value="WhatsApp Business API"]'); await page.fill(P + '[data-id="wan"] input', "98765" + String(10000 + i));
      await page.check(P + '[data-id="host"] input[value="No"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));        /* visitors do not click in the same millisecond */
      const t = Date.now(); await page.click(P + ".submit");
      const outcome = await Promise.race([
        page.waitForSelector("#done[open]", { timeout: 60000 }).then(() => "thank-you"),
        page.waitForSelector("#n-whatsapp.on", { timeout: 60000 }).then(() => "error-shown"),
      ]);
      const kept = outcome === "error-shown" ? (await page.inputValue(P + '[data-id="wan"] input')) !== "" : true;
      return { outcome, kept, ms: Date.now() - t };
    } catch (e) { return { outcome: "STUCK", kept: false, ms: 60000 }; } finally { await ctx.close(); }
  }));
  await browser.close();
  const stats = await (await fetch(MOCK + "/stats")).json();
  const by = o => results.filter(r => r.outcome === o).length, ms = results.map(r => r.ms).sort((a, b) => a - b);
  console.log(`\nVisitors: ${N}   total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Thank-you shown: ${by("thank-you")}   Error shown (answers kept): ${by("error-shown")}   Stuck: ${by("STUCK")}`);
  console.log(`Submit time  median ${ms[Math.floor(ms.length / 2)]} ms   95th percentile ${ms[Math.floor(ms.length * 0.95)]} ms`);
  console.log("Mock Google received:", stats.received, " dropped:", stats.dropped, " never answered:", stats.hung, " peak concurrent:", stats.peakConcurrent, " duplicate submissions:", stats.duplicates);
  const bad = by("STUCK") > 0 || results.some(r => !r.kept) || stats.duplicates > 0;
  console.log(bad ? "\nRESULT: PROBLEM FOUND" : "\nRESULT: PASS (no stuck visitors, no lost answers on screen, no duplicates)");
  process.exit(bad ? 1 : 0);
})();
