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
