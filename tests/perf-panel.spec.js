// The measurement panel (?perf) and the sound buffer switch (?audio=safe|fast), for diagnosing lag and broken sound
// on a phone. Without them, nothing in the game changes.
const { test, expect } = require("./support/game");

const watchAudio = () => {
  const made = (window.__acOptions = []);
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(o) {
      super(o);
      made.push(o === undefined ? null : o);
    }
  };
};
const startSound = async (game, page, touch) => {
  if (touch) await page.touchscreen.tap(195, 300);
  else await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => window.__acOptions.length), { timeout: 30_000 }).toBeGreaterThan(0);
};

test("?perf shows the panel with frame, code, drawing and sound readings", async ({ game, page }) => {
  await page.addInitScript(watchAudio);
  await game.open({ path: "/index.html?perf" });
  await startSound(game, page);
  const panel = page.locator("#perf");
  await expect(panel).toContainText(/clocks behind, [\d.]+ min: audio \d+ ms, output (-?\d+ ms|n\/a)/, { timeout: 20_000 });
  const text = await panel.textContent();
  for (const re of [
    /\d+ fps {2}frame p50 \d+ p95 \d+ p99 \d+ ms/,
    /over 33\/50\/100 ms: \d+\/\d+\/\d+ of \d+/,
    /CPU\/frame: sim [\d.]+ \(max \d+\) {2}render call [\d.]+ \(max \d+\) ms/,
    /long tasks (\d+ \(max \d+ ms\)|n\/a)/,
    /underruns (\d+ \(\d+ ms\)|n\/a)/,
    /draws \d+ {2}tris \d+k {2}textures \d+ {2}geometries \d+/,
    /scale [\d.]+ of [\d.]+ \d+x\d+ (AUTO|SHARP|SMOOTH)/,
  ])
    expect(text).toMatch(re);
  // the engine's oscillators and noise are counted as they start
  expect(Number(/sources active (\d+)/.exec(text)[1])).toBeGreaterThan(0);
});

test("without ?perf there is no panel, and the sound uses the browser's default buffer", async ({ game, page }) => {
  await page.addInitScript(watchAudio);
  await game.open();
  await startSound(game, page);
  await page.waitForTimeout(1500);
  await expect(page.locator("#perf")).toHaveCount(0);
  expect(await game.eval(() => window.__acOptions[0])).toBeNull();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("the default sound buffer is unchanged; ?audio=safe asks for the larger one", async ({ game, page }) => {
    await page.addInitScript(watchAudio);
    await game.open();
    await startSound(game, page, true);
    expect(await game.eval(() => window.__acOptions[0])).toBeNull();
    await game.open({ path: "/index.html?perf&audio=safe" });
    await startSound(game, page, true);
    expect(await game.eval(() => window.__acOptions[0])).toEqual({ latencyHint: "playback" });
    await expect(page.locator("#perf")).toContainText("(larger asked)", { timeout: 20_000 });
  });
});

test("counters the browser doesn't offer read n/a, not zero", async ({ game, page }) => {
  await page.addInitScript(watchAudio);
  await page.addInitScript(() => {
    Object.defineProperty(AudioContext.prototype, "playbackStats", { configurable: true, get: () => undefined });
    Object.defineProperty(PerformanceObserver, "supportedEntryTypes", { configurable: true, get: () => [] });
  });
  await game.open({ path: "/index.html?perf" });
  await startSound(game, page);
  const panel = page.locator("#perf");
  await expect(panel).toContainText(/clocks behind/, { timeout: 20_000 });
  await expect(panel).toContainText("underruns n/a");
  await expect(panel).toContainText("long tasks n/a");
});
