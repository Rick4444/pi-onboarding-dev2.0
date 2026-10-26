/* Serves the site folder (the parent of this folder) on http://localhost:8080 for browser-load.js. */
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (f.endsWith(path.sep) || req.url === "/") f = path.join(root, "index.html");
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(8080, () => console.log("site on http://localhost:8080"));
