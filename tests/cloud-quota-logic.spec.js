// js/screens.js clUpload and clReconcile with js/core.js persist, on their own, with an account and a browser whose
// storage refuses the game's save but takes the account's small note (Codex's review of #109): a backup of progress
// the browser wouldn't store must not be undone by the older save it still holds, on the next start
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
const read = (f) => fs.readFileSync(require.resolve("../js/" + f + ".js"), "utf8");
const part = (f, a, b) => { const s = read(f), i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw Error("Missing " + a); return s.slice(i, j); };
function device(stored, meta, room) {
  const store = { game: JSON.stringify(stored), meta: JSON.stringify(meta) }, account = { doc: null }, applied = [];
  const g = {
    save: JSON.parse(store.game), store, account, applied, room, tabIdle: false, SAVE_KEY: "game", CLOUD_KEY: "meta", saveWarned: false, Date,
    localStorage: { getItem: (k) => store[k] ?? null, setItem(k, v) { if (k === "game" && !g.room) throw new Error("QuotaExceededError"); store[k] = v; } },
    CL: { user: { uid: "u1" }, meta: JSON.parse(store.meta), ad: { put: async (uid, data, rev) => { account.doc = { ...data, rev: rev + 1 }; return { ok: true, rev: rev + 1 }; } } },
    clChanged() {}, clRender() {}, clSet() {}, clOwn() {}, clPickShow() {}, clSummary: () => ({}), clAt: () => 0, clFresh: () => false,
    clForUser: (u, f) => f(), clPayload: (s) => { const o = { ...s }; delete o.ghost; return o; }, clCanon: JSON.stringify, clHash: (x) => x,
    clProg: (s) => "cr" + s.cr, needsKey: () => "", clOff: () => false, clErr: String, photoDayClean: (d) => d || { day: 0, count: 0 },
    clWork() {}, clNeeds() {}, clApply: (doc, cloud) => applied.push(cloud.cr),
  };
  vm.createContext(g);
  for (const code of [part("core", "function persist()", "const paintOf"), part("screens", "function clSaveMeta()", "\n"),
    part("screens", "function clUpload(", "// a backup after"), part("screens", "function clReconcile(", "// With the same completed")])
    vm.runInContext(code, g);
  return g;
}
const reload = (g) => device(JSON.parse(g.store.game), JSON.parse(g.store.meta), g.room);
test("a backup of progress the browser wouldn't store brings the account's copy back on the next start", async () => {
  const g = device({ v: 3, cr: 200, owned: ["golf"], ghost: {} }, { rev: 4, prog: "cr200", disk: "cr200" }, false);
  g.save.cr = 900;
  vm.runInContext("persist()", g);
  expect(vm.runInContext("SAVE.ok", g)).toBe(false);
  await vm.runInContext("clUpload(4)", g);
  expect([JSON.parse(g.account.doc.save).cr, JSON.parse(g.store.game).cr]).toEqual([900, 200]);
  expect(JSON.parse(g.store.meta)).toMatchObject({ rev: 5, prog: "cr900", disk: "cr200" });
  // the next start: the older save, at the account's revision. It used to go up over the 900
  const next = reload(g);
  next.account.doc = g.account.doc;
  await vm.runInContext("clReconcile(" + JSON.stringify(g.account.doc) + ")", next);
  expect(next.applied).toEqual([900]);
  expect(next.account.doc && JSON.parse(next.account.doc.save).cr).toBe(900);
});
test("a save that moved on after its backup still goes up; one stored with its backup is in step", async () => {
  const g = device({ v: 3, cr: 200, owned: ["golf"], ghost: {} }, { rev: 4, prog: "cr200", disk: "cr200" }, true);
  g.save.cr = 900;
  vm.runInContext("persist()", g);
  await vm.runInContext("clUpload(4)", g);
  expect(JSON.parse(g.store.meta)).toMatchObject({ rev: 5, prog: "cr900", disk: "cr900" });
  // more progress, stored here, before the next backup
  g.save.cr = 950;
  vm.runInContext("persist()", g);
  const next = reload(g);
  await vm.runInContext("clReconcile(" + JSON.stringify(g.account.doc) + ")", next);
  expect([next.applied, JSON.parse(next.account.doc.save).cr]).toEqual([[], 950]);
});
