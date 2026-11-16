// On a phone, with everything showing at once (the damage pill, the wanted stars, the pistol and health bar, a
// prompt and two messages), nothing covers anything else: the minimap stays clear of the column above it, and the
// messages stay clear of the prompt. Portrait and two landscape sizes.
const { test, expect } = require("./support/game");

const overlap = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

for (const [name, w, h] of [
  ["portrait", 390, 844],
  ["landscape", 844, 390],
  ["small landscape", 740, 360],
])
  test.describe(name, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    test(`${name}: with everything on screen, nothing covers anything else`, async ({ game, page }) => {
      await game.open({ police: true });
      await game.waitState("GARAGE");
      await game.eval(() => document.getElementById("gGun").click());
      await game.driveOut();
      await game.park();
      await game.eval(() => {
        const T = __T;
        T.P.damage = 40;
        document.getElementById("damageHud").classList.remove("hide");
        T.WANTED.lvl = 3;
        T.wantedHud();
      });
      await page.locator("#chFoot").tap();
      await game.eval(() => {
        __T.hurt(60);
        __T.wantedBlock();
      });
      await page.waitForFunction(() => !document.getElementById("gunHud").classList.contains("hide") && !document.getElementById("prompt").classList.contains("hide"), null, { timeout: 5000 });
      const r = await game.eval(() => {
        const box = (sel) => {
          const e = document.querySelector(sel);
          if (!e || e.classList.contains("hide")) return null;
          const b = e.getBoundingClientRect();
          return b.width && b.height && getComputedStyle(e).display !== "none" ? b : null;
        };
        const shownToasts = [...document.querySelectorAll("#toasts>.toast")].filter((t) => getComputedStyle(t).display !== "none"),
          toasts = shownToasts.map((t) => t.getBoundingClientRect());
        return {
          shown: ["#tl .loc", "#damageHud", "#wanted", "#gunHud", "#mini", "#prompt"].map((s) => !!box(s)),
          tl: ["#tl .money", "#damageHud", "#tl .lvl", "#tl .loc", "#wanted", "#gunHud"].map(box).filter(Boolean),
          mini: box("#mini"),
          prompt: box("#prompt"),
          toasts,
          words: shownToasts.map((t) => t.textContent),
          pads: ["#bL", "#bR", "#bF", "#bH", "#bG", "#bB"].map(box).filter(Boolean),
        };
      });
      expect(r.shown, "everything is on screen").toEqual([true, true, true, true, true, true]);
      for (const b of r.tl) expect(overlap(b, r.mini), "the minimap covers part of the top-left column").toBe(false);
      for (const t of r.toasts) expect(overlap(t, r.prompt), "a message covers the prompt").toBe(false);
      for (const p of r.pads) expect(overlap(p, r.prompt), "the prompt covers a pad").toBe(false);
      expect(r.toasts.length).toBeGreaterThan(0);
      // the newest message is always among those shown (where only one fits, it is that one)
      expect(r.words.join(" ")).toContain("LOSE THE POLICE FIRST");
    });
  });
