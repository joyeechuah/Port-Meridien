const { test, expect } = require("./support/game");

// A panel opened over the pause menu (or the map) keeps Tab inside it. Tab used to reach RESUME behind the panel, and
// Enter there resumed the drive with the panel still open over the road. Closing the panel puts the keys back on the
// button that opened it.
test("Tab stays inside a panel opened from the pause menu or the map, and closing it returns to its button", async ({ game, page }) => {
  await game.open();
  await game.driveOut();
  const inside = (id) => page.evaluate((id) => !!document.activeElement && !!document.activeElement.closest("#" + id), id);
  const focused = () => page.evaluate(() => document.activeElement && document.activeElement.id);
  for (const [opener, panel] of [["pPass", "passport"], ["pCollections", "collections"], ["pJobs", "jobs"], ["pCups", "cups"], ["pPlay", "play"], ["pNeeds", "needs"]]) {
    await game.key("Escape");
    await game.waitState("PAUSE");
    await page.click("#" + opener);
    await expect(page.locator("#" + panel)).toBeVisible();
    for (let i = 1; i <= 30; i++) {
      await page.keyboard.press("Tab");
      expect(await inside("pause"), opener + ": Tab " + i + " reached the pause menu").toBe(false);
    }
    await game.key("Escape");
    await expect(page.locator("#" + panel)).toBeHidden();
    expect(await focused(), "focus after closing " + panel).toBe(opener);
    await game.key("Escape");
    await game.waitState("DRIVE");
  }
  await game.key("m");
  await game.waitState("MAP");
  await page.click("#mapPass");
  await expect(page.locator("#passport")).toBeVisible();
  for (let i = 1; i <= 30; i++) {
    await page.keyboard.press("Tab");
    expect(await inside("map"), "map: Tab " + i + " reached the map").toBe(false);
  }
  await game.key("Escape");
  await expect(page.locator("#passport")).toBeHidden();
  expect(await focused()).toBe("mapPass");
  expect(await game.state()).toBe("MAP");
});
