const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");

for (const limited of [true, false]) {
  test("garage purchase saves credits and ownership together, quota limited: " + limited, () => {
    const read = file => fs.readFileSync(require.resolve("../js/" + file), "utf8");
    const screens = read("screens.js"), play = read("play.js"), core = read("core.js");
    const save = { cr: 5000, xp: 0, owned: ["starter"], paint: {} };
    let stored = JSON.stringify(save);
    const limit = limited ? stored.length : Infinity;
    const buttons = {};
    const ctx = vm.createContext({ save, dSel: 0, CARS: [{ id: "coupe", price: 2000 }],
      GARAGE_CAP: 5, dPaint: 123, curId: "starter", CL: null, tabIdle: false, saveWarned: false,
      SAVE_KEY: "game", localStorage: { setItem(_, value) {
        if (value.length > limit) throw new Error("QuotaExceededError");
        stored = value;
      } }, $: id => buttons[id] ||= {}, getCar: () => ({ paint() {} }),
      toast() {}, updateMoney() {}, parkAll() {}, dPick() {} });
    vm.runInContext(core.slice(core.indexOf("function persist()"), core.indexOf("const paintOf")), ctx);
    vm.runInContext(play.split("\n").find(line => line.startsWith("function earn(")), ctx);
    vm.runInContext(screens.slice(screens.indexOf('$("dBuy").onclick'), screens.indexOf('$("dDrive").onclick')), ctx);
    buttons.dBuy.onclick();
    expect(JSON.parse(stored)).toMatchObject(limited ? { cr: 5000, owned: ["starter"] } :
      { cr: 3000, owned: ["starter", "coupe"], paint: { coupe: 123 } });
  });
}
