// A friend over (js/life.js): asked while talking, Friend and up; they wait on the mezzanine at home, and hanging out
// there is social, fun, Charisma and friendship, once, after which they go home
const { test, expect } = require("./support/game");

async function withFriend(game, i = 0, f = 50) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(([i, f]) => {
    const T = __T;
    window.__DTMAX = 1e-9;   // the page's own frames hand the game almost no time: only the test's steps count
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    T.RIDE_V.lift = 0;
    // into Old Quay first, so its people are about
    T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
    const walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40), e = walks[i];
    T.PEDS.forEach((q, k) => { if (k !== i) { q.m.G.visible = false; q.x = q.z = 1e5; } });
    const p = T.PEDS[i];
    p.e = e; p.from = e.a; p.s = 20; p.st = "idle"; p.t = 999; p.hitAt = undefined; p.mad = false;
    if (f !== null) T.save.rel[i] = { f, n: 3 };
    // the car on the nearest road, you beside the person
    T.driveUpdate(1 / 60);
    const nr = T.nearestRoadGlobal(p.x, p.z, true);
    T.P.x = nr.x; T.P.z = nr.z; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
  }, [i, f]);
  await game.key("f");
  return game.eval((i) => {
    const T = __T, F = T.FOOT, p = T.PEDS[i], e = p.e, ax = e.b.x - e.a.x, az = e.b.z - e.a.z, L = Math.hypot(ax, az);
    F.x = p.x - (ax / L) * 1.8; F.z = p.z - (az / L) * 1.8; F.h = Math.atan2(p.x - F.x, p.z - F.z); F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
    return { name: T.PEOPLE[i].name, prompt: document.getElementById("promptTxt").textContent, car: Math.hypot(T.P.x - F.x, T.P.z - F.z) };
  }, i);
}
const talk = (game, i = 0) => game.eval((i) => __T.talkOpen(__T.PEDS[i]), i);
const invite = (game) => game.eval(() => { const b = document.getElementById("tkInvite"); return b.classList.contains("hide") ? null : { text: b.textContent, off: b.disabled }; });

test("a friend asked over waits on the mezzanine at home, and hanging out there pays once before they go", async ({ game, page }) => {
  const f = await withFriend(game, 0, 50);
  await talk(game);
  expect(await invite(game)).toEqual({ text: "Come over to my place 8", off: false });
  await game.key("8");
  expect(await game.eval(() => __T.GUEST.who && __T.GUEST.who.name)).toBe(f.name);
  expect(await invite(game)).toEqual({ text: "Coming over to your place", off: true });
  await game.eval(() => { __T.talkClose(); __T.NEEDS.social = 40; __T.NEEDS.fun = 50; __T.goGarage(); });
  await game.waitState("GARAGE");
  const home = await game.eval(() => {
    const T = __T, G = T.GUEST.m && T.GUEST.m.G;
    return { shown: !!G && G.visible && G.parent === T.scene, onMezz: !!G && Math.abs(G.position.y - (T.gY + T.HOME_ORIGIN.y)) < 0.01, pill: document.getElementById("gGuest").textContent, hidden: document.getElementById("gGuest").classList.contains("hide") };
  });
  expect(home).toEqual({ shown: true, onMezz: true, pill: "HANG OUT · " + f.name.toUpperCase(), hidden: false });
  await page.locator("#gGuest").click();
  const after = await game.eval(() => { const T = __T; return { rel: T.save.rel[0], social: T.NEEDS.social, fun: T.NEEDS.fun, gone: T.GUEST.m === null, done: T.GUEST.done, hidden: document.getElementById("gGuest").classList.contains("hide") }; });
  expect(after).toEqual({ rel: { f: 54, n: 4 }, social: 70, fun: 60, gone: true, done: true, hidden: true });
  // once: another click does nothing
  expect(await game.eval(() => __T.guestHangOut())).toBe(false);
});

test("an invitation is called off when you hurt them, or when they're no longer a Friend by the time you're home", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T, said = (i) => document.getElementById("toasts").textContent.includes(T.PEOPLE[i].name.toUpperCase());
    T.save.rel[0] = { f: 60, n: 3 };
    T.GUEST.who = T.PEOPLE[0]; T.GUEST.done = false;
    T.lifeHurt(T.PEDS[0], 5);
    const hurt = [T.GUEST.who, said(0)];
    // asked as a Friend, then the friendship cooled (a rude line, say)
    T.save.rel[1] = { f: 30, n: 4 };
    T.GUEST.who = T.PEOPLE[1]; T.GUEST.done = false;
    T.guestSync("GARAGE");
    return { hurt, cooled: [T.GUEST.who, said(1), document.getElementById("gGuest").classList.contains("hide")] };
  });
  expect(r).toEqual({ hurt: [null, true], cooled: [null, true, true] });
});

test("a friend over counts as something done at home: a Homebody gets 20% more social and fun from it", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T;
    T.save.traits = { v: 1, ids: ["homebody"], day: -1 };
    // (a Friend: one who isn't any more doesn't stay over)
    T.save.rel[T.PEOPLE[0].id] = { f: 60, n: 3 };
    T.GUEST.who = T.PEOPLE[0]; T.GUEST.done = false;
    T.NEEDS.social = 40; T.NEEDS.fun = 50;
    return { comfort: T.homeComfort(T.save.home), ok: T.guestHangOut(), social: T.NEEDS.social, fun: T.NEEDS.fun };
  });
  // an empty home: comfort 0, so all of the lift is Homebody's
  expect(r).toEqual({ comfort: 0, ok: true, social: 76, fun: 62 });
});

test("only a Friend (40 or more) can be asked over; a comfortable home is worth more friendship", async ({ game, page }) => {
  await withFriend(game, 0, 39);
  await talk(game);
  expect(await invite(game)).toBe(null);
  await game.eval(() => { const T = __T; T.save.rel[0] = { f: 60, n: 3 }; T.talkShow(); });
  expect(await invite(game)).toEqual({ text: "Come over to my place 8", off: false });
  await page.locator("#tkInvite").click();
  // comfort 50 (five sofas' worth): +4 and +2
  await game.eval(() => { const T = __T; T.talkClose(); T.goGarage(); });
  await game.waitState("GARAGE");
  await game.eval(() => { const T = __T; T.save.home.items = [0, 1, 2, 3, 4].map((i) => ({ id: "sofa", x: 4 + i * 6, z: 10, r: 0 })); });
  expect(await game.eval(() => __T.homeComfort(__T.save.home))).toBe(50);
  expect(await game.eval(() => { __T.guestHangOut(); return __T.save.rel[0].f; })).toBe(66);
});

test("a guest sits on your comfiest seat, facing the way it faces; with no seat they stand, and selling it stands them up", async ({ game }) => {
  await game.open();
  const pose = () => game.eval(() => {
    const T = __T, G = T.GUEST.m.G, floor = T.gY + T.HOME_ORIGIN.y;
    return { seat: T.GUEST.seat && T.GUEST.seat.id, lift: +(G.position.y - floor + .92 * T.GUEST.h).toFixed(3), legs: T.GUEST.m.legs.map((l) => l.rotation.x), turn: +(G.rotation.y - T.gYaw).toFixed(3) };
  });
  await game.eval(() => { const T = __T; T.save.home.items = [{ id: "stool", x: 6, z: 6, r: 0 }, { id: "armchair", x: 24, z: 6, r: 1 }]; T.homeBuild(); T.save.rel[1] = { f: 50, n: 3 }; T.GUEST.who = T.PEOPLE[1]; T.guestSync("GARAGE"); });
  // the reading chair before the stool, turned a quarter: the guest faces round with it
  expect(await pose()).toEqual({ seat: "armchair", lift: 0.47, legs: [-1.05, -1.05], turn: +(Math.PI - Math.PI / 2).toFixed(3) });
  // a sofa is comfier still; moving furniture reseats them
  await game.eval(() => { const T = __T; T.save.home.items.push({ id: "sofa", x: 12, z: 10, r: 0 }); T.homeBuild(); });
  expect((await pose()).seat).toBe("sofa");
  // no seats: standing, legs straight
  await game.eval(() => { const T = __T; T.save.home.items = []; T.homeBuild(); });
  const stand = await pose();
  expect(stand.seat).toBe(null);
  expect(stand.legs).toEqual([0, 0]);
  expect(stand.lift).toBeCloseTo(0.92 * (await game.eval(() => __T.GUEST.h)), 3);
});

test("with no seat and every usual spot taken, a guest stands on the nearest free cell, not inside the furniture", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T;
    T.save.home.items = [[20, 3], [14, 3], [26, 3], [10, 6], [30, 6]].map(([x, z]) => ({ id: "vase", x, z, r: 0 }));
    const c = T.guestSpot();
    return { c, free: T.homeFits(T.save.home, "stool", c.x, c.z, 0) };
  });
  expect(r.free).toBe(true);
  expect(Math.hypot(r.c.x - 20, r.c.z - 3)).toBe(1);
});
