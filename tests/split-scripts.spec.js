// The game's code is in several scripts under js/, loaded in order by index.html and sharing one global scope
// (docs/CODE_LAYOUT.md). In one script, "can't run here" was a return out of the whole game; across scripts the
// first one stops and every later one stops at its first line, without an error. And each script tag keeps ?v=dev
// here: the published copy carries a stamp of each file instead (tests/stage-site.spec.js).
const { test, expect } = require("./support/game");
const { scriptFiles } = require("./support/source");

test("without the 3D engine the loading screen says so, and nothing else runs or reports an error", async ({ game, page }) => {
  await game.open({ instrument: false, autostart: false });
  // three.js fails to arrive: the browser reports the failed request, which is all it may report
  await page.route("**/vendor/three.min.js", (r) => r.abort("failed"));
  game.allowErrors.push(/Failed to load resource/);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await expect(page.locator("#lmsg")).toHaveText(/The 3D engine didn't load/);
  await expect(page.locator("#lretry")).toBeVisible();
  // the later scripts stopped at their first line: nothing from them exists
  expect(await page.evaluate(() => [typeof window.__gameOff, typeof window.__T, document.getElementById("lstart").classList.contains("hide")])).toEqual(["object", "undefined", true]);
  expect(errors).toEqual([]);
});

test("every script the page loads keeps ?v=dev in the repository: the published copy is stamped (stage-site.js)", () => {
  const files = scriptFiles();
  expect(files.map((f) => f.rel)).toEqual(["js/core.js", "js/world.js", "js/cars.js", "js/play.js", "js/media.js", "js/progress.js", "js/screens.js", "js/people.js", "js/life.js", "js/home.js", "js/homeview.js", "js/work.js", "js/net.js", "js/main.js"]);
  for (const f of files) expect(f.stamp, `${f.rel}: run npm run stamp to put it back to ?v=dev`).toBe("dev");
});
