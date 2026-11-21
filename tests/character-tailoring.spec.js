const { test, expect } = require("./support/game");

test("the jacket adds room at the wrist and the selected sleeve survives leaving the car @webgl", async ({ game, page }, info) => {
  await page.setViewportSize({ width: 392, height: 731 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await game.open({ render: true, autostart: false });
  await page.locator("#lstart").click({ timeout: 180000 });
  await game.waitState("WARDROBE");

  // Measure the worn garment in elbow space, independent of the mirror pose.
  const wristWidth = () => game.eval(() => {
    const elbow = __T.FOOT.m.elbows[0], point = new THREE.Vector3();
    elbow.updateWorldMatrix(true, true);
    const local = elbow.matrixWorld.clone().invert();
    let left = Infinity, right = -Infinity;
    elbow.traverse(mesh => {
      if (!mesh.isMesh) return;
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(local);
        if (point.y < -.235 || point.y > -.19) continue;
        left = Math.min(left, point.x);
        right = Math.max(right, point.x);
      }
    });
    return right - left;
  });
  const capture = async name => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await info.attach(name, { body: await page.screenshot(), contentType: "image/png" });
  };

  const bare = await wristWidth();
  expect(bare).toBeGreaterThan(.045);
  await capture("Wardrobe - Harbour palms - portrait");
  await page.getByRole("button", { name: /Night shift/ }).click();
  const jacket = await wristWidth();
  expect(jacket).toBeGreaterThan(bare * 1.12);
  await page.getByRole("button", { name: /Boardwalk stripe/ }).click();
  expect(await wristWidth()).toBeCloseTo(bare, 4);
  await page.getByRole("button", { name: /Night shift/ }).click();
  await page.setViewportSize({ width: 731, height: 392 });
  await capture("Wardrobe - Night shift - landscape");
  await page.locator("#wardWear").click();
  await game.waitState("DRIVE");
  await game.park();
  await game.key("f");
  expect(await game.eval(() => __T.FOOT.on && __T.save.outfit === "club")).toBe(true);
  expect(await wristWidth()).toBeCloseTo(jacket, 4);
  await capture("On foot - landscape");
  await page.setViewportSize({ width: 392, height: 731 });
  await capture("On foot - portrait");
});
