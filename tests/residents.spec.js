// Old Quay has fewer places for people than the sixteen who live there (js/people.js pedRotate): each time you leave,
// everyone but a friend with you makes way for the next residents in turn, so all sixteen can be met on a phone (six
// places) as on a computer (ten), each looking as they always do; a friend riding with you stays who they are
const { test, expect } = require("./support/game");

async function visits(game, n) {
  return game.eval((n) => {
    const T = __T, seen = new Set(), per = [];
    for (let v = 0; v < n; v++) {
      // into Old Quay, and away again
      T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
      const here = T.PEDS.map((p) => T.personOf(p).id);
      per.push(here);
      for (const id of here) seen.add(id);
      T.P.x = -600; T.P.z = 0; T.driveUpdate(1 / 60);
    }
    // each place shows its resident's own clothes and height
    const looks = T.PEDS.every((p) => p.m.G.children[0].geometry === T.pedLook(p.pid).body && Math.abs(p.m.G.scale.y - (0.94 + T.rnd(p.pid, 38) * 0.12)) < 1e-9);
    return { seen: [...seen].sort((a, b) => a - b), per, looks, places: T.PEDS.length };
  }, n);
}
for (const [name, touch] of [["a computer", false], ["a phone", true]])
  test.describe(name, () => {
    if (touch) test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    test(`on ${name} all sixteen residents come round as you come and go, none twice at once`, async ({ game }) => {
      await game.open();
      await game.driveOut();
      const r = await visits(game, 4);
      expect(r.places).toBe(touch ? 6 : 10);
      expect(r.seen).toEqual(Array.from({ length: 16 }, (_, i) => i));
      for (const here of r.per) expect(new Set(here).size).toBe(here.length);
      expect(r.looks).toBe(true);
    });
  });

test("a friend riding with you stays who they are when you leave town; the others change", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T;
    T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
    const friend = T.PEDS[0], who = T.personOf(friend).id, others = T.PEDS.slice(1).map((p) => T.personOf(p).id);
    // with you (js/life.js RIDE) as the town's people make way (as on leaving town)
    T.RIDE.p = friend;
    T.pedRotate();
    const after = { friend: T.personOf(friend).id, others: T.PEDS.slice(1).map((p) => T.personOf(p).id) };
    T.RIDE.p = null;
    return { who, others, after };
  });
  expect(r.after.friend).toBe(r.who);
  expect(r.after.others.some((id, i) => id !== r.others[i])).toBe(true);
  expect(r.after.others).not.toContain(r.who);
});
