// Feelings (docs/MOODS.md): something that has just happened lifts you for a few minutes of play. A landmark found
// makes you Inspired (Photography grows 50% faster); a rest in your own bed, Energised. The mood shows on the pause
// menu's NEEDS button and in Needs, with what caused it and the minutes left, and the panel still fits a phone.
const { test, expect } = require("./support/game");

test("finding a landmark makes you Inspired: the pause menu and Needs say so, and Photography grows faster", async ({
  game,
  page,
}) => {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.watchToasts();
  const r = await game.eval(() => {
    const T = __T;
    T.needsLoad({ v: 1, energy: 50, hunger: 50, fun: 50, social: 50 });
    const before = T.save.skills.photography;
    T.discoverLandmark(T.LANDMARKS[0]);
    for (let i = 0; i < 4; i++) T.skillAward("photography", 1);
    return { mood: T.needsMood(), xp: T.save.skills.photography - before };
  });
  // 4 base XP at 150%: 6
  expect(r).toEqual({ mood: "Inspired", xp: 6 });
  const name = await game.eval(() => __T.LANDMARKS[0].name);
  expect(
    (await game.toastLog()).filter((t) => t.startsWith("FEELING")),
  ).toEqual([
    "FEELING INSPIRED | You found " + name + " · Photography grows 50% faster",
  ]);
  await game.key("Escape");
  await game.waitState("PAUSE");
  await expect(page.locator("#pNeeds")).toHaveText("NEEDS · INSPIRED");
  await page.click("#pNeeds");
  await expect(page.locator("#ndMood")).toHaveText("Inspired");
  await expect(page.locator("#ndMoodEffect")).toHaveText(
    "Photography grows 50% faster",
  );
  await expect(page.locator("#ndFeel")).toHaveText(
    "You found " + name + " · 3 min left",
  );
});

test("a rest in your own bed leaves you Energised once you're out; it wears off after four minutes of play", async ({
  game,
  page,
}) => {
  await game.open({
    save: {
      home: {
        v: 1,
        wall: "plaster",
        floor: "oak",
        items: [{ id: "single", x: 4, z: 4, r: 0 }],
      },
      needs: { v: 1, energy: 30, hunger: 60, fun: 60, social: 60 },
    },
  });
  await game.waitState("GARAGE");
  await expect(page.locator("#gRest")).toBeEnabled();
  await page.click("#gRest");
  expect(await game.eval(() => __T.feeling())).toBe("energised");
  await game.driveOut();
  await game.park();
  const r = await game.eval(() => {
    const T = __T,
      out = [T.needsMood()];
    T.NS.t = T.FEEL.until - 1;
    out.push(T.needsMood());
    T.NS.t = T.FEEL.until;
    out.push(T.needsMood());
    return out;
  });
  expect(r).toEqual(["Energised", "Energised", "Okay"]);
});

test.describe("landscape phone", () => {
  test.use({
    viewport: { width: 667, height: 375 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  test("Needs with a feeling held back by a low need still fits, CLOSE in reach", async ({
    game,
    page,
  }) => {
    await game.open();
    await game.driveOut();
    await game.park();
    await game.eval(() => {
      const T = __T;
      T.needsLoad({ v: 1, energy: 50, hunger: 20, fun: 50, social: 50 });
      T.feel("happy", "Ana came over");
      T.pauseOn();
    });
    await game.waitState("PAUSE");
    await page.locator("#pNeeds").tap();
    await expect(page.locator("#ndMood")).toHaveText("Hungry");
    await expect(page.locator("#ndFeel")).toHaveText(
      "Happy once you're no longer hungry: Ana came over · 4 min left",
    );
    const fit = await page.evaluate(() => {
      const c = document.querySelector("#needs .card").getBoundingClientRect(),
        b = document.getElementById("ndClose").getBoundingClientRect(),
        f = document.getElementById("ndFeel").getBoundingClientRect();
      return {
        card: c.top >= 0 && c.bottom <= innerHeight + 0.5,
        close: b.bottom <= innerHeight + 0.5,
        feel: f.width > 0 && f.right <= c.right,
      };
    });
    expect(fit).toEqual({ card: true, close: true, feel: true });
  });
});
