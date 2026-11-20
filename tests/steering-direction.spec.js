// Right is right everywhere: in the car, on foot and on the boat, steering right takes you to the right of where
// you were heading, as the camera shows it. On foot and on the boat it was the wrong way round (a phone recording
// of 15 Nov 2026: the right pad turned the walker and the boat left).
const { test, expect } = require("./support/game");

// which side of its starting line something has gone: + is right as seen from behind it (the camera's view)
// the change of heading, the short way round
const TURN = `(a, b) => { const d = b - a; return Math.sign(Math.atan2(Math.sin(d), Math.cos(d))); }`;
const SIDE = `(x0, z0, h0, x, z) => { const cf = __T.camera; void cf; return (x - x0) * -Math.cos(h0) + (z - z0) * Math.sin(h0); }`;

test.describe("steering direction", () => {
  test("in the car, on foot and on the boat, D and the right pad go right; the camera agrees", async ({ game }) => {
    await game.open();
    await game.driveOut();
    await game.park();
    const r = await game.eval((S) => {
      const [SIDE, TURN] = S.split("\u0000");
      const T = __T,
        P = T.P,
        side = eval(SIDE),
        out = {};
      for (const t of T.TRAFFIC) {
        t.e = null;
        t.lost = false;
        t.wx = t.wz = 1e6;
      }
      // the camera's right, from behind the car: the screen's right edge points this way in the world
      T.driveUpdate(1 / 60);
      const cam = T.camera,
        right = new cam.position.constructor(1, 0, 0).applyQuaternion(cam.quaternion);
      out.camRight = +(right.x * -Math.cos(P.h) + right.z * Math.sin(P.h)).toFixed(2);
      // the car: on the gas and steering right for 2 s
      const c0 = [P.x, P.z, P.h];
      for (let i = 0; i < 120; i++) {
        T.keys.w = true;
        T.keys.d = true;
        T.driveUpdate(1 / 60);
      }
      T.keys.w = T.keys.d = false;
      out.car = Math.sign(side(c0[0], c0[1], c0[2], P.x, P.z));
      out.carH = eval(TURN)(c0[2], P.h);
      return out;
    }, SIDE + "\u0000" + TURN);
    expect(r.camRight).toBeGreaterThan(0.9);
    expect(r.car).toBe(1);
    // on foot: from a stop, walking and turning right
    await game.eval(() => {
      const T = __T,
        P = T.P;
      P.vx = P.vz = 0;
      for (let i = 0; i < 60; i++) T.driveUpdate(1 / 60);
    });
    await game.key("f");
    const f = await game.eval((S) => {
      const [SIDE, TURN] = S.split("\u0000");
      const T = __T,
        F = T.FOOT,
        side = eval(SIDE),
        f0 = [F.x, F.z, F.h];
      // half a second: a walker turns 2.5 rad/s, and a full half turn would read as the other way round
      for (let i = 0; i < 30; i++) {
        T.keys.w = true;
        T.keys.d = true;
        T.driveUpdate(1 / 60);
      }
      T.keys.w = T.keys.d = false;
      return { on: F.on, side: Math.sign(side(f0[0], f0[1], f0[2], F.x, F.z)), h: eval(TURN)(f0[2], F.h) };
    }, SIDE + "\u0000" + TURN);
    expect(f).toEqual({ on: true, side: 1, h: r.carH });
    // on the boat, under way, steering right
    const b = await game.eval((S) => {
      const [SIDE, TURN] = S.split("\u0000");
      const T = __T,
        B = T.BOAT,
        F = T.FOOT,
        side = eval(SIDE);
      F.x = B.x;
      F.z = T.PIER.z0 + 0.8;
      F.y = T.PIER.y;
      T.driveUpdate(1 / 60);
      T.boatBoard();
      for (let i = 0; i < 120; i++) {
        T.keys.w = true;
        T.driveUpdate(1 / 60);
      }
      const b0 = [B.x, B.z, B.h];
      for (let i = 0; i < 120; i++) {
        T.keys.w = true;
        T.keys.d = true;
        T.driveUpdate(1 / 60);
      }
      T.keys.w = T.keys.d = false;
      return { on: B.on, side: Math.sign(side(b0[0], b0[1], b0[2], B.x, B.z)), h: eval(TURN)(b0[2], B.h) };
    }, SIDE + "\u0000" + TURN);
    expect(b).toEqual({ on: true, side: 1, h: r.carH });
  });
});

test.describe("phone, portrait", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("the minimap moves down when the damage pill appears, and never covers the place and the clock", async ({ game, page }) => {
    await game.open();
    await game.driveOut();
    // the test drive time sits under the minimap (shown here just to measure it); the streak score sits in the column
    // under the speedometer, clear of the minimap wherever that goes
    const gap = () =>
      game.eval(() => {
        const td = document.getElementById("tdPill"), was = td.classList.contains("hide");
        td.classList.remove("hide");
        const loc = document.querySelector("#tl .loc").getBoundingClientRect(),
          mm = document.getElementById("mini").getBoundingClientRect(),   // the round map itself, not its wrapper (ChatGPT's review)
          tp = td.getBoundingClientRect(),
          st = document.getElementById("streak").getBoundingClientRect();
        td.classList.toggle("hide", was);
        const clear = st.left >= mm.right || st.top >= mm.bottom || st.bottom <= mm.top;
        return { gap: Math.round(mm.top - loc.bottom), below: Math.round(tp.top - mm.bottom), clear };
      });
    const before = await gap();
    expect(before.gap).toBeGreaterThanOrEqual(0);
    await game.eval(() => {
      __T.P.damage = 40;
      document.getElementById("damageHud").classList.remove("hide");
    });
    await game.frames(3);
    const after = await gap();
    expect(after.gap, "minimap below the place and clock").toBeGreaterThanOrEqual(0);
    // and what sits under the minimap moved with it, and the streak score stayed clear of it
    expect(after.below).toBe(before.below);
    expect(before.clear && after.clear, "the streak score clear of the minimap").toBe(true);
    await page.screenshot({ path: test.info().outputPath("portrait-damage.png") });
  });
});
