// The garage on a phone with every pill on (SNACK and PLAY from the home's furniture, SAVE MY PROGRESS, HANG OUT with
// a friend over, NOT SAVED beside the credits): no two of its controls overlap, and all are on screen. HANG OUT used to
// reach the car arrows in portrait (the pills are closer together there now), and REST ran under the right arrow in
// landscape.
const { test, expect } = require("./support/game");

const overlap = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

for (const [name, w, h] of [
  ["small phone", 360, 640],
  ["portrait", 390, 844],
  ["folded foldable", 344, 882],
  ["640 landscape", 640, 360],
  ["small landscape", 740, 360],
  ["landscape", 844, 390],
])
  test.describe(name, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    for (const mode of ["a friend over", "a party on"])
    test(`${name}: the garage with every pill on (${mode}), nothing overlaps and all of it is on screen`, async ({ game, page }) => {
      await page.addInitScript(() => {
        const real = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k === "port-meridien-v1" && window.__refuse) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
          return real.call(this, k, v);
        };
      });
      await game.open();
      await game.eval((mode) => {
        const T = __T;
        // the friend with the longest name, for the widest HANG OUT
        const i = T.PEOPLE.reduce((a, q, k) => (q.name.length > T.PEOPLE[a].name.length ? k : a), 0);
        T.save.rel[i] = { f: 50, n: 3 };
        if (mode === "a friend over") {
          T.GUEST.who = T.PEOPLE[i];
          T.GUEST.done = false;
        } else {
          // three guests, the button at its widest (SEE THEM OFF · PARTY and a score)
          for (const k of [0, 1, 2]) T.save.rel[k] = { f: 95, n: 3 };
          T.PARTY.ids = [0, 1, 2];
          T.PARTY.active = true;
        }
        T.guestSync("GARAGE");
        window.__refuse = true;
        T.earn(1);
        T.persist();
        // SNACK and PLAY show with a fridge and a games console at home, SAVE MY PROGRESS where the account is on offer
        for (const id of ["gSnack", "gPlay", "gCloud"]) document.getElementById(id).classList.remove("hide");
      }, mode);
      await page.waitForTimeout(400);
      const r = await game.eval(() => {
        const els = [...document.querySelectorAll("#gui button, #gui .pill, #gui .cname, #gui .stats")].filter((e) => e.offsetParent && e.getBoundingClientRect().width);
        return els.map((e) => ({ id: e.id || e.className, box: e.getBoundingClientRect().toJSON(), inside: els.filter((o) => o !== e && (o.contains(e) || e.contains(o))).map((o) => o.id || o.className) }));
      });
      expect(r.map((e) => e.id)).toEqual(expect.arrayContaining([mode === "a friend over" ? "gGuest" : "gParty", "gSave", "gSnack", "gPlay", "gRest", "gprev", "gnext"]));
      const hits = [];
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) if (!r[i].inside.includes(r[j].id) && overlap(r[i].box, r[j].box)) hits.push(r[i].id + " / " + r[j].id);
      expect(hits, "two of the garage's controls overlap").toEqual([]);
      const off = r.filter((e) => e.box.left < -1 || e.box.top < -1 || e.box.right > w + 1 || e.box.bottom > h + 1).map((e) => e.id);
      expect(off, "off the screen").toEqual([]);
    });
  });
