const { test, expect } = require("@playwright/test");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync(require.resolve("../js/net.js"), "utf8");

test("late authentication cannot join a room after the connection has timed out", async () => {
  let finishAuth, timeout, opened = 0, closed = 0;
  const NET = { peers: new Map(), room: null };
  const tx = {
    connect: () => new Promise(resolve => { finishAuth = resolve; }),
    open: async () => { opened++; },
    close: () => { closed++; }
  };
  const ctx = vm.createContext({ NET, netReady: () => true, netLocal: () => false, netFirebase: () => tx,
    netNote() {}, netGot() {}, netGone() {}, netLost() {}, performance, console: { warn() {} },
    setTimeout: fn => { timeout = fn; } });
  vm.runInContext(source.slice(source.indexOf("function netFail("), source.indexOf("function netLost(")), ctx);
  vm.runInContext('netBegin("ABCD", false)', ctx);
  timeout();
  await new Promise(resolve => setImmediate(resolve));
  expect(closed).toBe(1);
  NET.tx = {}; // a subsequent attempt now owns the connection
  finishAuth("old-session");
  await new Promise(resolve => setImmediate(resolve));
  expect(opened).toBe(0);
  expect(NET.uid).toBeUndefined();
});
