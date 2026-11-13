// Taking cars: on foot, a traffic car that has stopped can be taken and driven; the car you came from stays where
// you left it and can be driven again; taken cars never reach the save or the garage.
const { test, expect } = require("./support/game");

async function onFoot(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.key("f");
}
// one traffic car stopped 3 m from you on a straight road, the rest put away; your own car is 60 m back along the road
const STAGE = () => {
  const T = __T,
    F = T.FOOT,
    P = T.P;
  const t = T.TRAFFIC[1];
  for (const o of T.TRAFFIC)
    if (o !== t) {
      o.e = null;
      o.lost = false;
      o.wx = o.wz = 1e6;
      o.c.G.visible = false;
    }
  const e = T.EDGES.filter((q) => q.type !== "drive" && q.len > 260).find((q) => {
    const a = T.edgePos(q, 60),
      b = T.edgePos(q, 200);
    return a.dx * b.dx + a.dz * b.dz > 0.99;
  });
  const side = T.save.side === "R" ? 1 : -1,
    off = T.RT[e.type].lanes[0] * side;
  Object.assign(t, { e, dir: 1, s: 150, lane: 0, off, offCur: off, base: 12, v: 0, stopT: 1e6, lost: false, passT: 0, waitT: 0, damage: 30 });
  const q = T.edgePos(e, 150),
    c = T.edgePos(e, 90);
  // your car, parked in the same lane 60 m back
  P.x = c.x - c.dz * off;
  P.z = c.z + c.dx * off;
  P.h = Math.atan2(c.dx, c.dz);
  P.vx = P.vz = 0;
  // you, beside the traffic car, off the road side
  F.x = q.x - q.dz * (off + 2.6 * side);
  F.z = q.z + q.dx * (off + 2.6 * side);
  F.y = T.footGround(F.x, F.z);
  F.car = [P.x, P.z];
  T.driveUpdate(1 / 60);
  return { tx: t.wx, tz: t.wz, yaw: t.yaw, col: t.col, own: [P.x, P.z], cur: T.save.cur };
};
const now = (game) =>
  game.eval(() => {
    const T = __T,
      P = T.P;
    return {
      foot: T.FOOT.on,
      cur: T.curId,
      saveCur: T.save.cur,
      street: [...T.STREET.keys()],
      left: T.LEFT.map((l) => l.id),
      pos: [P.x, P.z],
      damage: Math.round(P.damage || 0),
      prompt: document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent,
      traffic1: !!T.TRAFFIC[1].e,
      saved: localStorage.getItem(T.SAVE_KEY) || "",
    };
  });

test.describe("taking cars", () => {
  test("a stopped traffic car can be taken: you drive it from where it stood, in its colour, with its damage", async ({ game }) => {
    await onFoot(game);
    const st = await game.eval(STAGE);
    const a = await now(game);
    expect(a.prompt).toBe("Take this car");
    await game.key("e");
    const b = await now(game);
    expect(b.foot).toBe(false);
    expect(b.cur).toBe("st0");
    // not yours: the save still names your own car, and nothing about the taken one is stored
    expect(b.saveCur).toBe(st.cur);
    expect(b.saved).not.toContain("st0");
    expect(Math.hypot(b.pos[0] - st.tx, b.pos[1] - st.tz)).toBeLessThan(0.01);
    expect(b.damage).toBe(30);
    // it left traffic (and comes back somewhere else later); your own car is where you left it
    expect(b.traffic1).toBe(false);
    expect(b.left).toEqual([st.cur]);
    const look = await game.eval(() => {
      const T = __T,
        m = T.carMeshes[T.curId],
        own = T.carMeshes[T.save.cur];
      return { paint: T.paintOf(T.curId), seen: m.G.visible, ownSeen: own.G.visible, ownAt: [own.G.position.x, own.G.position.z], shape: T.carById(T.curId).shape };
    });
    expect(look.paint).toBe(st.col);
    expect([look.seen, look.ownSeen]).toEqual([true, true]);
    expect(Math.hypot(look.ownAt[0] - st.own[0], look.ownAt[1] - st.own[1])).toBeLessThan(0.5);
    // and it drives
    expect((await game.steps(150, { w: true })).kph).toBeGreaterThan(25);
  });

  test("a moving traffic car can't be taken", async ({ game }) => {
    await onFoot(game);
    await game.eval(STAGE);
    const r = await game.eval(() => {
      const t = __T.TRAFFIC[1];
      t.v = 6;
      return __T.takeTraffic(t);
    });
    expect(r).toBe(false);
    expect((await now(game)).foot).toBe(true);
  });

  test("you can walk back to your own car and drive it; the taken car stays, and blocks the road like any car", async ({ game }) => {
    await onFoot(game);
    const st = await game.eval(STAGE);
    await game.key("e");
    await game.steps(10, {});
    // get out of the taken car, and stand beside your own
    await game.key("f");
    const mid = await now(game);
    expect(mid.foot).toBe(true);
    await game.eval((own) => {
      const T = __T,
        F = T.FOOT,
        l = T.LEFT[0];
      F.x = l.x + Math.cos(l.h) * 2.4;
      F.z = l.z - Math.sin(l.h) * 2.4;
      F.y = T.footGround(F.x, F.z);
      T.driveUpdate(1 / 60);
    }, st.own);
    const near = await now(game);
    expect(near.prompt).toMatch(/^Get in · /);
    await game.key("e");
    const c = await now(game);
    expect([c.foot, c.cur]).toEqual([false, st.cur]);
    expect(c.left).toEqual(["st0"]);
    expect(Math.hypot(c.pos[0] - st.own[0], c.pos[1] - st.own[1])).toBeLessThan(0.5);
    // driving straight on, the taken car 60 m ahead in your lane stops you: you don't pass through it
    const hit = await game.eval(() => {
      const T = __T,
        P = T.P,
        l = T.LEFT[0];
      T.save.assist = false;
      let min = 1e9;
      T.keys.w = true;
      for (let i = 0; i < 600; i++) {
        T.driveUpdate(1 / 60);
        const dx = P.x - l.x,
          dz = P.z - l.z,
          lx = dx * Math.cos(l.h) - dz * Math.sin(l.h),
          lz = dx * Math.sin(l.h) + dz * Math.cos(l.h);
        if (Math.abs(lx) < 0.9) min = Math.min(min, Math.abs(lz));
      }
      T.keys.w = false;
      return { min, damage: P.damage || 0 };
    });
    expect(hit.min).toBeGreaterThan(2.5);
    expect(hit.damage).toBeGreaterThan(0);
  });

  test("going home leaves taken cars behind: you're in your own car, and nothing of theirs is kept", async ({ game }) => {
    await onFoot(game);
    const st = await game.eval(STAGE);
    await game.key("e");
    const before = await game.eval(() => ({ geo: __T.renderer.info.memory.geometries, meshes: Object.keys(__T.carMeshes).length }));
    await game.eval(() => __T.goGarage(false));
    await game.waitState("GARAGE");
    const g = await now(game);
    expect([g.cur, g.saveCur, g.street, g.left]).toEqual([st.cur, st.cur, [], []]);
    const after = await game.eval(() => ({ meshes: Object.keys(__T.carMeshes).length, st: Object.keys(__T.carMeshes).filter((k) => k.startsWith("st")) }));
    expect(after.st).toEqual([]);
    expect(after.meshes).toBeLessThan(before.meshes + 6);
  });

  test("a test drive begun in a taken car doesn't make the taken car yours when it ends", async ({ game }) => {
    await onFoot(game);
    const st = await game.eval(STAGE);
    await game.key("e");
    const r = await game.eval(() => {
      const T = __T,
        other = T.CARS.find((c) => !T.save.owned.includes(c.id)).id;
      T.startTestDrive(other);
      T.finishTestDrive(false);
      T.persist();
      return { cur: T.curId, saveCur: T.save.cur, saved: localStorage.getItem(T.SAVE_KEY) };
    });
    // back in the taken car, and the save still names your own (it used to store "st0", which no car has)
    expect([r.cur, r.saveCur]).toEqual(["st0", st.cur]);
    expect(r.saved).not.toContain("st0");
  });

  test("a time-trial record set in a taken car keeps its ghost after a reload", async ({ game }) => {
    await onFoot(game);
    await game.eval(STAGE);
    await game.key("e");
    const r = await game.eval(() => {
      const T = __T,
        E = T.EVENTS.find((e) => e.type === "tt");
      delete T.save.rec[E.id];
      T.startEvent(E);
      T.ev.phase = "run";
      T.ev.t = 50;
      T.ev.rec = [];
      for (let i = 0; i < 12; i++) T.ev.rec.push(i, i, 0, i);
      T.finishEvent();
      const g = T.save.ghost[E.id];
      return { id: E.id, c: g && g.c, real: !!g && T.CARS.some((c) => c.id === g.c), cur: T.curId };
    });
    expect(r.cur).toBe("st0");
    // kept as the model the taken car borrows, not its made-up id (which the save's check drops on loading)
    expect(r.real, JSON.stringify(r)).toBe(true);
    await game.reload();
    expect(await game.eval((id) => !!__T.save.ghost[id], r.id)).toBe(true);
  });

  test("taking car after car keeps at most three standing, and never loses your own", async ({ game }) => {
    await onFoot(game);
    const st = await game.eval(STAGE);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        out = [];
      for (let i = 0; i < 6; i++) {
        const t = T.TRAFFIC[1 + i];
        // each next traffic car stands 12 m further along from where you are
        if (i) {
          T.footExit();
          const P = T.P;
          Object.assign(t, { e: T.TRAFFIC[1].eKeep, dir: 1, v: 0, stopT: 1e6, lost: false });
          t.wx = P.x + Math.sin(P.h) * 12;
          t.wz = P.z + Math.cos(P.h) * 12;
          t.yaw = P.h;
        } else T.TRAFFIC[1].eKeep = t.e;
        out.push(T.takeTraffic(t));
      }
      return { out, left: T.LEFT.map((l) => l.id), street: [...T.STREET.keys()].sort(), cur: T.curId, meshes: Object.keys(T.carMeshes).filter((k) => k.startsWith("st")).sort() };
    });
    expect(r.out).toEqual([true, true, true, true, true, true]);
    expect(r.left.length).toBe(3);
    expect(r.left).toContain(st.cur);
    // two taken cars standing and the one you're in: three made-up cars exist, no more
    expect(r.street.length).toBe(3);
    expect(r.meshes).toEqual(r.street);
  });
});
