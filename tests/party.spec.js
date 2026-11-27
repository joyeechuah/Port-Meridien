// A party at home (docs/PARTIES.md, js/life.js): THROW A PARTY in the garage asks up to three Friends over. Each
// answers with a reason; those coming take the comfiest seats and the rest stand by the railing, a metre apart. SEE THEM
// OFF ends it: friendship, social, fun and Charisma, and the next party waits three minutes of play. Leaving the garage
// calls it off (walking about the house doesn't: tests/party-on-foot.spec.js). A controller's Y opens it, the D-pad and A choose, and B closes it.
const { test, expect } = require("./support/game");

const HOME = {
  v: 1,
  wall: "plaster",
  floor: "oak",
  items: [{ id: "sofa", x: 16, z: 8, r: 0 }],
};
// three good friends, and one who's only just a Friend (too new a friend for some personalities)
async function home(game, rel) {
  await game.open({ save: { home: HOME, rel } });
  await game.waitState("GARAGE");
}
const ids = (game) =>
  game.eval(() => {
    const T = __T,
      pick = (trait) => T.PEOPLE.find((p) => p.trait === trait).id;
    return {
      cheerful: pick("cheerful"),
      chatty: pick("chatty"),
      joker: pick("joker"),
      busy: pick("busy"),
    };
  });

test("three friends come to a party: their replies, seats and standing places, then SEE THEM OFF pays and starts the wait", async ({
  game,
  page,
}) => {
  await game.open();
  const P = await ids(game);
  await home(game, {
    [P.cheerful]: { f: 80, n: 3 },
    [P.chatty]: { f: 80, n: 3 },
    [P.joker]: { f: 80, n: 3 },
    [P.busy]: { f: 45, n: 3 },
  });
  await game.watchToasts();
  await expect(page.locator("#gParty")).toHaveText("THROW A PARTY");
  await page.click("#gParty");
  await expect(page.locator("#party")).toBeVisible();
  await expect(page.locator("#pyList button")).toHaveCount(4);
  await expect(page.locator("#pyInvite")).toBeDisabled();
  for (const id of [P.cheerful, P.chatty, P.joker])
    await page.click(`#pyList [data-id="${id}"]`);
  await expect(page.locator("#pyCount")).toHaveText("3 of 3 chosen");
  // a fourth can't be chosen
  await expect(page.locator(`#pyList [data-id="${P.busy}"]`)).toBeDisabled();
  await page.click("#pyInvite");
  await expect(page.locator("#pyReplies li.yes")).toHaveCount(3);
  await expect(page.locator("#pyStart")).toBeVisible();
  const before = await game.eval(() => ({
    score: __T.partyScore(),
    rel: JSON.parse(JSON.stringify(__T.save.rel)),
  }));
  await expect(page.locator("#pyStart")).toHaveText(
    "START THE PARTY · SCORE " + before.score,
  );
  await page.click("#pyStart");
  await expect(page.locator("#party")).toBeHidden();
  const seated = await game.eval(() => {
    const T = __T,
      ms = [...T.PARTY_M.values()],
      pos = ms.map((m) => m.G.position);
    let close = Infinity;
    for (let i = 0; i < pos.length; i++)
      for (let j = 0; j < i; j++)
        close = Math.min(
          close,
          Math.hypot(pos[i].x - pos[j].x, pos[i].z - pos[j].z),
        );
    return {
      n: ms.length,
      shown: ms.every((m) => m.G.visible),
      sitting: ms.filter((m) => m.legs[0].rotation.x < -1).length,
      close: +close.toFixed(2),
    };
  });
  // one on the sofa, two standing, none on top of another
  expect(seated.n).toBe(3);
  expect(seated.shown).toBe(true);
  expect(seated.sitting).toBe(1);
  expect(seated.close).toBeGreaterThanOrEqual(0.9);
  await expect(page.locator("#gParty")).toHaveText(
    "SEE THEM OFF · PARTY " + before.score,
  );
  await page.click("#gParty");
  const after = await game.eval(() => ({
    guests: __T.PARTY_M.size,
    active: __T.PARTY.active,
    rel: JSON.parse(JSON.stringify(__T.save.rel)),
    feel: __T.feeling(),
  }));
  expect(after.guests).toBe(0);
  expect(after.active).toBe(false);
  for (const id of [P.cheerful, P.chatty, P.joker])
    expect(after.rel[id].f).toBeGreaterThan(before.rel[id].f);
  expect(after.rel[P.busy]).toEqual(before.rel[P.busy]);
  expect(after.feel).toBe(before.score >= 60 ? "happy" : null);
  expect(
    (await game.toastLog()).find((t) => t.startsWith("PARTY · SCORE")),
  ).toContain("PARTY · SCORE " + before.score);
  await expect(page.locator("#gParty")).toBeDisabled();
  await expect(page.locator("#gParty")).toHaveText("PARTY · AGAIN IN 3 MIN");
  expect((await game.readSave()).homeWait.party).toBe(180);
});

test("a friend who isn't close enough says why; with nobody coming there's nothing to start", async ({
  game,
  page,
}) => {
  await game.open();
  const P = await ids(game);
  await home(game, { [P.busy]: { f: 45, n: 3 } });
  await page.click("#gParty");
  await page.click(`#pyList [data-id="${P.busy}"]`);
  await page.click("#pyInvite");
  await expect(page.locator("#pyReplies li")).toHaveCount(2);
  await expect(page.locator("#pyReplies li").first()).toContainText(
    "can't come: “I can't clear my schedule.”",
  );
  await expect(page.locator("#pyReplies li").last()).toContainText(
    "Nobody can come this time",
  );
  await expect(page.locator("#pyStart")).toBeHidden();
  await game.key("Escape");
  await expect(page.locator("#party")).toBeHidden();
  expect(
    await game.eval(() => document.activeElement && document.activeElement.id),
  ).toBe("gParty");
});

test("leaving the garage calls a party off: the guests go, nothing is paid and there's no wait", async ({
  game,
  page,
}) => {
  await game.open();
  const P = await ids(game);
  await home(game, { [P.cheerful]: { f: 80, n: 3 } });
  await page.click("#gParty");
  await page.click(`#pyList [data-id="${P.cheerful}"]`);
  await page.click("#pyInvite");
  await page.click("#pyStart");
  const f = await game.eval((id) => __T.save.rel[id].f, P.cheerful);
  await game.driveOut();
  const r = await game.eval(
    (id) => ({
      active: __T.PARTY.active,
      guests: __T.PARTY_M.size,
      f: __T.save.rel[id].f,
      wait: __T.homeUntil.party - __T.NS.t,
    }),
    P.cheerful,
  );
  expect(r).toEqual({ active: false, guests: 0, f, wait: expect.any(Number) });
  expect(r.wait).toBeLessThanOrEqual(0);
});

// Tab used to reach DESIGN HOME behind the panel, and Space then opened the designer under it (Codex's review of #127)
test("the garage behind the party panel is out of reach: Tab stays inside, the designer can't open under it, and closing gives focus back", async ({
  game,
  page,
}) => {
  await game.open();
  const P = await ids(game);
  await home(game, { [P.cheerful]: { f: 80, n: 3 } });
  await page.click("#gParty");
  await expect(page.locator("#party")).toBeVisible();
  const where = () =>
    page.evaluate(() =>
      document.activeElement && document.activeElement.closest("#party")
        ? "party"
        : document.activeElement && document.activeElement !== document.body
          ? document.activeElement.id || document.activeElement.tagName
          : "body",
    );
  const outside = [];
  for (const k of ["Shift+Tab", "Tab"])
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(k);
      const w = await where();
      if (w !== "party" && w !== "body") outside.push(k + " → " + w);
    }
  expect(outside, "focus left the party panel").toEqual([]);
  await page.keyboard.press("Space");
  expect(await game.eval(() => __T.HV.on)).toBe(false);
  // and opening the designer some other way doesn't either
  await game.eval(() => document.getElementById("gDesign").click());
  expect(await game.eval(() => __T.HV.on)).toBe(false);
  await game.key("Escape");
  await expect(page.locator("#party")).toBeHidden();
  expect(
    await game.eval(() => [
      document.activeElement.id,
      document.getElementById("gui").inert,
    ]),
  ).toEqual(["gParty", false]);
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
  window.__press = (i, v = 1) => {
    pad.buttons[i].value = v;
    pad.buttons[i].pressed = v > 0.5;
  };
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [pad, null, null, null],
  });
};

test("with a controller: Y opens the party, the D-pad and A choose and send, B closes", async ({
  game,
  page,
}) => {
  await page.addInitScript(FAKE_PAD);
  await game.open();
  const P = await ids(game);
  await home(game, { [P.cheerful]: { f: 80, n: 3 } });
  const tap = async (i) => {
    await game.eval((i) => __press(i, 1), i);
    await game.frames(3);
    await game.eval((i) => __press(i, 0), i);
    await game.frames(3);
  };
  await tap(3);
  await expect(page.locator("#party")).toBeVisible();
  // the friend is the first button; A chooses them, then down to SEND and A
  await tap(12);
  await tap(13);
  expect(await game.eval(() => document.activeElement.dataset.id)).toBe(
    String(P.cheerful),
  );
  await tap(0);
  await expect(page.locator("#pyCount")).toHaveText("1 of 3 chosen");
  await tap(13);
  expect(await game.eval(() => document.activeElement.id)).toBe("pyInvite");
  await tap(0);
  await expect(page.locator("#pyReplies li.yes")).toHaveCount(1);
  await tap(1);
  await expect(page.locator("#party")).toBeHidden();
  expect(
    await game.eval(() => [
      __T.state,
      __T.HV.on,
      document.getElementById("gui").inert,
    ]),
  ).toEqual(["GARAGE", false, false]);
});

for (const [name, w, h] of [
  ["portrait", 390, 844],
  ["landscape", 844, 390],
  ["small landscape", 667, 375],
])
  test.describe(name, () => {
    test.use({
      viewport: { width: w, height: h },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    test(`${name}: the party panel with six friends and three replies fits, CLOSE in reach`, async ({
      game,
      page,
    }) => {
      await game.open();
      const rel = {};
      for (let i = 0; i < 6; i++) rel[i] = { f: 90, n: 3 };
      await home(game, rel);
      await page.locator("#gParty").tap();
      for (const i of [0, 1, 2])
        await page.locator(`#pyList [data-id="${i}"]`).tap();
      await page.locator("#pyInvite").tap();
      await expect(page.locator("#pyReplies li")).toHaveCount(3);
      const fit = await page.evaluate(() => {
        const card = document
            .querySelector("#party .card")
            .getBoundingClientRect(),
          inView = (id) => {
            const r = document.getElementById(id).getBoundingClientRect();
            return (
              r.top >= card.top - 1 &&
              r.bottom <= Math.min(card.bottom, innerHeight) + 1 &&
              r.height > 30
            );
          },
          wide = [
            ...document.querySelectorAll("#pyList button, #pyReplies li"),
          ].every(
            (e) =>
              e.scrollWidth <= e.clientWidth + 1 ||
              getComputedStyle(e).whiteSpace !== "nowrap",
          );
        return {
          card:
            card.top >= 0 &&
            card.bottom <= innerHeight + 0.5 &&
            card.left >= 0 &&
            card.right <= innerWidth + 0.5,
          start: inView("pyStart"),
          close: inView("pyClose"),
          wide,
        };
      });
      expect(fit).toEqual({ card: true, start: true, close: true, wide: true });
    });
  });
