// Playing together through Firebase's Realtime Database, the way players do: each game sits in one of a room's four
// numbered seats, and every write goes through the published rules (database.rules.json, checked by targaryen in
// tests/support/fake-rtdb.js). What the rules make the game handle: a full room, a connection that drops (the
// database empties the seat), and coming back to find the seat taken.
const { test, expect, Game } = require("./support/game");
const { FakeRtdb } = require("./support/fake-rtdb");

async function panel(game) {
  await game.eval(() => __T.pauseOn());
  await game.page.locator("#pPlay").click();
  await expect(game.page.locator("#play")).toBeVisible();
}
async function name(game, n) {
  await game.page.locator("#plName").fill(n);
  await game.page.locator("#plName").dispatchEvent("change");
}
const seats = (db, code) => db.value(`rooms/${code}/players`) || {};
const who = (db, code) => Object.fromEntries(Object.entries(seats(db, code)).filter(([, v]) => v).map(([k, v]) => [k, v.uid]));
const peers = (game) => game.eval(() => __T.NET.peers.size);
const away = (uid) => ({ uid, n: uid.slice(1), o: "palms", m: 3, x: 0, y: 0, z: 0, h: 0, v: 0, t: 1 });

test("friends on the database: a seat each, the seat taken back after a dropped connection, another if it went", async ({ game, page, browser }) => {
  test.setTimeout(180000);
  const db = new FakeRtdb();
  const ctx2 = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 720 } });
  const page2 = await ctx2.newPage();
  const friend = new Game(page2);
  await game.open();
  await friend.open();
  await db.attach(page, "uJo");
  await db.attach(page2, "uAli");
  await game.driveOut();
  await friend.driveOut();

  // Jo starts a room and sits in seat 0; Ali joins and sits in seat 1
  await panel(game);
  await name(game, "Jo");
  await page.locator("#plStart").click();
  await expect(page.locator("#plRoom")).toHaveText(/^[A-HJ-NP-Z2-9]{4}$/, { timeout: 10000 });
  const code = await page.locator("#plRoom").textContent();
  expect(who(db, code)).toEqual({ 0: "uJo" });
  await panel(friend);
  await name(friend, "Ali");
  await page2.locator("#plCode").fill(code);
  await page2.locator("#plJoin").click();
  await expect(page2.locator("#plRoom")).toHaveText(code, { timeout: 10000 });
  await expect(page.locator("#plList")).toContainText("Ali", { timeout: 10000 });
  expect(who(db, code)).toEqual({ 0: "uJo", 1: "uAli" });
  for (const g of [game, friend]) { await g.page.locator("#plClose").click(); await g.eval(() => __T.pauseOff()); }
  await expect.poll(() => peers(friend)).toBe(1);
  // a seat holds who sits there and where they are, in a car here; the rules refuse any other field
  expect(Object.keys(seats(db, code)[0]).sort()).toEqual(["c", "h", "m", "n", "o", "p", "q", "t", "uid", "v", "x", "y", "z"]);

  // Jo's connection drops: the database empties seat 0 and Ali sees Jo go; meanwhile Zed sits down in seat 0
  db.drop("uJo");
  expect(who(db, code)).toEqual({ 1: "uAli" });
  await expect.poll(() => peers(friend)).toBe(0);
  db.seed(`rooms/${code}/players/0`, away("uZed"));
  await expect.poll(() => peers(friend)).toBe(1);
  // back online, Jo finds seat 0 taken, sits in seat 2, and asks for that seat (only) to be emptied on the next drop
  db.restore("uJo");
  await expect.poll(() => who(db, code), { timeout: 10000 }).toEqual({ 0: "uZed", 1: "uAli", 2: "uJo" });
  await expect.poll(() => peers(friend)).toBe(2);
  const jo = [...db.conns.values()].find((c) => c.uid === "uJo");
  expect([...jo.ondisc]).toEqual([`rooms/${code}/players/2`]);
  // the only writes the rules refused were Jo's at the old seat: the try at taking it back, and any sends made just
  // before Jo's game noticed the drop (the SDK sends those once it's back, and the game moves seats on the refusal)
  expect(db.denied.length).toBeGreaterThan(0);
  expect(db.denied.filter((d) => d.uid !== "uJo" || d.path !== `rooms/${code}/players/0` || d.ondisc)).toEqual([]);

  // Jo leaves: seat 2 is emptied, Zed's seat is untouched, and Jo's connection closes
  await panel(game);
  await page.locator("#plLeave").click();
  await expect.poll(() => who(db, code)).toEqual({ 0: "uZed", 1: "uAli" });
  expect(jo.online).toBe(false);
  await expect.poll(() => peers(friend)).toBe(1);
  expect(friend.errors).toEqual([]);
  await ctx2.close();
});

test("a full room says so, and nothing is written to it", async ({ game, page }) => {
  const db = new FakeRtdb();
  for (let i = 0; i < 4; i++) db.seed(`rooms/K7PM/players/${i}`, away("u" + i));
  await game.open();
  await db.attach(page, "uJo");
  await game.driveOut();
  await panel(game);
  await page.locator("#plCode").fill("K7PM");
  await page.locator("#plJoin").click();
  await expect(page.locator("#plNote")).toHaveText("That room is full: four players already.", { timeout: 10000 });
  expect(db.writes).toBe(0);
  expect(db.denied).toEqual([]);
  expect(Object.keys(seats(db, "K7PM"))).toHaveLength(4);
});
