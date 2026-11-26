// Postcards out on the island (docs/POSTCARDS.md): each stands on a post by the road, turning, with a faint beam to
// spot it from the car. Walking up to one collects it, once, and its marker goes. Pause → POSTCARDS lists all twelve,
// fits a phone either way up, and a controller's B closes it back to the pause menu.
const { test, expect } = require("./support/game");

test("a marker stands on the ground by each card, and only the ones near the camera are drawn", async ({
  game,
}) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T,
      out = { n: T.POSTCARD_MARKS.size, ground: [], seen: [] };
    for (const c of T.POSTCARDS) {
      const m = T.POSTCARD_MARKS.get(c.id);
      out.ground.push(
        +Math.abs(m.G.position.y - T.footGround(c.x, c.z)).toFixed(3),
      );
    }
    // the camera over each card in turn: that one shows, and every other within 320 m of it, no more
    for (const c of T.POSTCARDS) {
      T.camera.position.set(c.x, T.footGround(c.x, c.z) + 3, c.z);
      T.postcardTick(0);
      const shown = T.POSTCARDS.filter(
          (o) => T.POSTCARD_MARKS.get(o.id).G.visible,
        ).map((o) => o.id),
        near = T.POSTCARDS.filter(
          (o) => Math.hypot(o.x - c.x, o.z - c.z) < 320,
        ).map((o) => o.id);
      out.seen.push(shown.join() === near.join() && shown.includes(c.id));
    }
    return out;
  });
  expect(r.n).toBe(12);
  expect(Math.max(...r.ground)).toBeLessThan(0.01);
  expect(r.seen).toEqual(Array(12).fill(true));
});

test("walking up to a card by the road collects it once, and its marker goes", async ({
  game,
}) => {
  await game.open();
  await game.driveOut();
  const card = await game.eval(() => __T.POSTCARDS[0]);
  // the road by the card, then the car parked on a quiet road elsewhere, so it isn't in the way of the walk
  const road = await game.park(card.x, card.z);
  await game.park();
  await game.eval(() => {
    for (const t of __T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.c.G.visible = false;
    }
  });
  await game.key("f");
  await expect.poll(() => game.eval(() => __T.FOOT.on)).toBe(true);
  await game.watchToasts();
  const r = await game.eval(
    ([c, road]) => {
      const T = __T,
        F = T.FOOT,
        m = T.POSTCARD_MARKS.get(c.id);
      // 5 m back towards the road, facing the card
      const dx = road.x - c.x,
        dz = road.z - c.z,
        L = Math.hypot(dx, dz) || 1;
      F.x = c.x + (dx / L) * 5;
      F.z = c.z + (dz / L) * 5;
      F.y = T.footGround(F.x, F.z);
      F.h = F.cy = Math.atan2(c.x - F.x, c.z - F.z);
      T.camera.position.set(F.x, F.y + 2, F.z);
      T.postcardTick(0);
      const before = m.G.visible;
      let n = 0;
      T.keys.w = true;
      while (!T.save.postcards.includes(c.id) && n++ < 240)
        T.driveUpdate(1 / 60);
      T.keys.w = false;
      const at = +Math.hypot(F.x - c.x, F.z - c.z).toFixed(2);
      T.postcardTick(0);
      // standing on it again collects nothing more
      for (let i = 0; i < 60; i++) T.driveUpdate(1 / 60);
      return { before, got: T.save.postcards.slice(), at, after: m.G.visible };
    },
    [card, road],
  );
  expect(r.before).toBe(true);
  expect(r.got).toEqual([card.id]);
  expect(r.at).toBeLessThanOrEqual(2.5);
  expect(r.after).toBe(false);
  const log = (await game.toastLog()).filter((t) => t.startsWith("POSTCARD"));
  expect(log).toEqual(["POSTCARD FOUND | " + card.title + " · 1/12"]);
  expect((await game.readSave()).postcards).toEqual([card.id]);
});

// a fake standard-layout controller the test can press (as in controls.spec.js)
const FAKE_PAD = () => {
  const pad = {
    id: "Test pad",
    index: 0,
    connected: true,
    mapping: "standard",
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: [],
  };
  for (let i = 0; i < 17; i++)
    pad.buttons.push({ pressed: false, touched: false, value: 0 });
  window.__pad = pad;
  window.__press = (i, v = 1) => {
    pad.buttons[i].value = v;
    pad.buttons[i].pressed = v > 0.5;
  };
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [pad, null, null, null],
  });
};

test("a controller's B closes Postcards back to the pause menu", async ({
  game,
  page,
}) => {
  await page.addInitScript(FAKE_PAD);
  await game.open();
  await game.driveOut();
  await game.park();
  await game.key("Escape");
  await game.waitState("PAUSE");
  await page.click("#pCollections");
  await expect(page.locator("#collections")).toBeVisible();
  await expect(page.locator("#cardList li")).toHaveCount(12);
  await game.eval(() => __press(1, 1));
  await game.frames(3);
  await game.eval(() => __press(1, 0));
  await game.frames(3);
  await expect(page.locator("#collections")).toBeHidden();
  expect(await game.eval(() => __T.state)).toBe("PAUSE");
  expect(
    await game.eval(() => document.activeElement && document.activeElement.id),
  ).toBe("pCollections");
});

test.describe("a short screen", () => {
  test.use({ viewport: { width: 1024, height: 560 } });
  test("a controller's stick scrolls the Postcards list to the last card", async ({
    game,
    page,
  }) => {
    await page.addInitScript(FAKE_PAD);
    await game.open();
    await game.driveOut();
    await game.park();
    await game.eval(() => __T.pauseOn());
    await game.waitState("PAUSE");
    await page.click("#pCollections");
    const at = () =>
      page.evaluate(() => {
        const L = document.getElementById("cardList"),
          last = L.lastElementChild.getBoundingClientRect();
        return {
          top: L.scrollTop,
          room: L.scrollHeight > L.clientHeight,
          lastShown: last.bottom <= L.getBoundingClientRect().bottom + 1,
        };
      });
    expect(await at()).toEqual({ top: 0, room: true, lastShown: false });
    await game.eval(() => (window.__pad.axes[3] = 1));
    await expect.poll(() => at().then((r) => r.lastShown)).toBe(true);
    await game.eval(() => (window.__pad.axes[3] = 0));
    await expect(page.locator("#collections")).toBeVisible();
  });
});

const box = (page, sel) =>
  page
    .locator(sel)
    .evaluate((n) => JSON.parse(JSON.stringify(n.getBoundingClientRect())));

for (const [name, w, h] of [
  ["portrait", 390, 844],
  ["landscape", 844, 390],
  ["small landscape", 667, 375],
  ["small phone", 360, 640],
])
  test.describe(name, () => {
    test.use({
      viewport: { width: w, height: h },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test(`${name}: the pause menu still fits with POSTCARDS, and the panel shows every card with CLOSE in reach`, async ({
      game,
      page,
    }) => {
      await game.open({ save: { postcards: ["summit", "cove"] } });
      await game.driveOut();
      await game.park();
      await game.eval(() => __T.pauseOn());
      await game.waitState("PAUSE");
      // every pause button inside the screen (the card scrolls on a portrait phone, so the button scrolled into view)
      const menu = await page.evaluate(() => {
        const out = [];
        for (const b of document.querySelectorAll("#pause .mbtn")) {
          if (b.classList.contains("hide")) continue;
          b.scrollIntoView({ block: "nearest" });
          const r = b.getBoundingClientRect();
          out.push(
            r.left >= 0 &&
              r.right <= innerWidth + 0.5 &&
              r.top >= 0 &&
              r.bottom <= innerHeight + 0.5 &&
              r.width > 40,
          );
        }
        return out;
      });
      expect(menu.every(Boolean)).toBe(true);
      await page.locator("#pCollections").tap();
      await expect(page.locator("#collections")).toBeVisible();
      const card = await box(page, "#collections .card"),
        close = await box(page, "#cardClose"),
        list = await box(page, "#cardList");
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.right).toBeLessThanOrEqual(w + 0.5);
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.bottom).toBeLessThanOrEqual(h + 0.5);
      expect(close.bottom).toBeLessThanOrEqual(h + 0.5);
      expect(list.bottom).toBeLessThanOrEqual(close.top + 0.5);
      const rows = await page.evaluate(() => {
        const L = document.getElementById("cardList"),
          inView = [...L.children].filter(
            (li) =>
              li.getBoundingClientRect().bottom <=
              L.getBoundingClientRect().bottom + 1,
          ).length;
        L.scrollTop = L.scrollHeight;
        const last = L.lastElementChild.getBoundingClientRect(),
          lb = L.getBoundingClientRect();
        return {
          inView: inView >= 4,
          n: L.children.length,
          lastShown: last.bottom <= lb.bottom + 1,
          found: [...L.querySelectorAll(".found b")].map((b) => b.textContent),
          wide: [...L.querySelectorAll("li")].every(
            (li) => li.scrollWidth <= li.clientWidth + 1,
          ),
        };
      });
      expect(rows).toEqual({
        inView: true,
        n: 12,
        lastShown: true,
        found: ["The Ridge Line", "Cove in Blue"],
        wide: true,
      });
      await expect(page.locator("#cardCount")).toHaveText(
        "2 of 12 found · 17%",
      );
      await page.locator("#cardClose").tap();
      await expect(page.locator("#collections")).toBeHidden();
    });
  });
