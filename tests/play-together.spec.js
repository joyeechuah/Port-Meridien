// Playing together: one player starts a room and gets a code, a friend joins with it, and each sees the other where
// they are (their car in its paint, then on foot), with a name above them, until one leaves. Two browsers (two
// contexts, as two people would be), with ?mp=local, which runs the rooms through the test server's relay instead of
// the Realtime Database.
const { test, expect, Game } = require("./support/game");

const PATH = "/index.html?mp=local";

async function panel(game) {
  await game.eval(() => __T.pauseOn());
  await game.page.locator("#pPlay").click();
  await expect(game.page.locator("#play")).toBeVisible();
}
async function name(game, n) {
  await game.page.locator("#plName").fill(n);
  await game.page.locator("#plName").dispatchEvent("change");
}
const peer = (game) => game.eval(() => {
  const p = [...__T.NET.peers.values()][0];
  if (!p) return null;
  const G = p.model && p.model.G;
  return { name: p.name, kind: p.model && p.model.kind, shown: p.shown, x: G && G.position.x, z: G && G.position.z, tag: !!(p.tag && p.tag.visible) };
});
const me = (game) => game.eval(() => { const a = __T.FOOT.on ? __T.FOOT : __T.P; return { x: a.x, z: a.z }; });

test("a friend joins with the room's code, and each sees the other drive and walk, until one leaves", async ({ game, page, browser }) => {
  test.setTimeout(240000);
  const ctx2 = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 720 } });
  const page2 = await ctx2.newPage();
  const friend = new Game(page2);
  await game.open({ path: PATH });
  await friend.open({ path: PATH });
  await game.driveOut();
  await friend.driveOut();

  // Jo starts a room
  await panel(game);
  await name(game, "Jo");
  await page.locator("#plStart").click();
  await expect(page.locator("#plRoom")).toHaveText(/^[A-HJ-NP-Z2-9]{4}$/, { timeout: 10000 });
  const code = await page.locator("#plRoom").textContent();
  expect(await game.eval(() => __T.save.nick)).toBe("Jo");

  // a wrong code says so, then Ali joins with the right one
  await panel(friend);
  await name(friend, "Ali");
  await page2.locator("#plCode").fill("ZZ9Z");
  await page2.locator("#plJoin").click();
  await expect(page2.locator("#plNote")).toHaveText(/no room with that code/, { timeout: 10000 });
  await page2.locator("#plCode").fill(code.toLowerCase());
  await expect(page2.locator("#plCode")).toHaveValue(code);
  await page2.locator("#plJoin").click();
  await expect(page2.locator("#plRoom")).toHaveText(code, { timeout: 10000 });
  await expect(page2.locator("#plList")).toContainText("Jo");
  await expect(page.locator("#plList")).toContainText("Ali", { timeout: 10000 });
  await expect(page.locator("#plCount")).toHaveText("2 of 4 players");
  for (const g of [game, friend]) { await g.page.locator("#plClose").click(); await g.eval(() => __T.pauseOff()); }

  // Jo drives somewhere far off: Ali sees Jo's car there (the name only shows within 260 m, so it's hidden)
  await game.park();
  await game.steps(30, { w: true });
  await page2.waitForTimeout(800);
  let at = await me(game), seen = await peer(friend);
  expect(seen).toMatchObject({ name: "Jo", kind: "car", shown: true, tag: false });
  expect(Math.hypot(seen.x - at.x, seen.z - at.z)).toBeLessThan(2);
  // Ali drives over: Jo's name shows above the car
  await friend.park(at.x, at.z);
  await page2.waitForTimeout(500);
  at = await me(game);
  seen = await peer(friend);
  expect(seen).toMatchObject({ name: "Jo", kind: "car", shown: true, tag: true });
  expect(Math.hypot(seen.x - at.x, seen.z - at.z)).toBeLessThan(2);
  expect(await friend.eval(() => [...__T.NET.peers.values()][0].key)).toBe(await game.eval(() => "car:" + __T.curCar().id + ":" + __T.paintOf(__T.curId)));

  // Jo stops and gets out: Ali sees Jo on foot, next to the car
  await game.park(at.x, at.z);
  await page.keyboard.press("f");
  await game.waitState("DRIVE");
  await page.waitForFunction(() => __T.FOOT.on);
  await page2.waitForTimeout(800);
  at = await me(game);
  seen = await peer(friend);
  expect(seen).toMatchObject({ name: "Jo", kind: "foot", shown: true });
  expect(Math.hypot(seen.x - at.x, seen.z - at.z)).toBeLessThan(1.5);

  // and Jo sees Ali too
  expect(await peer(game)).toMatchObject({ name: "Ali", kind: "car", shown: true });

  // Jo leaves: Ali's game takes Jo away and says so
  await friend.watchToasts();
  await panel(game);
  await page.locator("#plLeave").click();
  await expect(page.locator("#plOut")).toBeVisible();
  await page2.waitForFunction(() => __T.NET.peers.size === 0, null, { timeout: 5000 });
  expect((await friend.toastLog()).join()).toContain("JO | left the room");
  expect(friend.errors, "the friend's page threw or logged errors").toEqual([]);
  await ctx2.close();
});

test("each message is small and says only where you are and what you look like", async ({ game }) => {
  await game.open({ path: PATH });
  await game.driveOut();
  const d = await game.eval(() => __T.netState());
  expect(Object.keys(d).sort()).toEqual(["c", "h", "m", "n", "o", "p", "q", "v", "x", "y", "z"]);
  expect(d).toMatchObject({ m: 0, n: "Player", o: "palms" });
  expect(JSON.stringify(d).length).toBeLessThan(200);
  // on foot: no car, no paint
  await game.park();
  await game.key("f");
  await game.page.waitForFunction(() => __T.FOOT.on);
  expect(Object.keys(await game.eval(() => __T.netState())).sort()).toEqual(["h", "m", "n", "o", "v", "x", "y", "z"]);
});

test("without the address switch or a project, the panel says playing together isn't set up here", async ({ game, page }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => { __T.FIREBASE_CONFIG.databaseURL = ""; });
  await panel(game);
  await page.locator("#plStart").click();
  await expect(page.locator("#plNote")).toHaveText("Playing together isn't set up on this copy of the game.");
  expect(await game.eval(() => __T.NET.room)).toBeNull();
});
