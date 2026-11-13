// Exercise boat boarding, power/steering and disembark with the actual touch HUD
// and the standard gamepad handler. Game physics advances with deterministic steps.
// Only test code: these controls exist in production index.html.
const { test, expect } = require("./support/game");

async function stagePier(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T;
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    T.P.x = T.PIER.x0 - 14;
    T.P.z = 0;
    T.P.h = Math.PI / 2;
    T.P.vx = T.P.vz = 0;
    T.P.thr = 0;
    T.driveUpdate(1 / 60);
    T.footExit();
    T.FOOT.x = T.BOAT.x;
    T.FOOT.z = T.PIER.z0 + 0.8;
    T.FOOT.y = T.PIER.y;
    T.FOOT.h = Math.PI / 2;
    T.driveUpdate(1 / 60);
  });
}

const current = game => game.eval(() => ({
  boat: __T.BOAT.on, foot: __T.FOOT.on, x: __T.BOAT.x,
  z: __T.BOAT.z, h: __T.BOAT.h, speed: __T.BOAT.v,
  prompt: document.getElementById("prompt").classList.contains("hide")
    ? null : document.getElementById("promptTxt").textContent,
}));

// Simulates a real pointer press and release across a sequence of game updates
// without depending on the wall-clock duration of a Playwright hold.
async function holdTouch(game, id, n, pointerId) {
  const el = game.page.locator("#" + id);
  await el.dispatchEvent("pointerdown", { pointerId, pointerType: "touch", bubbles: true, isPrimary: true });
  try {
    return await game.eval(n => {
      const T = __T, before = { x: T.BOAT.x, z: T.BOAT.z, h: T.BOAT.h, v: T.BOAT.v };
      for (let i = 0; i < n; i++) T.driveUpdate(1 / 60);
      return { before, after: { x: T.BOAT.x, z: T.BOAT.z, h: T.BOAT.h, v: T.BOAT.v } };
    }, n);
  } finally {
    await el.dispatchEvent("pointerup", { pointerId, pointerType: "touch", bubbles: true, isPrimary: true });
  }
}

test.describe("boat controls on a phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("tap to board, POWER/steer/REVERSE on-screen pads, then tap to step onto the pier", async ({ game, page }) => {
    await stagePier(game);
    expect((await current(game)).prompt).toBe("Board the boat");
    await page.locator("#prompt").tap();
    const boarded = await current(game);
    expect([boarded.boat, boarded.foot]).toEqual([true, false]);
    await expect(page.locator("#bG")).toHaveText("POWER");
    await expect(page.locator("#bB")).toHaveText("REVERSE");

    const forward = await holdTouch(game, "bG", 360, 71);
    expect(forward.after.x - forward.before.x).toBeGreaterThan(20);
    expect(forward.after.v).toBeGreaterThan(10);
    const steering = await holdTouch(game, "bR", 120, 72);
    // A still-moving boat changes heading from the touch steering pad.
    expect(Math.abs(steering.after.h - steering.before.h)).toBeGreaterThan(0.1);

    await game.eval(() => { for (let i = 0; i < 950; i++) __T.driveUpdate(1 / 60); });
    const reverse = await holdTouch(game, "bB", 200, 73);
    expect(reverse.after.v).toBeLessThan(-2);

    // Return to the mooring under deterministic simulation; this is a control
    // test, not the boat navigation test already in boat.spec.js.
    await game.eval(() => {
      const T = __T;
      T.BOAT.x = 1238; T.BOAT.z = T.PIER.z0 - 1.6;
      T.BOAT.v = 0; T.BOAT.steer = 0;
      T.driveUpdate(1 / 60);
    });
    expect((await current(game)).prompt).toBe("Step onto the pier");
    await page.locator("#prompt").tap();
    const landed = await current(game);
    expect([landed.boat, landed.foot, landed.prompt]).toEqual([false, true, "Board the boat"]);
  });
});

test.describe("boat controls with a standard gamepad", () => {
  test("X boards/lands, right trigger powers, left stick steers and left trigger reverses", async ({ game, page }) => {
    await page.addInitScript(() => {
      const pad = {
        connected: true, axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      };
      window.boatPad = pad;
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    });
    await stagePier(game);
    expect((await current(game)).prompt).toBe("Board the boat");

    const tapX = () => game.eval(() => {
      const T = __T, b = window.boatPad.buttons[2];
      b.pressed = true; b.value = 1; T.pollPad();
      const heldMode = T.BOAT.on;
      T.pollPad(); // cannot repeat action without a new press
      b.pressed = false; b.value = 0; T.pollPad();
      return heldMode;
    });
    expect(await tapX()).toBe(true);
    expect((await current(game)).boat).toBe(true);

    const sailing = await game.eval(() => {
      const T = __T, pad = window.boatPad;
      pad.buttons[7].pressed = true; pad.buttons[7].value = 1; T.pollPad();
      const beforeX = T.BOAT.x;
      for (let i = 0; i < 400; i++) T.driveUpdate(1 / 60);
      const travelled = T.BOAT.x - beforeX, fast = T.BOAT.v;
      pad.axes[0] = 1; T.pollPad();
      const beforeH = T.BOAT.h;
      for (let i = 0; i < 120; i++) T.driveUpdate(1 / 60);
      const turned = Math.abs(T.BOAT.h - beforeH);
      pad.axes[0] = 0;
      pad.buttons[7].pressed = false; pad.buttons[7].value = 0; T.pollPad();
      for (let i = 0; i < 950; i++) T.driveUpdate(1 / 60);
      pad.buttons[6].pressed = true; pad.buttons[6].value = 1; T.pollPad();
      for (let i = 0; i < 190; i++) T.driveUpdate(1 / 60);
      const reverse = T.BOAT.v;
      pad.buttons[6].pressed = false; pad.buttons[6].value = 0; T.pollPad();
      return { travelled, fast, turned, reverse };
    });
    expect(sailing.travelled).toBeGreaterThan(25);
    expect(sailing.fast).toBeGreaterThan(12);
    expect(sailing.turned).toBeGreaterThan(0.1);
    expect(sailing.reverse).toBeLessThan(-2);

    await game.eval(() => {
      const T = __T;
      T.BOAT.x = 1238; T.BOAT.z = T.PIER.z0 - 1.6;
      T.BOAT.v = 0; T.BOAT.steer = 0;
      T.driveUpdate(1 / 60);
    });
    expect((await current(game)).prompt).toBe("Step onto the pier");
    expect(await tapX()).toBe(false);
    const landed = await current(game);
    expect([landed.boat, landed.foot, landed.prompt]).toEqual([false, true, "Board the boat"]);
  });
});
