// The police: patrols with the traffic, crimes they see make you wanted, chasers come along the roads, and you are
// either caught (a fine) or you lose them. While wanted the house, the dealer, races, contracts and travel are closed.
const { test, expect } = require("./support/game");

const toasts = (game) => game.eval(() => [...document.querySelectorAll("#toasts .toast")].map((t) => t.textContent).join(" | "));

// in free ride on a country road well away from the town, with no ordinary traffic and every police car stood down
async function setup(game) {
  await game.open({ police: true });
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T,
      P = T.P;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.chase = false;
      t.offDuty = false;
      t.c.G.visible = false;
      t.wx = t.wz = 1e6;
      t.v = 0;
    }
    // a long straight-ish road to stand on: the longest country road
    const e = T.EDGES.filter((e) => e.type === "country").sort((a, b) => b.len - a.len)[0],
      q = T.edgePos(e, e.len / 2);
    window.__road = { e, s: e.len / 2 };
    P.x = q.x;
    P.z = q.z;
    P.h = Math.atan2(q.dx, q.dz);
    P.vx = P.vz = 0;
    T.driveUpdate(1 / 60);
  });
}
// puts police car k on the player's road, `ahead` metres along it from the player, standing still
const placeCop = (game, k, ahead) =>
  game.eval(
    ([k, ahead]) => {
      const T = __T,
        t = T.TRAFFIC.filter((t) => t.cop)[k],
        { e, s } = window.__road,
        q = T.edgePos(e, s + ahead);
      t.e = e;
      t.s = s + ahead;
      t.dir = 1;
      t.lost = false;
      t.lane = 0;
      T.setLane(t);
      t.v = 0;
      t.stopT = 1e6;
      t.offCur = t.off;
      t.wx = q.x - q.dz * t.off;
      t.wz = q.z + q.dx * t.off;
      t.yaw = Math.atan2(q.dx, q.dz);
      return t.patrol;
    },
    [k, ahead]
  );
const wanted = (game) =>
  game.eval(() => {
    const W = __T.WANTED,
      el = document.getElementById("wanted");
    return { lvl: W.lvl, chasing: __T.copsChasing().length, shown: !el.classList.contains("hide"), stars: el.querySelectorAll("i.on").length, lost: el.classList.contains("lost") };
  });

test.describe("police", () => {
  test("two patrol cars drive with the traffic, with more held back; a police car can't be taken", async ({ game, page }) => {
    await game.open({ police: true });
    await game.driveOut();
    await game.steps(90, {});
    const r = await game.eval(() => {
      const T = __T,
        cops = T.TRAFFIC.filter((t) => t.cop);
      return { pool: cops.length, want: T.COP_V.pool, patrol: cops.filter((t) => t.patrol).length, out: cops.filter((t) => t.e).length, noCrime: !!window.__noCrime };
    });
    expect(r).toMatchObject({ patrol: 2, out: 2, noCrime: false });
    expect(r.pool).toBe(r.want);
    // on foot beside a police car standing at the roadside: no "Take this car"
    await setup(game);
    await placeCop(game, 0, 8);
    await game.key("f");
    const near = await game.eval(() => {
      const T = __T,
        t = T.TRAFFIC.find((t) => t.cop && t.e);
      T.FOOT.x = t.wx + Math.cos(t.yaw) * 2;
      T.FOOT.z = t.wz - Math.sin(t.yaw) * 2;
      T.driveUpdate(1 / 60);
      return { taken: T.takeTraffic(t), prompt: document.getElementById("prompt").classList.contains("hide") ? "" : document.getElementById("promptTxt").textContent };
    });
    expect(near.taken).toBe(false);
    expect(near.prompt).not.toContain("Take this car");
  });

  test("a crash no police car sees changes nothing; the same crash beside a patrol makes you wanted", async ({ game }) => {
    await setup(game);
    // a car stopped on the road 12 m ahead, and you driving into it at about 40 km/h
    const crash = () =>
      game.eval(() => {
        const T = __T,
          P = T.P,
          t = T.TRAFFIC[0],
          { e, s } = window.__road,
          q = T.edgePos(e, s + 12);
        Object.assign(t, { e, s: s + 12, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6, bumpAt: -99 });
        T.setLane(t);
        t.offCur = t.off = 0;
        t.wx = q.x;
        t.wz = q.z;
        t.yaw = Math.atan2(q.dx, q.dz);
        const p0 = T.edgePos(e, s);
        P.x = p0.x;
        P.z = p0.z;
        P.h = Math.atan2(p0.dx, p0.dz);
        P.vx = p0.dx * 11;
        P.vz = p0.dz * 11;
        P.r = P.steer = P.steerS = 0;
        // on the gas all the way: a car left to roll is held by the parking brake and only nudges it
        T.keys.w = true;
        let rel = 0;
        for (let i = 0; i < 90; i++) {
          T.driveUpdate(1 / 60);
          if (t.hitT > 1.4) rel = Math.max(rel, 1);
        }
        T.keys.w = false;
        return { hit: rel > 0, lvl: T.WANTED.lvl };
      });
    const quiet = await crash();
    expect(quiet).toEqual({ hit: true, lvl: 0 });
    // now with a patrol 50 m further on
    await placeCop(game, 0, 60);
    const seen = await crash();
    expect(seen).toEqual({ hit: true, lvl: 1 });
    const w = await wanted(game);
    expect(w).toMatchObject({ lvl: 1, shown: true, stars: 1 });
    expect(w.chasing).toBe(1);
    expect(await toasts(game)).toContain("WANTED");
  });

  test("ramming a police car is two stars; each further crime adds one, no more than one every 4 s, up to five", async ({ game }) => {
    await setup(game);
    await placeCop(game, 0, 10);
    const r = await game.eval(() => {
      const T = __T,
        W = T.WANTED,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        out = [];
      T.copBump(cop, 2.5); // a nudge: nothing
      out.push(W.lvl);
      T.copBump(cop, 9);
      out.push(W.lvl);
      T.crime("crash", cop.wx, cop.wz); // straight after: the same incident
      out.push(W.lvl);
      for (let i = 0; i < 5; i++) {
        W.crimeAt = -99;
        T.crime("crash", cop.wx, cop.wz);
        out.push(W.lvl);
      }
      return { out, chasing: T.copsChasing().length, want: T.COP_V.stars[5], stars: document.querySelectorAll("#wanted i.on").length };
    });
    expect(r.out).toEqual([0, 2, 2, 3, 4, 5, 5, 5]);
    expect(r.stars).toBe(5);
    // four cars after you at five stars (three on a phone, where only four are kept)
    expect(r.chasing).toBeGreaterThanOrEqual(3);
  });

  test("a chaser comes along the roads and catches you when you stop: a fine, and the stars are gone", async ({ game }) => {
    await setup(game);
    // seen 80 m away by a patrol that then has to drive to you
    await placeCop(game, 0, 80);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        cr0 = T.save.cr,
        cop = T.TRAFFIC.find((t) => t.cop && t.e);
      cop.stopT = 0;
      T.crime("crash", P.x, P.z);
      const start = Math.hypot(cop.wx - P.x, cop.wz - P.z);
      let n = 0,
        minD = 1e9,
        flash = new Set();
      while (T.WANTED.lvl && n++ < 60 * 60) {
        P.vx = P.vz = 0;
        T.driveUpdate(1 / 60);
        minD = Math.min(minD, Math.hypot(cop.wx - P.x, cop.wz - P.z));
        flash.add(cop.lights[0].color.getHex());
      }
      return { start, minD, seconds: n / 60, lvl: T.WANTED.lvl, fine: cr0 - T.save.cr, chase: cop.chase, flash: flash.size };
    });
    expect(r.start).toBeGreaterThan(70);
    expect(r.lvl).toBe(0);
    expect(r.seconds).toBeLessThan(30);
    expect(r.minD).toBeLessThan(8);
    expect(r.minD).toBeGreaterThan(2);
    expect(r.fine).toBe(500);
    expect(r.chase).toBe(false);
    expect(r.flash).toBeGreaterThan(1);
    expect(await toasts(game)).toContain("CAUGHT");
    expect((await wanted(game)).shown).toBe(false);
  });

  test("a chaser coming from the other way turns round, and follows you round a corner", async ({ game }) => {
    await setup(game);
    await placeCop(game, 0, -60);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        cop = T.TRAFFIC.find((t) => t.cop && t.e);
      cop.stopT = 0;
      // facing away from you, 60 m behind
      cop.dir = -1;
      cop.yaw += Math.PI;
      T.crime("crash", P.x, P.z);
      let n = 0,
        turned = false;
      while (T.WANTED.lvl && n++ < 60 * 40) {
        P.vx = P.vz = 0;
        T.driveUpdate(1 / 60);
        if (cop.dir === 1) turned = true;
      }
      return { turned, lvl: T.WANTED.lvl, seconds: n / 60 };
    });
    expect(r).toMatchObject({ turned: true, lvl: 0 });
  });

  test("out of their reach long enough, they lose you; the stars blink meanwhile", async ({ game }) => {
    await setup(game);
    await placeCop(game, 0, 30);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P;
      T.crime("crash", P.x, P.z);
      // gone: to the road farthest away, instantly
      let out0 = 0;
      const mid = (e) => T.edgePos(e, e.len / 2),
        far = T.EDGES.filter((e) => e.type !== "drive").sort((a, b) => Math.hypot(mid(b).x - P.x, mid(b).z - P.z) - Math.hypot(mid(a).x - P.x, mid(a).z - P.z))[0];
      out0 = Math.hypot(mid(far).x - P.x, mid(far).z - P.z);
      const q = T.edgePos(far, far.len / 2);
      P.x = q.x;
      P.z = q.z;
      P.vx = P.vz = 0;
      let n = 0,
        blink = false;
      const need = T.copLoseT();
      while (T.WANTED.lvl && n++ < 60 * 40) {
        P.vx = P.vz = 0;
        T.driveUpdate(1 / 60);
        if (document.getElementById("wanted").classList.contains("lost")) blink = true;
      }
      return { seconds: n / 60, need, blink, chasing: T.copsChasing().length, out0 };
    });
    expect(r.out0).toBeGreaterThan(900);
    expect(r.blink).toBe(true);
    expect(r.chasing).toBe(0);
    expect(r.seconds).toBeGreaterThan(r.need - 0.6);
    expect(r.seconds).toBeLessThan(r.need + 1.5);
    expect(await toasts(game)).toContain("LOST THEM");
  });

  test("while wanted: no house, no dealer, no races, no contracts, no going home", async ({ game, page }) => {
    await setup(game);
    await placeCop(game, 0, 30);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        out = {};
      T.crime("crash", P.x, P.z);
      const at = (x, z) => {
        P.x = x;
        P.z = z;
        P.vx = P.vz = 0;
        T.updatePrompt();
        return document.getElementById("promptTxt").textContent;
      };
      const hm = T.gW(0, -8);
      out.house = at(hm.x, hm.z);
      out.dealer = at(T.DEALER_MARK.x, T.DEALER_MARK.z);
      const E = T.EVENTS[0];
      out.race = at(E.x, E.z);
      T.openIntro(E);
      out.intro = T.state;
      out.job = T.jobBlocked();
      return out;
    });
    expect(r).toEqual({ house: "Lose the police first", dealer: "Lose the police first", race: "Lose the police first", intro: "DRIVE", job: "Lose the police first" });
    await game.key("Escape");
    await game.waitState("PAUSE");
    await page.locator("#pHome").click();
    expect(await game.eval(() => __T.state)).toBe("PAUSE");
    expect(await toasts(game)).toContain("LOSE THE POLICE FIRST");
  });

  test("taking a car, running into someone, and speeding past a patrol: each is a crime in front of the police", async ({ game }) => {
    await setup(game);
    await placeCop(game, 0, 30);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        W = T.WANTED,
        out = {},
        reset = () => {
          W.lvl = 0;
          W.crimeAt = -99;
          for (const t of T.TRAFFIC) t.chase = false;
        };
      // speeding: 140 km/h past the patrol, 20 m from it
      const cop = T.TRAFFIC.find((t) => t.cop && t.e);
      P.x = cop.wx + Math.cos(cop.yaw) * 20;
      P.z = cop.wz - Math.sin(cop.yaw) * 20;
      P.vx = Math.sin(cop.yaw) * 39;
      P.vz = Math.cos(cop.yaw) * 39;
      P.h = cop.yaw;
      T.copUpdate(1 / 60);
      out.speed = W.lvl;
      reset();
      // running into someone at 6 m/s, beside the patrol
      const p = T.PEDS[0];
      p.x = cop.wx + 3;
      p.z = cop.wz;
      P.x = p.x;
      P.z = p.z;
      P.vx = 6;
      P.vz = 0;
      P.h = Math.PI / 2;
      // pedUpdate only runs near the town: call its car check directly through a crime at that spot instead
      out.ped = T.crime("ped", p.x, p.z) ? W.lvl : 0;
      reset();
      return out;
    });
    expect(r).toEqual({ speed: 1, ped: 1 });
    // stopped again, on your road, before getting out
    await game.eval(() => {
      const T = __T,
        P = T.P,
        { e, s } = window.__road,
        q = T.edgePos(e, s);
      P.x = q.x;
      P.z = q.z;
      P.h = Math.atan2(q.dx, q.dz);
      P.vx = P.vz = 0;
      T.WANTED.lvl = 0;
      T.WANTED.crimeAt = -99;
      T.driveUpdate(1 / 60);
    });
    // taking a stopped traffic car beside the patrol
    const t = await game.eval(() => {
      const T = __T,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        car = T.TRAFFIC[1],
        { e, s } = window.__road,
        q = T.edgePos(e, s + 22);
      Object.assign(car, { e, s: s + 22, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6 });
      T.setLane(car);
      car.offCur = car.off;
      car.wx = q.x - q.dz * car.off;
      car.wz = q.z + q.dx * car.off;
      car.yaw = Math.atan2(q.dx, q.dz);
      void cop;
      return true;
    });
    expect(t).toBe(true);
    await game.key("f");
    const took = await game.eval(() => {
      const T = __T,
        car = T.TRAFFIC[1];
      T.FOOT.x = car.wx + Math.cos(car.yaw) * 1.9;
      T.FOOT.z = car.wz - Math.sin(car.yaw) * 1.9;
      T.driveUpdate(1 / 60);
      return { took: T.takeTraffic(car), lvl: T.WANTED.lvl };
    });
    expect(took).toEqual({ took: true, lvl: 1 });
  });

  test("in Old Quay, driving into someone on the pavement beside a patrol makes you wanted", async ({ game }) => {
    await game.open({ police: true });
    await game.driveOut();
    await game.park();
    const r = await game.eval(() => {
      const T = __T,
        P = T.P;
      for (const t of T.TRAFFIC) {
        t.e = null;
        t.lost = false;
        t.wx = t.wz = 1e6;
      }
      // someone standing on the avenue's pavement, a patrol on the avenue beside them
      const e = T.PED_EDGES.find((e) => !e.cross && e.len > 40),
        p = T.PEDS[0];
      p.e = e;
      p.from = e.a;
      p.s = 20;
      p.st = "idle";
      p.t = 99;
      P.x = 600;
      P.z = 0;
      T.driveUpdate(1 / 60);
      const nr = T.nearestRoad(p.x, p.z, 30),
        cop = T.TRAFFIC.find((t) => t.cop);
      Object.assign(cop, { e: nr.e, s: Math.min(nr.e.len - 1, nr.s + 15), dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6 });
      T.setLane(cop);
      const q = T.edgePos(cop.e, cop.s);
      cop.wx = q.x;
      cop.wz = q.z;
      // your car arriving fast right where they stand
      const x0 = p.x,
        z0 = p.z;
      P.x = x0;
      P.z = z0;
      P.h = 0;
      P.vx = 0;
      P.vz = 7;
      T.pedUpdate(1 / 60);
      return { lvl: T.WANTED.lvl, st: p.st, t: p.t };
    });
    expect(r.lvl).toBe(1);
    expect(r.st).toBe("idle");
    expect(r.t).toBeGreaterThan(3);
  });
  // Off the road the cars can't get beside you: an officer gets out and comes on foot. You get there the way a
  // player would: out of the car and walking away from the road for 9 s (stopped by any wall on the way)
  const offRoad = (game) =>
    game.eval(() => {
      const T = __T,
        F = T.FOOT,
        { e, s } = window.__road,
        q = T.edgePos(e, s);
      for (const sd of [1, -1]) {
        const ax = -q.dz * sd,
          az = q.dx * sd;
        // from beside the car
        F.x = q.x + ax * 2;
        F.z = q.z + az * 2;
        F.y = T.footGround(F.x, F.z);
        F.h = Math.atan2(ax, az);
        F.v = 0;
        T.keys.w = true;
        for (let i = 0; i < 60 * 9; i++) T.driveUpdate(1 / 60);
        T.keys.w = false;
        for (let i = 0; i < 30; i++) T.driveUpdate(1 / 60);
        const off = (F.x - q.x) * ax + (F.z - q.z) * az;
        if (off > 14) return { x: F.x, z: F.z, sd, off };
      }
      return null;
    });

  test("on foot off the road, an officer gets out of the car, runs to you and catches you", async ({ game }) => {
    await setup(game);
    await game.key("f");
    const spot = await offRoad(game);
    expect(spot).not.toBeNull();
    await placeCop(game, 0, 40);
    const r = await game.eval((spot) => {
      const T = __T,
        F = T.FOOT,
        O = T.OFFICER,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        cr0 = T.save.cr;
      F.x = spot.x;
      F.z = spot.z;
      F.y = T.footGround(spot.x, spot.z);
      cop.stopT = 0;
      T.crime("crash", F.x, F.z);
      let n = 0,
        out = false,
        carStill = true,
        minD = 1e9;
      while (T.WANTED.lvl && n++ < 60 * 40) {
        T.driveUpdate(1 / 60);
        if (O.on) {
          // (from a moment after they got out: the car was still rolling to a stop)
          if (out && cop.v > 0.3) carStill = false;
          out = true;
          minD = Math.min(minD, Math.hypot(O.x - F.x, O.z - F.z));
        }
      }
      return { out, carStill, minD, lvl: T.WANTED.lvl, fine: cr0 - T.save.cr, on: O.on, shown: O.m.G.visible, stopT: cop.stopT, seconds: n / 60 };
    }, spot);
    expect(r).toMatchObject({ out: true, carStill: true, lvl: 0, fine: 500, on: false, shown: false, stopT: 0 });
    expect(r.minD).toBeLessThan(1.5);
    expect(await toasts(game)).toContain("CAUGHT");
  });

  test("you can outrun an officer: they give up, go back to the car, and the chase carries on", async ({ game }) => {
    await setup(game);
    await game.key("f");
    const spot = await offRoad(game);
    expect(spot).not.toBeNull();
    await placeCop(game, 0, 40);
    const r = await game.eval((spot) => {
      const T = __T,
        F = T.FOOT,
        O = T.OFFICER,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        { e, s } = window.__road,
        q = T.edgePos(e, s);
      F.x = spot.x;
      F.z = spot.z;
      F.y = T.footGround(spot.x, spot.z);
      cop.stopT = 0;
      T.crime("crash", F.x, F.z);
      // wait for the officer to get out
      let n = 0;
      while (!O.on && n++ < 60 * 20) T.driveUpdate(1 / 60);
      const outAt = n / 60;
      // then run straight away from the road at full running speed, moved by hand so that no wall stops you (the
      // officer still has to go round them)
      const ax = -q.dz * spot.sd,
        az = q.dx * spot.sd;
      let fx = F.x,
        fz = F.z,
        gaveUp = false,
        backIn = false,
        lvlBackIn = 0,
        grabbed = false;
      for (let i = 0; i < 60 * 60 && !backIn; i++) {
        fx += (ax * T.FOOT_V.run) / 60;
        fz += (az * T.FOOT_V.run) / 60;
        F.x = fx;
        F.z = fz;
        T.driveUpdate(1 / 60);
        if (O.caughtT > 0) grabbed = true;
        if (O.back) gaveUp = true;
        if (gaveUp && !O.on) {
          backIn = true;
          lvlBackIn = T.WANTED.lvl;
        }
      }
      return { outAt, gaveUp, backIn, lvlBackIn, grabbed, chase: cop.chase };
    }, spot);
    expect(r.outAt).toBeLessThan(20);
    expect(r).toMatchObject({ gaveUp: true, backIn: true, grabbed: false });
    // never caught: by the time they are back in the car the chase carries on, or you are far enough away to lose them
    expect(await toasts(game)).not.toContain("CAUGHT");
  });
});
