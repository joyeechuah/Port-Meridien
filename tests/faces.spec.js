// Faces: painted on the head, with eyes that have whites, an iris and a pupil, and an occasional blink (built from
// tiny shapes, the walker read as a mannequin: Jo Yee, 19 Nov). The walker, the people in town and the officer.
const { test, expect } = require("./support/game");

test("the walker's eyes are open, blink within 7 s, and open again", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T, F = T.FOOT.m.face;
    T.P.vx = T.P.vz = 0;
    T.footExit();
    const openAtFirst = F.m.map === F.tex.open;
    let shutFor = 0, longest = 0, blinks = 0, was = false;
    for (let i = 0; i < 7 * 60; i++) {
      T.driveUpdate(1 / 60);
      const shut = F.m.map === F.tex.closed;
      if (shut) { shutFor += 1 / 60; longest = Math.max(longest, shutFor); if (!was) blinks++; } else shutFor = 0;
      was = shut;
    }
    return { openAtFirst, blinks, longest: +longest.toFixed(2), openAtEnd: F.m.map === F.tex.open || shutFor < 0.2, painted: !!F.tex.open.image && F.tex.open.image.width >= 256 };
  });
  expect(r.openAtFirst).toBe(true);
  expect(r.painted).toBe(true);
  expect(r.blinks, "blinks in 7 s").toBeGreaterThanOrEqual(1);
  expect(r.longest, "longest blink, seconds").toBeLessThan(0.25);
  expect(r.openAtEnd).toBe(true);
});

test("the people in town and the officer have painted faces of their own; the textures are shared, a handful in all", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T, faces = T.PEDS.map((p) => p.m.face), off = T.OFFICER.m && T.OFFICER.m.face;
    return {
      people: T.PEDS.length,
      withFace: faces.filter((f) => f && f.m.map === f.tex.open).length,
      ownMaterial: new Set(faces.map((f) => f.m)).size,
      looks: new Set(faces.map((f) => f.tex.open)).size,
      officer: !!off,
      textures: T.FACES.size,
    };
  });
  expect(r.withFace).toBe(r.people);
  // each person blinks on their own, so each has a material; the pictures are shared between people who look alike
  expect(r.ownMaterial).toBe(r.people);
  expect(r.looks, "different faces among the people in town").toBeGreaterThan(1);
  expect(r.officer).toBe(true);
  expect(r.textures, "face textures made").toBeLessThanOrEqual(12);
});
