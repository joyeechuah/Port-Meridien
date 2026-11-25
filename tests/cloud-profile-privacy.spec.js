const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../js/screens.js"), "utf8");
const block = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test("cloud metadata scrubs cached profiles before any network access", () => {
  let stored = JSON.stringify({ uid: "old", name: "Old player", email: "old@example.invalid", ownerName: "Older player", rev: 3 });
  const ctx = vm.createContext({ CLOUD_KEY: "cloud", localStorage: {
    getItem: () => stored, setItem: (_, value) => { stored = value; }
  } });
  vm.runInContext(block("function clLoadMeta()", "CL={meta:") + "clLoadMeta()", ctx);
  expect(JSON.parse(stored)).toMatchObject({ uid: "old", owner: "old", rev: 3, name: "", email: "", ownerName: "" });
});

test("restoring a session keeps the account profile in memory only", async () => {
  const user = { uid: "u1", name: "Player", email: "player@example.invalid" };
  let stored;
  const CL = { meta: {}, ad: { init: async () => user } };
  const ctx = vm.createContext({ CL, tabIdle: false, clSet() {}, clAccountError: e => { throw e; },
    clReadAccount() {}, clSaveMeta: () => { stored = JSON.parse(JSON.stringify(CL.meta)); } });
  await vm.runInContext(block("function clConnect(", "function clReconcile(") + "clConnect(false)", ctx);
  expect(CL.user).toBe(user);
  expect(stored).toEqual({ uid: "u1" });
});
