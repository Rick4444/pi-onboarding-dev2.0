/* =====================================================================
   Site configuration. This is the only file you normally need to edit.
   ===================================================================== */
window.PI_CONFIG = {

  /* Google Form IDs (the long id in each form's /d/e/<ID>/viewform link). */
  FORM_IDS: {
 whatsapp:"1FAIpQLSduxMQTB1MJ8YOm3MGKFtu5id2c8yxOYpEGSuCMpo9HMSQ5Tw",
 sms:"1FAIpQLSfUm27Wwa796q5bRSczhTgG90k_O0_XXMqzfOrCvlHIrf1YFA",
 rcs:"1FAIpQLScPnTteCUfqx4C0fhCpxpyQhpHDgpR6hDAw8NWEfqdnlkTczw"
},

  /* Google Form field IDs, keyed by the exact question title.
     To generate each map, open the form in Chrome, press F12, choose Console and run:
     JSON.stringify(Object.fromEntries(FB_PUBLIC_LOAD_DATA_[1][1].filter(q=>q[4]).map(q=>[q[1],'entry.'+q[4][0][0]])))
     then paste the result in place of the empty braces below.
     "Account Manager Name" is collected on the page for every channel. To store it, add a short-answer question titled
     exactly Account Manager Name to each Google Form and add its entry ID to that form's map below. Until then it is not sent. */
  ENTRY: {
 whatsapp:{"Account Manager Name": "entry.1812996000", "Company / Business Name": "entry.710738292", "Registered Business Name (as per legal documents)": "entry.1859297936", "Business Website": "entry.1399838605", "Primary Business Contact Name": "entry.238596162", "Mobile Number": "entry.1272807465", "Designation": "entry.890469343", "Does the client already have a WhatsApp Business Account (WABA)?": "entry.730684270", "If Yes, please share the Business Manager (BM) ID": "entry.1899110157", "If Yes, please share the Facebook Page URL": "entry.395607937", "Does the client have Admin access to the Business Manager?": "entry.149381843", "Is the client currently using": "entry.640907873", "WhatsApp Business Number": "entry.331463812", "Is the WhatsApp number currently hosted with another BSP?": "entry.1905936469", "If Yes, who is the current BSP?": "entry.878826687", "If \"Other\" BSP, please specify": "entry.1938329430", "Does the client want to migrate the existing WhatsApp number to Paytm?": "entry.581018770"},
 sms: {"Account Manager Name": "entry.1478423333", "Company / Business Name": "entry.837391247", "Registered Business Name": "entry.1677022448", "Business Website": "entry.1174479089", "Primary Contact Name": "entry.1494700798", "Mobile Number": "entry.1007684126", "Designation": "entry.211549002", "Principal Entity (PE) ID": "entry.77635151", "Which DLT operator is the business registered with?": "entry.133679905", "What type of SMS will be sent?": "entry.766385392", "Approved Transactional Sender ID(s)": "entry.2101335834", "Approved Promotional Sender ID(s)": "entry.1839802898"},
 rcs: {"Account Manager Name": "entry.637968150", "Company / Business Name": "entry.287010760", "Registered Business Name": "entry.1451742857", "Business Website": "entry.501724492", "SPOC Name": "entry.1031102158", "SPOC Designation": "entry.568506711", "SPOC Mobile Number": "entry.494764714", "Brand Name to be displayed on RCS": "entry.2030013134", "Legal Name of the Brand": "entry.93202971", "Intended use case for RCS messaging": "entry.1361497629", "Agent Name (Display Name)": "entry.1909962289", "Agent Description": "entry.1560965023", "Agent Logo - link to file (share PNG/JPG over email or paste a link - 224 px x 224px under 50kb)": "entry.1181274370", "Hero Image / Banner - link to file ( 1440 × 448 pixels, under 200kb, 45:14 aspect ratio)": "entry.1502097465", "Brand Colors (Hex Code)": "entry.1690364136", "Customer Support Phone Number": "entry.80443449", "Customer Support Email": "entry.532459846", "Business Website URL": "entry.1480506269", "How do you obtain customer consent before sending RCS messages?": "entry.1240790307", "Privacy Policy URL": "entry.897707198", "Terms & Conditions URL": "entry.542767060"},
},

  /* Questions that were removed from a page but still exist in its Google Form. Their answer is sent as NA_VALUE.
     In the Google Form, each of these radio / checkbox questions must either be set to "Optional" or have an
     "N/A" choice added (exact text), otherwise Google rejects the response. If you delete a question from the
     Google Form, you can delete it from this list too. */
  /* Per form: false = do NOT send "N/A" for hidden or empty optional questions (they are simply left out, so the
     Google Form must have them as Optional). true or missing = send "N/A" as before. WhatsApp uses the cleaned-up form. */
  SEND_NA: { whatsapp: false, sms: false, rcs: false },
  NA_VALUE: "N/A",
  NA_ANSWERS: {
    whatsapp: [],
    rcs: [],
    sms: []
  },

  /* Value sent for a dropdown that is hidden (WhatsApp: "If Yes, who is the current BSP?" when the client answers No).
     Add a matching "N/A" choice to that dropdown in the Google Form. Set to "" to send nothing for it
     (only works if the question is optional in the Google Form). */
  HIDDEN_SELECT_VALUE: "N/A",

  /* Optional: path or URL of the official Pi logo (for example "img/pi-logo.svg").
     Leave empty to show the built-in Pi wordmark. */
  LOGO_SRC: "",

  /* Where each form sends its answers:
       "sheet"  directly into a Google Sheet (needs SHEET_URL, see whatsapp-sheet-apps-script.gs)
       "form"   the original Google Form (uses FORM_IDS and ENTRY above) */
  TARGETS: { whatsapp: "form", sms: "form", rcs: "form" },

  /* Web app URL (ends in /exec) of whatsapp-sheet-apps-script.gs. Only used when a form is set to "sheet" above. */
  SHEET_URL: "https://script.google.com/macros/s/AKfycbzIZTchcvucKQ9Yz9TLvQ5AxeAubCqrcTqqdZojKXa9IRz7_FfprtbVP2JyMmvBMHlx/exec",

  /* RCS image upload. Web-app URL of the upload script (see upload-apps-script.gs and README).
     Leave empty and customers can still paste a link, but the Upload option will report that it is unavailable. */
  UPLOAD_URL: "",

  /* Checks applied to uploaded RCS images (JPG / JPEG only is always enforced).
     Remove a number to stop checking it. */
  IMAGE_RULES: {
    logo: { width: 224,  height: 224, maxKB: 50  },
    hero: { width: 1440, height: 448, maxKB: 200 }
  },

  /* Set to true only while testing. Then:
       ?preview  simulates a successful submit without sending anything
       ?debug    opens Google's real response page in a new tab so you can read its message
     Keep false for the live site. */
  ENABLE_TEST_MODES: false,

  /* ---------- Connection and load behaviour ----------
     TIMEOUT_MS     how long one submission may take before the page stops waiting (slow networks need patience).
     MAX_RETRIES    extra attempts after a network failure (the connection dropped before Google answered).
                    A timeout is NOT retried, because the first attempt may already have reached Google and a
                    retry would then create a duplicate response.
     RETRY_BASE_MS  first wait before a retry; doubles each time, plus a random 0-50% so thousands of visitors
                    recovering from the same outage do not all retry at the same second.
     SLOW_MS        after this long the loading overlay explains that the connection is slow. */
  NETWORK: { TIMEOUT_MS: 45000, MAX_RETRIES: 2, RETRY_BASE_MS: 1500, SLOW_MS: 8000 },

  /* Hidden anti-spam field. Real visitors never see it; bots that fill every field are ignored silently. */
  HONEYPOT: true,

  /* Lets the site open again with no connection after the first visit (see sw.js). Works on https only. */
  SERVICE_WORKER: true
};
