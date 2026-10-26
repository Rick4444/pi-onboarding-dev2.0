# Production guide: connection handling, capacity and load testing

## What the site does when the network is bad

| Situation | What the customer sees | What the code does |
|---|---|---|
| No connection while filling | Amber banner "You are offline". Answers keep saving on the device. Submit is disabled with a note. | Listens to the browser's online/offline events (`app.js`, "Connection handling"). |
| Connection returns | Green "You are back online" for 4 seconds. Submit works again. | Same events. |
| Page opened with no connection (after one earlier visit) | The full page opens from the saved copy, with the offline banner. | `sw.js` service worker (https only). |
| Very slow link / data saver | One-time "connection looks slow" banner. | `navigator.connection`. |
| Submit takes long | Loading overlay. After 8 s it adds "this is taking longer than usual, do not close this page". | `busy()`; wait time is `NETWORK.SLOW_MS`. |
| Connection drops during submit | Overlay says "Connection problem. Trying again (1 of 2)". Up to 2 retries, waiting 1.5 s then 3 s, plus a random part. | `withRetry()`; settings in `config.js` `NETWORK`. |
| Google does not answer within 45 s | Message: "We could not confirm your submission... if you already received a confirmation email, you do not need to submit again." Answers are kept. | Timeouts are not retried (the first try may have arrived). |
| Bot fills the hidden field | Sees a thank-you; nothing is sent. | `HONEYPOT` in `config.js`. |

Everything the customer typed is kept on the device until a submission succeeds or they press Clear.

## Where the limits are (be honest with management)

- **The website itself** is six small files: about 46 KB in total when compressed. 10,000 visitors is roughly 0.5 GB of transfer.
  A static host with a CDN (GitHub Pages, Cloudflare Pages, Netlify, Firebase Hosting) handles this without special work.
- **Google Forms** is the part that cannot be load-tested from here. It accepts submissions from the visitors' own browsers
  (not from one server), which is the friendliest way to use it, and Google does not publish a hard per-minute limit.
  Even so, nobody can promise 10,000 simultaneous submissions go through unthrottled. Mitigations built in: random retry delays,
  no retry after a timeout (so no duplicate floods), and a clear message with answers kept.
  Recommended: send invitations in batches (for example 1,000 per 10 minutes) instead of all at once.
- **Google Sheets** response sheet: up to 10 million cells per spreadsheet. At about 25 columns per row that is hundreds of thousands of responses.
- **Form notification emails** (if you send them through Apps Script or an add-on) are subject to Google's daily email quota. Check the current quota for your Workspace plan before a large campaign.
- **Apps Script web apps** (the Sheet route and the RCS image upload) allow only a small number of simultaneous runs per script. Do not use them for a 10,000-visitor event.
  Keep submissions on the Google Form route (`TARGETS` all `"form"`). For RCS images, customers can paste a link instead of uploading.
- **Duplicates:** a visitor who sees the timeout message and submits again can create a second row. De-duplicate in the sheet by email + company name.

## Load testing (folder `loadtest/`)

1. **Page files at 10,000 visitors** (`k6-static.js`): `k6 run -e SITE=https://your-staging-site k6-static.js`.
   Test a staging copy or a CDN you control. Do not stress-test github.io (against its terms) and never aim any test at docs.google.com.
2. **Submit behaviour with a flaky network** (`browser-load.js` + `mock-google.js` + `serve.js`):
   100 or more real headless browsers fill the WhatsApp form and press Submit together against a local fake Google that is slow, drops 10% of connections and never answers 2%.
   It reports visitors stuck, answers lost and duplicate submissions. Latest run (60 visitors, 10% drops, 2% hangs): 58 thank-yous,
   2 clear error messages with answers kept (the "never answers" ones), 0 stuck, 0 duplicates, median submit 4.0 s.
3. **End-to-end rehearsal with real Google:** copy each Google Form (a test copy with the same questions and N/A choices), point a staging copy of the site at the copies
   (`FORM_IDS`, `ENTRY` in `config.js`), and run 100 to 500 real submissions by hand or with a small script. Compare submissions made with rows received.

## Release checklist

1. Edit files. 2. Change the `?v=` number on the three links in `index.html` and `CACHE` in `sw.js`.
3. Upload all files together (`index.html`, `app.js`, `config.js`, `messages.js`, `styles.css`, `sw.js`, `.nojekyll`).
4. Wait for the green tick under Actions, hard-refresh, and send one test submission per channel. Delete the test rows.
5. Keep `ENABLE_TEST_MODES: false`.

## Security notes

- A Content Security Policy in `index.html` lets only this site's own scripts run and allows connections only to Google (forms, Apps Script, fonts).
  If you add another service (analytics, a new logo host), add its address to that policy.
- No customer data is stored on any server of ours; answers go from the browser to your Google Form. Drafts live only in the customer's browser.
- The Apps Script web app addresses and Google Form IDs in `config.js` are public by nature (they are in every web page). Do not put passwords or private keys in any file.
