// Life in the house on foot (js/people.js houseUse, js/life.js homeOnFoot, guestAbout): walk up to your furniture in
// the room upstairs and it does what the garage screen's buttons do; a friend you've asked over waits there for you
// to hang out; a friend following you comes up the stairs. In the garage's frame: x across, z from the door, y up.
const { test, expect } = require("./support/game");

async function upstairs(game, items) {
  await game.open();
  await game.driveOut();
  await game.eval(() => { P.vx = P.vz = 0; P.thr = 0; driveUpdate(1 / 60); });
  await game.key("f");
  await game.eval((items) => {
    window.__DTMAX = 1e-9;
    for (const t of TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    save.home.items = items; homeBuild();
    // stand at a point of the room upstairs (garage frame), facing a heading
    window.__at = (x, z, h, y = 5.25) => { const p = gW(x, z); Object.assign(FOOT, { x: p.x, z: p.z, y: gY + y, h, cy: h, v: 0 }); driveUpdate(1 / 60); };
    window.__prompt = () => document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent;
    // a cell's middle in the garage frame
    window.__cell = (cx, cz) => [HOME_ORIGIN.x + cx * HOME_CELL, HOME_ORIGIN.z + cz * HOME_CELL];
  }, items);
  expect(await game.eval(() => FOOT.on)).toBe(true);
}

test("by the bed: REST by day and SLEEP at night, as the garage's buttons", async ({ game }) => {
  await upstairs(game, [{ id: "double", x: 20, z: 8, r: 0 }]);
  const day = await game.eval(() => {
    save.todMode = 0; save.tod = 13; needsLoad(Object.assign({ v: 1 }, NEEDS_START, { energy: 30 }));
    const [x, z] = __cell(19, 10); __at(x, z, Math.PI);
    return { prompt: __prompt(), on: homeOnFoot() };
  });
  expect(day).toEqual({ prompt: "Rest · energy 30", on: true });
  await game.key("e");
  const rested = await game.eval(() => ({ energy: needOf("energy"), wait: NS.restAt > NS.t, prompt: (driveUpdate(1 / 60), __prompt()) }));
  expect(rested.energy).toBeGreaterThan(80);
  expect(rested.wait).toBe(true);
  expect(rested.prompt).toMatch(/^Rested · energy/);
  const night = await game.eval(() => { save.tod = 22; NEEDS.energy = 40; driveUpdate(1 / 60); return __prompt(); });
  expect(night).toBe("Sleep until 07:00 · energy 40");
  await game.key("e");
  const slept = await game.eval(() => ({ tod: save.tod, energy: needOf("energy") }));
  expect(slept.tod).toBeCloseTo(7, 2);
  expect(slept.energy).toBe(100);
});

test("the fridge feeds you and the TV entertains you; neither while the police are after you", async ({ game }) => {
  await upstairs(game, [{ id: "fridge", x: 10, z: 8, r: 0 }, { id: "tv", x: 30, z: 8, r: 0 }]);
  const r = await game.eval(() => {
    needsLoad(Object.assign({ v: 1 }, NEEDS_START, { hunger: 20, fun: 20 }));
    const cook = save.skills.cooking;
    let [x, z] = __cell(11, 11); __at(x, z, Math.PI);
    const snackPrompt = __prompt(); promptAct(); const hunger = needOf("hunger"), cooked = save.skills.cooking > cook;
    [x, z] = __cell(31.5, 10.5); __at(x, z, Math.PI);
    const playPrompt = __prompt();
    WANTED.lvl = 1; const refused = !homeUse("play") && !needsRest(); WANTED.lvl = 0;
    promptAct(); const fun = needOf("fun");
    return { snackPrompt, hunger, cooked, playPrompt, refused, fun };
  });
  expect(r.snackPrompt).toBe("Snack · hunger 20");
  expect(r.hunger).toBeGreaterThan(45);
  expect(r.cooked).toBe(true);
  expect(r.playPrompt).toBe("Play · fun 20");
  expect(r.refused).toBe(true);
  expect(r.fun).toBeGreaterThan(40);
});

test("a seat sits you down facing the way it faces; walking gets you up in front of it, still upstairs", async ({ game }) => {
  await upstairs(game, [{ id: "sofa", x: 16, z: 8, r: 0 }]);
  const r = await game.eval(() => {
    const [x, z] = __cell(18, 7); __at(x, z, -Math.PI / 2);
    const prompt = __prompt(); promptAct();
    const sat = { on: SIT.on, h: +wrapA(FOOT.h - (gYaw + Math.PI)).toFixed(3), y: +(FOOT.m.G.position.y - gY).toFixed(2) };
    keys.w = true; for (let i = 0; i < 30; i++) driveUpdate(1 / 60); keys.w = false;
    const l = houseLocal(FOOT.x, FOOT.z), q = homeRect("sofa", 16, 8, 0), z0 = HOME_ORIGIN.z + q.z * HOME_CELL;
    return { prompt, sat, up: !SIT.on, y: +(FOOT.y - gY).toFixed(2), clear: l.z < z0 || l.z > z0 + q.d * HOME_CELL };
  });
  expect(r.prompt).toBe("Sit on the harbour sofa");
  expect(r.sat.on).toBe(true);
  expect(r.sat.h).toBeCloseTo(0, 2);
  expect(r.sat.y).toBeGreaterThan(4.6);
  expect(r.sat.y).toBeLessThan(5.25);
  expect(r).toMatchObject({ up: true, y: 5.25, clear: true });
});

test("a friend asked over waits in the room; they're solid, and walking up to them you hang out", async ({ game }) => {
  await upstairs(game, []);
  const r = await game.eval(() => {
    save.rel[0] = { f: 50, n: 5 };
    GUEST.who = PEOPLE[0]; GUEST.done = false;
    cullParked();
    const G = GUEST.m && GUEST.m.G, shown = !!G && G.visible, at = G && houseLocal(G.position.x, G.position.z), up = G && +(G.position.y - gY).toFixed(2);
    // walk straight at them
    const g = G.position, p = gW(at.x, at.z + 3);   // (from inside the room: they stand by the railing)
    Object.assign(FOOT, { x: p.x, z: p.z, y: gY + 5.25 }); FOOT.h = FOOT.cy = Math.atan2(g.x - FOOT.x, g.z - FOOT.z);
    keys.w = true; for (let i = 0; i < 120; i++) driveUpdate(1 / 60); keys.w = false; driveUpdate(1 / 60);
    const gap = Math.hypot(FOOT.x - g.x, FOOT.z - g.z), prompt = __prompt(), f0 = save.rel[0].f;
    promptAct();
    return { shown, up, gap, prompt, done: GUEST.done, gone: !GUEST.m, more: save.rel[0].f > f0 };
  });
  expect(r.shown).toBe(true);
  expect(r.up).toBeCloseTo(5.25, 1);
  expect(r.gap).toBeGreaterThan(0.6);
  expect(r.prompt).toBe("Hang out · Maya");
  expect(r).toMatchObject({ done: true, gone: true, more: true });
});

test("a friend following you on foot comes up to the room with you", async ({ game }) => {
  await upstairs(game, []);
  const y = await game.eval(() => {
    // you upstairs; your friend on the floor by the stairs, following
    const p = PEDS[0], q = gW(-1.6, 15);
    save.rel[0] = { f: 50, n: 5 }; RIDE_V.lift = 0;
    Object.assign(RIDE, { p, who: personOf(p), st: "follow", t: 0, stuck: 0, gain: 0, soc: 0, fr: 0, chat: 1e9, fastAt: -99, hitAt: -99, dmg: 0, dest: null, cops: false, car: null });
    p.st = "follow"; p.v = 0; p.x = q.x; p.z = q.z; p.y = gY; p.m.G.visible = true;
    const [x, z] = __cell(6, 12); __at(x, z, Math.PI);
    for (let i = 0; i < 60 * 8; i++) driveUpdate(1 / 60);
    return +(p.y - gY).toFixed(2);
  });
  expect(y).toBeCloseTo(5.25, 1);
});
