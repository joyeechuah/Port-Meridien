// js/screens.js clUpload and clReconcile with js/core.js persist and saveWrite, on their own, with an account and a
// browser whose storage can refuse the game's save while taking the account's small note (Codex's reviews of #109 and
// #113): a backup of progress the browser wouldn't store must not be undone by the older save it still holds on the
// next start, whatever loading tidies in that save; and a newer save written here (even one that has come back to an
// earlier state) still goes up
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
const read = (f) => fs.readFileSync(require.resolve("../js/" + f + ".js"), "utf8");
const part = (f, a, b) => { const s = read(f), i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw Error("Missing " + a); return s.slice(i, j); };
// what the progress check sees here: the credits, the wall and how many race records there are
const prog = (s) => JSON.stringify([s.cr, s.wall || "plaster", Object.keys(s.rec || {}).length]);
// js/progress.js saveTrim's effect on old records: at most 64 of them
const trim = (s) => { const keys = Object.keys(s.rec || {}); for (const k of keys.slice(64)) delete s.rec[k]; };
// a start of the game: the stored save read and tidied, then the account compared with it
function boot(store, room, account) {
  const applied = [], chosen = [];
  const g = {
    store, account, applied, chosen, room, tabIdle: false, SAVE_KEY: "game", CLOUD_KEY: "meta", saveWarned: false, Date, saveRaw: store.game ?? null,
    localStorage: { getItem: (k) => store[k] ?? null, setItem(k, v) { if (k === "game" && !g.room) throw new Error("QuotaExceededError"); store[k] = v; } },
    CL: { user: { uid: "u1" }, meta: JSON.parse(store.meta || "{}"), ad: { put: async (uid, data, rev) => { account.doc = { ...data, rev: rev + 1 }; return { ok: true, rev: rev + 1 }; } } },
    clChanged() {}, clRender() {}, clSet: (st) => { if (st === "conflict") chosen.push("asked"); }, clOwn() {}, clPickShow() {}, clSummary: () => ({}), clAt: () => 0, clFresh: () => false,
    clForUser: (u, f) => f(), clPayload: (s) => { const o = { ...s }; delete o.ghost; delete o.gen; return o; }, clCanon: JSON.stringify, clHash: (x) => x,
    clProg: prog, needsKey: () => "", clOff: () => false, clErr: String, photoDayClean: (d) => d || { day: 0, count: 0 },
    clWork() {}, clNeeds() {}, clApply: (doc, cloud) => applied.push(cloud.wall || cloud.cr),
  };
  const s = JSON.parse(store.game);
  g.save = Object.assign({ gen: 0 }, s);
  g.save.gen = Number.isSafeInteger(g.save.gen) && g.save.gen > 0 ? g.save.gen : 0;
  trim(g.save);
  vm.createContext(g);
  for (const code of [part("core", "function persist()", "const paintOf"), part("screens", "function clSaveMeta()", "\n"),
    part("screens", "function clUpload(", "// a backup after"), part("screens", "function clReconcile(", "// With the same completed")])
    vm.runInContext(code, g);
  vm.runInContext("SAVE.bootProg=clProg(save)", g);
  return g;
}
const run = (g, s) => vm.runInContext(s, g);
// the account's copy of the save
const acct = (account) => JSON.parse(account.doc.save);
const synced = (stored) => ({ game: JSON.stringify(stored), meta: JSON.stringify({ rev: 4, prog: prog(stored), disk: prog(stored), diskGen: stored.gen || 0 }) });
// the last start's backup: storage refuses the game's save, the wall goes sage, and the backup goes up
async function backedUpWhileFull(stored) {
  const store = synced(stored), account = { doc: null }, g = boot(store, false, account);
  g.save.wall = "sage";
  run(g, "persist()");
  expect(run(g, "SAVE.ok")).toBe(false);
  await run(g, "clUpload(4)");
  expect(acct(account).wall).toBe("sage");
  return { store, account, g };
}

test("a backup of progress the browser wouldn't store brings the account's copy back on the next start", async () => {
  const { store, account } = await backedUpWhileFull({ v: 3, cr: 200, gen: 3, owned: ["golf"], ghost: {} });
  expect(JSON.parse(store.meta)).toMatchObject({ rev: 5, diskGen: 3 });
  const next = boot(store, false, account);
  await run(next, "clReconcile(" + JSON.stringify(account.doc) + ")");
  expect(next.applied).toEqual(["sage"]);
});

test("an old save that loading tidies (65 race records cut to 64) is still known for the one stored: the account's copy comes back", async () => {
  // from before saves were numbered, with 65 old records; loading keeps 64
  const rec = Object.fromEntries(Array.from({ length: 65 }, (_, i) => ["old" + i, i + 1]));
  const { store, account } = await backedUpWhileFull({ v: 3, cr: 200, owned: ["golf"], ghost: {}, rec });
  expect(JSON.parse(store.meta).diskGen).toBe(0);
  const next = boot(store, false, account);
  expect(Object.keys(next.save.rec)).toHaveLength(64);
  await run(next, "clReconcile(" + JSON.stringify(account.doc) + ")");
  // it used to go up over the sage, tidied
  expect([next.applied, acct(account).wall]).toEqual([["sage"], "sage"]);
});

test("a newer save written here goes up, even one that has come back to the wall the account's copy replaced", async () => {
  for (const wall of ["plaster", "sand"]) {
    const { store, account, g } = await backedUpWhileFull({ v: 3, cr: 200, gen: 3, owned: ["golf"], ghost: {} });
    // room again, and the wall changed (back to plaster, or to sand), which goes in
    g.room = true;
    g.save.wall = wall;
    run(g, "persist()");
    expect([run(g, "SAVE.ok"), JSON.parse(store.game).gen]).toEqual([true, 4]);
    const next = boot(store, true, account);
    await run(next, "clReconcile(" + JSON.stringify(account.doc) + ")");
    expect([next.applied, acct(account).wall || "plaster"]).toEqual([[], wall]);
  }
});

test("while the browser takes no save, progress made since the start isn't replaced by another device's: the player chooses", async () => {
  const { account, g } = await backedUpWhileFull({ v: 3, cr: 200, gen: 3, owned: ["golf"], ghost: {} });
  g.save.cr = 950;
  run(g, "persist()");
  // another device moved the account on
  const other = { ...account.doc, save: JSON.stringify({ ...acct(account), cr: 300 }), rev: 6 };
  await run(g, "clReconcile(" + JSON.stringify(other) + ")");
  expect([g.applied, g.chosen]).toEqual([[], ["asked"]]);
});

test("a stored save older than the one the backup noted can't be placed: the player chooses", async () => {
  const { store, account } = await backedUpWhileFull({ v: 3, cr: 200, gen: 3, owned: ["golf"], ghost: {} });
  store.meta = JSON.stringify({ ...JSON.parse(store.meta), diskGen: 7 });
  const next = boot(store, false, account);
  await run(next, "clReconcile(" + JSON.stringify(account.doc) + ")");
  expect([next.applied, next.chosen]).toEqual([[], ["asked"]]);
});
