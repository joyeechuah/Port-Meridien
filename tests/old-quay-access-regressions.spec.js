// Regressions promised in the independent Old Quay #21 review.
// Only tests: the original dealer marker/forecourt and Old Quay Dash run-out.
// Both driving sides are checked because the event grid/traffic placement flips.
const { test, expect } = require("./support/game");

async function ready(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  // Remove traffic from the area being surveyed. This tests the fixed scenery
  // and markers, not temporary car blockage or unrelated traffic spawns.
  await game.eval(() => {
    for (const t of __T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.c.G.visible = false;
      t.wx = t.wz = 1e6;
    }
  });
}

test("the original Auto Gallery forecourt and interaction marker remain open after Old Quay", async ({ game, page }) => {
  await ready(game);
  const survey = await game.eval(() => {
    const T = __T;
    T.P.x = 300; T.P.z = 600;
    T.P.vx = T.P.vz = 0;
    let worst = 0, count = 0;
    // The forecourt is a 46 x 16 paved rectangle in front of
    // the showroom. The marker is (722,54), with a 24m prompt reach.
    for (let x = 706; x <= 738; x += 2) {
      for (let z = 49; z <= 59; z += 2) {
        const p = T.footClear(x, z);
        worst = Math.max(worst, Math.hypot(p[0] - x, p[1] - z));
        count++;
      }
    }
    T.P.x = T.DEALER_MARK.x;
    T.P.z = T.DEALER_MARK.z;
    T.P.vx = T.P.vz = 0;
    T.updatePrompt();
    return {
      marker: [T.DEALER_MARK.x, T.DEALER_MARK.z],
      count, worst: +worst.toFixed(5),
      label: document.getElementById("promptTxt").textContent,
      visible: !document.getElementById("prompt").classList.contains("hide"),
    };
  });
  expect(survey.marker).toEqual([722, 54]);
  expect(survey.count).toBeGreaterThan(80);
  expect(survey.worst, "Old Quay obstruction on existing dealer forecourt").toBeLessThan(0.01);
  expect(survey.visible).toBe(true);
  expect(survey.label).toMatch(/^Enter Auto Gallery/);

  // Exercise the actual prompt control and return, not only the text.
  await page.locator("#prompt").click();
  await game.waitState("DEALER");
  await expect(page.locator("#dealer")).toBeVisible();
  await page.locator("#dExit").click();
  await game.waitState("DRIVE");
  const after = await game.eval(() => {
    const T = __T;
    return {
      d: Math.hypot(T.P.x - T.DEALER_MARK.x, T.P.z - T.DEALER_MARK.z),
      onRoad: T.P.onRoad,
    };
  });
  expect(after.d, "dealer exit returns to nearby town road").toBeLessThan(35);
});

for (const side of ["L", "R"]) {
  test(`Old Quay Dash finishes and has unobstructed run-out when traffic drives on ${side === "L" ? "left" : "right"}`, async ({ game, page }) => {
    await ready(game);
    // Keep the finish/straight-ahead strip clear of all fixed Old Quay colliders.
    // Last route points run north from approximately (560,60) to (560,40).
    const checked = await game.eval((side) => {
      const T = __T, E = T.EVENTS.find(e => e.id === "oldtown");
      T.save.side = side;
      T.P.x = 300; T.P.z = 600;
      let worst = 0, n = 0;
      for (let z = 40; z <= 65; z += 1) {
        for (const off of [-3.2, -1.6, 0, 1.6, 3.2]) {
          const x = 560 + off, c = T.footClear(x, z);
          worst = Math.max(worst, Math.hypot(c[0] - x, c[1] - z));
          n++;
        }
      }
      return { side: T.save.side, n, worst: +worst.toFixed(5),
        last: E.route.pts.at(-1), len: E.route.len };
    }, side);
    expect(checked.side).toBe(side);
    expect(checked.n).toBe(130);
    expect(checked.worst, "fixed obstacle across the dash finish and run-out").toBeLessThan(0.01);
    expect(checked.len).toBeGreaterThan(800);
    await game.eval(() => __T.openIntro(__T.EVENTS.find(e => e.id === "oldtown")));
    await game.waitState("INTRO");
    await page.locator("#iGo").click();
    await page.waitForFunction(() => __T.ev && __T.state === "DRIVE", null, { timeout: 30_000 });
    const result = await game.eventBot(20_000);
    expect(result.state, "Old Quay Dash should remain finishable").toBe("RESULT");
    expect(await game.eval(() => __T.save.rec.oldtown)).toBeGreaterThan(10);
  });
}
