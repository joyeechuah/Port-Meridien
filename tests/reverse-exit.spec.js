// Regression for GET OUT accepted while reversing, with the reverse control still held.
const { test, expect } = require("./support/game");
test("GET OUT takes over the reverse pedal and brings the car to rest", async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.park();
  const result = await game.eval(() => {
    const T = __T, p = T.P;
    p.vx = -8 * Math.sin(p.h);
    p.vz = -8 * Math.cos(p.h);
    T.keys.s = true;
    T.footExit();
    const requested = T.FOOT.stop > 0;
    for (let i = 0; i < 300 && !T.FOOT.on; i++) T.driveUpdate(1 / 60);
    T.keys.s = false;
    return { requested, out: T.FOOT.on };
  });
  expect(result).toEqual({ requested: true, out: true });
});
