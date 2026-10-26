# Live "people online" counter: free setup (Firebase Realtime Database)

The counter stays hidden until you finish this. Nothing else on the site changes.

1. Go to https://console.firebase.google.com and sign in with a PERSONAL Google account (a company Workspace account may block it).
2. "Create a project" > any name (for example pi-onboarding-live) > turn Google Analytics OFF > Create.
3. Left menu: Build > Realtime Database > Create Database > pick the location nearest to your customers (Singapore) > "Start in locked mode" > Enable.
4. Open the "Rules" tab, delete everything, paste this, press Publish:

```
{
  "rules": {
    ".read": false,
    ".write": false,
    "presence": {
      ".read": true,
      ".indexOn": ["t"],
      "$id": {
        ".write": true,
        ".validate": "newData.hasChildren(['t','f']) && newData.child('t').isNumber() && newData.child('f').isNumber() && $id.length <= 40"
      }
    }
  }
}
```
5. Open the "Data" tab and copy the address at the top, like https://pi-onboarding-live-default-rtdb.asia-southeast1.firebasedatabase.app
6. In config.js set:  PRESENCE: { DB_URL: "<that address>", HEARTBEAT_MS: 30000 }
7. Upload the changed files, refresh, and open the site in two tabs. Each tab should show "2 online now".

Privacy: only a random id, a time and a 0/1 "typing" flag are stored. No names, no form answers.
Limits of the free plan: 10 GB download a month, 1 GB storage. A few hundred people online at once is fine.
To switch the counter off at any time, set DB_URL to "".
