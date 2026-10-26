# Paytm Intelligence: client onboarding portal

A static website (no build step) where clients choose WhatsApp, SMS or RCS, complete the onboarding questionnaire
in the page, and submit. Answers go to the original Google Forms, so responses, response sheets and notification
emails work exactly as before.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | All styling (phone, tablet, laptop, large monitor) |
| `app.js` | Forms, validation, auto-saved drafts, submit, loaders, welcome pop-up |
| `config.js` | Settings: form IDs, field IDs, where each form submits, logo, test flags |
| `upload-apps-script.gs` | Optional: lets RCS clients upload JPG/JPEG images (saved to Google Drive) |
| `whatsapp-sheet-apps-script.gs` | Optional: submit WhatsApp answers straight into a Google Sheet instead of the form |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

All files sit in one folder (repository root or `/docs`).

## Publish on GitHub Pages

1. Put the files in the repository root (or `/docs`).
2. **Settings > Pages**: deploy from your branch and folder.
3. After every change, raise the `?v=` number on the three file links in `index.html` so visitors get fresh files.

## Current configuration (`config.js`)

- `TARGETS`: `whatsapp`, `sms` and `rcs` all submit to their Google Form (`"form"`).
  Set one to `"sheet"` to send it to a Google Sheet instead (needs `SHEET_URL`, see below).
- `FORM_IDS` and `ENTRY` link each field to its Google Form question. They match the question titles exactly:
  if a question is renamed or reordered in a Google Form, update `ENTRY` and the label in `app.js`.
- `UPLOAD_URL`: address of the RCS image-upload script. Empty means clients can still paste a link.
- `ENABLE_TEST_MODES`: keep `false` on the live site.

## How the form works

1. **Business information** (Step 1) is filled in once: email, company name, registered name, website, contact name,
   designation and mobile number. The WhatsApp, SMS and RCS tabs stay locked until every field is valid.
2. **Channels** (Step 2): once unlocked, the client can complete one, two or all of WhatsApp, SMS and RCS.
   Each channel is submitted separately to its own Google Form, and the business information is added to it automatically.
   A submitted channel shows a tick; the progress panel shows the status of every step.
3. Which business answer fills which Google Form question is set in `BI_MAP` in `app.js`
   (for RCS: contact name and mobile become "SPOC Name" and "SPOC Mobile Number", designation becomes "SPOC Designation").

## WhatsApp: questions that are hidden or removed are sent as N/A

- **BM ID** and **Facebook Page URL** show only when "already have a WABA?" is **Yes**.
- The **BSP dropdown** and **migration** question show only when "hosted with another BSP?" is **Yes**.
- The **"Other BSP"** box shows only when the BSP dropdown is **Other**.
- Anything hidden is sent as `N/A`. The questions removed from the page (Meta Business Manager yes/no, Business Verified, Facebook Page
  yes/no, message type, fallbacks, billing) are always sent as `N/A` (`NA_ANSWERS` in `config.js`).

In the WhatsApp Google Form, **add an `N/A` choice** to every choice or dropdown question that can be hidden or removed: the removed
questions above, plus "hosted with another BSP", "migrate" and the BSP dropdown. Making them optional is not enough on its own, because
the page still sends `N/A` and Google can reject a value that is not one of the choices. Text questions (BM ID, Facebook URL, "Other BSP")
accept `N/A` unless the form restricts them to numbers or links; remove such a restriction if you have set one.

## Unlocking and submitting

- The channel tabs unlock only when the client clicks **Continue** on the business information and every field passes validation.
- Each channel's **Submit** button stays disabled until every required field is complete (including the BSP dropdown and the
  "Other" box when they apply). A counter next to it shows how many required fields are left.
- The **Continue** button appears only once every business information field has been filled in; until then only **Clear** is available.
- The header menu lists WhatsApp, SMS and RCS. They open their tab once the channels are unlocked, and
  show an "Add business information first" pop-up before that (the tabs below behave the same way).
- The business information card can be collapsed and expanded with its toggle; it collapses automatically after a successful Continue
  and shows a one-line summary. On the WhatsApp form, the BM ID and Facebook Page URL appear only when the client answers **Yes** to "already have a WhatsApp Business
  Account (WABA)?" (they are sent as `N/A` otherwise); every other question stays. The BSP dropdown and migration question appear only when
  "hosted with another BSP?" is **Yes**, and the "Other BSP" box appears only when the dropdown says **Other**. Hidden answers are sent as `N/A`.
- Nothing is pre-selected; drafts saved in the browser bring back only what the client entered earlier (use Clear form to remove them).
- **Account Manager Name** (sub-label "Paytm Sales SPOC Name") is collected for every channel. To store it, add a short-answer
  question titled exactly `Account Manager Name` to each Google Form and add its entry ID to that form's map in `config.js`.

## Behaviour

- All visible fields are required, with format checks (email, phone, links, hex colour, dates, 5-10 RCS test numbers).
- Follow-up questions appear only when relevant; hidden text answers are sent as `N/A`.
- Answers are auto-saved in the client's browser until the form is submitted or cleared (kept up to 30 days).
- A loading overlay shows while submitting, with an extra notice on slow connections; requests time out after 30 seconds
  and show an error with a reference code, for example `(Ref: TIMEOUT-WHATSAPP)`.
- The welcome pop-up shows once per browser.

## RCS image upload (optional)

JPG / JPEG only, with the size checks in `IMAGE_RULES`. Deploy `upload-apps-script.gs` as an Apps Script web app
(Execute as: Me, access: Anyone) and put its `/exec` address in `UPLOAD_URL`. Run `testSetup` once in the script editor
to grant Drive access. This needs a Google account that is allowed to publish web apps to "Anyone".

## WhatsApp to a Google Sheet (optional)

Deploy `whatsapp-sheet-apps-script.gs` the same way, put its `/exec` address in `SHEET_URL` and set
`TARGETS.whatsapp` to `"sheet"`. To use an existing sheet, set `SHEET_ID` and `SHEET_NAME` in the script; answers are
matched to columns by header name.

## Before going live

- Submit one real test entry per channel and confirm it reaches the right response sheet and the usual email arrives.
- Replace the code-drawn Pi wordmark with the official logo: add the file and set `LOGO_SRC` in `config.js`.
- Delete test rows from the response sheets.

## WhatsApp Google Form checklist (required for submissions to be saved)

Google silently drops a response if an answer is not one of a question's choices. Before going live, in the WhatsApp form:

1. Add a choice named exactly `N/A` to: Meta Business Manager yes/no, Business Verified, Facebook Business Page yes/no,
   message type, first fallback, second fallback, billing model, "hosted with another BSP" follow-ups
   (BSP dropdown, migrate question).
2. Keep question wording unchanged.
3. Submit one test from the website, confirm the row appears, then delete it.

## Text and languages (`messages.js`)

Every word the customer sees (headings, labels, hints, notices, buttons, errors, dialogs, answer wording) is in
`messages.js`. Edit it and refresh; no other file changes. The Google Form question titles that are sent to Google stay in
`app.js` / `config.js` and must not be translated. To add a language, follow the steps at the top of `messages.js`;
English, Hindi and Bangla are included; the language switcher is in the top right of the page, and `?lang=hi` or `?lang=bn` in the link forces one. Missing messages fall back to English.
Upload `messages.js` together with the other files (it is loaded before `app.js`).
