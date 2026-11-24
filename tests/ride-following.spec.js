const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "../js/life.js"), "utf8");
const tickSrc = src.slice(src.indexOf("function rideTick("), src.indexOf("function emoteTick("));
function simulate(blocked) {
  const limb = () => ({ rotation: {} });
  const p = { x: 0, z: 0, h: 0, v: 2, ph: 0, m: { G: { position: { set() {} }, rotation: { set() {} } }, legs: [limb(), limb()], arms: [limb(), limb()] } };
  const goal = { x: 0, z: 3, stop: .35 }, ride = { st: "follow", t: 0, stuck: 0, best: 0, p, who: {} };
  const tick = vm.runInNewContext(tickSrc + "\nrideTick", {
    RIDE: ride, RIDE_V: { wait: 90, follow: 2, hurry: 3 }, state: "DRIVE",
    rideGoal: () => goal, BOAT: {}, FOOT: { on: true, h: 0 }, P: { vx: 0, vz: 0 },
    footClear: (x,z) => blocked && z < 1 ? [0,0] : [x,z], footGround: () => 0,
    wrapA: a => a, clamp: (x,a,b) => Math.max(a,Math.min(x,b)), faceBlink() {}, emoteTick() {}
  });
  let maxStep = 0;
  for (let i=0;i<275;i++) {
    const before = p.z;
    if (!blocked) goal.z += 2/60;
    tick(1/60);
    maxStep = Math.max(maxStep, p.z-before);
  }
  return { maxStep, z: p.z };
}
test("a moving friend follows smoothly even when the gap stays constant", () => {
  expect(simulate(false).maxStep).toBeLessThan(.05);
});
test("an obstructed friend still catches up after four seconds", () => {
  expect(simulate(true).z).toBeCloseTo(3);
});
