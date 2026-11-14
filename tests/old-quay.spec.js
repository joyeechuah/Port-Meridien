// Old Quay, the port town: six built blocks between streets that did not move. The streets and their pavements stay
// clear, the ways into the market and the garden are open, and what looks solid is solid.
const { test, expect } = require("./support/game");

// in free ride with traffic and the player's car out of the way, so only the town's own obstacles are felt
async function town(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.wx = t.wz = 1e6;
    }
    T.P.x = 300;
    T.P.z = 600;
  });
}
// how far a walker standing at (x,z) is pushed by whatever is there: 0 in the open
const PUSH = `(x, z) => { const c = __T.footClear(x, z); return Math.hypot(c[0] - x, c[1] - z); }`;

test.describe("Old Quay", () => {
  test("nothing built stands on a town street or its pavement", async ({ game }) => {
    await town(game);
    const r = await game.eval((PUSH) => {
      const T = __T,
        push = eval(PUSH);
      let n = 0,
        worst = { d: 0 };
      for (const e of T.EDGES) {
        if (e.type !== "town") continue;
        for (let s = 1; s < e.len - 1; s += 3) {
          const p = T.edgePos(e, s);
          // across the carriageway (5.2 m each side) and the pavement (2.8 m more), to within a step of the 9 m line
          for (let o = -8.6; o <= 8.6; o += 1.72) {
            const x = p.x - p.dz * o,
              z = p.z + p.dx * o,
              d = push(x, z);
            n++;
            if (d > worst.d) worst = { d: +d.toFixed(2), x: +x.toFixed(1), z: +z.toFixed(1), o: +o.toFixed(1) };
          }
        }
      }
      return { n, worst };
    }, PUSH);
    expect(r.n).toBeGreaterThan(5000);
    // a lamp post or a palm on the pavement nudges a walker aside by under a metre; a building would push much further
    expect(r.worst.d, JSON.stringify(r.worst)).toBeLessThan(0.9);
  });

  test("the market, the garden and the square can be walked into; the tower, the fountain and the hall are solid", async ({ game }) => {
    await town(game);
    const r = await game.eval((PUSH) => {
      const T = __T,
        Q = T.QUAY,
        push = eval(PUSH),
        line = (x0, z0, x1, z1) => {
          let m = 0;
          for (let k = 0; k <= 40; k++) m = Math.max(m, push(x0 + ((x1 - x0) * k) / 40, z0 + ((z1 - z0) * k) / 40));
          return +m.toFixed(2);
        };
      return {
        houses: Q.houses,
        sheds: Q.sheds.length,
        // from each street, through its way in, to just short of the clock tower
        west: line(622, -41, Q.tower[0] - 4, -41),
        east: line(688, -41, Q.tower[0] + 4, -41),
        // the arch on the avenue, into the south end of the market yard
        arch: line(655, 36, 655, 16),
        // the garden's way in from the south street, up the path
        garden: line(590, 188, 590, 70),
        // across the square from one street to the other, north of the fountain
        square: line(622, 115.5, 688, 115.5),
        // a lane between two workshops, street to street
        lane: line(692, Q.sheds[0][1] + Q.sheds[0][3] / 2 + 4.5, 758, Q.sheds[0][1] + Q.sheds[0][3] / 2 + 4.5),
        tower: push(Q.tower[0], Q.tower[1] + 0.5),
        fountain: push(Q.fountain[0] + 1, Q.fountain[1]),
        hall: push(Q.hall[0] + 3, Q.hall[1]),
        shed: push(Q.sheds[2][0] + 2, Q.sheds[2][1]),
        ground: [Q.tower, Q.fountain, [590, 114]].map(([x, z]) => T.footGround(x, z) > 0),
      };
    }, PUSH);
    expect(r.houses).toBeGreaterThan(80);
    expect(r.sheds).toBe(4);
    for (const k of ["west", "east", "arch", "garden", "square", "lane"]) expect(r[k], "the way through: " + k).toBe(0);
    for (const k of ["tower", "fountain", "hall", "shed"]) expect(r[k], k + " is solid").toBeGreaterThan(1);
    expect(r.ground).toEqual([true, true, true]);
  });

  test("you can walk from the street through the market's west entrance to the clock tower", async ({ game }) => {
    await town(game);
    // the car is parked on the west street beside the entrance; get out and walk east
    await game.eval(() => {
      const T = __T,
        P = T.P;
      P.x = 617.6;
      P.z = -41;
      P.h = 0;
      P.vx = P.vz = 0;
      T.driveUpdate(1 / 60);
    });
    await game.key("f");
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT;
      F.x = 626;
      F.z = -41;
      F.h = Math.PI / 2;
      T.keys.w = true;
      for (let i = 0; i < 60 * 14; i++) T.driveUpdate(1 / 60);
      T.keys.w = false;
      return { on: F.on, x: F.x, z: F.z, tower: T.QUAY.tower };
    });
    expect(r.on).toBe(true);
    // stopped by the tower's base, having crossed the yard
    expect(r.x).toBeGreaterThan(r.tower[0] - 4);
    expect(r.x).toBeLessThan(r.tower[0]);
    expect(Math.abs(r.z - -41)).toBeLessThan(1.5);
  });
});
