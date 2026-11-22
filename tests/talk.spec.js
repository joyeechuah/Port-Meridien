// Talking to the people of Old Quay (js/life.js): walking up to someone offers to talk; they stop and face you; what
// you say moves a friendship according to their personality; the friendship is kept in the save; knocking someone
// down costs it; and the panel fits a phone.
const { test, expect } = require("./support/game");

// on foot in Old Quay, the car parked on the avenue and traffic off the roads, with the pistol if asked
async function inTown(game, { gun = false } = {}) {
  await game.open();
  await game.waitState("GARAGE");
  if (gun) await game.eval(() => document.getElementById("gGun").click());
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T;
    for (const t of T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.wx = t.wz = 1e6;
    }
    T.P.x = 600;
    T.P.z = 0;
    T.P.vx = T.P.vz = 0;
    T.driveUpdate(1 / 60);
  });
  await game.key("f");
}

// person i standing still on a long stretch of pavement and you `gap` m along it, facing them; everyone else is
// standing on the stretch farthest away, so nobody walks between you
const meet = (game, i, gap = 1.8) =>
  game.eval(
    ([i, gap]) => {
      const T = __T,
        F = T.FOOT,
        walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40),
        e = walks[0],
        mid = (e) => [(e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2],
        far = walks.reduce((b, w) => (Math.hypot(mid(w)[0] - mid(e)[0], mid(w)[1] - mid(e)[1]) > Math.hypot(mid(b)[0] - mid(e)[0], mid(b)[1] - mid(e)[1]) ? w : b));
      T.PEDS.forEach((q, k) => {
        const mine = k === i;
        q.e = mine ? e : far;
        q.from = q.e.a;
        q.s = mine ? 20 : 4 + k * 3;
        q.st = "idle";
        q.t = 999;
        q.fall = 0;
        q.hitAt = undefined;
        q.mad = false;
      });
      T.driveUpdate(1 / 60);
      const p = T.PEDS[i],
        ax = e.b.x - e.a.x,
        az = e.b.z - e.a.z,
        L = Math.hypot(ax, az);
      F.x = p.x - (ax / L) * gap;
      F.z = p.z - (az / L) * gap;
      F.h = Math.atan2(p.x - F.x, p.z - F.z);
      F.y = T.footGround(F.x, F.z);
      T.driveUpdate(1 / 60);
      return { name: T.PEOPLE[i].name, prompt: document.getElementById("promptTxt").textContent, shown: !document.getElementById("prompt").classList.contains("hide") };
    },
    [i, gap]
  );
const steps = (game, n) => game.eval((n) => { for (let i = 0; i < n; i++) __T.driveUpdate(1 / 60); }, n);
const panel = (game) =>
  game.eval(() => ({
    open: !document.getElementById("talk").classList.contains("hide"),
    name: document.getElementById("tkName").textContent,
    rel: document.getElementById("tkRelLbl").textContent,
    line: document.getElementById("tkLine").textContent
  }));

test.describe("talking to people", () => {
  test("walking up to someone offers to talk; talking stops them, turns them to you and holds you still; Escape says goodbye", async ({ game, page }) => {
    await inTown(game);
    const m = await meet(game, 0);
    expect(m.shown).toBe(true);
    expect(m.prompt).toBe("Talk · " + m.name);
    await page.locator("#prompt").click();
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        p = T.PEDS[0],
        x0 = F.x,
        z0 = F.z;
      // trying to walk and turn away while talking
      T.keys.w = T.keys.d = true;
      for (let i = 0; i < 90; i++) T.driveUpdate(1 / 60);
      T.keys.w = T.keys.d = false;
      const face = Math.atan2(F.x - p.x, F.z - p.z);
      return {
        st: p.st,
        v: p.v,
        moved: Math.hypot(F.x - x0, F.z - z0),
        off: Math.abs(((p.h - face + Math.PI * 3) % (Math.PI * 2)) - Math.PI),
        prompt: !document.getElementById("prompt").classList.contains("hide"),
        bubble: !!(p.emo && p.emo.kind)
      };
    });
    const shown = await panel(game);
    expect(shown.open).toBe(true);
    expect(shown.name).toBe(m.name);
    expect(shown.rel).toBe("Stranger");
    expect(r.st).toBe("talk");
    expect(r.v).toBeLessThan(0.05);
    expect(r.moved, "you stay where you are while talking").toBeLessThan(0.05);
    expect(r.off, "they turn to face you").toBeLessThan(0.15);
    expect(r.prompt, "the Talk prompt is hidden while the panel is open").toBe(false);
    expect(r.bubble).toBe(true);
    await page.keyboard.press("Escape");
    await steps(game, 30);
    expect((await panel(game)).open).toBe(false);
    expect(await game.state(), "Escape said goodbye; it didn't pause the game").toBe("DRIVE");
    expect(await game.eval(() => __T.PEDS[0].st)).not.toBe("talk");
    // opening the map ends a conversation too: the panel isn't left over the map
    await meet(game, 0);
    await page.locator("#prompt").click();
    await page.keyboard.press("m");
    expect(await game.state()).toBe("MAP");
    expect((await panel(game)).open).toBe(false);
    expect(await game.eval(() => [__T.TALK.p, __T.PEDS[0].st])).toEqual([null, "idle"]);
    expect(game.errors).toEqual([]);
  });

  test("a joke lands with a joker and falls flat with a grump, a joke told twice wears thin, and the friendship is kept", async ({ game, page }) => {
    await inTown(game);
    const joke = async (i) => {
      await meet(game, i);
      await page.locator("#prompt").click();
      const f = [], lines = [];
      for (let k = 0; k < 2; k++) {
        await page.keyboard.press("3");
        await steps(game, 50);
        lines.push((await panel(game)).line);
        f.push(await game.eval((i) => __T.save.rel[i].f, i));
      }
      expect(lines[0].split("“")[1]).not.toBe(lines[1].split("“")[1]);
      const { line, rel } = await panel(game);
      await page.keyboard.press("Escape");
      await steps(game, 10);
      return { f, line, rel };
    };
    // Inês loves a joke; Theo is grumpy (see PEOPLE in js/life.js)
    const joker = await joke(2),
      grump = await joke(1);
    expect(joker.f[0]).toBeGreaterThanOrEqual(10);
    expect(joker.f[1]).toBeGreaterThan(joker.f[0]);
    expect(joker.f[1] - joker.f[0], "the same joke again is worth less").toBeLessThan(joker.f[0]);
    expect(joker.rel).toBe("Friendly");
    expect(grump.f[0]).toBeLessThan(0);
    expect(grump.f[1]).toBeLessThan(grump.f[0]);
    expect(grump.line).toMatch(/doesn't laugh/);

    // someone always in a hurry gives you three lines, then goes
    await meet(game, 5);
    await page.locator("#prompt").click();
    for (const k of ["1", "2", "4"]) {
      await page.keyboard.press(k);
      await steps(game, 50);
    }
    expect((await panel(game)).line).toMatch(/have to run/);
    await steps(game, 120);
    expect((await panel(game)).open).toBe(false);

    // the friendship is in the save, and the person remembers you after a reload
    const saved = (await game.readSave()).rel;
    expect(saved["2"]).toEqual({ f: joker.f[1], n: 1 });
    expect(saved["1"].f).toBe(grump.f[1]);
    await game.reload();
    await game.driveOut();
    await game.park();
    await game.eval(() => {
      const T = __T;
      for (const t of T.TRAFFIC) {
        t.e = null;
        t.lost = false;
        t.wx = t.wz = 1e6;
      }
      T.P.x = 600;
      T.P.z = 0;
      T.P.vx = T.P.vz = 0;
      T.driveUpdate(1 / 60);
    });
    await game.key("f");
    await meet(game, 2);
    await page.locator("#prompt").click();
    const back = await panel(game);
    expect(back.rel).toBe("Friendly");
    expect(back.line).toMatch(/glad to see you|remembers you/);
    expect(game.errors).toEqual([]);
  });

  test("knocking someone down costs their friendship, they can't be talked to while down, and they show it when they're up", async ({ game }) => {
    await inTown(game, { gun: true });
    await meet(game, 0, 6);
    const r = await game.eval(() => {
      const T = __T,
        p = T.PEDS[0],
        q = T.gunPick();
      if (!q || q.o !== p) return { locked: false };
      T.GUN.cool = 0;
      T.gunFire();
      T.driveUpdate(1 / 60);
      const down = { st: p.st, f: T.save.rel[0].f, label: T.relLabel(T.save.rel[0]), talkable: T.talkable(p) };
      for (let i = 0; i < 60 * 7; i++) T.driveUpdate(1 / 60);
      return { locked: true, down, upset: !!(p.emo && p.emo.kind === "angry" && p.emo.sp.visible) };
    });
    expect(r.locked).toBe(true);
    expect(r.down).toEqual({ st: "down", f: -25, label: "Dislikes you", talkable: false });
    expect(r.upset, "an angry bubble once they're back up").toBe(true);
  });

  test("the pause menu ends a conversation too, and the person carries on", async ({ game, page }) => {
    await inTown(game);
    await meet(game, 0);
    await page.locator("#prompt").click();
    await page.keyboard.press("p");
    expect(await game.state()).toBe("PAUSE");
    expect((await panel(game)).open).toBe(false);
    expect(await game.eval(() => [__T.TALK.p, __T.PEDS[0].st])).toEqual([null, "idle"]);
    expect(game.errors).toEqual([]);
  });

  test("someone waiting at the kerb waits for the traffic again after talking, and crosses once it's clear", async ({ game }) => {
    await inTown(game);
    const r = await game.eval(() => {
      const T = __T,
        F = T.FOOT,
        P = T.P,
        ce = T.PED_EDGES.find((e) => e.cross),
        p = T.PEDS[0],
        home = [P.x, P.z];
      T.PEDS.forEach((q, k) => {
        if (k) {
          q.st = "idle";
          q.t = 999;
        }
      });
      // your car standing on the stripes keeps the crossing unsafe (moving the car with it, so you stay on foot)
      P.x = (ce.a.x + ce.b.x) / 2;
      P.z = (ce.a.z + ce.b.z) / 2;
      F.car = [P.x, P.z];
      p.e = ce;
      p.from = ce.a;
      p.s = 0;
      p.st = "wait";
      p.t = 0;
      T.driveUpdate(1 / 60);
      const ux = (ce.b.x - ce.a.x) / ce.len,
        uz = (ce.b.z - ce.a.z) / ce.len;
      F.x = p.x - ux * 1.8;
      F.z = p.z - uz * 1.8;
      F.y = T.footGround(F.x, F.z);
      T.driveUpdate(1 / 60);
      const opened = T.talkOpen(p);
      for (let i = 0; i < 30; i++) T.driveUpdate(1 / 60);
      T.talkClose();
      const after = [];
      for (let i = 0; i < 180; i++) {
        T.driveUpdate(1 / 60);
        if (i % 60 === 59) after.push(p.st);
      }
      // the car moves off the crossing
      P.x = home[0];
      P.z = home[1];
      F.car = [P.x, P.z];
      let crossed = false;
      for (let i = 0; i < 120 && !crossed; i++) {
        T.driveUpdate(1 / 60);
        crossed = p.st === "cross";
      }
      return { opened, after, crossed };
    });
    expect(r.opened).toBe(true);
    expect(r.after, "still waiting at the kerb, 1, 2 and 3 s after goodbye").toEqual(["wait", "wait", "wait"]);
    expect(r.crossed).toBe(true);
  });

  test("the pistol neither aims nor fires while you talk, and fire held through goodbye waits to be let go", async ({ game }) => {
    await inTown(game, { gun: true });
    await meet(game, 0, 2);
    const r = await game.eval(() => {
      const T = __T,
        p = T.PEDS[0],
        G = T.GUN,
        a0 = G.ammo;
      T.talkOpen(p);
      T.keys.g = true;
      for (let i = 0; i < 60; i++) T.driveUpdate(1 / 60);
      const talking = { ammo: a0 - G.ammo, lock: !!G.lock, st: p.st };
      T.talkClose();
      for (let i = 0; i < 40; i++) T.driveUpdate(1 / 60);
      const held = a0 - G.ammo;
      T.keys.g = false;
      for (let i = 0; i < 6; i++) T.driveUpdate(1 / 60);
      T.keys.g = true;
      for (let i = 0; i < 12; i++) T.driveUpdate(1 / 60);
      T.keys.g = false;
      return { talking, held, after: a0 - G.ammo };
    });
    expect(r.talking).toEqual({ ammo: 0, lock: false, st: "talk" });
    expect(r.held, "no shot from a fire button held since the conversation").toBe(0);
    expect(r.after, "a fresh press fires").toBe(1);
  });

  test("a controller's pick follows the D-pad and keyboard focus, and starts on the first line each time", async ({ game }) => {
    await inTown(game);
    await meet(game, 0);
    const r = await game.eval(() => {
      const T = __T,
        p = T.PEDS[0],
        bs = () => [...document.querySelectorAll("#tkActs .btn")],
        sel = () => bs().map((b, i) => (b.classList.contains("sel") ? i : -1)).filter((i) => i >= 0);
      T.talkOpen(p);
      T.talkPad((k) => k === 13);
      T.talkPad((k) => k === 13);
      const moved = { sel: T.TALK.sel, marked: sel(), focus: bs().indexOf(document.activeElement) };
      T.talkPad((k) => k === 1);
      T.talkOpen(p);
      const reopened = { sel: T.TALK.sel, marked: sel() };
      bs()[3].focus();
      const tabbed = { sel: T.TALK.sel, marked: sel() };
      T.talkPad((k) => k === 0);
      return { moved, reopened, tabbed, said: T.TALK.used.compliment || 0 };
    });
    expect(r.moved).toEqual({ sel: 2, marked: [2], focus: 2 });
    expect(r.reopened).toEqual({ sel: 0, marked: [0] });
    expect(r.tabbed).toEqual({ sel: 3, marked: [3] });
    expect(r.said, "A says the line that has focus (Compliment)").toBe(1);
  });

  test("a save's friendships are cleaned on loading: only the sixteen people, with numbers in range", async ({ game }) => {
    await game.open({ save: { v: 3, rel: { 0: { f: 999, n: -3 }, 2: { f: -40.6, n: 2.4 }, x: { f: 5, n: 1 }, 20: { f: 5, n: 1 }, 3: "bad" } } });
    expect(await game.eval(() => __T.save.rel)).toEqual({ 0: { f: 100, n: 0 }, 2: { f: -41, n: 2 } });
    expect(game.errors).toEqual([]);
  });
});

for (const [name, w, h, phone] of [["phone portrait", 390, 844, true], ["phone landscape", 844, 390, true], ["computer", 1280, 720, false]])
  test.describe(`talking on a ${name}`, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
    test(`${name}: the talk panel fits the screen below the person you're talking to, clear of the minimap, with buttons big enough to tap`, async ({ game }) => {
      await inTown(game);
      await meet(game, 0);
      expect(await game.eval(() => __T.talkOpen(__T.PEDS[0]))).toBe(true);
      const r = await game.eval(() => {
        const box = (e) => e.getBoundingClientRect(),
          over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const bs = [...document.querySelectorAll("#tkActs .btn")].map(box),
          t = box(document.getElementById("talk")),
          pads = [...document.querySelectorAll("#pads .pz")].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden").map(box),
          mini = box(document.getElementById("minWrap"));
        // the top of their head, on screen
        __T.camera.updateMatrixWorld();
        const p = __T.PEDS[0],
          v = new THREE.Vector3(p.x, p.y + 1.75 * p.m.G.scale.y, p.z).project(__T.camera),
          headY = ((1 - v.y) / 2) * innerHeight;
        return {
          n: bs.length,
          minH: Math.min(...bs.map((b) => b.height)),
          inside: t.left >= 0 && t.right <= innerWidth && t.top >= 0 && t.bottom <= innerHeight,
          padHit: bs.filter((b) => pads.some((p) => over(b, p))).length,
          miniHit: over(t, mini),
          headAbove: headY < t.top,
          headOn: v.x > -1 && v.x < 1 && v.y > -1 && v.y < 1,
          at: [+v.x.toFixed(2), +v.y.toFixed(2), Math.round(headY), Math.round(t.top)]
        };
      });
      expect(r.n).toBe(7);
      expect(r.minH).toBeGreaterThanOrEqual(40);
      expect(r.inside).toBe(true);
      expect(r.padHit, "buttons under the touch controls").toBe(0);
      expect(r.miniHit, "the panel over the minimap").toBe(false);
      expect(r.headOn, "the person is in view " + JSON.stringify(r.at)).toBe(true);
      expect(r.headAbove, "their head (and the reaction bubble) above the panel " + JSON.stringify(r.at)).toBe(true);
    });
  });
