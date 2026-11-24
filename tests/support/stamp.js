// `npm run stamp`: since 24 Nov 2026 the repository's index.html keeps a fixed ?v=dev on every script tag, and the
// stamps are written on the published copy by the Pages workflow (tests/support/stage-site.js,
// docs/SCRIPT_RELEASES.md). This puts any tag carrying a stamp back to ?v=dev, so a branch made before the change, or
// a habit, can't bring stamps back. `npm run lint` fails on a stamped tag.
const fs = require("fs");
const path = require("path");
const { ROOT, TAG, readPage } = require("./source");

let changed = 0;
const out = readPage().replace(TAG, (tag, rel, old) => {
  if (old !== "dev") changed++;
  return `<script src="${rel}?v=dev"></script>`;
});
if (changed) fs.writeFileSync(path.join(ROOT, "index.html"), out);
console.log(changed ? `put ${changed} script tag(s) in index.html back to ?v=dev` : "index.html: every script tag is ?v=dev (the published copy is stamped by the Pages workflow)");
