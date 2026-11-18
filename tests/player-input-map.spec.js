const { test, expect } = require("./support/game");

test("map marker and ME use the active player's position and heading", async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.key("m");
  const samples = await game.eval(() => {
    const { P, FOOT, BOAT, MV, drawMap } = __T;
    const ctx = document.querySelector("#mapc").getContext("2d");
    const rotate = ctx.rotate;
    let lastRotation;
    ctx.rotate = function (angle) {
      const transform = this.getTransform();
      lastRotation = [transform.e, transform.f, angle];
      return rotate.call(this, angle);
    };
    try {
      return [P, FOOT, BOAT].map((actor, i) => {
        FOOT.on = actor === FOOT;
        BOAT.on = actor === BOAT;
        Object.assign(actor, { x: 50 * i, z: -80 * i, h: i });
        document.querySelector("#mapMe").click();
        drawMap();
        const d = Math.min(devicePixelRatio, 2);
        return { centre: [MV.cx, MV.cz], marker: lastRotation, expected: [MV.ox * d, MV.oy * d, Math.PI - i] };
      });
    } finally {
      FOOT.on = BOAT.on = false;
      delete ctx.rotate;
    }
  });
  for (const [i, sample] of samples.entries()) {
    expect(sample.centre[0]).toBeCloseTo(50 * i);
    expect(sample.centre[1]).toBeCloseTo(-80 * i);
    sample.marker.forEach((value, j) => expect(value).toBeCloseTo(sample.expected[j]));
  }
});

test("disconnect releases controller fire and a new controller can use the same menu button", async ({ game }) => {
  await game.open();
  const result = await game.eval(() => {
    const { GP, pollPad } = __T;
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 5 || i === 15 }));
    const pad = { connected: true, buttons, axes: [] };
    let pads = [pad];
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    try {
      pollPad();
      const first = __T.gSel;
      pads = [];
      pollPad();
      const fire = GP.fire;
      pads = [pad];
      pollPad();
      return { fire, first, second: __T.gSel };
    } finally {
      delete navigator.getGamepads;
    }
  });
  expect(result.fire).toBe(false);
  expect(result.second).not.toBe(result.first);
});

test("switching directly between connected controllers starts fresh button history", async ({ game }) => {
  await game.open();
  const selections = await game.eval(() => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 15 }));
    const controller = index => ({ index, connected: true, buttons, axes: [] });
    let pads = [controller(0), controller(1)];
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => pads });
    try {
      __T.pollPad();
      const first = __T.gSel;
      pads[0] = null;
      __T.pollPad();
      const second = __T.gSel;
      __T.pollPad();
      return [first, second, __T.gSel];
    } finally {
      delete navigator.getGamepads;
    }
  });
  expect(selections[1]).not.toBe(selections[0]);
  expect(selections[2]).toBe(selections[1]);
});

test("handbrake and fire can be held and released independently", async ({ game }) => {
  await game.open();
  const states = await game.eval(() => {
    const snapshot = () => [!!__T.pad.H, !!__T.pad.F];
    const send = (id, type, pointerId) => document.getElementById(id).dispatchEvent(
      new PointerEvent(type, { pointerId, pointerType: "touch", bubbles: true, cancelable: true })
    );
    send("bH", "pointerdown", 11);
    send("bF", "pointerdown", 12);
    const both = snapshot();
    send("bH", "pointercancel", 11);
    const onlyFire = snapshot();
    send("bF", "pointerup", 12);
    return [both, onlyFire, snapshot()];
  });
  expect(states).toEqual([[true, true], [false, true], [false, false]]);
});

test("overlapping zoom resets restore the original viewport", async ({ game, page }) => {
  await game.open();
  const viewport = page.locator('meta[name="viewport"]');
  const original = await viewport.getAttribute("content");
  const locked = await game.eval(() => {
    const reset = document.getElementById("zoomed");
    reset.click();
    reset.click();
    return document.querySelector('meta[name="viewport"]').content;
  });
  expect(locked).toContain("minimum-scale=1");
  await expect(viewport).toHaveAttribute("content", original);
});
