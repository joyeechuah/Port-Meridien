// On a phone: sound that doesn't drop out while the phone is busy drawing, and Auto graphics that keep the frame
// rate up. Seen in a recording from an Android phone on 16 Nov 2026: the sound cut out three or four times a
// second, and the game ran at 30 to 45 frames a second without lowering its render scale.
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

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("the sound uses a larger audio buffer, so it doesn't drop out", async ({ game, page }) => {
    await page.addInitScript(watchAudio);
    await game.open();
    await page.touchscreen.tap(195, 300); // a first touch starts the game's audio
    await expect.poll(() => game.eval(() => window.__acOptions.length), { timeout: 30_000 }).toBeGreaterThan(0);
    const opts = await game.eval(() => window.__acOptions[0]);
    expect(opts).toEqual({ latencyHint: "playback" });
  });
});

test("on a computer the sound keeps the quick, small buffer", async ({ game, page }) => {
  await page.addInitScript(watchAudio);
  await game.open();
  await page.mouse.click(640, 200);
  await expect.poll(() => game.eval(() => window.__acOptions.length), { timeout: 30_000 }).toBeGreaterThan(0);
  expect(await game.eval(() => window.__acOptions[0])).toBeNull();
});

test("Auto graphics lower the render scale at 40 frames a second, and step back up at 60", async ({ game, page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 }));
  await game.open({ save: { v: 3, gfx: 0 } });
  const r = await game.eval(() => {
    const T = __T,
      ratio = () => T.renderer.getPixelRatio(),
      advance = (hz, seconds) => {
        for (let i = 0; i < hz * seconds; i++) T.adaptRes(1 / hz);
        return ratio();
      };
    return { initial: ratio(), at40: advance(40, 18), at60: advance(60, 18) };
  });
  // (it used to stay at full sharpness until frames fell below 36 a second)
  expect(r.initial).toBe(2);
  expect(r.at40).toBeLessThan(2);
  expect(r.at60).toBe(2);
});
