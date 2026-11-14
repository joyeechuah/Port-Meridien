// What you hear and read while out of the car: the parked car is silent, the boat has a motor, and the district
// name and the clock keep up with the walker and the boat (they used to freeze at the moment you got out).
const { test, expect } = require("./support/game");

// records the level each sound layer was last told to reach (headless audio never plays, so the values are read
// from the instructions, not from the speakers)
const spy = (game) =>
  game.eval(() => {
    const T = __T;
    window.__snd = {};
    for (const k of ["eg", "rg", "sg", "cg", "scg"]) {
      const g = T.AU[k].gain,
        f = g.setTargetAtTime.bind(g);
      g.setTargetAtTime = (v, t, c) => {
        window.__snd[k] = v;
        return f(v, t, c);
      };
    }
  });
const snd = (game) => game.eval(() => ({ ...window.__snd }));

async function shore(game) {
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
  expect(await game.eval(() => !!__T.AU), "sound is set up").toBe(true);
  await spy(game);
}
const aboard = (game) =>
  game.eval(() => {
    const T = __T,
      F = T.FOOT;
    F.x = T.BOAT.x;
    F.z = T.PIER.z0 + 0.8;
    F.y = T.PIER.y;
    T.driveUpdate(1 / 60);
    return T.boatBoard();
  });

test.describe("sound and HUD out of the car", () => {
  test("the car you get out of falls silent, and sounds again when you get back in", async ({ game }) => {
    await shore(game);
    await game.steps(5, {});
    expect((await snd(game)).eg, "engine idling in the car").toBeGreaterThan(0.01);
    await game.key("f");
    await game.steps(5, {});
    expect(await snd(game)).toEqual({ eg: 0, rg: 0, sg: 0, cg: 0, scg: 0 });
    await game.key("f");
    await game.steps(5, {});
    expect((await snd(game)).eg).toBeGreaterThan(0.01);
  });

  test("the boat's motor idles at the mooring, rises with speed, and the hull washes through the water", async ({ game }) => {
    await shore(game);
    await game.key("f");
    expect(await aboard(game)).toBe(true);
    await game.steps(5, {});
    const idle = await snd(game);
    expect(idle.eg).toBeGreaterThan(0.005);
    expect(idle.rg).toBe(0);
    // straight ahead from the mooring, out to sea
    await game.steps(300, { w: true });
    const fast = await snd(game);
    expect(await game.eval(() => __T.BOAT.v)).toBeGreaterThan(8);
    expect(fast.eg).toBeGreaterThan(idle.eg * 1.4);
    expect(fast.rg).toBeGreaterThan(0.05);
    expect(fast.scg).toBe(0);
  });

  test("the district name follows the walker, and the clock keeps time on foot and at sea", async ({ game }) => {
    await shore(game);
    await game.key("f");
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        zone = () => document.getElementById("zone").textContent,
        clock = () => document.getElementById("clock").textContent,
        out = {};
      T.driveUpdate(0.5);
      out.z0 = zone();
      // the walker is set down in another district (the car stays put)
      F.x = 430;
      F.z = -400;
      F.y = T.footGround(430, -400);
      T.save.tod = 15.5;
      T.driveUpdate(0.5);
      out.z1 = zone();
      out.want1 = T.zoneAt(430, -400);
      out.c1 = clock();
      return out;
    });
    expect(r.z1).toBe(r.want1);
    expect(r.z1).not.toBe(r.z0);
    expect(r.c1).toMatch(/^15:3\d$/);
    // at sea
    await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      F.x = T.BOAT.x;
      F.z = T.PIER.z0 + 0.8;
      F.y = T.PIER.y;
      T.driveUpdate(1 / 60);
      T.boatBoard();
      T.save.tod = 18.25;
      T.driveUpdate(0.5);
    });
    expect(await game.eval(() => document.getElementById("clock").textContent)).toMatch(/^18:1\d$/);
  });
});
