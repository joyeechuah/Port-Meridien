// On a computer, the key that fires the pistol (G) was only in the README: the keys along the bottom of the screen
// didn't list it, so on a laptop there seemed to be no way to shoot (Jo Yee, 21 Nov). Now, whenever the pistol can
// fire, the key bar ends with "G fire" and the pistol pill says "G TO FIRE"; the driving keys also list F to get out.
// Not in a race or without the pistol, and on a phone the FIRE pad says it instead.
const { test, expect } = require("./support/game");

const look = (game) =>
  game.eval(() => new Promise((r) => setTimeout(() => r({
    keys: document.getElementById("keys").textContent.replace(/\s+/g, " ").trim(),
    pill: document.getElementById("gunTxt").textContent,
    pad: !document.getElementById("bF").classList.contains("hide"),
  }), 250)));

test("on a computer, the key bar and the pistol pill say G fires, whenever it can", async ({ game }) => {
  await game.open();
  await game.waitState("GARAGE");
  await game.eval(() => document.getElementById("gGun").click());
  await game.driveOut();
  let r = await look(game);
  expect(r.keys).toContain("F get out");
  expect(r.keys).toContain("G fire");
  expect(r.pill).toBe("PISTOL 48 · G TO FIRE");
  // in a race the pistol can't fire, so neither says it
  await game.eval(() => __T.startEvent(__T.EVENTS[0]));
  r = await look(game);
  expect(r.keys).not.toContain("G fire");
  expect(r.pill).toBe("PISTOL 48");
  await game.eval(() => __T.endEvent());
  // on foot: the walking keys, and G again
  await game.park();
  await game.key("f");
  r = await look(game);
  expect(r.keys).toContain("walk / back");
  expect(r.keys).toContain("G fire");
  expect(r.pill).toBe("PISTOL 48 · G TO FIRE");
  // back in the car, the driving keys
  await game.key("f");
  await game.waitState("DRIVE");
  r = await look(game);
  expect(r.keys).toContain("gas / brake");
  expect(r.keys).toContain("G fire");
});

test("without the pistol, the key bar lists F to get out and no fire key", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await look(game);
  expect(r.keys).toContain("F get out");
  expect(r.keys).not.toContain("fire");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 392, height: 731 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  test("on a phone the FIRE pad shows, and the pill names no key", async ({ game }) => {
    await game.open();
    await game.waitState("GARAGE");
    await game.eval(() => document.getElementById("gGun").click());
    await game.driveOut();
    const r = await look(game);
    expect(r.pad).toBe(true);
    expect(r.pill).toBe("PISTOL 48");
  });
});
