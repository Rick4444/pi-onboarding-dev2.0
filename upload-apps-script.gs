/**
 * Image upload endpoint for the RCS logo / banner fields.
 *
 * The website sends a JPG/JPEG here, the script saves it to a Google Drive folder and returns a
 * link, which the website puts into the existing "link to file" field of the RCS Google Form.
 *
 * Setup
 *  1. Go to script.google.com > New project, delete the sample code and paste this whole file.
 *     (The script creates a Drive folder called "Pi RCS Images" by itself the first time an image arrives.
 *      To use an existing folder instead, put its ID in FOLDER_ID below.)
 *  2. Click Save, then Deploy > New deployment > type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *  3. Authorise when asked, copy the Web app URL (it ends in /exec) and paste it into
 *     UPLOAD_URL in config.js.
 *  After changing this script, use Deploy > Manage deployments > Edit > New version.
 *
 * Note: if your Google Workspace policy blocks "Anyone with the link" sharing, change
 * ANYONE_WITH_LINK below to DOMAIN_WITH_LINK so only Paytm accounts can open the images.
 */

var FOLDER_ID = "";                             // optional: ID of an existing Drive folder
var FOLDER_NAME = "Pi RCS Images";              // used when FOLDER_ID is empty
var MAX_BYTES = 300 * 1024;                     // hard server-side limit
var KINDS = { logo: "Logo", hero: "Banner" };   // allowed image kinds

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var kind = KINDS[req.kind];
    if (!kind) return reply({ ok: false, error: "kind" });
    if (req.mime !== "image/jpeg") return reply({ ok: false, error: "type" });

    var bytes = Utilities.base64Decode(req.data || "");
    if (!bytes.length || bytes.length > MAX_BYTES) return reply({ ok: false, error: "size" });
    // JPEG files start with FF D8 FF (signed bytes in Apps Script: -1, -40, -1)
    if (!(bytes[0] === -1 && bytes[1] === -40 && bytes[2] === -1)) return reply({ ok: false, error: "type" });

    var stamp = Utilities.formatDate(new Date(), "UTC", "yyyyMMdd-HHmmss");
    var safe = String(req.name || "image").replace(/\.(jpe?g)$/i, "").replace(/[^\w\-]+/g, "_").slice(0, 50);
    var blob = Utilities.newBlob(bytes, "image/jpeg", kind + "_" + stamp + "_" + safe + ".jpg");

    var file = getFolder_().createFile(blob);
    var shared = "anyone";
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e1) {                       // company policy may block public links
      try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); shared = "domain"; }
      catch (e2) { shared = "none"; }
    }
    return reply({ ok: true, url: file.getUrl(), shared: shared });
  } catch (err) {
    return reply({ ok: false, error: "server", detail: String(err) });
  }
}

function getFolder_() {
  if (FOLDER_ID) return DriveApp.getFolderById(FOLDER_ID);
  var props = PropertiesService.getScriptProperties(), id = props.getProperty("FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty("FOLDER_ID", folder.getId());
  return folder;
}

function doGet() { return reply({ ok: true, status: "upload endpoint ready" }); }

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this ONCE from the editor (choose "testSetup" in the function list, click Run).
 * It makes Google ask for Drive permission and creates the upload folder, so you can confirm Drive access works.
 * Check the "Execution log" at the bottom: it prints the folder link.
 */
function testSetup() {
  var folder = getFolder_();
  Logger.log("Drive access OK. Upload folder: " + folder.getUrl());
}
