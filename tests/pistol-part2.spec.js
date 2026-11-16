// Step 4, part 2 (docs/STEP4_DECISIONS.md): shooting from a car, police cars firing at four stars, first-aid kits.
const { test, expect } = require("./support/game");

// armed, driven out onto the longest country road, everything else off the roads
async function armedInCar(game, opts = {}) {
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
}
// car k of TRAFFIC (or the n-th police car) standing on your road `ahead` m along
const place = (game, which, ahead, chase = false) =>
  game.eval(
    ([which, ahead, chase]) => {
      const T = __T,
        { e, s } = window.__road,
        t = typeof which === "number" ? T.TRAFFIC[which] : T.TRAFFIC.filter((t) => t.cop)[+which.slice(3)],
        q = T.edgePos(e, s + ahead);
      Object.assign(t, { e, s: s + ahead, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6, damage: 0, damageT: 0, chase, offDuty: false });
      t.offCur = t.off = 0;
      t.wx = q.x;
      t.wz = q.z;
      t.yaw = Math.atan2(q.dx, q.dz);
      t.c.G.visible = true;
      return T.TRAFFIC.indexOf(t);
    },
    [which, ahead, chase]
  );

test.describe("step 4 part 2", () => {
  test("from the car: the lock ahead, G fires, a hit damages the car in front; not without the pistol", async ({ game }) => {
    await armedInCar(game);
    const k = await place(game, 0, 18);
    const r = await game.eval((k) => {
      const T = __T,
        t = T.TRAFFIC[k];
      T.driveUpdate(1 / 60);
      const locked = !!T.GUN.lock && T.GUN.lock.o === t,
        ring = T.GUN.ring.visible;
      T.keys.g = true;
      for (let i = 0; i < 10; i++) T.driveUpdate(1 / 60);
      T.keys.g = false;
      for (let i = 0; i < 10; i++) T.driveUpdate(1 / 60);
      const out = { locked, ring, ammo: T.GUN.ammo, damage: Math.round(t.damage), gunSeen: T.GUN.m.visible, foot: T.FOOT.on };
      T.save.armed = false;
      T.driveUpdate(1 / 60);
      out.unarmed = !!T.GUN.lock || T.GUN.ring.visible;
      return out;
    }, k);
    expect(r).toEqual({ locked: true, ring: true, ammo: 47, damage: 12, gunSeen: false, foot: false, unarmed: false });
  });

  test("at four stars a police car close by fires: in the car it damages the car, on foot it hurts you; not at three", async ({ game }) => {
    await armedInCar(game, { police: true });
    await place(game, "cop0", 14, true);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        W = T.WANTED,
        H = T.HEALTH,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        rnd = Math.random,
        out = {};
      const run = (s) => {
        for (let i = 0; i < 60 * s; i++) {
          cop.stopT = 1e6;
          cop.v = 0;
          P.vx = P.vz = 0;
          T.copCarFire(1 / 60, [cop]);
        }
      };
      Math.random = () => 0;
      try {
        W.lvl = 3;
        run(2);
        out.three = [Math.round(P.damage || 0), H.hp];
        W.lvl = 4;
        cop.shootT = 0;
        run(1.4);
        out.fourCar = [Math.round(P.damage || 0), H.hp];
        // on foot beside the car (not inside it: the car would be cover)
        T.FOOT.on = true;
        T.FOOT.x = P.x - Math.cos(P.h) * 3;
        T.FOOT.z = P.z + Math.sin(P.h) * 3;
        cop.shootT = 0;
        run(1.4);
        out.fourFoot = H.hp;
        T.FOOT.on = false;
        cop.damage = 100;
        cop.shootT = 0;
        const d0 = P.damage;
        run(2);
        out.wrecked = Math.round(P.damage - d0);
      } finally {
        Math.random = rnd;
      }
      return out;
    });
    expect(r.three).toEqual([0, 100]);
    expect(r.fourCar).toEqual([6, 100]);
    expect(r.fourFoot).toBe(92);
    expect(r.wrecked).toBe(0);
  });

  test("no more than two police cars fire at once", async ({ game }) => {
    await armedInCar(game, { police: true });
    // three with a clear line: two side by side 10 m ahead, one 16 m behind. Without the limit all three would fire
    for (const [i, a] of [[0, 10], [1, -16], [2, 10]]) await place(game, "cop" + i, a, true);
    await game.eval(() => {
      const t = __T.TRAFFIC.filter((t) => t.cop)[2],
        h = t.yaw;
      t.wx += Math.cos(h) * 3.6;
      t.wz -= Math.sin(h) * 3.6;
    });
    const r = await game.eval(() => {
      const T = __T,
        cops = T.TRAFFIC.filter((t) => t.cop && t.e),
        rnd = Math.random;
      T.WANTED.lvl = 5;
      T.FOOT.on = true;
      T.FOOT.x = T.P.x - Math.cos(T.P.h) * 3;
      T.FOOT.z = T.P.z + Math.sin(T.P.h) * 3;
      for (const c of cops) c.shootT = 0;
      Math.random = () => 0;
      try {
        T.copCarFire(1 / 60, cops);
      } finally {
        Math.random = rnd;
        T.FOOT.on = false;
      }
      return { cops: cops.length, hp: T.HEALTH.hp };
    });
    expect(r.cops).toBe(3);
    expect(r.hp).toBe(84);
  });

  test("first-aid kits: four, each on open ground; +50 health up to 100; not taken at full health; back after 2 minutes", async ({ game }) => {
    await armedInCar(game);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        H = T.HEALTH,
        K = T.KITS,
        out = {};
      out.n = K.length;
      out.open = K.every((k) => {
        const c = T.footClear(k.x, k.z);
        return Math.hypot(c[0] - k.x, c[1] - k.z) < 0.05 && T.footGround(k.x, k.z) > 0;
      });
      const k = K[0];
      // drive over it at full health: it stays
      P.x = k.x;
      P.z = k.z;
      P.vx = P.vz = 0;
      T.driveUpdate(1 / 60);
      out.full = k.back <= 0;
      T.hurt(70);
      T.driveUpdate(1 / 60);
      out.healed = H.hp;
      out.taken = k.back > 0 && !k.G.visible;
      // away from it (standing on it, a hurt player would take it again the moment it's back)
      P.x += 40;
      for (let i = 0; i < 60 * 121; i++) T.driveUpdate(1 / 60);
      out.back = k.back <= 0 && k.G.visible;
      return out;
    });
    expect(r).toEqual({ n: 4, open: true, full: true, healed: 80, taken: true, back: true });
  });
  // Codex's review of #35
  test("FLASHES OFF: no muzzle flash from your car, a police car or an officer; damage and rounds unchanged", async ({ game }) => {
    await armedInCar(game, { police: true });
    await place(game, 0, 18);
    await place(game, "cop0", -14, true);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        G = T.GUN,
        car = T.TRAFFIC[0],
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        lit = () => G.sparks.filter((s) => s.m.visible).length,
        clear = () => G.sparks.forEach((s) => {
          s.t = 0;
          s.m.visible = false;
        }),
        rnd = Math.random,
        out = {};
      const round = () => {
        clear();
        T.driveUpdate(1 / 60);
        G.cool = 0;
        T.gunFire();
        const mine = lit();
        clear();
        T.WANTED.lvl = 4;
        cop.shootT = 0;
        cop.v = 0;
        Math.random = () => 0;
        try {
          T.copCarFire(1 / 60, [cop]);
        } finally {
          Math.random = rnd;
        }
        return { mine, police: lit(), ammo: G.ammo, carDamage: Math.round(car.damage), myDamage: Math.round(P.damage || 0) };
      };
      out.on = round();
      T.save.flash = false;
      out.off = round();
      return out;
    });
    // with flashes: the muzzle and where it lands (2), and the police car's muzzle (1)
    expect(r.on).toMatchObject({ mine: 2, police: 1, ammo: 47, carDamage: 12, myDamage: 6 });
    // without: only where your shot lands; the same damage and rounds
    expect(r.off).toMatchObject({ mine: 1, police: 0, ammo: 46, carDamage: 24, myDamage: 12 });
  });

  test("a car between you and a police car is cover: it doesn't fire through it", async ({ game }) => {
    await armedInCar(game, { police: true });
    await place(game, "cop0", 20, true);
    await place(game, 0, 10);
    const r = await game.eval(() => {
      const T = __T,
        P = T.P,
        cop = T.TRAFFIC.find((t) => t.cop && t.e),
        rnd = Math.random;
      T.WANTED.lvl = 5;
      Math.random = () => 0;
      try {
        for (let i = 0; i < 60 * 4; i++) {
          cop.v = 0;
          P.vx = P.vz = 0;
          T.copCarFire(1 / 60, [cop]);
        }
      } finally {
        Math.random = rnd;
      }
      return Math.round(P.damage || 0);
    });
    expect(r).toBe(0);
  });
});

test.describe("step 4 part 2 on a phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("the FIRE pad is there on the first drive with the pistol, in the car and on foot; gone on the boat and in a race", async ({ game, page }) => {
    await game.open();
    await game.waitState("GARAGE");
    await game.eval(() => document.getElementById("gGun").click());
    await game.driveOut();
    await expect(page.locator("#bF")).toBeVisible();
    // in a race (from the car)
    await game.eval(() => __T.openIntro(__T.EVENTS[2]));
    await game.waitState("INTRO");
    await page.locator("#iGo").tap();
    await page.waitForFunction(() => __T.ev && __T.state === "DRIVE", null, { timeout: 30000 });
    await expect(page.locator("#bF"), "in a race").toBeHidden();
    await game.eval(() => {
      __T.endEvent();
      __T.driveUpdate(1 / 60);
    });
    await expect(page.locator("#bF"), "after the race").toBeVisible();
    // on foot
    await game.eval(() => {
      __T.P.vx = __T.P.vz = 0;
    });
    await page.locator("#chFoot").tap();
    await expect(page.locator("#bF"), "on foot").toBeVisible();
    // on the boat
    await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      F.x = T.BOAT.x;
      F.z = T.PIER.z0 + 0.8;
      F.y = T.PIER.y;
      T.driveUpdate(1 / 60);
      T.boatBoard();
    });
    await expect(page.locator("#bF"), "on the boat").toBeHidden();
  });
});
