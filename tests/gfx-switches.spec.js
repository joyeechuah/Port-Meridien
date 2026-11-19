// Diagnostic switches for measuring what the picture costs on a phone: ?scale=N, ?shadows=off, ?far=near.
// Without them nothing changes.
const { test, expect } = require("./support/game");

const density2 = () => Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
const slowFrames = () => {
  for (let i = 0; i < 24 * 18; i++) __T.adaptRes(1 / 24);
};

test("without switches: shadows on, trees out to 1.7 km, and AUTO free to lower the scale", async ({ game, page }) => {
  await page.addInitScript(density2);
  await game.open({ save: { v: 3, gfx: 0 } });
  const r = await game.eval((slow) => {
    const T = __T;
    new Function(slow)();
    return { shadows: T.renderer.shadowMap.enabled, trunk: T.VRANGE.trunk, rock: T.VRANGE.rock, scale: T.renderer.getPixelRatio() };
  }, `(${slowFrames})()`);
  expect(r).toEqual({ shadows: true, trunk: 1700, rock: 900, scale: 0.75 });
});

test("?scale=2 holds full sharpness on AUTO even with slow frames; ?scale=1 holds 1", async ({ game, page }) => {
  await page.addInitScript(density2);
  for (const [q, want] of [["2", 2], ["1", 1]]) {
    await game.open({ save: { v: 3, gfx: 0 }, path: "/index.html?scale=" + q });
    const scale = await game.eval((slow) => {
      new Function(slow)();
      return __T.renderer.getPixelRatio();
    }, `(${slowFrames})()`);
    expect(scale, "?scale=" + q).toBe(want);
  }
});

test("?shadows=off draws no shadows; ?far=near draws trees and rocks out to 400 m", async ({ game }) => {
  await game.open({ path: "/index.html?shadows=off&far=near&perf" });
  const r = await game.eval(() => ({ shadows: __T.renderer.shadowMap.enabled, trunk: __T.VRANGE.trunk, crownFar: __T.VRANGE.crownFar, rock: __T.VRANGE.rock, crown: __T.VRANGE.crown }));
  expect(r).toEqual({ shadows: false, trunk: 400, crownFar: 400, rock: 400, crown: 260 });
  await expect(game.page.locator("#perf")).toContainText("switches: shadows off, far near", { timeout: 15_000 });
});
