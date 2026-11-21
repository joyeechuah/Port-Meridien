// Visit counts (Cloudflare Web Analytics): the counter loads only on the game's own site, not for a browser that asks
// not to be tracked, and with Port Meridien's own token (not White Isle Drive's). The page's security policy lets it
// load and report. The counter's script itself is never fetched in tests: the loader runs here in a sandbox.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const loader = html.match(/<script>\n(\/\/ Visit counts:[\s\S]*?)<\/script>/)[1];

function run({ host = "joyeechuah.github.io", gpc = false, dnt = null } = {}) {
  const added = [];
  const document = {
    createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
    head: { appendChild: (s) => added.push(s) },
  };
  vm.runInNewContext(loader, { location: { hostname: host }, navigator: { globalPrivacyControl: gpc, doNotTrack: dnt }, document });
  return added;
}

test("the visit counter loads on the game's own site, with this game's token", () => {
  const [s, more] = run();
  expect(more).toBeUndefined();
  expect(s.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
  expect(s.defer).toBe(true);
  expect(JSON.parse(s.attrs["data-cf-beacon"])).toEqual({ token: "e21319aac019413c91ab2f1a73988047" });
  // White Isle Drive's token is never used here
  expect(html).not.toContain("ff73f87e582344099cec33d266bdec7e");
});

test("nothing is counted elsewhere, or for a browser that asks not to be tracked", () => {
  for (const host of ["127.0.0.1", "localhost", "raw.githack.com", "claude.ai", "joyeechuah.github.io.evil.example"]) expect(run({ host }), host).toEqual([]);
  expect(run({ gpc: true })).toEqual([]);
  expect(run({ dnt: "1" })).toEqual([]);
});

test("the page's security policy lets the counter load and report, and nothing more from Cloudflare", () => {
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const dir = Object.fromEntries(csp.split(";").map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));
  expect(dir["script-src"]).toContain("https://static.cloudflareinsights.com");
  expect(dir["connect-src"]).toContain("https://cloudflareinsights.com");
  for (const d of ["img-src", "frame-src", "style-src", "font-src"]) expect((dir[d] || []).join(" "), d).not.toContain("cloudflareinsights");
});
