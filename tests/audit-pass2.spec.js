// Fixes from Gemini's second audit pass (28 Nov 2026), from its regression suite and adapted to the game's helpers:
// the route at sea, the in-place paint job's reflections, cup intros leaving the save alone, the lock ring going with
// the pistol's screen, a friend who falls out not staying over, and the other-tab screen keeping Tab to itself.
const { test, expect } = require("./support/game");

test("at sea the route is kept up, and you arrive at a waypoint by boat", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    window.__DTMAX = 1e-9;
    if (!boatBoard()) { FOOT.on = true; FOOT.car = [P.x, P.z]; FOOT.v = 0; footModel().G.visible = true; boatBoard(); }
    BOAT.x = BOAT.home[0] + 60; BOAT.z = BOAT.home[1];
    setGPS(BOAT.x + 150, BOAT.z, "Harbour Buoy");
    boatUpdate(1 / 60);
    const far = document.getElementById("gpsTxt").textContent;
    gps.t = { x: BOAT.x + 10, z: BOAT.z };
    for (let i = 0; i < 4 && gps.t; i++) boatUpdate(1 / 60);
    return { boat: BOAT.on, far, arrived: gps.t === null };
  });
  expect(r.boat).toBe(true);
  expect(r.far).toContain("Harbour Buoy");
  expect(r.arrived).toBe(true);
});

test("turns from the other players arrive as unit quaternions, and impossible ones are dropped", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => ({ q: NET_Q([0, 1.2, 0, 0]), big: NET_Q([10, 0, 0, 0]), bad: NET_Q([1e308, 1e308, 0, 0]) }));
  expect(Math.hypot(...r.q)).toBeCloseTo(1, 5);
  expect(r.q[1]).toBeCloseTo(1, 5);
  expect(r.big).toBeUndefined();
  expect(r.bad).toBeUndefined();
});

test("opening a cup's intro and backing out leaves a new game new", async ({ game, page }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => ({ fresh: clFresh(save), keys: Object.keys(save.champ || {}), cls: CUPS[0].cls }));
  expect(r.fresh).toBe(true);
  expect(await game.eval((cls) => cupStart(cls), r.cls)).toBe(true);
  await page.locator("#iNo").click();
  await game.waitState("DRIVE");
  const after = await game.eval(() => ({ fresh: clFresh(save), keys: Object.keys(save.champ || {}) }));
  expect(after).toEqual({ fresh: true, keys: r.keys });
});

test("leaving the drive puts the pistol's lock ring away at once", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    GUN.ring.visible = true;
    GUN.lock = { k: "car", x: 0, z: 0, y: 1 };
    setState("PAUSE");
    return { visible: GUN.ring.visible, lock: GUN.lock };
  });
  expect(r).toEqual({ visible: false, lock: null });
});

test("a paint job changed in place uses the reflection in use now, not the one the car was built with", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    updateCarEnv(true);
    const to = Object.assign({}, pc.mods, { tint: (pc.mods.tint + 1) % MOD_TINT.length, exhC: pc.mods.exhC === 2 ? 1 : 2 });
    const ok = modsInPlace(pc, to);
    return { ok, tint: pc.refs.tintMesh.material.envMap === carEnvTex(), tips: pc.refs.tips[0].material.envMap === carEnvTex() };
  });
  expect(r).toEqual({ ok: true, tint: true, tips: true });
});

test("a friend who has fallen out with you doesn't stay over", async ({ game }) => {
  await game.open();
  await game.waitState("GARAGE");
  const r = await game.eval(() => {
    const id = PEOPLE ? PEOPLE[0].id : 0;
    relSet(id, 5, 3);
    GUEST.who = PEOPLE[0]; GUEST.done = false;
    const stayed = guestHangOut();
    return { stayed, who: GUEST.who };
  });
  expect(r).toEqual({ stayed: false, who: null });
});

test("behind the other-tab screen everything is out of reach of Tab", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    tabStop();
    return {
      shown: !document.getElementById("tabIdle").classList.contains("hide"),
      self: !!document.getElementById("tabIdle").inert,
      gui: !!document.getElementById("gui").inert,
      pause: !!document.getElementById("pause").inert,
    };
  });
  expect(r).toEqual({ shown: true, self: false, gui: true, pause: true });
});
