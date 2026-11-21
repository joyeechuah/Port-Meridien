// Smoke tests: the page as shipped loads and the main screens open. The first two use the exact index.html in the
// repository, with no test hooks at all.
const { test, expect } = require("./support/game");

test.describe("smoke", () => {
  test("the shipping page loads three.js with its integrity hash, shows START and opens Old Quay @webgl", async ({ game, page }) => {
    // record Content Security Policy violations, which the browser reports as events
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI));
    });
    await game.open({ instrument: false, autostart: false });
    await expect(page).toHaveTitle(/Port Meridien/);
    await expect(page.locator("#lstart")).toBeVisible({ timeout: 180_000 });
    expect(await page.evaluate(() => window.THREE && THREE.REVISION)).toBe("128");
    await page.locator("#lstart").click();
    await expect(page.locator("#arrivalPlace")).toHaveText("Old Quay");
    await page.locator("#arrivalSkip").click();
    await page.getByRole("button", { name: /Boardwalk stripe/ }).click();
    await page.getByRole("button", { name: "Turn around" }).click();
    await page.locator("#wardWear").click();
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#gui")).toBeHidden();
    expect(await page.evaluate(() => window.__csp)).toEqual([]);
    expect(game.external, "requests to other sites").toEqual([]);
  });

  test("a key press on the start screen starts the game too @webgl", async ({ game, page }) => {
    await game.open({ instrument: false, autostart: false });
    await expect(page.locator("#lstart")).toBeVisible({ timeout: 180_000 });
    await page.keyboard.press("Enter");
    await expect(page.locator("#arrival")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#wardrobe")).toBeVisible({ timeout: 120_000 });
    await page.locator("#wardWear").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#arrival")).toBeHidden();
  });

  test("slow frames count toward the intro and time in the cloud dialog is excluded", async ({ game, page }) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await game.open({ autostart: false });
    await page.locator("#lstart").click({ timeout: 180_000 });
    await game.waitState("ARRIVAL");
    await page.clock.fastForward(3000);
    await game.eval(() => __T.clOpen());
    await page.clock.fastForward(20_000);
    await page.locator("#clClose").click();
    await expect(page.locator("#arrival")).toBeVisible();
    await page.clock.fastForward(5000);
    await expect(page.locator("#wardrobe")).toBeVisible({ timeout: 2000 });
  });

  test("reduced motion starts the saved car on an Old Quay road", async ({ game, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await game.open({ autostart: false });
    await page.locator("#lstart").click({ timeout: 180000 });
    await game.waitState("WARDROBE");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", {name:/Boardwalk stripe/})).toHaveAttribute("aria-pressed","true");
    await page.locator("#wardWear").click();
    await game.waitState("DRIVE");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem(__T.SAVE_KEY)).outfit)).toBe("stripe");
    await game.key("f");
    await expect(page.locator("#keys")).toContainText("walk / back");
    expect(await game.eval(() => __T.FOOT.m.G.visible && __T.FOOT.m.G.parent === __T.scene)).toBe(true);
    await game.key("e");
    await expect(page.locator("#keys")).toContainText("gas / brake");
    const spawn = await game.eval(() => {
      const { P, save, curId, nearestRoadGlobal } = __T;
      const road = nearestRoadGlobal(P.x, P.z, true);
      return { car: curId, saved: save.cur, x: P.x, road: road.e.type, distance: road.d };
    });
    expect(spawn.car).toBe(spawn.saved);
    expect(spawn.x).toBeCloseTo(680, -1);
    expect(spawn.road).toBe("town");
    expect(spawn.distance).toBeLessThan(5);
    await expect(page.locator("#arrival")).toBeHidden();
    await game.key("Escape");
    await page.locator("#pHome").click();
    await game.waitState("GARAGE");
    await expect(page.locator("#drive")).toBeVisible();
  });

  test("garage, drive, pause, resume and home", async ({ game, page }) => {
    await game.open();
    await game.driveOut();
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#speedo")).toBeVisible();
    await expect(page.locator("#mini")).toBeVisible();
    await game.park();
    await game.key("Escape");
    await game.waitState("PAUSE");
    await expect(page.locator("#pause")).toBeVisible();
    await expect(page.locator("#pTitle")).toHaveText("Free ride");
    await game.key("Escape");
    await game.waitState("DRIVE");
    await expect(page.locator("#pause")).toBeHidden();
    await game.key("p");
    await game.waitState("PAUSE");
    await page.locator("#pHome").click();
    await game.waitState("GARAGE", 30_000);
    await expect(page.locator("#gui")).toBeVisible();
  });
});

test.describe("site files", () => {
  test("the files the page and README refer to are served with the right types", async ({ request }) => {
    for (const [path, type] of [
      ["/index.html", "text/html"],
      ["/404.html", "text/html"],
      ["/audio/cruise.mp3", "audio/mpeg"],
      ["/audio/highway.mp3", "audio/mpeg"],
      ["/audio/showroom.mp3", "audio/mpeg"],
    ]) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
      expect(r.headers()["content-type"], path).toContain(type);
      expect((await r.body()).length, path).toBeGreaterThan(500);
    }
  });

  test("the 404 page links back to the game", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.locator("h1")).toBeVisible();
    const href = await page.locator("main a").first().getAttribute("href");
    expect(href).toMatch(/Port-Meridien\/?$|^\.?\/?$/);
  });
});
