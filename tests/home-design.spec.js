// DESIGN HOME (js/homeview.js on js/home.js's rules): an overhead view of the garage's mezzanine where a click (or two
// touches) buys and places a piece, a piece can be picked, turned, moved and sold, and the room's walls and floor
// changed; what you build is drawn there and kept in the save.
const { test, expect } = require("./support/game");

// the point on the screen over a cell's middle on the mezzanine floor, through the camera as it stands
const cellPoint = (game, x, z) =>
  game.eval(([x, z]) => {
    const T = __T,
      c = T.HOME_CELL,
      p = T.gW(T.HOME_ORIGIN.x + (x + 0.5) * c, T.HOME_ORIGIN.z + (z + 0.5) * c, T.HOME_ORIGIN.y).project(T.camera);
    return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
  }, [x, z]);
// into DESIGN HOME, the camera settled over the room
async function design(game, page) {
  await page.locator("#gDesign").click();
  await expect(page.locator("#hd")).toBeVisible();
  await expect.poll(() => game.eval(() => __T.camera.position.distanceTo(__T.hvCam().pos)), { timeout: 15000 }).toBeLessThan(0.3);
}
const card = (page, name) => page.locator("#hdList .hdc", { hasText: name });

test.describe("design your home", () => {
  test("a click on the floor buys and places the chosen piece where you clicked, drawn on the mezzanine and kept after a reload", async ({ game, page }) => {
    await game.open();
    await design(game, page);
    expect(await game.eval(() => ({ on: __T.HV.on, roofsHidden: __T.HV.roofs.length > 0 && __T.HV.roofs.every((m) => !m.visible), grid: __T.HV.grid.visible }))).toEqual({ on: true, roofsHidden: true, grid: true });
    await page.locator("#hdg_seating").click();
    await card(page, "Harbour sofa").click();
    const at = await cellPoint(game, 10, 8);
    await page.mouse.move(at.x, at.y);
    await page.mouse.click(at.x, at.y);
    const r = await game.eval(() => {
      const T = __T,
        p = T.save.home.items[0],
        m = T.HV.meshes[0];
      return { n: T.save.home.items.length, p, cr: T.save.cr, drawn: T.HV.meshes.length, onSpot: m.position.distanceTo(T.hvSpot(p.id, p.x, p.z, p.r)) < 1e-6 };
    });
    expect(r).toMatchObject({ n: 1, cr: 120000 - 1200, drawn: 1, onSpot: true });
    expect(r.p).toMatchObject({ id: "sofa", r: 0 });
    // the clicked cell is under the sofa (4 by 2 cells)
    expect(r.p.x <= 10 && 10 < r.p.x + 4 && r.p.z <= 8 && 8 < r.p.z + 2).toBe(true);
    expect((await game.readSave()).home.items).toEqual([r.p]);
    await game.reload();
    expect(await game.eval(() => ({ drawn: __T.HV.meshes.length, items: __T.save.home.items }))).toEqual({ drawn: 1, items: [r.p] });
  });

  test("a placed piece is picked, turned and sold; a piece where it can't go isn't bought; ROOM paints the walls; Escape and DONE leave", async ({ game, page }) => {
    await game.open();
    await design(game, page);
    await page.locator("#hdg_seating").click();
    await card(page, "Harbour sofa").click();
    let at = await cellPoint(game, 10, 8);
    await page.mouse.click(at.x, at.y);
    // let go of the catalogue piece, then click the sofa to pick it
    await page.keyboard.press("Escape");
    const mid = await game.eval(() => {
      const p = __T.save.home.items[0];
      return { x: p.x + 1, z: p.z + 0 };
    });
    at = await cellPoint(game, mid.x, mid.z);
    await page.mouse.click(at.x, at.y);
    expect(await game.eval(() => __T.HV.pick)).toBe(0);
    await page.locator("#hdTurn").click();
    expect(await game.eval(() => __T.save.home.items[0].r)).toBe(1);
    await page.locator("#hdSell").click();
    expect(await game.eval(() => ({ n: __T.save.home.items.length, cr: __T.save.cr, drawn: __T.HV.meshes.length }))).toEqual({ n: 0, cr: 120000 - 1200 + 900, drawn: 0 });
    // the strip along the railing is kept clear
    await page.locator("#hdg_decor").click();
    await card(page, "Floor lamp").click();
    at = await cellPoint(game, 20, 0);
    await page.mouse.click(at.x, at.y);
    expect(await game.eval(() => __T.save.home.items.length)).toBe(0);
    await expect(page.locator("#hdMsg")).toHaveText("It doesn't fit there");
    // Enter doesn't drive off while designing
    await page.keyboard.press("Enter");
    expect(await game.state()).toBe("GARAGE");
    await page.locator("#hdg_room").click();
    await page.locator("#hdList .hdc", { hasText: "SAGE" }).click();
    // (the game keeps colours in linear light: js/core.js converts every setHex)
    expect(await game.eval(() => ({ wall: __T.save.home.wall, painted: __T.HV.wall.material.color.getHex() === new THREE.Color(0xb4c3a7).getHex() }))).toEqual({ wall: "sage", painted: true });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    expect(await game.eval(() => ({ on: __T.HV.on, roofs: __T.HOUSE_MESHES.filter((m) => m.position.y > __T.gY + 9).every((m) => m.visible) }))).toEqual({ on: false, roofs: true });
    await expect(page.locator("#hd")).toBeHidden();
    await expect(page.locator("#gDesign")).toBeVisible();
  });

  test("a fridge put in brings SNACK to the garage; selling it takes it away", async ({ game, page }) => {
    await game.open();
    await design(game, page);
    await page.locator("#hdg_kitchen").click();
    await card(page, "Kitchen fridge").click();
    const at = await cellPoint(game, 30, 16);
    await page.mouse.click(at.x, at.y);
    await page.locator("#hdDone").click();
    await expect(page.locator("#gSnack")).toBeVisible();
    await design(game, page);
    const p = await game.eval(() => __T.save.home.items[0]);
    const at2 = await cellPoint(game, p.x + 1, p.z + 1);
    await page.mouse.click(at2.x, at2.y);
    await page.locator("#hdSell").click();
    await page.locator("#hdDone").click();
    await expect(page.locator("#gSnack")).toBeHidden();
  });

  test("on a phone held upright the panel fits the screen and the room shows above it", async ({ game, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await game.open();
    await design(game, page);
    const box = await page.locator("#hd").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    // the room's middle and its two ends along the railing are on screen, above the panel
    for (const [x, z] of [[21, 11], [1, 3], [41, 3]]) {
      const p = await cellPoint(game, x, z);
      expect(p.x, "cell " + x + "," + z).toBeGreaterThan(0);
      expect(p.x, "cell " + x + "," + z).toBeLessThan(390);
      expect(p.y, "cell " + x + "," + z).toBeLessThan(box.y);
    }
  });
  test("a touch off the floor cancels a waiting tap; Enter on a focused card is the card's, not DRIVE; the cloud dialog keeps its keys; the right stick leaves the garage view alone", async ({ game, page }) => {
    await game.open();
    await design(game, page);
    await page.locator("#hdg_seating").click();
    await card(page, "Harbour sofa").click();
    // the card keeps the focus as the panel is drawn again, and Enter on it is its own click (letting go of the sofa)
    await expect(card(page, "Harbour sofa")).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await game.eval(() => ({ state: __T.state, on: __T.HV.on, sel: __T.HV.sel }))).toEqual({ state: "GARAGE", on: true, sel: null });
    await card(page, "Harbour sofa").click();
    // one touch on a cell waits for a second; a touch off the floor cancels it, so the next touch on the cell waits again
    const at = await cellPoint(game, 10, 8),
      cr0 = await game.eval(() => __T.save.cr);
    const tap = (x, y) =>
      game.eval(([x, y]) => {
        __T.hvTap(x, y, true);
        return { tap: !!__T.HV.tap, n: __T.save.home.items.length, cr: __T.save.cr };
      }, [x, y]);
    expect(await tap(at.x, at.y)).toEqual({ tap: true, n: 0, cr: cr0 });
    expect(await tap(4, 4)).toEqual({ tap: false, n: 0, cr: cr0 });
    expect(await tap(at.x, at.y)).toEqual({ tap: true, n: 0, cr: cr0 });
    expect(await tap(at.x, at.y)).toEqual({ tap: false, n: 1, cr: cr0 - 1200 });
    // the sofa picked and the cloud dialog open over the room: Delete is the dialog's (nothing is sold), Escape closes it
    await game.eval(() => {
      __T.HV.sel = null;
      __T.HV.pick = 0;
      __T.show("cloud", true);
    });
    await page.keyboard.press("Delete");
    await page.keyboard.press("Escape");
    const read = () => game.eval(() => ({ n: __T.save.home.items.length, cloud: !document.getElementById("cloud").classList.contains("hide"), on: __T.HV.on, pick: __T.HV.pick }));
    expect(await read()).toEqual({ n: 1, cloud: false, on: true, pick: 0 });
    await page.keyboard.press("Delete");
    expect((await read()).n).toBe(0);
    // a controller's right stick held over the design view doesn't turn the garage view behind it
    const yaw = await game.eval(() => __T.GO.yaw);
    await game.eval(() => {
      const pad = { index: 0, connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 1, 0] };
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
      __T.pollPad();
    });
    await page.waitForTimeout(600);
    expect(await game.eval(() => ({ yaw: __T.GO.yaw, stick: __T.GO.stick.slice() }))).toEqual({ yaw, stick: [0, 0] });
  });
  test("a two-finger drag is no tap: it buys nothing and cancels a waiting touch; the mouse's preview goes when it leaves the floor", async ({ game, page }) => {
    await game.open();
    await design(game, page);
    await page.locator("#hdg_seating").click();
    await card(page, "Woven stool").click();
    const p = await cellPoint(game, 10, 8),
      q = await cellPoint(game, 20, 12),
      cr0 = await game.eval(() => __T.save.cr);
    const ptr = (type, id, at) =>
      game.eval(([type, id, x, y]) => {
        document.getElementById("c").dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
        return { tap: !!__T.HV.tap, n: __T.save.home.items.length, cr: __T.save.cr };
      }, [type, id, at.x, at.y]);
    // one touch on P, and the stool waits there for a second
    await ptr("pointerdown", 1, p);
    expect(await ptr("pointerup", 1, p)).toEqual({ tap: true, n: 0, cr: cr0 });
    // finger A down at Q, then finger B on P, which cancels the waiting touch; A dragged onto P and lifted, then B
    await ptr("pointerdown", 2, q);
    expect(await ptr("pointerdown", 3, p)).toEqual({ tap: false, n: 0, cr: cr0 });
    await ptr("pointermove", 2, p);
    expect(await ptr("pointerup", 2, p)).toEqual({ tap: false, n: 0, cr: cr0 });
    expect(await ptr("pointerup", 3, p)).toEqual({ tap: false, n: 0, cr: cr0 });
    // every finger off: two taps on P place it as before
    await ptr("pointerdown", 4, p);
    await ptr("pointerup", 4, p);
    await ptr("pointerdown", 5, p);
    expect(await ptr("pointerup", 5, p)).toEqual({ tap: false, n: 1, cr: cr0 - 160 });
    // the mouse: a preview over the floor, and none once it's past the room's edge
    await page.mouse.move(q.x, q.y);
    expect(await game.eval(() => !!__T.HV.at && __T.HV.ghost.visible)).toBe(true);
    await page.mouse.move(4, 4);
    expect(await game.eval(() => ({ at: __T.HV.at, ghost: __T.HV.ghost.visible }))).toEqual({ at: null, ghost: false });
  });
});
