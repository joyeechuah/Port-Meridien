const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, scriptFiles } = require("./support/source");

test("the architecture and contributor notes agree with the number of shipped scripts", () => {
  const instructions = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
  const layout = fs.readFileSync(path.join(ROOT, "docs/CODE_LAYOUT.md"), "utf8");
  const obsoleteCount = scriptFiles().length !== 9;
  expect(obsoleteCount && /\bnine (?:classic )?scripts\b/.test(instructions + layout)).toBe(false);
});

test("the architecture does not describe the shipped cloud service as unconfigured", () => {
  const doc = fs.readFileSync(path.join(ROOT, "docs/ARCHITECTURE.md"), "utf8");
  const screen = scriptFiles().find(file => file.rel === "js/screens.js");
  const cloudConfigured = /const FIREBASE_CONFIG=\{apiKey:"[^"]+"/.test(screen.text);
  expect(cloudConfigured && /Cloud saving is currently disabled/.test(doc)).toBe(false);
});

test("Back to the game really leaves the 404 page on the local server", async ({ page }) => {
  const missing = await page.goto("/no-such-page");
  expect(missing.status()).toBe(404);
  const next = page.waitForEvent("response", response => response.request().isNavigationRequest());
  await page.getByRole("link", { name: "Back to the game" }).click();
  expect((await next).status()).toBe(200);
});
