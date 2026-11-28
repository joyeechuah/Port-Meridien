// On a phone the garage's MUSIC, SAVE MY PROGRESS and pistol pills sit under one OPTIONS pill, opened over the
// others; a wider screen shows all of them as before.
const { test, expect } = require("./support/game");

const overlap = (a, b) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

for (const [name, w, h] of [["small phone", 360, 640], ["640 landscape", 640, 360]])
  test.describe(name, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test(`${name}: OPTIONS opens the three pills over the others, on screen, and closes again`, async ({ game, page }) => {
      await game.open();
      await game.waitState("GARAGE");
      await game.eval(() => document.getElementById("gCloud").classList.remove("hide"));
      const more = page.locator("#gMore");
      await expect(more).toBeVisible();
      await expect(page.locator("#gMus")).toBeHidden();
      await more.click();
      await expect(more).toHaveAttribute("aria-expanded", "true");
      const boxes = [];
      for (const id of ["#gMus", "#gCloud", "#gGun"]) {
        await expect(page.locator(id)).toBeInViewport({ ratio: 1 });
        boxes.push(await page.locator(id).boundingBox());
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
      // a choice in it leaves it open, so you see what changed
      await page.locator("#gGun").click();
      await expect(page.locator("#gGun")).toHaveText("PISTOL: TAKING IT");
      await expect(more).toHaveAttribute("aria-expanded", "true");
      // a tap elsewhere closes it
      await page.mouse.click(w / 2, h * 0.55);
      await expect(more).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#gMus")).toBeHidden();
      // and Escape
      await more.click();
      await page.keyboard.press("Escape");
      await expect(more).toHaveAttribute("aria-expanded", "false");
    });
  });

test("on a wide screen the three pills show as before, with no OPTIONS", async ({ game, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await game.open();
  await game.waitState("GARAGE");
  await expect(page.locator("#gMore")).toBeHidden();
  await expect(page.locator("#gMus")).toBeVisible();
  await expect(page.locator("#gGun")).toBeVisible();
});

test("OPTIONS shows the cloud save's warning, and closes on leaving the garage", async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await game.open();
  await game.waitState("GARAGE");
  const r = await game.eval(() => {
    const c = document.getElementById("gCloud");
    c.classList.remove("hide");
    c.classList.add("warn");
    const more = document.getElementById("gMore");
    const warned = getComputedStyle(more).borderColor;
    c.classList.remove("warn");
    const calm = getComputedStyle(more).borderColor;
    more.click();
    const open = more.getAttribute("aria-expanded");
    __T.setState("DEALER");
    return { warnedDiffers: warned !== calm, open, after: more.getAttribute("aria-expanded") };
  });
  expect(r).toEqual({ warnedDiffers: true, open: "true", after: "false" });
});
