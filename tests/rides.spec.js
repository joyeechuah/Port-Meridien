// Friends who ride with you (js/life.js): a friend can be asked along; they walk to your car and get in beside you,
// talk as you drive, sometimes ask for a lift somewhere, and get out when you stop and let them, get out yourself or
// go indoors. Company lifts Social and the friendship; crashes, speed and the police get a word.
const { test, expect } = require("./support/game");

const steps = (game, n, dt = 1 / 60) => game.eval(([n, dt]) => { for (let i = 0; i < n; i++) __T.driveUpdate(dt); }, [n, dt]);
const log = (game) => game.toastLog();
// on foot in Old Quay with person i standing still beside you on a pavement, your car parked on the road next to you,
// traffic off the roads and everyone else out of the way
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
const rideBtn = (game) => game.eval(() => { const b = document.getElementById("tkRide"); return b.classList.contains("hide") ? null : b.textContent; });
// walk to the car and get in
const getIn = (game) => game.eval(() => {
  const T = __T, F = T.FOOT;
  F.x = T.P.x + Math.cos(T.P.h) * 1.7; F.z = T.P.z - Math.sin(T.P.h) * 1.7; F.y = T.footGround(F.x, F.z);
  T.driveUpdate(1 / 60);
  return T.footEnter();
});
const ride = (game) => game.eval(() => ({ st: __T.RIDE.st, who: __T.RIDE.who && __T.RIDE.who.name, inCar: !!(__T.RIDE.p && __T.RIDE.p.m.G.parent === __T.pc.G), hud: document.getElementById("ride").classList.contains("hide") ? null : document.getElementById("ride").textContent.replace(/\s+/g, " ").trim() }));

test.describe("rides", () => {
  test("friends are asked along with 7 or the button; strangers aren't offered it; saying yes brings them to your car and into the seat beside you", async ({ game, page }) => {
    const m = await withFriend(game, 0, 10);
    expect(m.car).toBeLessThan(40);
    expect(await talk(game)).toBe(true);
    expect(await rideBtn(game), "not friends yet").toBe(null);
    await game.eval(() => __T.talkClose());
    await game.eval(() => { __T.save.rel[0] = { f: 45, n: 4 }; });
    expect(await talk(game)).toBe(true);
    expect(await rideBtn(game)).toBe("Come for a ride 7");
    await game.watchToasts();
    await game.key("7");
    expect(await ride(game)).toMatchObject({ st: "follow", who: m.name, hud: "WITH " + m.name + " · to your car" });
    expect(await game.eval(() => document.getElementById("talk").classList.contains("hide"))).toBe(true);
    expect((await log(game))[0]).toBe(m.name.toUpperCase() + " | “I'd love to!”");
    expect(await game.eval(() => __T.save.rel[0].f)).toBe(48);
    // they come with you on foot
    await game.eval(() => { const T = __T, F = T.FOOT; F.h += Math.PI / 2; T.keys.w = true; for (let i = 0; i < 180; i++) T.driveUpdate(1 / 60); T.keys.w = false; for (let i = 0; i < 120; i++) T.driveUpdate(1 / 60); });
    const near = await game.eval(() => Math.hypot(__T.RIDE.p.x - __T.FOOT.x, __T.RIDE.p.z - __T.FOOT.z));
    expect(near).toBeLessThan(2.5);
    // in the car, they walk round to the passenger door and get in
    expect(await getIn(game)).toBe(true);
    await steps(game, 360);
    expect(await ride(game)).toMatchObject({ st: "ride", inCar: true, hud: "WITH " + m.name });
    const seat = await game.eval(() => { const G = __T.RIDE.p.m.G; return { x: G.position.x, legs: __T.RIDE.p.m.legs[0].rotation.x }; });
    expect(seat.x).toBeLessThan(0);   // the right-hand seat (the driver sits on the left)
    expect(seat.legs).toBeCloseTo(-1.35, 2);
  });

  test("riding: Social and the friendship rise a little; speed, a crash and the police each get a word; the police cost friendship once a chase", async ({ game }) => {
    await withFriend(game, 0, 50);
    await talk(game);
    await game.key("7");
    await getIn(game);
    await steps(game, 360);
    expect((await ride(game)).st).toBe("ride");
    await game.watchToasts();
    const r = await game.eval(() => {
      const T = __T, P = T.P, who = T.RIDE.who;
      T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START, { social: 30 }));
      T.RIDE.chat = 1e9;   // no chatter, so only what's tested speaks
      const f0 = T.save.rel[who.id].f, s0 = T.NEEDS.social;
      for (let i = 0; i < 60 * 61; i++) T.driveUpdate(1 / 60);
      const after = { f: T.save.rel[who.id].f - f0, s: T.NEEDS.social - s0 };
      // speed (the needs and ride ticks, without the car's own physics)
      for (let i = 0; i < 3; i++) { P.vx = Math.sin(P.h) * (140 / 3.6); P.vz = Math.cos(P.h) * (140 / 3.6); T.rideTick(1 / 60); }
      P.vx = P.vz = 0;
      // a crash
      const f1 = T.save.rel[who.id].f;
      P.damage = (P.damage || 0) + 5; T.rideTick(1 / 60);
      const crash = T.save.rel[who.id].f - f1;
      // the police, twice in one chase
      const f2 = T.save.rel[who.id].f;
      T.WANTED.lvl = 1; T.rideTick(1 / 60); T.rideTick(1 / 60);
      const cops = T.save.rel[who.id].f - f2;
      T.copClear();
      return { after, crash, cops, trait: who.trait };
    });
    // 61 s: 3 friendship points (one every 20 s) and 10 points of company less 61 s of the need falling
    expect(r.after.f).toBe(3);
    expect(r.after.s).toBeCloseTo(10 - (2 * 61) / 30, 5);
    expect(r.crash).toBe(-2);
    expect(r.cops).toBe(-8);
    const t = await log(game);
    expect(t.length).toBe(3);
    expect(t[0]).toBe("MAYA | “Whee! Faster!”");
    expect(t[1]).toBe("MAYA | “Oops! Everyone all right?”");
    expect(t[2]).toBe("MAYA | “Oh no, oh no. Drive!”");
  });

  test("stopped, the prompt lets them out: in Old Quay they step onto the pavement and walk on; getting out or going home also ends a ride", async ({ game, page }) => {
    await withFriend(game, 0, 50);
    await talk(game);
    await game.key("7");
    await getIn(game);
    await steps(game, 360);
    await game.watchToasts();
    // not straight after they get in; a few seconds later, stopped, it's there
    expect(await game.eval(() => { __T.RIDE.t = 0; return __T.ridePrompt(); })).toBe(null);
    await steps(game, 330);
    await expect(page.locator("#promptTxt")).toHaveText("Drop off Maya");
    await page.locator("#prompt").click();
    const out = await game.eval(() => { const p = __T.PEDS[0]; return { st: p.st, scene: p.m.G.parent === __T.scene, rider: __T.RIDE.p, hud: document.getElementById("ride").classList.contains("hide") }; });
    expect(out).toEqual({ st: "idle", scene: true, rider: null, hud: true });
    expect((await log(game)).slice(-1)).toEqual(["MAYA | “Thanks for the ride!”"]);
    // and she walks round the blocks again, and can be talked to
    await steps(game, 240);
    expect(await game.eval(() => ["walk", "idle", "wait", "cross"].includes(__T.PEDS[0].st))).toBe(true);
    // getting out yourself
    await game.eval(() => { __T.footExit(); });
    await game.eval(() => { const T = __T, p = T.PEDS[0], F = T.FOOT; F.x = p.x - 1.5; F.z = p.z; F.h = Math.atan2(p.x - F.x, p.z - F.z); p.st = "idle"; p.t = 999; T.P.x = p.x - 4; T.P.z = p.z; T.FOOT.car = [T.P.x, T.P.z]; T.driveUpdate(1 / 60); });
    expect(await talk(game)).toBe(true);
    await game.key("7");
    await getIn(game);
    await steps(game, 360);
    expect((await ride(game)).st).toBe("ride");
    await game.eval(() => __T.footExit());
    await steps(game, 1);
    expect((await ride(game)).st).toBe("");
    expect(await game.eval(() => __T.PEDS[0].m.G.parent === __T.scene)).toBe(true);
    // going home
    await game.eval(() => { const T = __T, p = T.PEDS[0], F = T.FOOT; F.x = p.x - 1.5; F.z = p.z; F.h = Math.atan2(p.x - F.x, p.z - F.z); p.st = "idle"; p.t = 999; T.driveUpdate(1 / 60); });
    expect(await talk(game)).toBe(true);
    await game.key("7");
    await getIn(game);
    await steps(game, 360);
    await game.eval(() => __T.goGarage(true));
    expect(await game.eval(() => ({ st: __T.RIDE.st, scene: __T.PEDS[0].m.G.parent === __T.scene }))).toEqual({ st: "", scene: true });
  });

  test("a lift: they ask to go somewhere, the GPS takes you, and pulling up there is thanks and something for the fuel", async ({ game }) => {
    await withFriend(game, 0, 50);
    await game.eval(() => { __T.RIDE_V.lift = 1; });
    await talk(game);
    await game.key("7");
    await getIn(game);
    await game.watchToasts();
    await steps(game, 360);
    const d = await game.eval(() => ({ dest: __T.RIDE.dest, gps: __T.gps.t && __T.gps.label, hud: document.getElementById("rideTo").textContent }));
    expect(d.dest).toBeTruthy();
    expect(d.gps).toBe(d.dest.name);
    expect(d.hud).toBe("· to " + d.dest.name);
    expect((await log(game)).some((t) => t === "MAYA | “Could you drop me at " + d.dest.name + "?”")).toBe(true);
    const r = await game.eval((D) => {
      const T = __T, cr = T.save.cr, f = T.save.rel[0].f;
      T.P.x = D.x + 10; T.P.z = D.z; T.P.vx = T.P.vz = 0;
      T.rideTick(1 / 60);
      return { cr: T.save.cr - cr, f: T.save.rel[0].f - f, rider: T.RIDE.p, gps: T.gps.t };
    }, d.dest);
    expect(r).toMatchObject({ cr: 250, f: 8, rider: null, gps: null });
    expect((await log(game)).slice(-1)[0]).toMatch(/^MAYA \| “This is me\. Thanks! Here, for the fuel\.” \+250 CR$/);
  });

  test("drive off before they reach the car and they're left behind, a little hurt", async ({ game }) => {
    await withFriend(game, 0, 50);
    await talk(game);
    await game.key("7");
    // straight into the car while they're 20 m off
    await game.eval(() => { const p = __T.PEDS[0]; p.x += 20; });
    await getIn(game);
    await game.watchToasts();
    const r = await game.eval(() => {
      const T = __T, P = T.P, f = T.save.rel[0].f;
      for (let i = 0; i < 10; i++) { P.vx = Math.sin(P.h) * 8; P.vz = Math.cos(P.h) * 8; P.x += P.vx / 60; P.z += P.vz / 60; T.rideTick(1 / 60); }
      P.vx = P.vz = 0;
      return { f: T.save.rel[0].f - f, rider: T.RIDE.p };
    });
    expect(r).toEqual({ f: -4, rider: null });
    expect((await log(game))[0]).toBe("MAYA | “You drove off without me!”");
  });

  test("who says yes: someone in a hurry wants a good friend, a grumpy one a close friend; your car must be near; one friend at a time; not with the police after you", async ({ game }) => {
    await withFriend(game, 5, 50);   // Rafael, always in a hurry
    const why = (i) => game.eval((i) => __T.rideWhy(__T.PEOPLE[i], __T.PEDS[i]), i);
    expect(await why(5)).toBe("Sorry, I'm late as it is!");
    await game.eval(() => { __T.save.rel[5].f = 70; });
    expect(await why(5)).toBe("");
    await game.eval(() => { __T.save.rel[1] = { f: 50, n: 2 }; });   // Theo, grumpy
    expect(await game.eval(() => __T.rideWhy(__T.PEOPLE[1], __T.PEDS[1]))).toBe("I'll walk, thanks.");
    await game.eval(() => { __T.save.rel[1].f = 55; });
    expect(await game.eval(() => __T.rideWhy(__T.PEOPLE[1], __T.PEDS[1]))).toBe("");
    await game.eval(() => { __T.WANTED.lvl = 1; });
    expect(await why(5)).toBe("Not while the police are after you!");
    await game.eval(() => __T.copClear());
    // far from the car
    await game.eval(() => { const T = __T; T.P.x += 60; T.FOOT.car = [T.P.x, T.P.z]; });
    expect(await why(5)).toBe("Where's your car? Bring it closer and ask again.");
    await game.eval(() => { const T = __T; T.P.x -= 60; T.FOOT.car = [T.P.x, T.P.z]; });
    // a "no" leaves the friendship as it was, and the conversation goes on
    await game.eval(() => { __T.save.rel[5].f = 50; });
    expect(await talk(game, 5)).toBe(true);
    await game.key("7");
    expect(await game.eval(() => ({ f: __T.save.rel[5].f, open: !document.getElementById("talk").classList.contains("hide"), rider: __T.RIDE.p }))).toEqual({ f: 50, open: true, rider: null });
    expect(await game.eval(() => document.getElementById("tkLine").textContent)).toMatch(/shakes their head\. “Sorry, I'm late as it is!”/);
    await game.eval(() => __T.talkClose());
  });

  test("a controller's pick takes in the ride line, and keyboard focus and the pick still agree", async ({ game }) => {
    await withFriend(game, 0, 50);
    await talk(game);
    const r = await game.eval(() => {
      const T = __T, buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), pad = { index: 0, connected: true, buttons, axes: [0, 0, 0, 0] };
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
      const press = (i) => { T.pollPad(); buttons[i].pressed = true; T.pollPad(); buttons[i].pressed = false; T.pollPad(); };
      const seen = [];
      try { for (let i = 0; i < 8; i++) { press(15); seen.push(document.activeElement.dataset.k); } } finally { delete navigator.getGamepads; }
      return { seen, sel: [...document.querySelectorAll("#tkActs .sel")].map((b) => b.dataset.k) };
    });
    expect(r.seen).toEqual(["chat", "joke", "compliment", "tip", "rude", "ride", "bye", "hello"]);
    expect(r.sel).toEqual(["hello"]);
    await game.eval(() => __T.talkClose());
  });
});
