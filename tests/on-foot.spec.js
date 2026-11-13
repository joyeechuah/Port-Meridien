// On foot: getting out of the car, walking and running, not walking through things or into the sea, and getting
// back in. The game stays in the DRIVE state; the car stays where it was left.
const { test, expect } = require("./support/game");

async function parked(game, opts) {
  await game.open(opts);
  await game.driveOut();
  await game.park();
}
const foot = (game) =>
  game.eval(() => {
    const T = __T,
      F = T.FOOT,
      P = T.P;
    return {
      on: F.on,
      x: F.x,
      z: F.z,
      h: F.h,
      v: F.v,
      seen: !!F.m && F.m.G.visible,
      fromCar: Math.hypot(F.x - P.x, F.z - P.z),
      car: [P.x, P.z, Math.hypot(P.vx, P.vz)],
      state: T.state,
      prompt: document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent,
    };
  });

// Capture before and after each scripted interval in one browser task.
// Separate evaluate() calls let real animation frames move the walker during the measurement.
const footMove = (game, n, held = {}) =>
  game.eval(
    ([n, held]) => {
      const T = __T, F = T.FOOT, P = T.P;
      const snap = () => ({ x: F.x, z: F.z, h: F.h, car: [P.x, P.z, Math.hypot(P.vx, P.vz)] });
      for (const k in held) T.keys[k] = held[k];
      const before = snap();
      for (let i = 0; i < n; i++) T.driveUpdate(1 / 60);
      for (const k in held) T.keys[k] = false;
      return { before, after: snap() };
    },
    [n, held]
  );

test.describe("on foot", () => {
  test("F gets out beside the car; the car stays put while you walk, run, turn and step back", async ({ game, page }) => {
    await parked(game);
    await game.key("f");
    const a = await foot(game);
    expect([a.on, a.seen, a.state]).toEqual([true, true, "DRIVE"]);
    // standing beside the door, clear of the car's body
    expect(a.fromCar).toBeGreaterThan(1.2);
    expect(a.fromCar).toBeLessThan(2.6);
    await expect(page.locator("#speedo")).toBeHidden();
    await expect(page.locator("#chFoot")).toBeHidden();
    // 2 s walking: about 1.9 m/s, and the car hasn't moved
    const walk = await footMove(game, 120, { w: true });
    const walked = Math.hypot(walk.after.x - walk.before.x, walk.after.z - walk.before.z);
    expect(walked).toBeGreaterThan(3);
    expect(walked).toBeLessThan(4.2);
    expect(walk.after.car).toEqual([a.car[0], a.car[1], 0]);
    // 2 s running (Shift): measure only the simulated interval.
    const run = await footMove(game, 120, { w: true, shift: true });
    expect(Math.hypot(run.after.x - run.before.x, run.after.z - run.before.z)).toBeGreaterThan(8.5);
    // Steering turns; the brake steps back. Neither assertion includes idle browser frames.
    const turn = await footMove(game, 30, { d: true });
    expect(Math.abs(turn.after.h - turn.before.h)).toBeGreaterThan(0.8);
    await footMove(game, 20);
    const reverse = await footMove(game, 60, { s: true });
    const back = (reverse.after.x - reverse.before.x) * Math.sin(reverse.after.h) + (reverse.after.z - reverse.before.z) * Math.cos(reverse.after.h);
    expect(back).toBeLessThan(-0.8);
    expect(back).toBeGreaterThan(-1.4);
  });

  test("the get-in prompt and action are available immediately on exit, without an intervening frame", async ({ game }) => {
    await parked(game);
    const r = await game.eval(() => {
      const T = __T;
      const exited = T.footExit();
      const prompt = document.getElementById("prompt");
      const visible = !prompt.classList.contains("hide");
      const label = document.getElementById("promptTxt").textContent;
      // The real prompt action must already be installed, not just the DOM text.
      const actionReady = typeof T.promptAct === "function";
      if (actionReady) T.promptAct();
      return { exited, visible, label, actionReady, backInCar: !T.FOOT.on };
    });
    expect(r.exited).toBe(true);
    expect(r.visible).toBe(true);
    expect(r.label).toMatch(/^Get in · /);
    expect([r.actionReady, r.backInCar]).toEqual([true, true]);
  });

  test("you get out only from a car that has stopped, and not during a race", async ({ game }) => {
    await parked(game);
    await game.steps(90, { w: true });
    expect(await game.eval(() => __T.footExit())).toBe(false);
    expect((await foot(game)).on).toBe(false);
    await game.park();
    await game.eval(() => __T.startEvent(__T.EVENTS.find((E) => E.type === "race")));
    expect(await game.eval(() => __T.footExit())).toBe(false);
    await game.eval(() => __T.endEvent());
    await game.park();
    expect(await game.eval(() => __T.footExit())).toBe(true);
  });

  test("walls and parked traffic stop you, and so does the sea", async ({ game }) => {
    await parked(game);
    await game.key("f");
    // straight at the nearest building-sized obstacle, from 6 m out
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      let o = null,
        bd = 1e9;
      for (const a of T.OGRID.values())
        for (const q of a) {
          if (q.c || Math.min(q.hx, q.hz) < 2) continue;
          const d = Math.hypot(q.x - F.x, q.z - F.z);
          if (d < bd && T.footGround(q.x, q.z) > 0.5) {
            bd = d;
            o = q;
          }
        }
      // approach along the box's own x axis, so the wall is square on
      const ax = { x: o.cs, z: -o.sn };
      F.x = o.x + ax.x * (o.hx + 6);
      F.z = o.z + ax.z * (o.hx + 6);
      F.y = T.footGround(F.x, F.z);
      F.h = Math.atan2(-ax.x, -ax.z);
      // the car comes along so the walk isn't ended by "the car moved": park it well behind
      F.car = [T.P.x, T.P.z];
      T.keys.w = T.keys.shift = true;
      for (let i = 0; i < 300; i++) T.driveUpdate(1 / 60);
      T.keys.w = T.keys.shift = false;
      const lx = (F.x - o.x) * o.cs - (F.z - o.z) * o.sn,
        lz = (F.x - o.x) * o.sn + (F.z - o.z) * o.cs;
      return { on: F.on, outside: Math.abs(lx) >= o.hx + 0.3 || Math.abs(lz) >= o.hz + 0.3, lx, hx: o.hx };
    });
    expect(r.on).toBe(true);
    expect(r.outside, JSON.stringify(r)).toBe(true);
    // towards the sea from the shore: you stop at the water's edge
    const sea = await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      // walk outwards from the island's middle until the ground is nearly at sea level
      let x = 0,
        z = 0,
        dir = Math.atan2(F.x, F.z) || 0.3;
      for (let d = 0; d < 6000; d += 2) {
        const qx = F.x + Math.sin(dir) * d,
          qz = F.z + Math.cos(dir) * d,
          g = T.footGround(qx, qz);
        if (g < 0.3 && g > -0.2) {
          x = qx;
          z = qz;
          break;
        }
      }
      if (!x && !z) return { found: false };
      F.x = x;
      F.z = z;
      F.y = T.footGround(x, z);
      F.h = dir;
      T.keys.w = T.keys.shift = true;
      for (let i = 0; i < 1200; i++) T.driveUpdate(1 / 60);
      T.keys.w = T.keys.shift = false;
      return { found: true, on: F.on, ground: T.footGround(F.x, F.z) };
    });
    expect(sea.found).toBe(true);
    expect(sea.on).toBe(true);
    expect(sea.ground).toBeGreaterThan(-0.4);
  });

  test("traffic stops for you when you stand in the road, and drives on when you step aside", async ({ game }) => {
    await parked(game);
    await game.key("f");
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      // one traffic car on a long straight road, 40 m back from where you stand in its lane; the rest are put away
      const t = T.TRAFFIC[0];
      for (const o of T.TRAFFIC) if (o !== t) { o.e = null; o.lost = false; o.wx = o.wz = 1e6; }
      const e = T.EDGES.filter((q) => q.type !== "drive" && q.len > 200).find((q) => { const a = T.edgePos(q, 60), b = T.edgePos(q, 140); return a.dx * b.dx + a.dz * b.dz > 0.995; });
      t.e = e; t.dir = 1; t.s = 60; t.lane = 0; t.lost = false; t.stopT = 0; t.passT = 0; t.waitT = 0; t.damage = 0;
      t.off = t.offCur = T.RT[e.type].lanes[0] * (T.save.side === "R" ? 1 : -1);
      t.base = t.v = 12;
      const q = T.edgePos(e, 100);
      F.x = q.x - q.dz * t.off; F.z = q.z + q.dx * t.off; F.y = T.footGround(F.x, F.z);
      // your own car is parked far from this road
      T.P.x = F.x + 300; T.P.z = F.z + 300; F.car = [T.P.x, T.P.z];
      let min = 1e9;
      for (let i = 0; i < 480; i++) { T.driveUpdate(1 / 60); min = Math.min(min, Math.hypot(t.wx - F.x, t.wz - F.z)); }
      const stopped = { v: t.v, gap: Math.hypot(t.wx - F.x, t.wz - F.z), min };
      // step off the road, to the side
      F.x += q.dx * 0 - q.dz * 8 * Math.sign(t.off || 1); F.z += q.dx * 8 * Math.sign(t.off || 1);
      for (let i = 0; i < 300; i++) T.driveUpdate(1 / 60);
      return { stopped, after: t.v, on: F.on };
    });
    expect(r.on).toBe(true);
    expect(r.stopped.v).toBeLessThan(0.2);
    // it pulls up short of you: it never touches you
    expect(r.stopped.min).toBeGreaterThan(3);
    expect(r.stopped.gap).toBeLessThan(12);
    expect(r.after).toBeGreaterThan(5);
  });

  test("near the car a prompt offers to get in; E gets in, and the car drives again", async ({ game, page }) => {
    await parked(game);
    await game.key("f");
    const a = await foot(game);
    expect(a.prompt).toMatch(/^Get in · /);
    // 8 m away: no prompt, and F does nothing
    await game.steps(260, { w: true });
    const far = await foot(game);
    expect(far.fromCar).toBeGreaterThan(5);
    expect(far.prompt).toBe(null);
    await game.key("f");
    expect((await foot(game)).on).toBe(true);
    // turn round and walk back
    await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      F.h = Math.atan2(T.P.x - F.x, T.P.z - F.z);
    });
    await game.steps(200, { w: true });
    const back = await foot(game);
    // the car's body stops you beside it, within reach
    expect(back.fromCar).toBeLessThan(3.4);
    expect(back.prompt).toMatch(/^Get in · /);
    await game.key("e");
    const c = await foot(game);
    expect([c.on, c.seen, c.prompt]).toEqual([false, false, null]);
    await expect(page.locator("#speedo")).toBeVisible();
    await expect(page.locator("#chFoot")).toBeVisible();
    expect(await game.eval(() => document.getElementById("bG").textContent)).toBe("GAS");
    expect((await game.steps(120, { w: true })).kph).toBeGreaterThan(20);
  });

  test("moving the car from the map or the garage puts you back in it", async ({ game }) => {
    await parked(game);
    await game.key("f");
    await game.steps(60, { w: true });
    await game.eval(() => {
      __T.P.x += 40;
      __T.driveUpdate(1 / 60);
    });
    expect((await foot(game)).on).toBe(false);
    await game.park();
    await game.key("f");
    expect((await foot(game)).on).toBe(true);
    await game.eval(() => __T.setState("GARAGE"));
    expect((await foot(game)).on).toBe(false);
  });
});

test.describe("on foot, on a phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("GET OUT is a button, and the pads say WALK, BACK and RUN while you're out", async ({ game, page }) => {
    await parked(game);
    await expect(page.locator("#chFoot")).toBeVisible();
    await page.locator("#chFoot").tap();
    expect((await foot(game)).on).toBe(true);
    expect(await game.eval(() => ["bG", "bB", "bH"].map((id) => document.getElementById(id).textContent))).toEqual(["WALK", "BACK", "RUN"]);
    await expect(page.locator("#prompt")).toBeVisible();
    await page.locator("#prompt").tap();
    expect((await foot(game)).on).toBe(false);
    expect(await game.eval(() => document.getElementById("bH").textContent)).toBe("HANDBRAKE");
  });
});
