// An officer up in the room checks cover at their own height before firing (js/people.js copOfficer, gunClear's y), as
// the pistol does: the aquarium under the room's back half used to count as a wall between two people standing above it.
const { test, expect } = require("./support/game");

test("up in the room, the aquarium below is no cover between an officer and you", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const o = gW(10, 24), me = gW(10, 29.3), up = gY + 5.25;
    return { ground: gunClear(o.x, o.z, me.x, me.z, 0.6), upstairs: gunClear(o.x, o.z, me.x, me.z, 0.6, up) };
  });
  expect(r).toEqual({ ground: false, upstairs: true });
});
