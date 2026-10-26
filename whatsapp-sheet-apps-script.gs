/**
 * WhatsApp onboarding: saves each submission as a new row in a Google Sheet.
 * (Replaces the WhatsApp Google Form. SMS and RCS still use their Google Forms.)
 *
 * Setup
 *  1. Go to script.google.com > New project. Delete the sample code and paste this whole file. Click Save.
 *  2. In the function list choose "testSetup" and click Run. Allow the permissions Google asks for
 *     (Review permissions > your account > Advanced > Go to project (unsafe) > Allow).
 *     The Execution log prints the link of the new Google Sheet, which is created automatically.
 *  3. Deploy > New deployment > type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *     Copy the Web app URL (ends in /exec) and put it in SHEET_URL in config.js.
 *  After changing this script, use Deploy > Manage deployments > Edit > Version: New version > Deploy.
 *
 * Moving to your original Google Sheet later
 *  Put its ID in SHEET_ID below (the long text in the sheet's address, between /d/ and /edit) and its tab name in
 *  SHEET_NAME. Answers are matched to columns by header name, so an existing sheet whose headers are the same
 *  question titles works as it is. Columns that do not exist yet are added at the end, so nothing is lost.
 */

var SHEET_ID = "";                                  // leave empty to let the script create a new sheet
var SHEET_NAME = "WhatsApp Responses";              // tab name (a Google Form response sheet uses "Form Responses 1")
var SPREADSHEET_TITLE = "Pi WhatsApp Onboarding Responses";
var NOTIFY_EMAIL = "";                              // optional: e-mail address to notify about each new submission

var TIMESTAMP_HEADER = "Timestamp";
var EMAIL_HEADER = "Email Address";
var QUESTIONS = [
  "Company / Business Name",
  "Registered Business Name (as per legal documents)",
  "Business Website",
  "Primary Business Contact Name",
  "Mobile Number",
  "Does the client already have a Meta Business Manager (Business Portfolio)?",
  "If Yes, please share the Business Manager (BM) ID",
  "Is the Meta Business Manager Business Verified?",
  "Does the client have Admin access to the Business Manager?",
  "Does the client have a Facebook Business Page?",
  "If Yes, please share the Facebook Page URL",
  "Does the client already have a WhatsApp Business Account (WABA)?",
  "Is the client currently using",
  "WhatsApp Business Number",
  "Is the WhatsApp number currently hosted with another BSP?",
  "If Yes, who is the current BSP?",
  "If \"Other\" BSP, please specify",
  "Does the client want to migrate the existing WhatsApp number to Paytm?",
  "What type of messages does the client want to send?",
  "What should be the first fallback?",
  "What should be the second fallback?",
  "Preferred Billing Model"
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.form !== "whatsapp" || !req.data || typeof req.data !== "object") return reply({ ok: false, error: "bad_request" });
    var keys = Object.keys(req.data);
    if (!keys.length || keys.length > 60) return reply({ ok: false, error: "bad_request" });

    lock.waitLock(20000);
    var sheet = getSheet_();
    var headers = ensureHeaders_(sheet, keys);
    var row = headers.map(function (h) {
      if (h === TIMESTAMP_HEADER) return "";
      var v = req.data[h];
      return v === undefined || v === null ? "" : String(v).slice(0, 2000);
    });

    var r = sheet.getLastRow() + 1;
    var range = sheet.getRange(r, 1, 1, headers.length);
    range.setNumberFormat("@");                     // store everything as plain text (no formulas, no changed phone numbers)
    range.setValues([row]);
    var tsCol = headers.indexOf(TIMESTAMP_HEADER);
    if (tsCol > -1) sheet.getRange(r, tsCol + 1).setNumberFormat("yyyy-mm-dd hh:mm:ss").setValue(new Date());
    SpreadsheetApp.flush();

    notify_(req.data);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: "server", detail: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function getSheet_() {
  var ss, props = PropertiesService.getScriptProperties();
  if (SHEET_ID) {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    var id = props.getProperty("SHEET_ID");
    if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} }
    if (!ss) { ss = SpreadsheetApp.create(SPREADSHEET_TITLE); props.setProperty("SHEET_ID", ss.getId()); }
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    var first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0) { sh = first; sh.setName(SHEET_NAME); }
    else sh = ss.insertSheet(SHEET_NAME);
  }
  return sh;
}

function ensureHeaders_(sheet, keys) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (!headers.length || headers.every(function (h) { return !h; })) {
    headers = [TIMESTAMP_HEADER, EMAIL_HEADER].concat(QUESTIONS);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  keys.forEach(function (k) {                      // never lose an answer: add unknown questions as new columns
    if (headers.indexOf(k) === -1) { headers.push(k); sheet.getRange(1, headers.length).setValue(k).setFontWeight("bold"); }
  });
  return headers;
}

function notify_(data) {
  if (!NOTIFY_EMAIL) return;
  try {
    var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
    MailApp.sendEmail(NOTIFY_EMAIL, "New WhatsApp onboarding: " + (data["Company / Business Name"] || ""), body);
  } catch (e) {}
}

/** Run once from the editor to grant permissions and create the sheet. The log shows the sheet link. */
function testSetup() {
  var sh = getSheet_();
  Logger.log("Sheet ready: " + sh.getParent().getUrl());
}

function doGet() { return reply({ ok: true, status: "whatsapp sheet endpoint ready" }); }

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
