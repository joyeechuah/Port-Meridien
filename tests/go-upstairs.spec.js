// GO UPSTAIRS on the garage screen (js/screens.js goUpstairs): straight into your room on foot, at the top of the
// stairs, with the car you chose out on the drive to get into later. U on the keyboard, LB on a controller.
const { test, expect } = require("./support/game");

test("GO UPSTAIRS puts you on foot in the room, the chosen car out on the drive", async ({ game, page }) => {
  await game.open();
  await game.waitState("GARAGE");
  await expect(page.locator("#gUp")).toBeVisible();
  const chosen = await game.eval(() => { __T.gPick(1); return __T.save.owned[1]; });
  await page.locator("#gUp").click();
  const r = await game.eval(() => {
    const T = __T, l = T.houseLocal(T.FOOT.x, T.FOOT.z), c = T.houseLocal(T.P.x, T.P.z);
    return { state: T.state, foot: T.FOOT.on, up: +(T.FOOT.y - T.gY).toFixed(2), inRoom: l.x > 0.5 && l.x < 21.5 && l.z > 19 && l.z < 30, car: T.curId, carOut: c.z < -5, home: T.homeOnFoot() };
  });
  expect(r).toEqual({ state: "DRIVE", foot: true, up: 5.25, inRoom: true, car: chosen, carOut: true, home: true });
  // walking about works from there, and the walker doesn't fall through the floor
  await game.eval(() => { for (let i = 0; i < 30; i++) __T.driveUpdate(1 / 60); });
  expect(await game.eval(() => +(__T.FOOT.y - __T.gY).toFixed(2))).toBe(5.25);
});

test("U goes upstairs from the garage screen, and a party at home carries on there", async ({ game }) => {
  await game.open();
  await game.waitState("GARAGE");
  await game.eval(() => {
    const T = __T, p = T.PEOPLE[0];
    T.relSet(p.id, 80, 3);
    T.PARTY.ids = [p.id];
    T.partyStart();
  });
  await game.key("u");
  const r = await game.eval(() => ({ state: __T.state, foot: __T.FOOT.on, party: __T.PARTY.active }));
  expect(r).toEqual({ state: "DRIVE", foot: true, party: true });
});
