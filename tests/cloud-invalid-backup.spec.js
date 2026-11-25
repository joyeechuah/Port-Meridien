const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const screens = fs.readFileSync(require.resolve("../js/screens.js"), "utf8");

for (const raw of ['{"cr":800000', "null", "[]", "42", "{}"]) {
  test("an unreadable existing backup survives reconciliation and retry: " + raw, async () => {
    const save = { cr: 120000, owned: ["starter"] };
    const doc = { rev: 1, save: raw }, CL = { user: {}, meta: { rev: 1 } };
    let writes = 0, restores = 0, reads = 0;
    const ctx = vm.createContext({ CL, save, tabIdle: false, clearTimeout() {}, clFresh: () => true,
      clProg: JSON.stringify, clCanon: JSON.stringify, clHash: s => s, clPayload: s => s,
      clSet: st => { CL.st = st; }, clUpload: () => { writes++; }, clApply: () => { restores++; },
      clReadAccount: async () => { reads++; vm.runInContext("clReconcile(doc)", ctx); }, doc, clAccountError() {} });
    vm.runInContext(screens.slice(screens.indexOf("function clReconcile("), screens.indexOf("function clWork(")), ctx);
    vm.runInContext(screens.slice(screens.indexOf("function clSync("), screens.indexOf("function clSignIn(")), ctx);
    vm.runInContext("clReconcile(doc)", ctx);
    await vm.runInContext("clSync()", ctx);
    expect({ writes, restores, reads, state: CL.st }).toEqual({ writes: 0, restores: 0, reads: 1, state: "error" });
  });
}
