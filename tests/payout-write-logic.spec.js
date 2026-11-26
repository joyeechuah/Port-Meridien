// A one-time prize goes into the same save write as the mark that it has been paid (Codex's review of cd5bbf9). With
// the mark in one write and the credits in the next, a refused second write lost the prize for good: on reload the
// cup counted as won, or the passport as complete, so it never paid again.
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  vm = require("node:vm");
function part(file, from, to) {
  const s = fs.readFileSync(require.resolve("../js/" + file + ".js"), "utf8"),
    a = s.indexOf(from),
    b = s.indexOf(to, a);
  if (a < 0 || b < 0) throw Error(from);
  return s.slice(a, b);
}
const earn = () => part("play", "function earn(cr)", "\n");

test("the first save written after winning a cup holds the cup prize", () => {
  const save = { cr: 0, xp: 0, rec: {}, champ: { A: { r: 2, pts: [10, 10], won: false } } };
  let stored;
  const g = {
    save,
    ev: { E: { id: "test", type: "trial", rewards: [300, 200, 100, 0] }, cup: { cls: "A", round: 2 }, tg: { gold: 20, silver: 30, bronze: 40 } },
    cupOf: () => ({ prize: 5000 }), champOf: () => save.champ.A, cupTotal: (c) => c.pts.reduce((a, b) => a + b, 0), CUP_PTS: [10, 6, 4, 3], CUP_WIN: 22,
    fmtCr: String, fmtT: String, toast() {}, needsRace() {}, lvlOf: () => 0, updateMoney() {},
    persist() { if (!stored) stored = JSON.parse(JSON.stringify(save)); },
    $: () => ({ classList: { remove() {} } }), beep() {}, locked: false,
  };
  vm.runInNewContext(part("progress", "function cupScore(", "// ---- the championships") + earn() + "\n" + part("play", "function finishEvent(", "function showResult(") + ";finishEvent(10)", g);
  expect(stored.champ.A.won).toBe(true);
  expect(stored.cr).toBe(5300);
});

test("the first save written after the last landmark holds the passport bonus", () => {
  const save = { cr: 0, xp: 0, found: {}, passBonus: false };
  let first;
  const g = {
    save, LANDMARKS: [{ id: "pier" }], foundCount: () => 1, wantEvent() {}, LANDMARK_REWARD: 500, PASSPORT_BONUS: 5000, skillFactor: () => 1,
    lvlOf: () => 0, updateMoney() {}, persist() { if (!first) first = JSON.parse(JSON.stringify(save)); }, fmtCr: String, toast() {},
    $: () => ({ classList: { contains: () => true } }),
  };
  vm.runInNewContext(earn() + "\n" + part("progress", "function discoverLandmark(", "\n}") + "\n};discoverLandmark({id:\"pier\",name:\"Pier\"})", g);
  expect(first.passBonus).toBe(true);
  expect(first.cr).toBe(5500);
});
