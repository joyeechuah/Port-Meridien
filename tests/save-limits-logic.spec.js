// js/core.js persist and saveWrite, on their own: storage that won't take the whole save gets it without the time
// trial ghost laps, and for five minutes only that; storage that takes nothing keeps what it has
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
const core = fs.readFileSync(require.resolve("../js/core.js"), "utf8");
function game(room) {
  const g = {
    room, now: 0, store: { pm: '{"cr":120000}' }, tries: [], toasts: [], SAVE_KEY: "pm", tabIdle: false, CL: null, saveWarned: false,
    Date: { now: () => g.now }, toast: (t) => g.toasts.push(t),
    // takes a save no longer than `room` characters; a refused one leaves what's stored as it was
    localStorage: { setItem(k, v) { g.tries.push(v.includes('"ghost":{}') ? "lite" : "full"); if (v.length > g.room) throw new Error("QuotaExceededError"); g.store[k] = v; } },
    save: { cr: 121500, work: { v: 1, completed: 3, cool: 0 }, home: { v: 1, wall: "sage", floor: "oak", items: [{ id: "lamp", x: 4, z: 4, r: 0 }] },
      wants: { v: 1, active: ["meet"], completed: { race: 2 } }, aspire: { v: 1, claimed: { chef: 2 } }, ghost: { south: { c: "golf", t: 61, d: new Array(400).fill(12.5) } } },
  };
  vm.createContext(g);
  vm.runInContext(core.slice(core.indexOf("function persist()"), core.indexOf("const paintOf")), g);
  return g;
}
test("without room for the ghost laps the progress goes in without them, and for five minutes only that is tried", () => {
  // (each save written is numbered: js/core.js saveWrite)
  const g = game(0), lite = JSON.stringify(Object.assign({}, game(0).save, { ghost: {}, gen: 1 })).length;
  g.room = lite;
  vm.runInContext("persist()", g);
  const stored = JSON.parse(g.store.pm);
  expect(stored).toEqual(Object.assign({}, g.save, { ghost: {} }));
  expect(g.tries).toEqual(["full", "lite"]);
  expect([vm.runInContext("SAVE.ok", g), g.toasts]).toEqual([true, ["GHOST LAPS NOT SAVED"]]);
  g.now = 299999; g.tries.length = 0;
  vm.runInContext("persist()", g);
  expect(g.tries).toEqual(["lite"]);
  // five minutes on, the whole save is tried again, and goes in once there's room
  g.now = 300000; g.room = Infinity; g.tries.length = 0;
  vm.runInContext("persist()", g);
  expect(g.tries).toEqual(["full"]);
  expect(JSON.parse(g.store.pm).ghost.south.d.length).toBe(400);
  expect(g.toasts).toEqual(["GHOST LAPS NOT SAVED"]);
});
test("storage that takes nothing keeps the last save that went in; it says so once, and SAVE.ok follows each try", () => {
  const g = game(-1);
  vm.runInContext("persist();persist()", g);
  expect(g.store.pm).toBe('{"cr":120000}');
  expect([vm.runInContext("SAVE.ok", g), g.toasts]).toEqual([false, ["PROGRESS NOT SAVED"]]);
  g.room = Infinity; g.now = 300000;
  vm.runInContext("persist()", g);
  expect([vm.runInContext("SAVE.ok", g), JSON.parse(g.store.pm).cr]).toEqual([true, 121500]);
});

test("account restore retries its own snapshot and advances the revision only after storage accepts it", () => {
  const screens = fs.readFileSync(require.resolve("../js/screens.js"), "utf8");
  for (const fits of [false, true]) {
    const g = game(0);
    const cloud = { cr: 200, owned: ["golf"] };
    const restored = { ...cloud, home: {}, ghost: {} }, stored = { ...restored, gen: 1 };
    g.room = fits ? JSON.stringify(stored).length : 1;
    Object.assign(g, { CL: { other: true, meta: { rev: 3 } }, clearTimeout() {}, clOwn() {},
      homeClean: () => ({}), clAt: () => 0, clSaveMeta() {}, clSet() {},
      window: { __cloudNoReload: true }, cloud });
    vm.runInContext(screens.slice(screens.indexOf("function clApply("), screens.indexOf("// this device's save goes")), g);
    vm.runInContext("clApply({rev:7},cloud)", g);
    expect(g.tries).toEqual(["full","lite"]);
    // (not stored: the revision is spoilt, so this device's older save can't go up at the account's revision)
    expect(g.CL.meta.rev).toBe(fits ? 7 : -1);
    expect(JSON.parse(g.store.pm)).toEqual(fits ? stored : { cr: 120000 });
    expect(g.save.ghost.south.d).toHaveLength(400);
    if (fits) expect(g.window.__cloudApplied).toEqual(restored);
    else expect(g.CL.pick.cloud).toEqual(cloud);
  }
});
