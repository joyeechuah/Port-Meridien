// On a phone held upright, messages (WANTED, LANDMARK DISCOVERED, SPEED RADAR...) used to stack in the middle of the
// screen, over the free-ride score, the minimap and the car, and the score itself slid down onto the car once the
// damage pill and the stars pushed the minimap down (seen in a phone recording on the live site). Now the score, the
// race panel and the contract panel sit in the column under the speedometer, and the messages go under whichever is
// showing, only as many as fit above the car (the newest always). Free ride, a race and a contract, on three phone
// sizes (392 x 731 is the phone in the recording), once more with a wider font (as on CI, without the game's fonts),
// plus a sideways phone, where nothing moved.
const { test, expect } = require("./support/game");

const overlap = (a, b) => !!(a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1);

async function measure(game, page, setup) {
  await game.eval(setup);
  // let the page lay out and the observers (left column height, panels coming and going) re-fit the messages
  await page.waitForTimeout(150);
  return game.eval(() => {
    const T = __T;
    const box = (sel) => {
      const e = document.querySelector(sel);
      if (!e || e.classList.contains("hide") || e.classList.contains("off")) return null;
      const b = e.getBoundingClientRect();
      return b.width && b.height && getComputedStyle(e).display !== "none" ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom } : null;
    };
    const kids = [...document.querySelectorAll("#toasts>.toast")];
    const shown = kids.filter((t) => getComputedStyle(t).display !== "none");
    T.camera.updateMatrixWorld();
    const bb = new THREE.Box3().setFromObject(T.pc.G);
    let carTop = Infinity;
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(T.camera);
      carTop = Math.min(carTop, ((1 - p.y) * innerHeight) / 2);
    }
    return {
      toasts: shown.map((t) => { const b = t.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; }),
      newest: kids[0] && getComputedStyle(kids[0]).display !== "none",
      count: kids.length,
      streak: box("#streak"),
      evhud: box("#evhud"),
      jobhud: box("#jobhud"),
      speedo: box("#speedo"),
      mini: box("#mini"),
      gps: box("#gpsTxt"),
      tl: ["#tl .money", "#damageHud", "#tl .lvl", "#tl .loc", "#wanted"].map(box).filter(Boolean),
      carTop,
    };
  });
}

const msgs = () => {
  const T = __T;
  T.wantedBlock();
  T.discoverLandmark(T.LANDMARKS.find((l) => !T.save.found[l.id]));
  T.toast("SPEED RADAR", "142 km/h past the camera · +800 CR", "gold");
};

function checkPortrait(r, what) {
  const at = (b) => b && `${Math.round(b.left)}-${Math.round(b.right)} x ${Math.round(b.top)}-${Math.round(b.bottom)}`;
  expect(r.count, `${what}: messages are up`).toBeGreaterThan(0);
  expect(r.newest, `${what}: the newest message shows`).toBe(true);
  const panels = [r.streak, r.evhud, r.jobhud].filter(Boolean);
  for (const t of r.toasts) {
    for (const p of panels) expect(overlap(t, p), `${what}: a message covers the score / race / contract panel`).toBe(false);
    for (const b of [...r.tl, r.mini, r.gps, r.speedo]) expect(overlap(t, b), `${what}: a message (${at(t)}) covers the top-left column, the minimap, the GPS line or the speedometer (${at(b)})`).toBe(false);
    expect(t.bottom, `${what}: a message sits on the car`).toBeLessThanOrEqual(r.carTop);
  }
  for (const p of panels) {
    for (const b of [...r.tl, r.mini, r.gps, r.speedo]) expect(overlap(p, b), `${what}: the score / race / contract panel (${at(p)}) covers the left column, the minimap or the speedometer (${at(b)})`).toBe(false);
    expect(p.bottom, `${what}: the score / race / contract panel sits on the car`).toBeLessThanOrEqual(r.carTop);
  }
}

for (const [w, h, wide] of [[392, 731], [375, 667], [390, 844], [392, 731, true]])
  test.describe(`portrait ${w}x${h}${wide ? ", wide font" : ""}`, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    test(`${w}x${h}${wide ? ", wide font" : ""}: messages stay clear of the score, the panels, the minimap and the car`, async ({ game, page }) => {
      await game.open({ police: true });
      // the money / level / place column is as wide as its widest pill (the damage pill), and a wider font makes it
      // wider still: on CI (DejaVu Sans, not the game's Barlow) it reached past the contract panel's fixed 190 px
      if (wide) await page.addStyleTag({ content: ':root{--f-body:"DejaVu Sans",sans-serif!important;--f-num:"DejaVu Sans",sans-serif!important}' });
      await game.driveOut();

      // free ride with a streak going, a damaged car and the stars showing (the left column at its tallest)
      let r = await measure(game, page, () => {
        const T = __T;
        T.FR.pts = 13; T.FR.label = "SPEED"; T.FR.mult = 1; T.FR.timer = 3;
        T.P.damage = 40;
        document.getElementById("damageHud").classList.remove("hide");
        T.WANTED.lvl = 3;
        T.wantedHud();
        T.driveUpdate(1 / 60);
      });
      await game.eval(msgs);
      r = await measure(game, page, () => __T.driveUpdate(1 / 60));
      expect(r.streak, "the streak score shows").toBeTruthy();
      checkPortrait(r, "free ride");

      // a race: the race panel in the column, the messages under it
      r = await measure(game, page, () => {
        const T = __T;
        T.WANTED.lvl = 0; T.wantedHud(); T.FR.pts = 0;
        document.getElementById("toasts").innerHTML = "";
        T.startEvent(T.EVENTS[0]);
        T.driveUpdate(1 / 60);
      });
      await game.eval(msgs);
      r = await measure(game, page, () => __T.driveUpdate(1 / 60));
      expect(r.evhud, "the race panel shows").toBeTruthy();
      checkPortrait(r, "race");
      await game.eval(() => { __T.endEvent(); document.getElementById("toasts").innerHTML = ""; });

      // a contract with the GPS line showing, then the stars and the damage pill
      r = await measure(game, page, () => {
        const T = __T;
        T.jobStart(T.JOBS[0]);
        T.P.damage = 40;
        document.getElementById("damageHud").classList.remove("hide");
        T.WANTED.lvl = 2;
        T.wantedHud();
        T.driveUpdate(1 / 60);
      });
      await game.eval(msgs);
      r = await measure(game, page, () => __T.driveUpdate(1 / 60));
      expect(r.jobhud, "the contract panel shows").toBeTruthy();
      expect(r.gps, "the GPS line shows").toBeTruthy();
      checkPortrait(r, "contract");
    });
  });

test.describe("sideways 844x390", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  test("844x390: messages stay clear of the score", async ({ game, page }) => {
    await game.open({ police: true });
    await game.driveOut();
    const r = await measure(game, page, () => {
      const T = __T;
      T.FR.pts = 13; T.FR.label = "SPEED"; T.FR.mult = 1; T.FR.timer = 3;
      T.driveUpdate(1 / 60);
      T.discoverLandmark(T.LANDMARKS.find((l) => !T.save.found[l.id]));
      T.toast("SPEED RADAR", "142 km/h past the camera · +800 CR", "gold");
      T.driveUpdate(1 / 60);
    });
    expect(r.streak).toBeTruthy();
    expect(r.newest).toBe(true);
    for (const t of r.toasts) expect(overlap(t, r.streak), "a message covers the score").toBe(false);
  });
});
