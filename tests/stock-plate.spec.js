// The stock number plate is Port Meridien's own. It read "WID 2026", White Isle Drive's plate, carried over with the
// code: a save made then gets today's stock plate when it loads, and a plate the player typed is kept.
const { test, expect } = require("./support/game");

test("an old save's stock plate becomes Port Meridien's, and a typed plate stays", async ({ game }) => {
  await game.open({ save: { v: 3, mods: { golf: { plate: "WID 2026", wing: 2 }, mini: { plate: "JO 1" } } } });
  const r = await game.eval(() => ({ stock: __T.MOD_STOCK.plate, golf: __T.modsOf("golf"), mini: __T.modsOf("mini").plate }));
  expect(r.stock).toBe("PM 2026");
  expect(r.golf.plate, "the old stock plate is replaced").toBe("PM 2026");
  expect(r.golf.wing, "the rest of that car's customisation is kept").toBe(2);
  expect(r.mini).toBe("JO 1");
  expect(game.errors).toEqual([]);
});
