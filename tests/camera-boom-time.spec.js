const { test, expect } = require("@playwright/test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { Vector3 } = require("three");

test("chase camera pulls in and recovers equally at 30, 60 and 120 Hz", () => {
  const js = fs.readFileSync(path.join(__dirname, "../js/screens.js"), "utf8");
  const fn = js.slice(js.indexOf("function camWant("), js.indexOf("// after a teleport"));
  for (const fps of [30, 60, 120]) {
    let clear = 6;
    const camera = vm.runInNewContext(fn + "\ncamWant", {
      V3: Vector3, pc: { G: { position: new Vector3() } }, camMode: 0,
      camYaw: 0, camBoom: null, speedF: () => 0, boomClear: () => clear,
      CAMV: { up: 3, ahead: 24, lookY: 1.2 }, lerp: (a,b,t) => a+(b-a)*t
    });
    const distance = dt => -camera(dt,null).pos.z;
    expect(distance(0)).toBe(6);
    clear = 2;
    let back;
    for (let i=0;i<fps/6;i++) back=distance(1/fps);
    const near=2+4*.65**10;
    expect(back).toBeCloseTo(near, 10);
    clear=6;
    for (let i=0;i<fps/2;i++) back=distance(1/fps);
    expect(back).toBeCloseTo(6+(near-6)*.95**30, 10);
  }
});
