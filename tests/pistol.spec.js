// Step 4, first part: the pistol from the garage, lock-on aiming, hits on cars, people and the police, health,
// being knocked out, arrest, and the violence setting. Working decisions: docs/STEP4_DECISIONS.md.
const { test, expect } = require("./support/game");

const toasts = (game) => game.eval(() => [...document.querySelectorAll("#toasts .toast")].map((t) => t.textContent).join(" | "));

// armed (the garage's PISTOL button), driven out, parked on the longest country road, out of the car, nothing about
async function armed(game, opts = {}) {
  await game.open(opts);
  await game.waitState("GARAGE");
  await game.eval(() => document.getElementById("gGun").click());
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T,
      P = T.P;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.chase = false;
      t.c.G.visible = false;
      t.wx = t.wz = 1e6;
    }
    const e = T.EDGES.filter((e) => e.type === "country").sort((a, b) => b.len - a.len)[0],
      q = T.edgePos(e, e.len / 2);
    window.__road = { e, s: e.len / 2 };
    P.x = q.x;
    P.z = q.z;
    P.h = Math.atan2(q.dx, q.dz);
    P.vx = P.vz = 0;
    T.driveUpdate(1 / 60);
  });
  await game.key("f");
}
// a car (traffic, or police car k) standing on your road `ahead` m along it, and you facing it from beside your car
const carAhead = (game, ahead, cop = false) => // (`ahead` counts from your car; you stand 4 m along)

  game.eval(
    ([ahead, cop]) => {
      const T = __T,
        { e, s } = window.__road,
        t = cop ? T.TRAFFIC.find((t) => t.cop) : T.TRAFFIC[0],
        q = T.edgePos(e, s + ahead),
        F = T.FOOT;
      Object.assign(t, { e, s: s + ahead, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6, damage: 0, damageT: 0 });
      t.offCur = t.off = 0;
      t.wx = q.x;
      t.wz = q.z;
      t.yaw = Math.atan2(q.dx, q.dz);
      t.c.G.visible = true;
      // between your parked car and the target: your own car would be cover (a shot doesn't go through a car)
      const p0 = T.edgePos(e, s + 4);
      F.x = p0.x;
      F.z = p0.z;
      F.h = Math.atan2(q.x - F.x, q.z - F.z);
      T.driveUpdate(1 / 60);
      return T.TRAFFIC.indexOf(t);
    },
    [ahead, cop]
  );
const fire = (game, n) =>
  game.eval((n) => {
    const T = __T;
    for (let i = 0; i < n; i++) {
      // a press of G: held 0.2 s (one shot), then 0.2 s off
      T.keys.g = true;
      for (let k = 0; k < 12; k++) T.driveUpdate(1 / 60);
      T.keys.g = false;
      for (let k = 0; k < 12; k++) T.driveUpdate(1 / 60);
    }
    return T.GUN.ammo;
  }, n);

test.describe("pistol", () => {
  test("taken from the garage: 48 rounds, in your hand on foot only, with the HUD and (on a phone) a FIRE pad", async ({ game }) => {
    await game.open();
    await game.waitState("GARAGE");
    const before = await game.eval(() => ({ txt: document.getElementById("gGun").textContent, armed: __T.save.armed }));
    expect(before).toEqual({ txt: "PISTOL: LEFT HERE", armed: false });
    await game.eval(() => document.getElementById("gGun").click());
    expect(await game.eval(() => [document.getElementById("gGun").textContent, JSON.parse(localStorage.getItem(__T.SAVE_KEY)).armed])).toEqual(["PISTOL: TAKING IT", true]);
    await game.driveOut();
    const inCar = await game.eval(() => ({ ammo: __T.GUN.ammo, gun: __T.GUN.m.visible }));
    expect(inCar).toEqual({ ammo: 48, gun: false });
    await game.park();
    await game.key("f");
    // the HUD is refreshed ten times a second
    await game.page.waitForFunction(() => !document.getElementById("gunHud").classList.contains("hide"), null, { timeout: 5000 });
    const onFoot = await game.eval(() => ({ gun: __T.GUN.m.visible, hud: !document.getElementById("gunHud").classList.contains("hide"), txt: document.getElementById("gunTxt").textContent }));
    expect(onFoot).toEqual({ gun: true, hud: true, txt: "PISTOL 48" });
  });

  test("G fires at the car in front of you: 12 damage a hit, it stops at 100; not at one behind you", async ({ game }) => {
    await armed(game);
    const k = await carAhead(game, 14);
    const lock = await game.eval((k) => {
      const T = __T,
        q = T.gunPick();
      return { k: q && q.k, same: !!q && q.o === T.TRAFFIC[k], ring: T.GUN.ring.visible };
    }, k);
    expect(lock).toEqual({ k: "car", same: true, ring: true });
    expect(await fire(game, 3)).toBe(45);
    expect(await game.eval((k) => Math.round(__T.TRAFFIC[k].damage), k)).toBe(36);
    await fire(game, 6);
    const done = await game.eval((k) => ({ d: __T.TRAFFIC[k].damage, stop: __T.TRAFFIC[k].stopT > 1e5, lock: !!__T.gunPick() }), k);
    expect(done).toEqual({ d: 100, stop: true, lock: false });
    // turned round: nothing in front, nothing locked; the shot still goes, and costs a round
    await game.eval(() => {
      __T.FOOT.h += Math.PI;
    });
    expect(await game.eval(() => __T.gunPick())).toBeNull();
    expect(await fire(game, 1)).toBe(38);
  });

  test("out of rounds: no more shots, the HUD says so, and the house refills it", async ({ game }) => {
    await armed(game);
    await game.eval(() => {
      __T.GUN.ammo = 1;
    });
    expect(await fire(game, 3)).toBe(0);
    await game.frames(8);
    expect(await game.eval(() => document.getElementById("gunTxt").textContent)).toBe("PISTOL EMPTY");
    expect(await toasts(game)).toContain("OUT OF ROUNDS");
  });

  test("someone shot is knocked down and gets up again; on LOW they stand still for as long; on STRONG a red mark fades", async ({ game }) => {
    await game.open();
    await game.waitState("GARAGE");
    await game.eval(() => document.getElementById("gGun").click());
    await game.driveOut();
    await game.park();
    // parked in Old Quay, out of the car (moving the car after getting out would put you back in it)
    await game.eval(() => {
      const T = __T;
      for (const t of T.TRAFFIC) {
        t.e = null;
        t.lost = false;
        t.wx = t.wz = 1e6;
      }
      T.P.x = 600;
      T.P.z = 0;
      T.P.vx = T.P.vz = 0;
      T.driveUpdate(1 / 60);
    });
    await game.key("f");
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        out = {};
      // the walker beside someone standing on an Old Quay pavement
      const e = T.PED_EDGES.find((e) => !e.cross && e.len > 40),
        p = T.PEDS[0];
      const one = (viol) => {
        T.save.violence = viol;
        p.e = e;
        p.from = e.a;
        p.s = 20;
        p.st = "idle";
        p.t = 99;
        p.fall = 0;
        T.driveUpdate(1 / 60);
        const ax = e.b.x - e.a.x,
          az = e.b.z - e.a.z,
          L = Math.hypot(ax, az);
        F.x = p.x - (ax / L) * 6;
        F.z = p.z - (az / L) * 6;
        F.h = Math.atan2(p.x - F.x, p.z - F.z);
        F.y = T.footGround(F.x, F.z);
        T.driveUpdate(1 / 60);
        const q = T.gunPick();
        if (!q || q.o !== p) return { locked: false };
        T.GUN.cool = 0;
        T.gunFire();
        let lay = 0;
        for (let i = 0; i < 60; i++) {
          T.driveUpdate(1 / 60);
          lay = Math.max(lay, Math.abs(p.m.G.rotation.x));
        }
        const st = p.st,
          mark = T.GUN.marks.some((k) => k.m.visible);
        for (let i = 0; i < 60 * 9; i++) T.driveUpdate(1 / 60);
        return { locked: true, st, lay: +lay.toFixed(2), mark, up: p.st !== "down" && Math.abs(p.m.G.rotation.x) < 0.05 };
      };
      out.standard = one(1);
      out.low = one(0);
      out.strong = one(2);
      return out;
    });
    expect(r.standard).toEqual({ locked: true, st: "down", lay: 1.57, mark: false, up: true });
    // LOW changes only what you see: down for as long, standing instead of lying
    expect(r.low).toMatchObject({ locked: true, st: "down", lay: 0, mark: false, up: true });
    expect(r.strong).toMatchObject({ locked: true, st: "down", mark: true, up: true });
  });

  test("the VIOLENCE setting cycles LOW, STANDARD, STRONG from the pause menu and is saved", async ({ game, page }) => {
    await game.open();
    await game.driveOut();
    await game.key("Escape");
    await game.waitState("PAUSE");
    const b = page.locator("#pViol");
    expect(await b.textContent()).toBe("VIOLENCE: STANDARD");
    await b.click();
    expect(await b.textContent()).toBe("VIOLENCE: STRONG");
    await b.click();
    expect(await b.textContent()).toBe("VIOLENCE: LOW");
    expect(await game.eval(() => JSON.parse(localStorage.getItem(__T.SAVE_KEY)).violence)).toBe(0);
  });

  test("in front of the police: firing is one star, shooting a police car two; a police car shot to a stop leaves the chase", async ({ game }) => {
    await armed(game, { police: true });
    const k = await carAhead(game, 14, true);
    const r = await game.eval((k) => {
      const T = __T,
        F = T.FOOT,
        W = T.WANTED,
        cop = T.TRAFFIC[k],
        out = {};
      // into the air, the police car behind you
      F.h += Math.PI;
      T.driveUpdate(1 / 60);
      T.GUN.cool = 0;
      T.gunFire();
      out.fire = W.lvl;
      W.lvl = 0;
      W.crimeAt = -99;
      for (const t of T.TRAFFIC) t.chase = false;
      F.h -= Math.PI;
      T.driveUpdate(1 / 60);
      T.GUN.cool = 0;
      T.gunFire();
      out.cop = W.lvl;
      out.chasing = cop.chase;
      for (let i = 0; i < 9; i++) {
        cop.damageT = 0;
        T.GUN.cool = 0;
        T.GUN.lock = { k: "cop", x: cop.wx, z: cop.wz, y: 1, o: cop };
        T.gunFire();
      }
      out.stopped = cop.damage >= 100 && cop.stopT > 1e5 && !cop.chase;
      return out;
    }, k);
    expect(r).toEqual({ fire: 1, cop: 2, chasing: true, stopped: true });
  });

  test("health: back to 50 after a quiet 6 s; at 0 you're knocked out and wake at home, 10% poorer (at most 5,000)", async ({ game }) => {
    await armed(game, { police: true });
    const r = await game.eval(() => {
      const T = __T,
        H = T.HEALTH;
      T.hurt(80);
      const hp1 = H.hp;
      for (let i = 0; i < 60 * 5; i++) T.driveUpdate(1 / 60);
      const quiet5 = H.hp;
      for (let i = 0; i < 60 * 12; i++) T.driveUpdate(1 / 60);
      return { hp1, quiet5, after: Math.round(H.hp) };
    });
    expect(r).toEqual({ hp1: 20, quiet5: 20, after: 50 });
    const cr0 = await game.eval(() => __T.save.cr);
    await game.eval(() => {
      __T.WANTED.lvl = 2;
      __T.hurt(100);
    });
    await game.waitState("GARAGE");
    const o = await game.eval(() => ({ cr: __T.save.cr, lvl: __T.WANTED.lvl, hp: __T.HEALTH.hp }));
    expect(o).toEqual({ cr: cr0 - Math.min(Math.round(cr0 * 0.1), 5000), lvl: 0, hp: 100 });
    expect(await toasts(game)).toContain("KNOCKED OUT");
  });

  test("caught while carrying the pistol is an arrest: the fine, the pistol back in the garage, outside the Harbour Hall", async ({ game }) => {
    await armed(game, { police: true });
    await carAhead(game, 10, true);
    const r = await game.eval(() => {
      const T = __T,
        cr0 = T.save.cr;
      T.crime("crash", T.FOOT.x, T.FOOT.z);
      T.copCaught();
      return { fine: cr0 - T.save.cr, armed: T.save.armed, lvl: T.WANTED.lvl, foot: T.FOOT.on };
    });
    expect(r).toEqual({ fine: 500, armed: false, lvl: 0, foot: false });
    await game.waitState("FADE");
    await game.waitState("DRIVE");
    const at = await game.eval(() => Math.hypot(__T.P.x - __T.QUAY.hall[0], __T.P.z - (__T.QUAY.hall[1] + __T.QUAY.hall[3])));
    expect(at).toBeLessThan(40);
    expect(await toasts(game)).toContain("ARRESTED");
  });

  test("at three stars an officer on foot fires at you, and a hit takes 10 health", async ({ game }) => {
    await armed(game, { police: true });
    await carAhead(game, 30, true);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        O = T.OFFICER,
        W = T.WANTED,
        cop = T.TRAFFIC.find((t) => t.cop && t.e);
      T.crime("cop", F.x, F.z);
      W.crimeAt = -99;
      T.crime("crash", F.x, F.z);
      // an officer 12 m from you, on the road ahead
      Object.assign(O, { on: true, car: cop, back: false, x: cop.wx, z: cop.wz - 0, y: T.footGround(cop.wx, cop.wz), h: 0, v: 0, caughtT: 0, down: 0, outT: 0, detA: 0, detT: 0, best: 1e9, shootT: 0 });
      O.m.G.visible = true;
      cop.stopT = 1e6;
      const rnd = Math.random;
      Math.random = () => 0;
      let n = 0;
      try {
        while (n++ < 60 * 5 && T.HEALTH.hp === 100) T.driveUpdate(1 / 60);
      } finally {
        Math.random = rnd;
      }
      return { lvl: W.lvl, out: O.on, hp: T.HEALTH.hp, d: Math.hypot(O.x - F.x, O.z - F.z) };
    });
    expect(r.lvl).toBe(3);
    expect(r.hp).toBe(90);
  });
  // Codex's review of #31
  test("a police car shot to a stop is never sent after you again while wrecked, and comes back repaired", async ({ game }) => {
    await armed(game, { police: true });
    const k = await carAhead(game, 14, true);
    const r = await game.eval((k) => {
      const T = __T,
        W = T.WANTED,
        cop = T.TRAFFIC[k];
      T.crime("crash", T.FOOT.x, T.FOOT.z);
      cop.damage = 100;
      cop.stopT = 1e6;
      cop.chase = false;
      cop.offDuty = true;
      // more stars: more cars are called, several dispatch rounds
      const out = { wreckedCalled: false };
      for (let i = 0; i < 4; i++) {
        W.crimeAt = -99;
        T.crime("crash", T.FOOT.x, T.FOOT.z);
        for (let f = 0; f < 40; f++) {
          T.driveUpdate(1 / 60);
          if (cop.chase) out.wreckedCalled = true;
        }
      }
      out.lvl = W.lvl;
      out.chasing = T.copsChasing().length;
      // stood down out of sight, it is repaired
      T.copStandDown(cop);
      out.repaired = cop.damage === 0 && cop.stopT === 0;
      return out;
    }, k);
    expect(r.wreckedCalled).toBe(false);
    expect(r.lvl).toBe(5);
    expect(r.chasing).toBeGreaterThan(0);
    expect(r.repaired).toBe(true);
  });

  test("a hit the police can't see happen still counts if they can see you fire; and only once", async ({ game }) => {
    await armed(game, { police: true });
    // a patrol beside you, a traffic car 35 m on: more than 90 m from the patrol at the target end
    await carAhead(game, 35);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        W = T.WANTED,
        car = T.TRAFFIC[0],
        cop = T.TRAFFIC.find((t) => t.cop),
        { e } = window.__road;
      // 60 m straight behind you, looking on (not moved by traffic: no frames run from here)
      const dx = F.x - car.wx,
        dz = F.z - car.wz,
        d = Math.hypot(dx, dz);
      Object.assign(cop, { e, lost: false, v: 0, stopT: 1e6, chase: false });
      cop.wx = F.x + (dx / d) * 60;
      cop.wz = F.z + (dz / d) * 60;
      const out = { seesTarget: Math.hypot(cop.wx - car.wx, cop.wz - car.wz) < T.COP_V.see, seesYou: Math.hypot(cop.wx - F.x, cop.wz - F.z) < T.COP_V.see };
      T.GUN.lock = T.gunPick();
      out.locked = !!T.GUN.lock && T.GUN.lock.o === car;
      T.GUN.cool = 0;
      T.gunFire();
      out.lvl = W.lvl;
      return out;
    });
    expect(r).toEqual({ seesTarget: false, seesYou: true, locked: true, lvl: 1 });
  });

  test("getting into the car puts the pistol away; the ring then shows what the car's own lock sees", async ({ game }) => {
    await armed(game);
    await carAhead(game, 14);
    const before = await game.eval(() => __T.GUN.ring.visible);
    expect(before).toBe(true);
    await game.eval(() => {
      const T = __T;
      T.FOOT.x = T.P.x + 1.5;
      T.FOOT.z = T.P.z;
      T.driveUpdate(1 / 60);
    });
    await game.key("f");
    await game.frames(3);
    // (part 2: you can shoot from the car, so the ring stays on a target ahead of it, and only on one: never left behind)
    expect(await game.eval(() => [__T.FOOT.on, __T.GUN.m.visible, __T.GUN.ring.visible === !!__T.GUN.lock])).toEqual([false, false, true]);
  });

  test("FLASHES: OFF hides the muzzle flash and the red flash when you're hit", async ({ game, page }) => {
    await armed(game);
    const flash = () =>
      game.eval(() => {
        const T = __T;
        T.GUN.cool = 0;
        T.gunFire();
        T.driveUpdate(1 / 60);
        const muzzle = T.GUN.flash.visible;
        T.hurt(5);
        T.driveUpdate(1 / 60);
        return { muzzle, edge: document.getElementById("edge").style.boxShadow };
      });
    const on = await flash();
    expect(on.muzzle).toBe(true);
    expect(on.edge).not.toContain("0)");
    await game.key("Escape");
    await game.waitState("PAUSE");
    await page.locator("#pFlash").click();
    expect(await page.locator("#pFlash").textContent()).toBe("FLASHES: OFF");
    await page.locator("#pRes").click();
    await game.waitState("DRIVE");
    const off = await flash();
    expect(off.muzzle).toBe(false);
    expect(off.edge).toContain("rgba(226, 72, 61, 0)");
  });
  // Codex's re-review of #31: the repair is checked through the whole stand-down, not by calling it
  test("a wrecked reserve police car is stood down once out of sight and comes back repaired", async ({ game }) => {
    await armed(game, { police: true });
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        cops = T.TRAFFIC.filter((t) => t.cop),
        cop = cops.find((t) => !t.patrol),
        { e, s } = window.__road,
        q = T.edgePos(e, s + 30);
      // a reserve car, wrecked on your road after a chase
      Object.assign(cop, { e, s: s + 30, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6, damage: 100, chase: false, offDuty: true });
      cop.wx = q.x;
      cop.wz = q.z;
      // you, far away (back in your car, which goes with you)
      T.FOOT.on = false;
      const far = T.EDGES.filter((x) => x.type !== "drive").sort((a, b) => {
        const pa = T.edgePos(a, a.len / 2),
          pb = T.edgePos(b, b.len / 2);
        return Math.hypot(pb.x - q.x, pb.z - q.z) - Math.hypot(pa.x - q.x, pa.z - q.z);
      })[0];
      const f = T.edgePos(far, far.len / 2);
      P.x = f.x;
      P.z = f.z;
      P.vx = P.vz = 0;
      let n = 0;
      while (cop.e && n++ < 60 * 5) T.driveUpdate(1 / 60);
      return { gone: !cop.e, damage: cop.damage, stopT: cop.stopT, waiting: cop.lost, seconds: n / 60 };
    });
    expect(r).toMatchObject({ gone: true, damage: 0, stopT: 0, waiting: true });
  });
});
