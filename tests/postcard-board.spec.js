// The postcard board (docs/POSTCARDS.md, js/home.js on Codex's rules, its look in js/homeview.js): in DESIGN HOME's
// Decor, locked until a postcard is found, then 440 CR. The cards found are pinned on its front in the album's order,
// four to a row, and its comfort grows with them. A card collected with a board at home is on it next time you look.
const { test, expect } = require("./support/game");

async function design(game, page) {
  await page.locator("#gDesign").click();
  await expect(page.locator("#hd")).toBeVisible();
  await page.locator("#hdg_decor").click();
}
const board = (page) =>
  page.locator("#hdList .hdc", { hasText: "Postcard board" });

test("with no postcard found the board can't be bought, and says why", async ({
  game,
  page,
}) => {
  await game.open();
  await game.waitState("GARAGE");
  await design(game, page);
  await expect(board(page)).toBeDisabled();
  await expect(board(page)).toContainText("Find a postcard first");
  expect(await game.eval(() => __T.homePlace("postcard-board", 10, 8))).toBe(
    false,
  );
});

test("the board shows the cards found, in the album's order, and its comfort grows with them", async ({
  game,
  page,
}) => {
  await game.open({ save: { postcards: ["cove", "summit"] } });
  await game.waitState("GARAGE");
  await design(game, page);
  await expect(board(page)).toBeEnabled();
  await expect(board(page)).toContainText("Comfort +5 with your 2 cards");
  const placed = await game.eval(() => {
    const T = __T,
      ok = T.homePlace("postcard-board", 10, 8),
      built = T.homeBuild(),
      m = T.HV.meshes.find(
        (x) => T.save.home.items[x.userData.index].id === "postcard-board",
      );
    return {
      ok,
      comfort: T.homeComfort(T.save.home),
      cards: T.postcardBoardCards(),
      verts: m.geometry.attributes.position.count,
    };
  });
  // the album's order (summit comes before cove), whatever order they were found in
  expect(placed).toMatchObject({
    ok: true,
    comfort: 5,
    cards: ["summit", "cove"],
  });
  // a third card: pinned on the board (two more boxes) and one more comfort
  const more = await game.eval(() => {
    const T = __T;
    T.save.postcards.push("east-cape");
    T.homeBuild();
    const m = T.HV.meshes.find(
      (x) => T.save.home.items[x.userData.index].id === "postcard-board",
    );
    return {
      comfort: T.homeComfort(T.save.home),
      verts: m.geometry.attributes.position.count,
    };
  });
  expect(more.comfort).toBe(6);
  expect(more.verts).toBe(placed.verts + 2 * 24);
});

test("a card collected on the road with a board at home is on it when you're back", async ({
  game,
  page,
}) => {
  await game.open({
    save: {
      postcards: ["summit"],
      home: {
        v: 1,
        wall: "plaster",
        floor: "oak",
        items: [{ id: "postcard-board", x: 10, z: 8, r: 0 }],
      },
    },
  });
  await game.waitState("GARAGE");
  const verts = () =>
    game.eval(() => {
      const T = __T,
        m = T.HV.meshes.find(
          (x) => T.save.home.items[x.userData.index].id === "postcard-board",
        );
      return m.geometry.attributes.position.count;
    });
  const before = await verts();
  await game.driveOut();
  const card = await game.eval(() => __T.POSTCARDS[1]);
  await game.park(card.x, card.z);
  await game.key("f");
  await expect.poll(() => game.eval(() => __T.FOOT.on)).toBe(true);
  // stood on the card, walking a step
  expect(
    await game.eval((c) => {
      const T = __T,
        F = T.FOOT;
      F.x = c.x + 0.5;
      F.z = c.z;
      F.y = T.footGround(F.x, F.z);
      F.h = F.cy = Math.atan2(c.x - F.x, c.z - F.z);
      T.keys.w = true;
      for (let i = 0; i < 30 && !T.save.postcards.includes(c.id); i++)
        T.driveUpdate(1 / 60);
      T.keys.w = false;
      return T.save.postcards.includes(c.id);
    }, card),
  ).toBe(true);
  expect(await verts()).toBe(before + 2 * 24);
});
