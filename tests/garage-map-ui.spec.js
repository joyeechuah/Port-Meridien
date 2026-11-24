const { test, expect } = require("./support/game");

for (const [layout, width, height] of [
  ["phone", 390, 844], ["short landscape", 667, 375], ["desktop", 1280, 800],
]) {
  test.describe(layout, () => {
    test.use({ hasTouch: width <= 700 });
    test("garage selection and map controls @webgl", async ({ game, page }, testInfo) => {
      await page.setViewportSize({ width, height });
      await game.open({ render: true });
      const drive = page.getByRole("button", { name: "DRIVE", exact: true });
      const customise = page.locator("#gCust");
      for (const control of [drive, customise]) {
        await expect(control).toBeInViewport({ ratio: 1 });
        const box = await control.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }

      const selected = page.locator('#gdots button[aria-pressed="true"]');
      const initial = await selected.getAttribute("aria-label");
      await page.locator("#gnext").click();
      expect(await selected.getAttribute("aria-label")).not.toBe(initial);
      await expect(page.locator("#gprev")).toBeInViewport({ ratio: 1 });
      if (height < 400) {
        const next = await page.locator("#gnext").boundingBox();
        for (const id of ["#gGun", "#gRest"]) {
          const equipment = await page.locator(id).boundingBox();
          expect(equipment.y + equipment.height, `${id} clears the next-car touch target`).toBeLessThanOrEqual(next.y);
        }
      }
      await testInfo.attach(`garage-${layout}`, { body: await page.screenshot(), contentType: "image/png" });

      await game.noRender();
      await game.driveOut();
      await game.park();
      await page.locator("#chMap").click();
      const key = page.getByRole("button", { name: "MAP KEY", exact: true });
      if (width <= 700) {
        await expect(page.locator("#mapSide")).toBeHidden();
        await key.click();
        await expect(key).toHaveAttribute("aria-expanded", "true");
      } else {
        await expect(key).toBeHidden();
      }
      await page.locator("#mapPass").click();
      await expect(page.locator("#passport")).toBeVisible();
      await page.locator("#pzClose").click();
      await expect(page.locator("#mapSide")).toBeVisible();
      await testInfo.attach(`map-${layout}`, { body: await page.screenshot(), contentType: "image/png" });
      if (width <= 700) {
        await page.keyboard.press("Escape");
        await expect(key).toBeFocused();
        await expect(page.locator("#mapSide")).toBeHidden();
      }
      await page.getByRole("button", { name: "Centre map on me" }).click();
      await page.locator("#mapClose").click();
      await game.waitState("DRIVE");
    });
  });
}

test("WebGL failure shows a recovery action and retry reloads the page", async ({ game, page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl" || type === "webgl2") return null;
      return getContext.call(this, type, ...args);
    };
  });
  await game.open({ instrument: false, autostart: false });
  await expect(page.getByRole("heading", { name: "PORT MERIDIEN" })).toBeVisible();
  await expect(page.locator("#lmsg")).toContainText("WebGL");
  await expect(page.locator("#load .bar")).toBeHidden();
  const retry = page.getByRole("button", { name: "TRY AGAIN" });
  await Promise.all([page.waitForEvent("domcontentloaded"), retry.click()]);
  await expect(retry).toBeVisible();
});
