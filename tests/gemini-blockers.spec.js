// Fixes from Gemini's follow-up audit of 9170171: messages shown off the HUD, the cloud dialog over the loading screen,
// leaving a room going offline, headings and turns sent within the room's rules, and the pistol's close-range cover.
const { test, expect } = require("./support/game");

test("a message given on the garage screen is seen there (the HUD it lived in is hidden)", async ({ game, page }) => {
  await game.open();
  await game.waitState("GARAGE");
  await game.eval(() => toast("PURCHASED", "A test message", "gold"));
  await expect(page.locator("#toasts .toast").first()).toBeVisible();
  expect(await game.eval(() => document.getElementById("hud").classList.contains("hide"))).toBe(true);
});

test("the cloud dialog stands over the loading screen, and under the other-tab screen", async ({ game }) => {
  await game.open();
  const z = await game.eval(() => ["cloud", "cloudPick", "load", "tabIdle"].map((id) => +getComputedStyle(document.getElementById(id)).zIndex));
  expect(z[0]).toBeGreaterThan(z[2]);
  expect(z[1]).toBeGreaterThan(z[2]);
  expect(z[0]).toBeLessThan(z[3]);
});

test("leaving a room lets the database connection go offline", async ({ game }) => {
  await game.open();
  const r = await game.eval(async () => {
    let offline = false;
    const ref = { set: () => Promise.resolve(), remove: () => Promise.resolve(), onDisconnect: () => ({ remove: () => Promise.resolve(), cancel: () => Promise.resolve() }), on() {}, off() {} };
    const room = { once: () => Promise.resolve({ child: () => ({ val: () => null }) }), child: () => ref, on() {}, off() {} };
    const db = { goOnline() {}, goOffline() { offline = true; }, ref: () => room };
    const fb = window.firebase, load = window.fbLoad;
    window.fbLoad = () => Promise.resolve();
    window.firebase = { apps: [{ name: "play", auth: () => ({ currentUser: { uid: "u1" } }), database: () => db }] };
    try {
      const tx = netFirebase();
      await tx.connect();
      await tx.open("ABCD", true, { first: () => ({ x: 0 }), state() {}, leave() {}, lost() {} });
      NET.tx = tx; NET.room = "ABCD";
      netLeave();
      await new Promise((res) => setTimeout(res, 50));
      return { offline, tx: NET.tx, room: NET.room, joining: NET.joining };
    } finally { window.firebase = fb; window.fbLoad = load; }
  });
  expect(r).toEqual({ offline: true, tx: null, room: null, joining: false });
});

test("the heading sent is an angle within -pi..pi however far the car has turned, and turns arrive normalised", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => { P.h = 200.5; const d = netState(); return { h: d.h, q: NET_Q([0, 0.6, 0, 0.6]) }; });
  expect(Math.abs(r.h)).toBeLessThanOrEqual(Math.PI + 1e-3);
  expect(Math.hypot(...r.q)).toBeCloseTo(1, 6);
});

test("at close range a wall behind the target isn't cover, and one between still is", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    // the house's back wall (local z 29.75 to 30.6), clear of the aquarium: a target just in front of it, and one behind it
    const a = gW(-12, 28.9), behindWall = gW(-12, 29.35), beyond = gW(-12, 31.2);
    return { wallBehind: gunClear(a.x, a.z, behindWall.x, behindWall.z, 0.6, gY), through: gunClear(a.x, a.z, beyond.x, beyond.z, 0.6, gY) };
  });
  expect(r).toEqual({ wallBehind: true, through: false });
});
