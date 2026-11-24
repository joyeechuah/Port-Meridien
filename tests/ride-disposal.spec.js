const { test, expect } = require("@playwright/test");
const THREE = require("three");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("disposing a car frees its body and preserves the passenger's shared figure", () => {
  const src = fs.readFileSync(path.join(__dirname, "../js/cars.js"), "utf8");
  const scene = new THREE.Scene(), car = new THREE.Group(), person = new THREE.Group();
  person.userData.rider = true;
  const mesh = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const body = mesh(), face = mesh(), freed = [];
  for (const [name, part] of [["car", body], ["face", face]]) {
    part.geometry.addEventListener("dispose", () => freed.push(name));
    part.material.addEventListener("dispose", () => freed.push(name));
  }
  person.add(face); car.add(person, body); scene.add(car);
  const dispose = vm.runInNewContext(src.slice(src.indexOf("function disposeHeroCar("), src.indexOf("/* ---------- what the cars reflect")) + "\ndisposeHeroCar", {
    carShared: () => ({ G: new Set(), M: new Set(), T: new Set() }), CAR_ENV: { mats: new Set() }, scene
  });
  dispose({ G: car });
  expect(freed).toEqual(["car", "car"]);
  expect(person.parent === scene).toBe(true);
});
