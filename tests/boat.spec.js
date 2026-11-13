// The harbour and the boat: a pier you can walk on but not drive on, boarding from the pier, sailing (deep water
// only, clear of the pier, other boats and the edge of the map), and stepping back off beside the pier.
const { test, expect } = require("./support/game");

// on foot, standing on the pier beside the moored boat; your car is parked on the shore behind the pier
async function onPier(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T,
      P = T.P;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.wx = t.wz = 1e6;
    }
    P.x = T.PIER.x0 - 14;
    P.z = 0;
    P.h = Math.PI / 2;
    P.vx = P.vz = 0;
    T.driveUpdate(1 / 60);
  });
  await game.key("f");
  await game.eval(() => {
    const T = __T,
      F = T.FOOT;
    F.x = T.BOAT.x;
    F.z = T.PIER.z0 + 0.8;
    F.y = T.PIER.y;
    F.h = Math.PI;
    T.driveUpdate(1 / 60);
  });
}
const now = (game) =>
  game.eval(() => {
    const T = __T,
      B = T.BOAT,
      F = T.FOOT;
    return {
      boat: B.on,
      foot: F.on,
      bx: B.x,
      bz: B.z,
      bh: B.h,
      bv: B.v,
      fx: F.x,
      fz: F.z,
      fy: F.y,
      walker: !!F.m && F.m.G.visible,
      prompt: document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent,
      state: T.state,
    };
  });

test.describe("harbour and boat", () => {
  test("the pier stands over the water: you walk its length, and can't step off the sides or the end", async ({ game }) => {
    await onPier(game);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        Pr = T.PIER,
        out = {};
      out.deck = T.footGround((Pr.x0 + Pr.x1) / 2, 0);
      out.beside = T.footGround((Pr.x0 + Pr.x1) / 2, Pr.z0 - 3);
      out.seaUnder = T.meshH(Pr.x1 - 5, 0);
      const walk = (x, z, h, n) => {
        F.x = x;
        F.z = z;
        F.y = Pr.y;
        F.h = h;
        F.v = 0;
        T.keys.w = T.keys.shift = true;
        for (let i = 0; i < n; i++) T.driveUpdate(1 / 60);
        T.keys.w = T.keys.shift = false;
        return [F.x, F.z, F.y];
      };
      // from the landward end, 20 s of running east: to the far end, and no further
      out.along = walk(Pr.x0 + 3, 1.5, Math.PI / 2, 1200);
      // straight at the side, and at the far end
      out.side = walk((Pr.x0 + Pr.x1) / 2 + 9, 0, 0, 300);
      out.on = F.on;
      return out;
    });
    const P = await game.eval(() => __T.PIER);
    expect(r.deck).toBeCloseTo(P.y, 2);
    expect(r.beside).toBeLessThan(-0.4);
    expect(r.seaUnder).toBeLessThan(-3);
    expect(r.on).toBe(true);
    expect(r.along[0]).toBeGreaterThan(P.x1 - 1.2);
    expect(r.along[0]).toBeLessThan(P.x1);
    expect(r.along[2]).toBeCloseTo(P.y, 1);
    expect(r.side[1]).toBeLessThan(P.z1);
    expect(r.side[1]).toBeGreaterThan(P.z1 - 1.2);
  });

  test("you walk onto the pier from the beach, between the bollards, and back to the beach", async ({ game }) => {
    await onPier(game);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        Pr = T.PIER,
        out = [];
      // from 10 m up the beach, straight at the landward end: down the middle, then off-centre, between other bollards
      for (const z of [0.75, -2.2]) {
        F.x = Pr.x0 - 10;
        F.z = z;
        F.y = T.footGround(F.x, F.z);
        F.h = Math.PI / 2;
        F.v = 0;
        const beach = F.y;
        T.keys.w = true;
        for (let i = 0; i < 600; i++) T.driveUpdate(1 / 60);
        const on = { x: F.x, y: F.y, deck: T.onPier(F.x, F.z) };
        // turn round and walk back off
        F.h = -Math.PI / 2;
        for (let i = 0; i < 900; i++) T.driveUpdate(1 / 60);
        T.keys.w = false;
        out.push({ beach, on, backX: F.x, backDeck: T.onPier(F.x, F.z), backY: F.y, foot: F.on });
      }
      return { out, x0: Pr.x0, y: Pr.y };
    });
    for (const o of r.out) {
      expect(o.foot).toBe(true);
      // the beach is lower than the deck: a step up, not a wall
      expect(o.beach).toBeLessThan(r.y);
      expect(o.on.deck).toBe(true);
      expect(o.on.x).toBeGreaterThan(r.x0 + 8);
      expect(o.on.y).toBeCloseTo(r.y, 1);
      expect(o.backDeck).toBe(false);
      expect(o.backX).toBeLessThan(r.x0);
    }
  });

  test("a lane runs from the town's avenue down to the shore, and ends a short walk from the pier", async ({ game }) => {
    await game.open();
    await game.driveOut();
    await game.park();
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        Pr = T.PIER,
        e = T.EDGES.find((q) => q.type === "drive" && q.pts[0].x > 900),
        out = { found: !!e };
      if (!e) return out;
      const a = T.edgePos(e, 0),
        b = T.edgePos(e, e.len);
      out.from = [a.x, a.z];
      out.to = [b.x, b.z];
      out.len = e.len;
      // it joins roads at its top end, and stops at its bottom end
      out.joins = [e.a.adj.length, e.b.adj.length].sort();
      // downhill all the way, and no steeper than the game's steepest roads
      let steep = 0,
        up = 0;
      for (let s = 2; s <= e.len; s += 2) {
        const g = (T.edgeY(e, s) - T.edgeY(e, s - 2)) / 2;
        steep = Math.max(steep, Math.abs(g));
        up = Math.max(up, g);
      }
      out.steep = steep;
      out.up = up;
      out.top = T.edgeY(e, 0);
      out.bottom = T.edgeY(e, e.len);
      // the ground under it follows it, and the beach beyond its end is level with it: no ledge to drive off
      out.ground = Math.abs(T.meshH(b.x - 20, b.z) - T.edgeY(e, e.len - 20));
      out.beyond = Math.abs(T.meshH(b.x + 8, b.z) - out.bottom);
      out.gap = Pr.x0 - b.x;
      // driving down it from the top with the gas held: the car stays on the lane to the bottom
      T.save.assist = true;
      const q = T.edgePos(e, 12);
      P.x = q.x;
      P.z = q.z;
      P.h = Math.atan2(q.dx, q.dz);
      P.vx = P.vz = 0;
      P.r = 0;
      let off = 0,
        far = 0;
      for (let i = 0; i < 1500 && far < e.len - 10; i++) {
        const nr = T.nearestRoad(P.x, P.z, 30);
        // steer along the lane
        const s = nr && nr.e === e ? nr.s : 0,
          la = T.edgePos(e, Math.min(e.len, s + 14)),
          err = ((Math.atan2(la.x - P.x, la.z - P.z) - P.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        T.keys.a = err > 0.03;
        T.keys.d = err < -0.03;
        T.keys.w = Math.hypot(P.vx, P.vz) < 12;
        T.driveUpdate(1 / 60);
        if (nr && nr.e === e) {
          off = Math.max(off, nr.d);
          far = Math.max(far, nr.s);
        }
      }
      T.keys.a = T.keys.d = T.keys.w = false;
      out.drove = far;
      out.off = off;
      out.water = P.water;
      // no traffic uses it
      out.traffic = T.TEDGES ? T.TEDGES.includes(e) : null;
      return out;
    });
    expect(r.found).toBe(true);
    // a dead end at the shore; at the top, the junction of the coast road (two ways) and the avenue
    expect(r.joins).toEqual([1, 4]);
    expect(r.len).toBeGreaterThan(200);
    expect(r.to[0]).toBeCloseTo(1160, 0);
    expect(r.top).toBeGreaterThan(12);
    expect(r.bottom).toBeLessThan(2.5);
    expect(r.bottom).toBeGreaterThan(1);
    // 13% is the steepest any road in the game is allowed to be
    expect(r.steep).toBeLessThan(0.131);
    expect(r.up).toBeLessThan(0.01);
    expect(r.ground).toBeLessThan(0.6);
    expect(r.beyond).toBeLessThan(0.6);
    // 16 m of beach between the lane's end and the pier's bollards
    expect(r.gap).toBeCloseTo(16, 0);
    expect(r.drove).toBeGreaterThan(r.len - 12);
    expect(r.off).toBeLessThan(3);
    expect(r.water).toBe(false);
  });

  test("a car can't be driven onto the pier", async ({ game }) => {
    await game.open();
    await game.driveOut();
    await game.park();
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        Pr = T.PIER;
      T.save.assist = false;
      let max = -1e9;
      // straight at the landward end, and at an angle towards each side
      for (const z of [0, -9, 9]) {
        P.x = Pr.x0 - 30;
        P.z = z;
        P.h = Math.atan2(Pr.x0 + 6 - P.x, 0 - P.z);
        P.vx = P.vz = 0;
        P.r = 0;
        T.keys.w = true;
        for (let i = 0; i < 420; i++) {
          T.driveUpdate(1 / 60);
          if (Math.abs(P.z) < Pr.z1 - 0.2) max = Math.max(max, P.x);
        }
        T.keys.w = false;
      }
      return { max, x0: Pr.x0 };
    });
    // the car's middle never gets past the bollards, 1 m in from the end
    expect(r.max).toBeLessThan(r.x0 + 1);
  });

  test("you board from the pier, and the boat sails: it gathers speed, turns only while moving, and backs up", async ({ game, page }) => {
    await onPier(game);
    const a = await now(game);
    expect(a.prompt).toBe("Board the boat");
    await game.key("e");
    const b = await now(game);
    expect([b.boat, b.foot, b.walker, b.state]).toEqual([true, false, false, "DRIVE"]);
    expect(await game.eval(() => ["bG", "bB"].map((id) => document.getElementById(id).textContent))).toEqual(["POWER", "REVERSE"]);
    // steering at a standstill does nothing
    await game.steps(60, { d: true });
    expect((await now(game)).bh).toBeCloseTo(b.bh, 5);
    // 8 s of full power, heading east out to sea: near its 17 m/s, and well clear of the pier
    await game.steps(480, { w: true });
    const c = await now(game);
    expect(c.bv).toBeGreaterThan(15);
    expect(c.bv).toBeLessThanOrEqual(17.01);
    expect(c.bx - b.bx).toBeGreaterThan(70);
    await expect(page.locator("#zone")).toHaveText(/^AT SEA · \d+ KN$/);
    // the wake is part of the boat and shows behind it at speed (it was once built and never attached: a comment
    // had swallowed the line that adds it, and every other check still passed)
    const wake = await game.eval(() => {
      const T = __T,
        w = T.BOAT.wake;
      w.geometry.computeBoundingBox();
      return { attached: w.parent === T.BOAT.m, inScene: (() => { let o = w; while (o.parent) o = o.parent; return o === T.scene; })(), seen: w.visible, opacity: w.material.opacity, behind: w.geometry.boundingBox.max.z < 0 };
    });
    expect(wake).toEqual({ attached: true, inScene: true, seen: true, opacity: 0.3, behind: true });
    // and it lies on the water all the way back, though the bow is up (it tilted with the hull: its far end was 2 m under)
    const tail = await game.eval(() => {
      const w = __T.BOAT.wake;
      w.updateWorldMatrix(true, false);
      const pos = w.geometry.attributes.position;
      return [0, 1, 2].map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(w.matrixWorld).y);
    });
    for (const y of tail) {
      expect(y).toBeGreaterThan(0.05);
      expect(y).toBeLessThan(0.6);
    }
    // it turns under way (right is clockwise from above, as in the car)
    await game.steps(90, { w: true, d: true });
    const d = await now(game);
    expect(d.bh - c.bh).toBeGreaterThan(0.6);
    // throttle shut: the water slows it; then reverse backs it up, slowly
    await game.steps(900, {});
    expect(Math.abs((await now(game)).bv)).toBeLessThan(0.2);
    expect(await game.eval(() => __T.BOAT.wake.visible)).toBe(false);
    await game.steps(240, { s: true });
    const e = await now(game);
    expect(e.bv).toBeLessThan(-3);
    expect(e.bv).toBeGreaterThanOrEqual(-4.01);
  });

  test("the boat stays in deep water, off the pier, away from other boats and inside the map", async ({ game }) => {
    await onPier(game);
    await game.key("e");
    const r = await game.eval(() => {
      const T = __T,
        B = T.BOAT,
        V = T.BOAT_V,
        out = {};
      const run = (x, z, h, n) => {
        B.x = x;
        B.z = z;
        B.h = h;
        B.v = 0;
        B.steer = 0;
        let shallow = -1e9,
          far = 0;
        T.keys.w = true;
        for (let i = 0; i < n; i++) {
          T.driveUpdate(1 / 60);
          for (const k of [-1.35, 0, 1.35]) shallow = Math.max(shallow, T.meshH(B.x + Math.sin(B.h) * k, B.z + Math.cos(B.h) * k));
          far = Math.max(far, Math.hypot(B.x, B.z));
        }
        T.keys.w = false;
        return { shallow, far, x: B.x, z: B.z, on: B.on };
      };
      // from 150 m out, full power straight at the shore for 30 s
      out.shore = run(1400, 120, -Math.PI / 2, 1800);
      // from the north, full power straight at the middle of the pier
      out.pier = run(1225, -60, 0, 600);
      // straight out to sea for two and a half minutes
      out.sea = run(1500, 0, Math.PI / 2, 9000);
      // at an anchored boat
      const o = T.BOATS.find((b) => !b.move);
      const a = Math.atan2(o.x, o.z);
      B.x = o.x + Math.sin(a) * 60;
      B.z = o.z + Math.cos(a) * 60;
      let near = 1e9;
      B.h = a + Math.PI;
      B.v = 0;
      T.keys.w = true;
      for (let i = 0; i < 900; i++) {
        T.driveUpdate(1 / 60);
        near = Math.min(near, Math.hypot(B.x - o.x, B.z - o.z));
      }
      T.keys.w = false;
      out.near = near;
      out.depth = V.depth;
      out.edge = V.edge;
      out.pierZ = T.PIER.z0;
      return out;
    });
    expect(r.shore.shallow).toBeLessThanOrEqual(r.depth);
    expect(r.shore.on).toBe(true);
    // stopped short of the pier's north side
    expect(r.pier.z).toBeLessThan(r.pierZ - 1.2);
    expect(r.sea.far).toBeLessThanOrEqual(r.edge);
    expect(r.sea.far).toBeGreaterThan(r.edge - 30);
    expect(r.near).toBeGreaterThanOrEqual(9);
  });

  test("you step off only beside the pier and nearly stopped; the boat stays where you left it, and you can board again", async ({ game }) => {
    await onPier(game);
    await game.key("e");
    // out at sea: no way off
    await game.steps(480, { w: true });
    const sea = await now(game);
    expect(sea.prompt).toBe(null);
    expect(await game.eval(() => __T.boatLand())).toBe(false);
    // back beside the pier's south side this time, drifting in at 3 m/s: not yet; stopped: yes
    await game.eval(() => {
      const T = __T,
        B = T.BOAT;
      B.x = 1238;
      B.z = T.PIER.z1 + 1.6;
      B.h = Math.PI / 2;
      B.v = 3;
    });
    expect(await game.eval(() => __T.boatLand())).toBe(false);
    await game.eval(() => {
      __T.BOAT.v = 0;
      __T.driveUpdate(1 / 60);
    });
    const beside = await now(game);
    expect(beside.prompt).toBe("Step onto the pier");
    await game.key("e");
    const c = await now(game);
    expect([c.boat, c.foot, c.walker]).toEqual([false, true, true]);
    const P = await game.eval(() => __T.PIER);
    expect(c.fy).toBeCloseTo(P.y, 2);
    expect(c.fx).toBeGreaterThan(P.x0);
    expect(c.fx).toBeLessThan(P.x1);
    expect(Math.abs(c.fz)).toBeLessThan(P.z1);
    // the boat is where it was left, and offers to take you aboard again at once
    expect([c.bx, c.bz]).toEqual([beside.bx, beside.bz]);
    expect(c.prompt).toBe("Board the boat");
    await game.key("e");
    expect((await now(game)).boat).toBe(true);
  });

  test("Photo Mode looks at the boat, or at you on foot, not at the parked car; a delivery's clock keeps running", async ({ game }) => {
    await onPier(game);
    const foot = await game.eval(() => {
      const T = __T,
        t = T.phTarget();
      return [Math.hypot(t.x - T.FOOT.x, t.z - T.FOOT.z), Math.hypot(t.x - T.P.x, t.z - T.P.z)];
    });
    expect(foot[0]).toBeLessThan(0.01);
    expect(foot[1]).toBeGreaterThan(20);
    await game.key("e");
    await game.steps(300, { w: true });
    const r = await game.eval(() => {
      const T = __T,
        B = T.BOAT,
        out = {};
      const t = T.phTarget();
      out.target = Math.hypot(t.x - B.x, t.z - B.z);
      T.photoEnter();
      T.photoFrame(1 / 60);
      out.state = T.state;
      out.cam = [Math.hypot(T.camera.position.x - B.x, T.camera.position.z - B.z), T.camera.position.y];
      T.photoExit();
      out.after = [T.state, B.on];
      // a timed delivery under way: 2 s at sea take 2 s off its clock
      const J = T.JOBS.find((j) => j.type === "courier");
      T.jobStart(J);
      T.job.timing = true;
      T.job.left = 100;
      for (let i = 0; i < 120; i++) T.driveUpdate(1 / 60);
      out.left = T.job.left;
      return out;
    });
    expect(r.target).toBeLessThan(0.01);
    expect(r.state).toBe("PHOTO");
    // the camera is around the boat, above the water
    expect(r.cam[0]).toBeLessThan(40);
    expect(r.cam[1]).toBeGreaterThanOrEqual(0.5);
    expect(r.after).toEqual(["DRIVE", true]);
    expect(r.left).toBeCloseTo(98, 1);
  });

  test("going home, or the car being moved, takes you off the boat and puts it back at its mooring", async ({ game }) => {
    await onPier(game);
    const home = await game.eval(() => [__T.BOAT.x, __T.BOAT.z]);
    await game.key("e");
    await game.steps(300, { w: true });
    await game.eval(() => {
      __T.P.x -= 40;
      __T.driveUpdate(1 / 60);
    });
    const a = await now(game);
    expect([a.boat, a.foot, a.bx, a.bz]).toEqual([false, false, home[0], home[1]]);
    expect(await game.eval(() => document.getElementById("bG").textContent)).toBe("GAS");
    // and from the boat straight to the garage
    await game.park();
    await game.eval(() => {
      const T = __T;
      T.P.x = T.PIER.x0 - 14;
      T.P.z = 0;
      T.P.vx = T.P.vz = 0;
      T.driveUpdate(1 / 60);
      T.footExit();
      T.FOOT.x = T.BOAT.x;
      T.FOOT.z = T.PIER.z0 + 0.8;
      T.FOOT.y = T.PIER.y;
      T.driveUpdate(1 / 60);
      T.boatBoard();
      T.setState("GARAGE");
    });
    const b = await now(game);
    expect([b.boat, b.foot]).toEqual([false, false]);
  });
});
