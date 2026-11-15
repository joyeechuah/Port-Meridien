// Back on the road (R, or after the sea) never sets you down on a traffic car. It did about one time in three in
// the sea test, and the collision shot the car off at up to 8,000 km/h.
const { test, expect } = require("./support/game");

test("a traffic car standing where you are put back on the road is moved away first", async ({ game }) => {
  await game.open();
  await game.driveOut();
  // where the sea at (0, 1070) puts you back: find it once, then park a traffic car right there
  const spot = await game.eval(() => {
    const nr = __T.nearestRoadGlobal(0, 1070, true);
    return { x: nr.x, z: nr.z, e: __T.EDGES.indexOf(nr.e), s: nr.s };
  });
  const r = await game.eval((spot) => {
    const T = __T,
      P = T.P,
      t = T.TRAFFIC[0],
      e = T.EDGES[spot.e],
      q = T.edgePos(e, spot.s);
    Object.assign(t, { e, s: spot.s, dir: 1, lost: false, lane: 0, v: 0, stopT: 1e6 });
    t.wx = q.x;
    t.wz = q.z;
    t.yaw = Math.atan2(q.dx, q.dz);
    P.x = 0;
    P.z = 1070;
    P.vx = P.vz = 0;
    return true;
  }, spot);
  expect(r).toBe(true);
  await game.key("r");
  await game.waitState("FADE");
  await game.waitState("DRIVE");
  await game.steps(30, {});
  const after = await game.eval(() => {
    const T = __T,
      P = T.P;
    let near = 1e9;
    for (const t of T.TRAFFIC) if (t.e) near = Math.min(near, Math.hypot(t.wx - P.x, t.wz - P.z));
    return { kph: Math.hypot(P.vx, P.vz) * 3.6, near, onRoad: T.nearestRoad(P.x, P.z, 10).d < 3 };
  });
  expect(after.onRoad).toBe(true);
  expect(after.kph).toBeLessThan(1);
  expect(after.near).toBeGreaterThan(8);
});
