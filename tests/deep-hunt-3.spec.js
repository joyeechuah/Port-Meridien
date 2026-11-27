// Bugs from the third deep audit (28 Nov 2026) and Codex's audit of the same day, about the house on foot: where you
// sit on moved furniture, what the bed offers with a friend waiting, the party and the friend following you, the
// police in the house, and furniture in the camera's way. In the garage's frame: x across, z from the door, y up.
const { test, expect } = require("./support/game");

async function upstairs(game, items = []) {
  await game.open();
  await game.driveOut();
  await game.eval(() => { P.vx = P.vz = 0; P.thr = 0; driveUpdate(1 / 60); });
  await game.key("f");
  await game.eval((items) => {
    window.__DTMAX = 1e-9;
    for (const t of TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    save.home.items = items; homeBuild();
    window.__at = (x, z, h, y = 5.25) => { const p = gW(x, z); Object.assign(FOOT, { x: p.x, z: p.z, y: gY + y, h, cy: h, v: 0 }); driveUpdate(1 / 60); };
    window.__prompt = () => document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent;
    window.__cell = (cx, cz) => [HOME_ORIGIN.x + cx * HOME_CELL, HOME_ORIGIN.z + cz * HOME_CELL];
  }, items);
}

test("a sofa moved and turned in DESIGN HOME: you sit where it is now, facing its new way", async ({ game }) => {
  await upstairs(game, [{ id: "sofa", x: 16, z: 8, r: 0 }]);
  const r = await game.eval(() => {
    let [x, z] = __cell(18, 9); __at(x, z, Math.PI); promptAct(); sitEnd();
    Object.assign(save.home.items[0], { x: 30, z: 10, r: 1 }); homeBuild();
    const q = homeRect("sofa", 30, 10, 1), mid = __cell(q.x + q.w / 2, q.z + q.d / 2);
    __at(mid[0] + 1.2, mid[1], 0);
    const prompt = __prompt(); promptAct();
    const l = houseLocal(FOOT.x, FOOT.z);
    return { prompt, d: Math.hypot(l.x - mid[0], l.z - mid[1]), turn: wrapA(SIT.b.a - (gYaw - Math.PI / 2)) };
  });
  expect(r.prompt).toBe("Sit on the harbour sofa");
  expect(r.d).toBeLessThan(0.5);
  expect(r.turn).toBeCloseTo(0, 5);
});

test("at night with a friend waiting the bed offers REST, not a SLEEP that refuses; sleeping on foot says so", async ({ game }) => {
  await upstairs(game, [{ id: "double", x: 20, z: 8, r: 0 }]);
  const r = await game.eval(() => {
    save.todMode = 0; save.tod = 23; needsLoad(Object.assign({ v: 1 }, NEEDS_START, { energy: 30 }));
    relSet(0, 80, 3); GUEST.who = PEOPLE[0]; GUEST.done = false;
    const [x, z] = __cell(19, 10); __at(x, z, Math.PI);
    const waiting = __prompt();
    GUEST.who = null; driveUpdate(1 / 60);
    const free = __prompt(); promptAct();
    return { waiting, free, tod: save.tod, toasts: document.getElementById("toasts").textContent };
  });
  expect(r.waiting).toBe("Rest · energy 30");
  expect(r.free).toBe("Sleep until 07:00 · energy 30");
  expect(r.tod).toBeCloseTo(7, 2);
  expect(r.toasts).toContain("07:00 · A good night's sleep");
});

test("the friend following you isn't on the party's list, and can't be asked", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    const p = PEDS[0], who = personOf(p); relSet(who.id, 80, 3);
    Object.assign(RIDE, { p, who, st: "follow", t: 0, stuck: 0, gain: 0, soc: 0, fr: 0, chat: "", fastAt: -99, hitAt: -99, dmg: 0, dest: null, cops: false, car: null }); p.st = "follow";
    __at(19, 27, Math.PI);
    const listed = partyFriends().some((q) => q.id === who.id), rep = partyInvite([who.id])[0];
    return { listed, accepted: rep.accepted, reason: rep.reason, started: partyStart() };
  });
  expect(r).toEqual({ listed: false, accepted: false, reason: "I'm right here with you!", started: false });
});

test("with the police after you, the room's furniture and guests say so instead of doing nothing", async ({ game }) => {
  await upstairs(game, [{ id: "fridge", x: 10, z: 8, r: 0 }]);
  const r = await game.eval(() => {
    needsLoad(Object.assign({ v: 1 }, NEEDS_START, { hunger: 20 }));
    const [x, z] = __cell(11, 11); __at(x, z, Math.PI);
    const calm = __prompt();
    WANTED.lvl = 1; driveUpdate(1 / 60);
    const wanted = __prompt(); WANTED.lvl = 0;
    return { calm, wanted };
  });
  expect(r).toEqual({ calm: "Snack · hunger 20", wanted: "Lose the police first" });
});

test("an officer on the garage floor can't arrest you in the room above; they come up the stairs", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    __at(10, 24, Math.PI);
    WANTED.lvl = 1; WANTED.seen = true;
    // the patrol car they got out of, stopped out on the drive (standing in for one: only its place matters here)
    const O = OFFICER, d = gW(0, -14), t = { e: {}, wx: d.x, wz: d.z, v: 0, stopT: 0, yaw: 0 };
    Object.assign(O, { on: true, x: FOOT.x + 0.3, z: FOOT.z, y: gY, h: 0, v: 0, car: t, back: false, caughtT: 0, detA: 0, detT: 0, detSide: 0, outT: 0, best: 1e9, down: 0, fall: 0, out: false, downT: 0 });
    let caught = false, top = 0;
    for (let i = 0; i < 60 * 12 && !caught; i++) { caught = copOfficer(1 / 60, [t], false); top = Math.max(top, O.y - gY); }
    return { caught, top: +top.toFixed(2) };
  });
  // a while under the room without an arrest, then up the stairs to you
  expect(r.top).toBeGreaterThan(5);
  expect(r.caught).toBe(true);
});

test("the officer under the room: no arrest for the first seconds, while they're still on the floor below", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    __at(10, 24, Math.PI);
    WANTED.lvl = 1; WANTED.seen = true;
    // the patrol car they got out of, stopped out on the drive (standing in for one: only its place matters here)
    const O = OFFICER, d = gW(0, -14), t = { e: {}, wx: d.x, wz: d.z, v: 0, stopT: 0, yaw: 0 };
    Object.assign(O, { on: true, x: FOOT.x + 0.3, z: FOOT.z, y: gY, h: 0, v: 0, car: t, back: false, caughtT: 0, detA: 0, detT: 0, detSide: 0, outT: 0, best: 1e9, down: 0, fall: 0, out: false, downT: 0 });
    let caught = false;
    for (let i = 0; i < 90 && !caught; i++) caught = copOfficer(1 / 60, [t], false);
    return { caught, below: O.y - gY < 1 };
  });
  expect(r).toEqual({ caught: false, below: true });
});

test("furniture between you and the chase camera brings the lens in front of it", async ({ game }) => {
  await upstairs(game, [{ id: "fridge", x: 20, z: 12, r: 0 }]);
  const r = await game.eval(() => {
    const q = homeRect("fridge", 20, 12, 0), mid = __cell(q.x + q.w / 2, q.z + q.d / 2);
    // stand in front of the fridge, facing away from it: the lens behind you is where the fridge is
    __at(mid[0], mid[1] - 1.6, -Math.PI / 2);
    for (let i = 0; i < 30; i++) driveUpdate(1 / 60);
    const eye = new THREE.Vector3(FOOT.x, FOOT.y + 1.1, FOOT.z), lens = camera.position.clone();
    const box = new THREE.Box3().setFromObject(HV.meshes[0]);
    const ray = new THREE.Ray(eye, lens.clone().sub(eye).normalize()), hit = new THREE.Vector3();
    const blocked = !!ray.intersectBox(box, hit) && eye.distanceTo(hit) < eye.distanceTo(lens);
    return { blocked, inside: box.containsPoint(lens) };
  });
  expect(r).toEqual({ blocked: false, inside: false });
});

test("up in the room the pistol doesn't lock onto an officer on the garage floor below", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    save.armed = true; GUN.ammo = 48;
    __at(10, 24, Math.PI);
    const O = OFFICER, d = gW(0, -14), t = { e: {}, wx: d.x, wz: d.z, v: 0, stopT: 0, yaw: 0 };
    // below and a few metres ahead of you (facing +x in the garage's frame is h = PI)
    const p = gW(14, 24);
    Object.assign(O, { on: true, x: p.x, z: p.z, y: gY, h: 0, v: 0, car: t, back: false, down: 0, out: false });
    const below = gunPick();
    O.y = FOOT.y;
    const level = gunPick();
    O.on = false;
    return { below: below && below.k, level: level && level.k };
  });
  expect(r).toEqual({ below: null, level: "officer" });
});

test("a party ended by leaving home any other way than walking out says so too", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    relSet(PEOPLE[0].id, 80, 3);
    __at(19, 27, Math.PI);
    PARTY.ids = [PEOPLE[0].id]; partyStart(); partySync();
    document.getElementById("toasts").innerHTML = "";
    setState("INTRO");
    return { active: PARTY.active, toasts: document.getElementById("toasts").textContent };
  });
  expect(r.active).toBe(false);
  expect(r.toasts).toContain("PARTY OVER");
});
