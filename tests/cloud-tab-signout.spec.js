const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const screens = fs.readFileSync(require.resolve("../js/screens.js"), "utf8");

test("a sign-out finishing in a stopped tab preserves the active tab's account ownership", async () => {
  let done;
  const CL = { ad: { signOut: () => new Promise(resolve => { done = resolve; }) }, meta: { owner: "first" } };
  const active = JSON.stringify({ uid: "second", owner: "second", rev: 9 });
  let stored = active;
  const ctx = vm.createContext({ CL, tabIdle: false, CLOUD_KEY: "cloud", clearTimeout() {}, clRender() {},
    localStorage: { setItem: (_, value) => { stored = value; } }, clSet() {}, toast() {} });
  vm.runInContext(screens.slice(screens.indexOf("function clSaveMeta("), screens.indexOf("CL={meta:")), ctx);
  vm.runInContext(screens.slice(screens.indexOf("function clSignOut("), screens.indexOf("function clRow(")), ctx);
  vm.runInContext("clSignOut()", ctx);
  ctx.tabIdle = true;
  const pending = CL.signingOut;
  done();
  await pending;
  expect(stored).toBe(active);
});
