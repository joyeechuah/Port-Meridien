// Birthdays (docs/GIFTS.md, js/life.js): each resident's comes round once in sixteen UTC days. Near them on their
// birthday a cake shows over their head now and then, and talking to them, the panel says BIRTHDAY TODAY beside their
// name. Today's is resident (day % 16), so the test needs no change to the clock.
const { test, expect } = require("./support/game");

async function besideSomeone(game, pid) {
  await game.open();
  await game.driveOut();
  await game.park();
  return game.eval((pid) => {
    const T = __T;
    window.__DTMAX = 1e-9; // the page's own frames hand the game almost no time: only the test's steps count
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.wx = t.wz = 1e6;
    }
    // into Old Quay, so its people are about
    T.P.x = 600;
    T.P.z = 0;
    T.P.vx = T.P.vz = 0;
    T.driveUpdate(1 / 60);
    const walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40),
      e = walks[0],
      p = T.PEDS[0];
    T.PEDS.forEach((q, k) => {
      if (k) {
        q.m.G.visible = false;
        q.x = q.z = 1e5;
      }
    });
    p.pid = pid;
    p.e = e;
    p.from = e.a;
    p.s = 20;
    p.st = "idle";
    p.t = 999;
    p.hitAt = undefined;
    p.mad = false;
    T.save.rel[pid] = { f: 50, n: 3 };
    T.driveUpdate(1 / 60);
    const nr = T.nearestRoadGlobal(p.x, p.z, true);
    T.P.x = nr.x;
    T.P.z = nr.z;
    T.P.vx = T.P.vz = 0;
    T.driveUpdate(1 / 60);
    // what they show as you pull up beside them
    return {
      name: T.PEOPLE[pid].name,
      shows: p.emo && p.emo.sp.visible ? p.emo.kind : null,
    };
  }, pid);
}
const today = () => Math.floor(Date.now() / 86400000) % 16;

test("on someone's birthday a cake shows over them when you're near, and talking to them says so", async ({
  game,
  page,
}) => {
  const id = today();
  const { name, shows } = await besideSomeone(game, id);
  expect(shows).toBe("cake");
  await game.key("f");
  await game.eval(() => {
    const T = __T,
      F = T.FOOT,
      p = T.PEDS[0];
    F.x = p.x + 1.8;
    F.z = p.z;
    F.h = Math.atan2(p.x - F.x, p.z - F.z);
    F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
  });
  await game.eval(() => __T.talkOpen(__T.PEDS[0]));
  await expect(page.locator("#tkBday")).toBeVisible();
  await expect(page.locator("#tkLine")).toContainText(
    "It's my birthday today.",
  );
  await expect(page.locator("#tkName")).toHaveText(name);
});

test("anyone else's day: no cake and no birthday in the panel", async ({
  game,
  page,
}) => {
  const id = (today() + 5) % 16;
  expect((await besideSomeone(game, id)).shows).not.toBe("cake");
  await game.key("f");
  const r = await game.eval(() => {
    const T = __T,
      F = T.FOOT,
      p = T.PEDS[0];
    F.x = p.x + 1.8;
    F.z = p.z;
    F.h = Math.atan2(p.x - F.x, p.z - F.z);
    F.y = T.footGround(F.x, F.z);
    for (let i = 0; i < 10; i++) T.driveUpdate(1 / 60);
    T.talkOpen(p);
    return p.emo ? p.emo.kind : null;
  });
  expect(r).not.toBe("cake");
  await expect(page.locator("#tkBday")).toBeHidden();
  await expect(page.locator("#tkLine")).not.toContainText("birthday");
});
