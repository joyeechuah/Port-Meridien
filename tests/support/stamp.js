// `npm run stamp`: after changing a file in js/, update the ?v= stamp on its script tag in index.html, so browsers
// load the new copy together with the page (see source.js). `npm run lint` fails while a stamp is out of date.
const fs = require("fs");
const path = require("path");
const { ROOT, TAG, readPage, stampOf } = require("./source");

const html = readPage();
let changed = 0;
const out = html.replace(TAG, (tag, rel, old) => {
  const v = stampOf(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  if (v !== old) changed++;
  return `<script src="${rel}?v=${v}"></script>`;
});
if (changed) fs.writeFileSync(path.join(ROOT, "index.html"), out);
console.log(changed ? `updated ${changed} stamp(s) in index.html` : "all stamps up to date");
