// People walking in Old Quay: they keep to the pavements, cross only when no car is coming, traffic stops for one
// who is crossing, a car can't end up inside one, and they are only worked out near the town.
const { test, expect } = require("./support/game");

// in free ride, parked in the town with traffic taken off the roads
async function inTown(game, at = [600, -60]) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval((at) => {
    const T = __T,
      P = T.P;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.c.G.visible = false;
      t.wx = t.wz = 1e6;
    }
    P.x = at[0];
    P.z = at[1];
    P.vx = P.vz = 0;
    T.driveUpdate(1 / 60);
  }, at);
}
// how far (x,z) is from the nearest town street's centre line
const ROAD_D = `(x, z) => { let m = 1e9; for (const e of __T.EDGES) { if (e.type !== "town") continue; for (let s = 0; s <= e.len; s += 1) { const p = __T.edgePos(e, s); m = Math.min(m, Math.hypot(p.x - x, p.z - z)); } } return m; }`;

test.describe("pedestrians", () => {
  test("a pavement route rings each of the six blocks, joined by crossings at the corners", async ({ game }) => {
    await inTown(game);
    const r = await game.eval((ROAD_D) => {
      const T = __T,
        roadD = eval(ROAD_D);
      const walks = T.PED_EDGES.filter((e) => !e.cross),
        cross = T.PED_EDGES.filter((e) => e.cross);
      let minD = 1e9,
        maxD = 0,
        blocked = 0;
      for (const e of walks)
        for (let k = 0; k <= 20; k++) {
          const x = e.a.x + ((e.b.x - e.a.x) * k) / 20,
            z = e.a.z + ((e.b.z - e.a.z) * k) / 20,
            d = roadD(x, z),
            c = T.footClear(x, z);
          minD = Math.min(minD, d);
          maxD = Math.max(maxD, d);
          if (Math.hypot(c[0] - x, c[1] - z) > 0.01) blocked++;
        }
      return {
        nodes: T.PED_NODES.length,
        walks: walks.length,
        cross: cross.length,
        crossLen: [Math.min(...cross.map((e) => e.len)), Math.max(...cross.map((e) => e.len))],
        minD,
        maxD,
        blocked,
        adj: [...new Set(T.PED_NODES.map((n) => n.adj.filter((e) => !e.cross).length))],
        n: T.PEDS.length,
        cap: T.PED_V.cap,
      };
    }, ROAD_D);
    expect(r).toMatchObject({ nodes: 24, walks: 24, cross: 14, adj: [2], blocked: 0 });
    expect(r.n).toBe(r.cap);
    // on the pavement: beyond the kerb (5.2 m from the centre line) and short of the houses (9 m)
    expect(r.minD).toBeGreaterThan(5.6);
    expect(r.maxD).toBeLessThan(8);
    // a crossing spans one street, kerb to kerb
    expect(r.crossLen[0]).toBeGreaterThan(12);
    expect(r.crossLen[1]).toBeLessThan(13.5);
  });

  test("over five minutes everyone keeps to the pavements and crossings, keeps moving, and stays out of walls", async ({ game }) => {
    await inTown(game);
    const r = await game.eval((ROAD_D) => {
      const T = __T,
        roadD = eval(ROAD_D),
        out = { onRoadNotCrossing: 0, inWall: 0, crossed: 0, far: 0, states: {} },
        start = T.PEDS.map((p) => [p.x, p.z]),
        moved = T.PEDS.map(() => 0),
        was = T.PEDS.map((p) => p.st);
      for (let i = 0; i < 60 * 300; i++) {
        T.driveUpdate(1 / 60);
        if (i % 20) continue;
        T.PEDS.forEach((p, k) => {
          const d = roadD(p.x, p.z);
          if (d < 5 && p.st !== "cross") out.onRoadNotCrossing++;
          if (d > 8.9) out.far++;
          const c = T.footClear(p.x, p.z);
          if (Math.hypot(c[0] - p.x, c[1] - p.z) > 0.05) out.inWall++;
          if (p.st === "walk" && was[k] === "cross") out.crossed++;
          was[k] = p.st;
          out.states[p.st] = (out.states[p.st] || 0) + 1;
          moved[k] = Math.max(moved[k], Math.hypot(p.x - start[k][0], p.z - start[k][1]));
        });
      }
      out.leastMoved = Math.min(...moved);
      out.on = T.pedOn;
      out.shown = T.PEDS.filter((p) => p.m.G.visible).length;
      return out;
    }, ROAD_D);
    test.info().annotations.push({ type: "pedestrians", description: JSON.stringify(r) });
    expect(r.on).toBe(true);
    expect(r.onRoadNotCrossing).toBe(0);
    expect(r.far).toBe(0);
    expect(r.inWall).toBe(0);
    expect(r.crossed).toBeGreaterThan(3);
    expect(r.leastMoved).toBeGreaterThan(30);
    expect(r.shown).toBeGreaterThan(0);
  });

  test("nobody steps out while a car is coming; they cross once it has gone", async ({ game }) => {
    await inTown(game);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        p = T.PEDS[0],
        e = T.PED_EDGES.find((e) => e.cross),
        out = {};
      // at the kerb, about to cross, with your car driving past the crossing
      p.e = e;
      p.from = e.a;
      p.s = 0;
      p.st = "wait";
      p.t = 0;
      const mx = (e.a.x + e.b.x) / 2,
        mz = (e.a.z + e.b.z) / 2;
      P.x = mx;
      P.z = mz + 14;
      P.h = Math.PI;
      for (let i = 0; i < 120; i++) {
        P.vx = 0;
        P.vz = -3;
        P.x = mx;
        P.z = mz + 14;
        T.pedUpdate(1 / 60);
      }
      out.whileCar = p.st;
      // the car is gone
      P.vx = P.vz = 0;
      P.x = 600;
      P.z = -60;
      for (let i = 0; i < 30; i++) T.pedUpdate(1 / 60);
      out.after = p.st;
      let n = 0;
      while (p.st === "cross" && n++ < 60 * 20) T.pedUpdate(1 / 60);
      out.seconds = +(n / 60).toFixed(1);
      out.end = [p.st === "cross", Math.hypot(p.x - e.b.x, p.z - e.b.z) < 3];
      return out;
    });
    expect(r.whileCar).toBe("wait");
    expect(r.after).toBe("cross");
    expect(r.end).toEqual([false, true]);
    expect(r.seconds).toBeLessThan(14);
  });

  test("traffic stops for someone on a crossing", async ({ game }) => {
    await inTown(game);
    const r = await game.eval(() => {
      const T = __T,
        p = T.PEDS[0],
        e = T.PED_EDGES.find((e) => e.cross),
        t = T.TRAFFIC[0];
      // a car on the street this crossing spans, 30 m short of it and driving towards it
      const mx = (e.a.x + e.b.x) / 2,
        mz = (e.a.z + e.b.z) / 2;
      let best = null;
      for (const ed of T.EDGES) {
        if (ed.type !== "town") continue;
        for (let s = 0; s <= ed.len; s += 1) {
          const q = T.edgePos(ed, s),
            d = Math.hypot(q.x - mx, q.z - mz);
          if (!best || d < best.d) best = { ed, s, d };
        }
      }
      const dir = best.s > 40 ? 1 : -1;
      t.e = best.ed;
      t.dir = dir;
      t.s = best.s - dir * 30;
      t.v = 9;
      t.lost = false;
      t.lane = 0;
      t.passT = 0;
      t.waitT = 0;
      // the walker is held on the crossing in the car's own lane (not walking on), so only the car's behaviour is measured
      const alongX = Math.abs(e.b.x - e.a.x) > Math.abs(e.b.z - e.a.z);
      let minGap = 1e9;
      for (let i = 0; i < 60 * 8; i++) {
        p.e = e;
        p.from = e.a;
        p.st = "cross";
        p.t = 0;
        p.v = 0;
        if (i > 0) p.s = alongX ? Math.abs(t.wx - e.a.x) : Math.abs(t.wz - e.a.z);
        T.driveUpdate(1 / 60);
        if (i > 1) minGap = Math.min(minGap, Math.hypot(t.wx - p.x, t.wz - p.z));
      }
      return { v: t.v, minGap, near: best.d };
    });
    expect(r.near).toBeLessThan(2);
    expect(r.v).toBeLessThan(0.2);
    expect(r.minGap).toBeGreaterThan(2.5);
  });

  test("a car driven at someone on the pavement never ends up on top of them; they step in towards the houses", async ({ game }) => {
    await inTown(game);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        p = T.PEDS[0],
        e = T.PED_EDGES.find((e) => !e.cross && e.inx === 1 && e.len > 100);
      p.e = e;
      p.from = e.a;
      p.s = 60;
      p.st = "idle";
      p.t = 99;
      for (let i = 0; i < 5; i++) T.pedUpdate(1 / 60);
      const x0 = p.x,
        z0 = p.z,
        dz = Math.sign(e.b.z - e.a.z);
      // along the pavement straight at them from 20 m, at 8 m/s
      let minD = 1e9;
      for (let i = 0; i < 60 * 5; i++) {
        P.x = x0;
        P.z = z0 - dz * (20 - (i / 60) * 8);
        P.h = dz > 0 ? 0 : Math.PI;
        P.vx = 0;
        P.vz = dz * 8;
        T.pedUpdate(1 / 60);
        // the car's box: 0.95 m half-width, 2.3 m half-length
        const lx = Math.abs(p.x - P.x),
          lz = Math.abs(p.z - P.z);
        if (lz < 2.3) minD = Math.min(minD, lx);
      }
      return { minD, aside: p.x - x0 };
    });
    expect(r.minD).toBeGreaterThan(0.95);
    expect(r.aside).toBeGreaterThan(0.8);
  });

  test("away from the town they are hidden and not worked out", async ({ game }) => {
    await inTown(game, [-400, 300]);
    const r = await game.eval(() => {
      const T = __T,
        before = T.PEDS.map((p) => p.s);
      for (let i = 0; i < 300; i++) T.driveUpdate(1 / 60);
      return { on: T.pedOn, shown: T.PEDS.filter((p) => p.m.G.visible).length, same: T.PEDS.every((p, k) => p.s === before[k]) };
    });
    expect(r).toEqual({ on: false, shown: 0, same: true });
  });
});
