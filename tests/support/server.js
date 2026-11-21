// A small static file server for the repository folder, used by the tests (and handy for playing locally with
// the full soundtrack: `npm start`, then open http://127.0.0.1:4173). No dependencies.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

// ?mp=local (js/net.js): playing together without the Realtime Database, on this computer. Each room is an event
// stream: GET /__play/<code> listens, POST /__play/<code> sends a small JSON message to everyone listening
const ROOMS = new Map();
function relay(req, res, code) {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(": open\n\n");
    let set = ROOMS.get(code);
    if (!set) ROOMS.set(code, (set = new Set()));
    set.add(res);
    req.on("close", () => {
      set.delete(res);
      if (!set.size) ROOMS.delete(code);
    });
    return;
  }
  if (req.method !== "POST") return res.writeHead(405).end();
  let body = "";
  req.on("data", (c) => {
    body += c;
    if (body.length > 4096) req.destroy();
  });
  req.on("end", () => {
    try {
      JSON.parse(body);
    } catch {
      return res.writeHead(400).end();
    }
    for (const r of ROOMS.get(code) || []) r.write("data: " + body.replace(/[\r\n]/g, "") + "\n\n");
    res.writeHead(204).end();
  });
}

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const play = /^\/__play\/([A-HJ-NP-Z2-9]{4})$/.exec(rel);
  if (play) return relay(req, res, play[1]);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  // never serve anything outside the repository folder, or its node_modules and git data
  if (!file.startsWith(ROOT + path.sep) || /[\\/](node_modules|\.git)([\\/]|$)/.test(file.slice(ROOT.length))) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // like GitHub Pages: unknown paths get the 404 page
      fs.readFile(path.join(ROOT, "404.html"), (e, body) => {
        res.writeHead(404, { "content-type": TYPES[".html"] });
        res.end(e ? "Not found" : body);
      });
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "content-length": st.size,
      "cache-control": "no-store",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`Port Meridien on http://127.0.0.1:${PORT}/`));
