const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function gameFunction(file, name, globals) {
  const source = readFileSync(join(__dirname, "../js", file), "utf8");
  const start = source.indexOf("function " + name + "(");
  const end = source.indexOf("\n}", start) + 2;
  return vm.runInNewContext(source.slice(start, end) + "\n" + name, globals);
}

// Step the game's movement loop on flat ground without a renderer or a real clock.
function walker(peds, footClear) {
  const F = { x: 0, y: 0, z: 0, h: 0, v: 0, ph: 0, car: [0, 0], hudT: 10 };
  const noop = () => {};
  const input = { gas: 1, brake: 0 };
  const step = gameFunction("people.js", "footUpdate", {
    FOOT: F, P: { x: 0, z: 0 }, FOOT_V: { walk: 1.9, run: 5.4, back: 1.2, turn: 2.5 },
    PEDS: peds, keys: {}, locked: false, state: "DRIVE", pc: {}, TALK: { p: null }, SIT: { on: false },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)), wrapA: v => v,
    footClear, footGround: () => 0, steerIn: () => 0, kH: () => false,
    gasIn: () => input.gas, brakeIn: () => input.brake,
    updateTraffic: noop, jobTick: noop, footPlace: noop, gunFoot: noop,
    footPrompt: noop, audioUpd: noop, placeCarMesh: noop, showDamageSmoke: noop,
    footCam: noop, drawMini: noop, skillDistance: noop
  });
  return { F, input, advance(frames) { for (let i=0; i<frames; i++) step(1/60); } };
}

test("holding Walk against a wall settles the stride and backing away works", () => {
  const { F, input, advance } = walker([], (x,z) => [x,Math.min(0,z)]);
  advance(90);
  expect(F.z).toBe(0);
  expect(F.ph).toBe(0);
  input.gas=0; input.brake=1;
  advance(60);
  expect(F.z).toBeLessThan(-1);
});

test("a walker catches up to a pedestrian without passing through them", () => {
  const ped = { x: 0, z: 1, st: "idle", m: { G: { visible: true } } };
  const { F, advance } = walker([ped], (x,z) => [x,z]);
  advance(90);
  expect(F.z).toBeGreaterThan(0.45);
  expect(F.z).toBeLessThanOrEqual(0.52);
  F.h=Math.PI/2;
  advance(60);
  expect(F.x).toBeGreaterThan(1);
});

test("the active streetlights follow a walker away from the parked car", () => {
  const lights = [0,1].map(() => ({ position: { set(x) { this.x=x; } } }));
  const player = { x: 0, z: 0 };
  const update = gameFunction("screens.js", "updateLampLights", {
    pc: { G: { position: { x: 0, z: 0 } } }, state: "DRIVE", night: 1,
    activePlayer: () => player, LAMP_LIGHTS: lights, smooth: () => 0,
    LAMPS: [0,5,100,105].map(x => ({ x, y: 7, z: 0 }))
  });
  update();
  expect(lights.map(l => l.position.x)).toEqual([0,5]);
  player.x=100;
  update();
  expect(lights.map(l => l.position.x)).toEqual([100,105]);
});
