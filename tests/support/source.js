// The game's code as players get it: index.html and the scripts it loads from js/, in the order it loads them.
// The scripts are classic scripts sharing one global scope (docs/CODE_LAYOUT.md). Each script tag carries ?v= and a
// stamp of the file's contents, so a browser that cached an older copy fetches the new one together with the
// page that asks for it; `npm run stamp` updates the stamps and `npm run lint` checks them.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
// the stamp is ten hex digits, or "dev" in a repository that leaves the stamps to the published copy (stage-site.js)
const TAG = /<script src="(js\/[A-Za-z0-9_-]+\.js)(?:\?v=([0-9a-f]+|dev))?"><\/script>/g;

const readPage = () => fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const stampOf = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 10);

// [{rel: "js/core.js", stamp, text}] in load order
function scriptFiles(html = readPage()) {
  return [...html.matchAll(TAG)].map((m) => ({ rel: m[1], stamp: m[2] || "", text: fs.readFileSync(path.join(ROOT, m[1]), "utf8") }));
}

// everything the game is made of, as one text: the page, then each script
function gameSource() {
  const html = readPage();
  return [html, ...scriptFiles(html).map((f) => f.text)].join("\n");
}

module.exports = { ROOT, TAG, readPage, scriptFiles, gameSource, stampOf };
