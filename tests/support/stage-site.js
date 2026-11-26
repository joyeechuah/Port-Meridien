// `node tests/support/stage-site.js <dir>`: the files GitHub Pages publishes, copied into <dir> (default _site), with
// each script tag in index.html stamped from the copied file's own bytes. The Pages workflow
// (.github/workflows/pages.yml) runs it and publishes <dir>. The site is index.html, 404.html, js/ and audio/:
// nothing else in the repository is served. Decided 24 Nov 2026 (docs/SCRIPT_RELEASES.md, option A): the stamps are
// written here, on the published copy, so feature branches stop conflicting over them.
const fs = require("fs");
const path = require("path");
const { ROOT, TAG, stampOf } = require("./source");

const SITE = ["index.html", "404.html", "js", "audio"];

// copies src's site into out and stamps it; returns the scripts in load order, or throws on anything wrong
// It builds in a sibling directory and only then replaces out, so a run that fails (a missing file, a bad tag) leaves
// the last good build in place (it used to delete it first: Codex's audit). out mustn't be, contain or sit inside src
function stageSite(src = ROOT, out = path.resolve("_site")) {
  src = path.resolve(src);
  out = path.resolve(out);
  const inside = (a, b) => {
    const r = path.relative(b, a);
    return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
  };
  if (inside(out, src) && SITE.some((f) => inside(out, path.join(src, f)))) throw new Error(`staging into ${out} would write over the site's own files`);
  if (inside(src, out)) throw new Error(`staging into ${out} would delete the source at ${src}`);
  for (const f of SITE) if (!fs.existsSync(path.join(src, f))) throw new Error(`the site's ${f} isn't in ${src}`);
  const work = fs.mkdtempSync(path.join(path.dirname(out), "." + path.basename(out) + "-"));
  try {
    const scripts = stageInto(src, work);
    fs.rmSync(out, { recursive: true, force: true });
    fs.renameSync(work, out);
    return scripts;
  } catch (e) {
    fs.rmSync(work, { recursive: true, force: true });
    throw e;
  }
}
function stageInto(src, out) {
  for (const f of SITE) fs.cpSync(path.join(src, f), path.join(out, f), { recursive: true });
  const page = path.join(out, "index.html"),
    scripts = [];
  const html = fs.readFileSync(page, "utf8").replace(TAG, (tag, rel) => {
    const file = path.join(out, rel);
    if (!fs.existsSync(file)) throw new Error(`index.html loads ${rel}, which isn't there`);
    if (scripts.includes(rel)) throw new Error(`index.html loads ${rel} twice`);
    scripts.push(rel);
    return `<script src="${rel}?v=${stampOf(fs.readFileSync(file, "utf8"))}"></script>`;
  });
  // every script tag that names a file in js/ was stamped: none left in another form, and none still on ?v=dev
  const tags = (html.match(/<script[^>]*\ssrc="js\//g) || []).length;
  if (!scripts.length || tags !== scripts.length) throw new Error(`stamped ${scripts.length} of ${tags} script tags in index.html`);
  if (/\?v=dev\b/.test(html)) throw new Error("a ?v=dev tag is left in the published index.html");
  fs.writeFileSync(page, html);
  return scripts;
}

module.exports = { SITE, stageSite };

if (require.main === module) {
  const out = path.resolve(process.argv[2] || "_site");
  const scripts = stageSite(ROOT, out);
  console.log(`staged ${scripts.length} scripts in ${path.relative(process.cwd(), out) || "."}`);
}
