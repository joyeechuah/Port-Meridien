// A phone can resize the page while the game's scripts are still loading (its viewport settling). The resize handler
// in js/core.js used names from scripts that load later, threw, and left the canvas at its old size.
const { test, expect } = require("./support/game");

test("a resize while the scripts are still loading resizes the canvas and throws nothing", async ({ game, page }) => {
  await page.addInitScript(() => {
    const add = window.addEventListener;
    window.addEventListener = function (type, fn, opts) {
      add.call(this, type, fn, opts);
      // the game's own resize handler: call it the moment it's registered, before the later scripts have loaded
      if (type === "resize" && typeof fn === "function" && String(fn).includes("resetResolutionSample") && !window.__early) {
        window.__early = { width: innerWidth };
        try {
          fn(new Event("resize"));
          window.__early.ok = true;
        } catch (e) {
          window.__early.err = String(e);
        }
      }
    };
  });
  await game.open();
  const r = await game.eval(() => ({ ...window.__early, canvas: __T.renderer.domElement.clientWidth }));
  expect(r.err).toBeUndefined();
  expect(r.ok).toBe(true);
  expect(r.canvas).toBe(r.width);
  expect(game.errors).toEqual([]);
});
