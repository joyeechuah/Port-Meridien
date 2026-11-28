// The published copy of the site (tests/support/stage-site.js, run by .github/workflows/pages.yml): only the files
// players load, every script tag stamped from the bytes published beside it, whether the repository's index.html
// carries stamps or the fixed ?v=dev tags (docs/SCRIPT_RELEASES.md, option A). Node only: no browser.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ROOT, TAG, stampOf, scriptFiles } = require("./support/source");
const { SITE, stageSite } = require("./support/stage-site");

const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), "pm-" + name + "-"));
const stamped = (dir) => [...fs.readFileSync(path.join(dir, "index.html"), "utf8").matchAll(TAG)].map((m) => ({ rel: m[1], v: m[2] }));

test("the published site is index.html, 404.html, js/, audio/, fonts/ and vendor/, each script stamped from its own bytes", () => {
  const out = tmp("site");
  const scripts = stageSite(ROOT, out);
  expect(fs.readdirSync(out).sort()).toEqual([...SITE].sort());
  expect(scripts).toEqual(scriptFiles().map((f) => f.rel));
  for (const s of stamped(out)) expect(s.v, s.rel).toBe(stampOf(fs.readFileSync(path.join(out, s.rel), "utf8")));
  // the stamps are the ones a player's browser has always been given: the same as `npm run stamp` would write
  for (const f of scriptFiles()) expect(stamped(out).find((s) => s.rel === f.rel).v).toBe(stampOf(f.text));
});

test("a repository on fixed ?v=dev tags is published fully stamped, and a missing script stops the deploy", () => {
  const src = tmp("src");
  for (const f of SITE) fs.cpSync(path.join(ROOT, f), path.join(src, f), { recursive: true });
  const page = path.join(src, "index.html");
  fs.writeFileSync(page, fs.readFileSync(page, "utf8").replace(TAG, (tag, rel) => `<script src="${rel}?v=dev"></script>`));
  const out = tmp("out");
  stageSite(src, out);
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  expect(html).not.toContain("?v=dev");
  for (const s of stamped(out)) expect(s.v, s.rel).toMatch(/^[0-9a-f]{10}$/);
  fs.rmSync(path.join(src, "js", "net.js"));
  expect(() => stageSite(src, tmp("broken"))).toThrow(/js\/net\.js/);
});
