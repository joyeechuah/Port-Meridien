// Needs and moods (js/life.js, docs/LIFE_NEEDS_DESIGN.md): energy, hunger, fun and social fall with play, on the
// game's own clock and nothing else; a bench, home, the Market Kitchen, races, speed and company put them back, each
// once per press and then not again for a while; they set your mood, a suggestion in the pause menu and one hint; they
// are saved as whole numbers, and a broken save gets the starting values.
const { test, expect, SAVE_KEY } = require("./support/game");

const steps = (game, n, dt = 1 / 60) => game.eval(([n, dt]) => { for (let i = 0; i < n; i++) __T.driveUpdate(dt); }, [n, dt]);
const needs = (game) => game.eval(() => Object.fromEntries(["energy", "hunger", "fun", "social"].map((k) => [k, Math.round(__T.NEEDS[k])])));
const setNeeds = (game, n) => game.eval((n) => { __T.needsLoad(Object.assign({ v: 1 }, __T.NEEDS_START, n)); }, n);
const prompt = (game) => game.eval(() => (document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent));
// traffic off the roads and the people of Old Quay out of the way, so nothing nudges you or gets between you and a bench
const quiet = (game) =>
  game.eval(() => {
    for (const t of __T.TRAFFIC) {
      t.e = null;
      t.lost = false;
      t.wx = t.wz = 1e6;
    }
  });
// The page's own frames keep running between a test's steps; with this they hand the game almost no time (__DTMAX
// caps each frame's step), so the needs move only by the steps a test takes
const freeze = (game) => game.eval(() => { window.__DTMAX = 1e-9; });
async function out(game, opts = {}) {
  await game.open(opts);
  await game.driveOut();
  await game.park();
  await quiet(game);
  await freeze(game);
}
// on foot in Old Quay, the car parked on the avenue
async function onFoot(game, opts = {}) {
  await out(game, opts);
  await game.eval(() => {
    const T = __T;
    T.P.x = 600;
    T.P.z = 0;
    T.P.vx = T.P.vz = 0;
    T.driveUpdate(1 / 60);
    T.PEDS.forEach((p) => {
      p.m.G.visible = false;
      p.x = p.z = 1e5;
    });
  });
  await game.key("f");
  expect(await game.eval(() => __T.FOOT.on)).toBe(true);
}
// standing `gap` m in front of bench b (between it and the fountain), facing it
const toBench = (game, b = 0, gap = 1.4) =>
  game.eval(([b, gap]) => {
    const T = __T, F = T.FOOT, B = T.QUAY.benches[b];
    F.x = B.x - Math.sin(B.a) * gap;
    F.z = B.z - Math.cos(B.a) * gap;
    F.h = B.a;
    F.v = 0;
    F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
    return document.getElementById("promptTxt").textContent;
  }, [b, gap]);
// at the Market Kitchen's counter
const toKitchen = (game) =>
  game.eval(() => {
    const T = __T, F = T.FOOT, K = T.QUAY.kitchen;
    F.x = K.x - 0.4;
    F.z = K.z;
    F.h = K.h;
    F.v = 0;
    F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
    return document.getElementById("promptTxt").textContent;
  });
// a controller: press button i (one poll with it down, one with it up)
const PAD = (i) => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  const pad = { index: 0, connected: true, buttons, axes: [0, 0, 0, 0] };
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
  try {
    __T.pollPad();
    buttons[i].pressed = true;
    __T.pollPad();
    buttons[i].pressed = false;
    __T.pollPad();
  } finally {
    delete navigator.getGamepads;
  }
};

test.describe("needs: the clock", () => {
  test("two needs-hours (60 s of play) take 6, 4, 6 and 4, the same at 30, 60 and 120 frames a second", async ({ game }) => {
    await out(game);
    const got = [];
    for (const fps of [30, 60, 120]) {
      await setNeeds(game, {});
      await steps(game, 60 * fps, 1 / fps);
      got.push(await needs(game));
    }
    for (const n of got) expect(n).toEqual({ energy: 74, hunger: 71, fun: 59, social: 61 });
  });

  test("walking counts as play; the pause menu, Photo Mode, a hidden tab and the garage don't", async ({ game }) => {
    await onFoot(game);
    await setNeeds(game, {});
    await steps(game, 600);
    expect((await needs(game)).hunger).toBe(74);   // 10 s on foot: 75 - 2/3
    const still = async (what) => {
      const before = await game.eval(() => JSON.stringify(__T.NEEDS));
      await game.frames(20);
      await game.eval(() => __T.needsTick(1));   // a frame that arrives here anyway changes nothing either
      expect(await game.eval(() => JSON.stringify(__T.NEEDS)), what).toBe(before);
    };
    await game.eval(() => __T.pauseOn());
    expect(await game.state()).toBe("PAUSE");
    await still("pause menu");
    await game.eval(() => __T.photoEnter());
    expect(await game.state()).toBe("PHOTO");
    await still("Photo Mode");
    await game.eval(() => { __T.photoExit(); __T.pauseOff(); });
    expect(await game.state()).toBe("DRIVE");
    // the tab goes into the background: the game pauses itself
    await game.eval(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await game.state()).toBe("PAUSE");
    await still("hidden tab");
    await game.eval(() => { delete document.hidden; __T.pauseOff(); });
    await game.eval(() => __T.goGarage(true));
    await game.waitState("GARAGE");
    await still("garage");
  });

  test("the real loop takes exactly the play time it ran, at night speed and across midnight, and with the sky's clock stopped", async ({ game }) => {
    await out(game);
    await game.eval(() => { window.__DTMAX = 0; });
    for (const sky of [{ todMode: 0, tod: 23.9 }, { todMode: 2, tod: 13 }]) {
      const r = await game.eval(async (sky) => {
        const T = __T;
        Object.assign(T.save, sky);
        T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START));
        // count the time each frame hands to the drive update
        const real = window.driveUpdate;
        let played = 0;
        window.driveUpdate = (dt) => { played += dt; real(dt); };
        const tod0 = T.save.tod;
        await new Promise((res) => setTimeout(res, 2500));
        window.driveUpdate = real;
        const left = (k) => T.NEEDS_START[k] - (T.NEED_LOSS[k] * played) / 30;
        return { played, tod0, tod: T.save.tod, err: Math.max(...["energy", "hunger", "fun", "social"].map((k) => Math.abs(T.NEEDS[k] - left(k)))) };
      }, sky);
      expect(r.played).toBeGreaterThan(0.5);
      expect(r.err).toBeLessThan(1e-6);
      if (sky.todMode === 0) expect(r.tod, "the clock went past midnight").toBeLessThan(r.tod0);
      else expect(r.tod).toBe(r.tod0);
    }
  });
});

test.describe("needs: mood", () => {
  test("the lowest need at 25 or under sets the mood, kept until 35, unless another drops to 15 and lower; ties go in order", async ({ game }) => {
    await out(game);
    const mood = (n) => game.eval((n) => { Object.assign(__T.NEEDS, n); return __T.needsMood(); }, n);
    await setNeeds(game, {});
    expect(await mood({})).toBe("Okay");
    expect(await mood({ energy: 90, hunger: 80, fun: 70, social: 75 })).toBe("Content");
    expect(await mood({ energy: 26 })).toBe("Okay");
    expect(await mood({ energy: 25 })).toBe("Tired");
    expect(await mood({ energy: 34 }), "kept until 35").toBe("Tired");
    expect(await mood({ energy: 30, hunger: 20 }), "another low need, not 15").toBe("Tired");
    expect(await mood({ hunger: 15 }), "another at 15 and lower").toBe("Hungry");
    expect(await mood({ energy: 35, hunger: 35 })).toBe("Okay");
    expect(await mood({ energy: 20, hunger: 20, fun: 20 }), "a tie: the first in the list").toBe("Tired");
    // a chase: Tense, and the held mood is still there afterwards
    expect(await game.eval(() => { __T.WANTED.lvl = 1; return __T.needsMood(); })).toBe("Tense");
    expect(await game.eval(() => { __T.WANTED.lvl = 0; return __T.needsMood(); })).toBe("Tired");
  });

  test("the mood is worked out again on loading: no mood is saved", async ({ game }) => {
    const sv = { v: 3, needs: { v: 1, energy: 30, hunger: 75, fun: 65, social: 65 } };
    await game.open({ save: sv });
    // 30 is above 25: whatever the mood was when it was saved, it starts as Okay
    expect(await game.eval(() => __T.needsMood())).toBe("Okay");
    const saved = await game.readSave();
    expect(saved === null || !("mood" in saved)).toBe(true);
  });
});

test.describe("needs: putting them back", () => {
  test("a bench: +3 energy for each 5 s sat, up to +15 a visit; getting up and down again doesn't start a new visit; walking away does", async ({ game, page }) => {
    await onFoot(game);
    expect(await toBench(game, 0)).toBe("Sit on the bench");
    await setNeeds(game, { energy: 40 });
    await page.locator("#prompt").click();
    const sat = await game.eval(() => ({ on: __T.SIT.on, h: __T.FOOT.h, prompt: document.getElementById("promptTxt").textContent }));
    expect(sat.on).toBe(true);
    expect(sat.prompt).toMatch(/^Stand up · energy 40/);
    // 4.9 s: nothing yet (and the needs fall as usual); just past 5 s, +3
    const e0 = await game.eval(() => __T.NEEDS.energy);
    await steps(game, 294);
    expect(await game.eval(() => __T.VISIT.got)).toBe(0);
    expect(await game.eval(() => __T.NEEDS.energy)).toBeCloseTo(e0 - 0.49, 5);
    await steps(game, 7);
    expect(await game.eval(() => __T.VISIT.got)).toBeCloseTo(3, 5);
    expect(await game.eval(() => __T.NEEDS.energy)).toBeCloseTo(e0 - 301 / 600 + 3, 5);
    // 25 s in all: +15; then no more however long you sit
    await steps(game, 1210);
    expect(await game.eval(() => __T.VISIT.got)).toBeCloseTo(15, 5);
    await steps(game, 600);
    expect(await game.eval(() => __T.VISIT.got)).toBeCloseTo(15, 5);
    expect(await prompt(game)).toMatch(/ · rested$/);
    // walking stands you up, a step towards the fountain and clear of the bench
    await game.eval(() => { __T.keys.w = true; __T.driveUpdate(1 / 60); __T.keys.w = false; });
    const up = await game.eval(() => {
      const T = __T, B = T.QUAY.benches[0], c = T.footClear(T.FOOT.x, T.FOOT.z);
      return { on: T.SIT.on, d: Math.hypot(T.FOOT.x - B.x, T.FOOT.z - B.z), clear: Math.hypot(c[0] - T.FOOT.x, c[1] - T.FOOT.z) < 1e-6 };
    });
    expect(up).toMatchObject({ on: false, clear: true });
    expect(up.d).toBeGreaterThan(0.7);
    // down again at once: the same visit, so nothing more
    await toBench(game, 0);
    await game.key("e");
    expect(await game.eval(() => __T.SIT.on)).toBe(true);
    const e1 = await game.eval(() => __T.NEEDS.energy);
    await steps(game, 600);
    expect(await game.eval(() => __T.NEEDS.energy)).toBeCloseTo(e1 - 1, 5);
    // up and away out of the bench's reach, then back: a new visit
    await game.eval(() => __T.sitEnd());
    await toBench(game, 0, 5);
    await steps(game, 1);
    expect(await game.eval(() => __T.VISIT.b)).toBe(null);
    await toBench(game, 0);
    await game.key("e");
    await steps(game, 302);
    expect(await game.eval(() => __T.VISIT.got)).toBeCloseTo(3, 5);
  });

  test("getting up early starts the 5 s again; the police or getting hurt get you up; no bench while you're wanted", async ({ game }) => {
    await onFoot(game);
    await toBench(game, 1);
    await game.key("e");
    await steps(game, 240);   // 4 s
    await game.eval(() => __T.sitEnd());
    await toBench(game, 1);
    await game.key("e");
    await steps(game, 120);   // 2 s more: 6 s sat, but not 5 on end
    expect(await game.eval(() => __T.VISIT.got)).toBe(0);
    // hurt
    await game.eval(() => __T.hurt(5));
    await steps(game, 1);
    expect(await game.eval(() => __T.SIT.on)).toBe(false);
    // the police
    await toBench(game, 1);
    await game.key("e");
    expect(await game.eval(() => __T.SIT.on)).toBe(true);
    await game.eval(() => { __T.WANTED.lvl = 1; });
    await steps(game, 1);
    expect(await game.eval(() => __T.SIT.on)).toBe(false);
    expect(await toBench(game, 1)).toBe("Lose the police first");
    await game.key("e");
    expect(await game.eval(() => __T.SIT.on)).toBe(false);
    await game.eval(() => __T.copClear());
  });

  test("sitting holds the pistol: no aim and no fire, and a fire button held as you get up waits to be let go", async ({ game }) => {
    await game.open();
    await game.eval(() => document.getElementById("gGun").click());
    await game.driveOut();
    await game.park();
    await quiet(game);
    await freeze(game);
    await game.eval(() => { const T = __T; T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60); T.PEDS.forEach((p) => { p.m.G.visible = false; p.x = p.z = 1e5; }); });
    await game.key("f");
    await toBench(game, 2);
    await game.key("e");
    const r = await game.eval(() => {
      const T = __T, ammo = T.GUN.ammo;
      T.keys.g = true;
      for (let i = 0; i < 30; i++) T.driveUpdate(1 / 60);
      const sat = T.GUN.ammo;
      T.sitEnd();
      for (let i = 0; i < 30; i++) T.driveUpdate(1 / 60);
      const held = T.GUN.ammo;
      T.keys.g = false;
      T.driveUpdate(1 / 60);
      return { ammo, sat, held, lock: T.GUN.lock };
    });
    expect(r.sat).toBe(r.ammo);
    expect(r.held).toBe(r.ammo);
  });

  test("the Market Kitchen: a free meal, +35 hunger, with no credits at all; then not again for 30 s of play; not when full", async ({ game, page }) => {
    await onFoot(game);
    await game.eval(() => { __T.save.cr = 0; });
    await setNeeds(game, { hunger: 30 });
    expect(await toKitchen(game)).toBe("Eat at the Market Kitchen · free");
    await game.watchToasts();
    // two presses in the same moment: one meal
    await game.eval(() => { __T.needsEat(); __T.needsEat(); });
    expect((await needs(game)).hunger).toBe(65);
    expect(await game.eval(() => __T.save.cr)).toBe(0);
    expect(await game.eval(() => __T.save.needs.hunger), "saved straight away").toBe(65);
    expect(await prompt(game)).toBe("Market Kitchen · you've just eaten");
    await page.locator("#prompt").click();
    expect((await needs(game)).hunger).toBe(65);
    const log = await game.toastLog();
    expect(log[0]).toMatch(/^A GOOD MEAL \| Hunger \+35/);
    expect(log[1]).toMatch(/^YOU'VE JUST EATEN/);
    // 30 s of play later it serves you again
    await steps(game, 1810);
    expect(await prompt(game)).toBe("Eat at the Market Kitchen · free");
    await game.key("e");
    expect((await needs(game)).hunger).toBe(98);
    // full: no meal, and no wait either
    await steps(game, 1810);
    await setNeeds(game, { hunger: 100 });
    await steps(game, 1);
    await game.eval(() => { __T.NEEDS.hunger = 100; });
    expect(await game.eval(() => __T.needsEat())).toBe(false);
    expect(await game.eval(() => __T.NS.mealAt < __T.NS.t)).toBe(true);
    // wanted: not now
    await game.eval(() => { __T.NEEDS.hunger = 40; __T.WANTED.lvl = 1; });
    expect(await toKitchen(game)).toBe("Lose the police first");
    expect(await game.eval(() => __T.needsEat())).toBe(false);
    await game.eval(() => __T.copClear());
  });

  test("rest at home: REST in the garage is +40 energy, then not again for 30 s of play; a trip home on its own is no rest", async ({ game, page }) => {
    await game.open();
    await setNeeds(game, { energy: 30 });
    await game.eval(() => __T.restSync());
    await expect(page.locator("#gRest")).toHaveText("REST · ENERGY 30");
    await page.locator("#gRest").click();
    expect((await needs(game)).energy).toBe(70);
    expect(await game.eval(() => __T.state)).toBe("GARAGE");
    await expect(page.locator("#gRest")).toHaveText("RESTED · ENERGY 70");
    await expect(page.locator("#gRest")).toBeDisabled();
    expect(await game.eval(() => __T.needsRest())).toBe(false);
    expect(await game.eval(() => __T.save.needs.energy)).toBe(70);
    // out for 30 s, knocked out and home: no rest for it, but REST works again
    await game.driveOut();
    await game.park();
    await quiet(game);
    await freeze(game);
    await steps(game, 1810);
    const before = await game.eval(() => __T.NEEDS.energy);
    await game.eval(() => __T.knockedOut());
    await game.waitState("GARAGE");
    expect(await game.eval(() => __T.NEEDS.energy)).toBeCloseTo(before, 5);
    await expect(page.locator("#gRest")).toHaveText("REST · ENERGY 67");
    // a controller's X rests too
    await game.eval(PAD, 2);
    expect((await needs(game)).energy).toBe(100);
    await expect(page.locator("#gRest")).toHaveText("ENERGY FULL");
    await expect(page.locator("#gRest")).toBeDisabled();
  });

  test("finishing a race or a time trial is +15 fun, at the result, whatever the place; quitting is nothing", async ({ game }) => {
    await out(game);
    const fin = (type, quit) =>
      game.eval(([type, quit]) => {
        const T = __T;
        T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START, { fun: 20 }));
        T.startEvent(T.EVENTS.find((E) => E.type === type));
        const f0 = T.NEEDS.fun;
        if (quit) T.endEvent();
        else {
          // last place in a race, no medal in a time trial
          T.ev.t = 500;
          if (T.ev.ai) for (const a of T.ev.ai) a.fin = 0.5;
          T.finishEvent();
          T.showResult();
          document.getElementById("rOk").click();
        }
        return T.NEEDS.fun - f0;
      }, [type, quit]);
    expect(await fin("race", false)).toBeCloseTo(15, 5);
    expect(await fin("tt", false)).toBeCloseTo(15, 5);
    expect(await fin("race", true)).toBe(0);
  });

  test("speed: a point of fun for each 5 s on end at 80 km/h or more, or 3 m/s on the boat; slowing down starts again", async ({ game }) => {
    await out(game);
    const run = (plan) =>
      game.eval((plan) => {
        const T = __T, P = T.P;
        T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START, { fun: 50 }));
        const f0 = T.NEEDS.fun;
        let s = 0;
        for (const [kph, secs] of plan) {
          for (let i = 0; i < secs * 60; i++) {
            P.vx = Math.sin(P.h) * (kph / 3.6);
            P.vz = Math.cos(P.h) * (kph / 3.6);
            T.needsTick(1 / 60);
            s += 1 / 60;
          }
        }
        P.vx = P.vz = 0;
        return T.NEEDS.fun - f0 + (3 * s) / 30;   // what speed gave, without what time took
      }, plan);
    expect(await run([[80.01, 10.01]])).toBeCloseTo(2, 5);
    expect(await run([[79.9, 10.01]])).toBeCloseTo(0, 5);
    expect(await run([[120, 4.9], [60, 0.02], [120, 4.9]]), "slowing down starts the 5 s again").toBeCloseTo(0, 5);
    // the boat, from the pier
    const boat = await game.eval(() => {
      const T = __T, B = T.BOAT;
      T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START, { fun: 50 }));
      B.on = true;
      const f0 = T.NEEDS.fun;
      let s = 0;
      const go = (v, secs) => { for (let i = 0; i < secs * 60; i++) { B.v = v; T.needsTick(1 / 60); s += 1 / 60; } };
      go(2.9, 6);
      const slow = T.NEEDS.fun - f0 + (3 * s) / 30;
      go(3.001, 5.01);
      const fast = T.NEEDS.fun - f0 + (3 * s) / 30;
      B.on = false;
      B.v = 0;
      return { slow, fast };
    });
    expect(boat.slow).toBeCloseTo(0, 5);
    expect(boat.fast).toBeCloseTo(1, 5);
  });

  test("company: the first friendly line in a conversation is +8 social, once; that person gives no more for 30 s of play", async ({ game }) => {
    await onFoot(game);
    // person i standing still on a pavement, you 1.8 m along it facing them
    const meet = (i) =>
      game.eval((i) => {
        const T = __T, F = T.FOOT, walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40), e = walks[i];
        T.PEDS.forEach((q, k) => { q.m.G.visible = k === i; if (k !== i) { q.x = q.z = 1e5; } });
        const p = T.PEDS[i];
        p.e = e; p.from = e.a; p.s = 20; p.st = "idle"; p.t = 999; p.fall = 0; p.hitAt = undefined; p.mad = false;
        T.driveUpdate(1 / 60);
        const ax = e.b.x - e.a.x, az = e.b.z - e.a.z, L = Math.hypot(ax, az);
        F.x = p.x - (ax / L) * 1.8; F.z = p.z - (az / L) * 1.8; F.h = Math.atan2(p.x - F.x, p.z - F.z); F.y = T.footGround(F.x, F.z);
        T.driveUpdate(1 / 60);
        const s0 = T.NEEDS.social, ok = T.talkOpen(p);
        return ok && T.NEEDS.social === s0;   // walking up to someone is nothing in itself
      }, i);
    const say = (k) => game.eval((k) => { const T = __T, s = T.NEEDS.social; T.TALK.busy = 0; T.talkPick(k); return Math.round((T.NEEDS.social - s) * 100) / 100; }, k);
    await setNeeds(game, { social: 30 });
    expect(await meet(0)).toBe(true);
    expect(await say("rude"), "rude is nothing").toBe(0);
    expect(await say("hello")).toBe(8);
    expect(await say("chat"), "once a conversation").toBe(0);
    await game.eval(() => __T.talkClose());
    expect(await meet(0)).toBe(true);
    expect(await say("compliment"), "the same person again within 30 s").toBe(0);
    await game.eval(() => __T.talkClose());
    expect(await meet(1)).toBe(true);
    expect(await say("hello"), "someone else").toBe(8);
    await game.eval(() => __T.talkClose());
    await steps(game, 1810);
    expect(await meet(0)).toBe(true);
    expect(await say("chat"), "30 s later").toBe(8);
    await game.eval(() => __T.talkClose());
  });

  test("a need never goes past 100 or under 0", async ({ game }) => {
    await out(game);
    const r = await game.eval(() => {
      const T = __T;
      T.needsLoad(Object.assign({ v: 1 }, T.NEEDS_START, { fun: 95, hunger: 1 }));
      const got = T.needsAdd("fun", 15);
      for (let i = 0; i < 60 * 60; i++) T.driveUpdate(1 / 60);
      return { got, fun: T.NEEDS.fun, hunger: T.NEEDS.hunger };
    });
    expect(r.got).toBeCloseTo(5, 5);
    expect(r.hunger).toBe(0);
    expect(r.fun).toBeLessThanOrEqual(100);
  });
});

test.describe("needs: the hint", () => {
  test("one hint when a need drops to 25, in free ride; none again until it's back to 35; it waits for a contract and for other messages", async ({ game }) => {
    await out(game);
    // whatever came up on driving out has gone
    await page_wait(game, 3500);
    await game.watchToasts();
    const hints = async () => (await game.toastLog()).filter((t) => /^(TIRED|HUNGRY|BORED|LONELY) \|/.test(t));
    await setNeeds(game, { hunger: 25.6 });
    await steps(game, 60 * 7);
    expect(await hints()).toEqual(["HUNGRY | The Market Kitchen in Old Quay serves a free meal"]);
    await steps(game, 60 * 20);
    expect((await hints()).length, "once").toBe(1);
    // back to 35: it can tell you again
    await game.eval(() => { __T.NEEDS.hunger = 36; __T.driveUpdate(1 / 60); __T.NEEDS.hunger = 25.5; });
    await page_wait(game, 3500);
    await steps(game, 60 * 4);
    expect((await hints()).length).toBe(2);
    // during a contract it waits, and comes when the contract is over
    await game.eval(() => { __T.NEEDS.energy = 26; __T.jobStart(__T.JOBS[0]); });
    await page_wait(game, 3500);
    await steps(game, 60 * 12);
    expect((await hints()).length).toBe(2);
    await game.eval(() => __T.jobEnd("abandoned"));
    await page_wait(game, 3500);
    await steps(game, 2);
    expect((await hints()).slice(-1)).toEqual(["TIRED | Sit on a bench by the fountain, or go home and rest"]);
    // another message on screen: it waits for that to go
    await game.eval(() => { __T.NEEDS.fun = 25.02; __T.toast("SOMETHING ELSE", "on screen"); });
    await steps(game, 60);
    expect((await hints()).length).toBe(3);
    await page_wait(game, 3500);
    await steps(game, 1);
    expect((await hints()).slice(-1)[0]).toMatch(/^BORED/);
    await game.eval(() => __T.toast("LANDMARK DISCOVERED", "Found in Old Quay"));
    await expect(game.page.locator("#toasts .needHint")).toHaveCount(0);
    await expect(game.page.locator("#toasts .toast").first()).toContainText("LANDMARK DISCOVERED");
  });
});
const page_wait = (game, ms) => game.page.waitForTimeout(ms);

test.describe("needs: the save", () => {
  test("saved as whole numbers, kept with fractions in play; 0 and 100 come back as they were", async ({ game }) => {
    await out(game);
    await setNeeds(game, {});
    await steps(game, 600);
    const r = await game.eval(() => { __T.persist(); return { live: __T.NEEDS.energy, saved: JSON.parse(localStorage.getItem(__T.SAVE_KEY)).needs }; });
    expect(r.live).toBeCloseTo(79, 5);
    expect(r.saved).toEqual({ v: 1, energy: 79, hunger: 74, fun: 64, social: 64 });
    await game.eval(() => { __T.needsLoad({ v: 1, energy: 0, hunger: 100, fun: 0, social: 100 }); __T.persist(); });
    await game.reload();
    expect(await needs(game)).toEqual({ energy: 0, hunger: 100, fun: 0, social: 100 });
  });

  for (const [what, stored, want] of [
    ["a save from before needs", undefined, { v: 1, energy: 80, hunger: 75, fun: 65, social: 65 }],
    ["a list", [1, 2, 3], { v: 1, energy: 80, hunger: 75, fun: 65, social: 65 }],
    ["another version", { v: 2, energy: 10, hunger: 10, fun: 10, social: 10 }, { v: 1, energy: 80, hunger: 75, fun: 65, social: 65 }],
    ["broken numbers", { v: 1, energy: "50", hunger: null, fun: 1e999, social: -20, mood: "Tired", extra: 5 }, { v: 1, energy: 80, hunger: 75, fun: 65, social: 0 }],
    ["out of range and fractions", { v: 1, energy: 140, hunger: 12.6, fun: 0, social: 99.4 }, { v: 1, energy: 100, hunger: 13, fun: 0, social: 99 }],
  ])
    test(`a broken save: ${what}`, async ({ game }) => {
      const sv = { v: 3, cr: 5000 };
      if (stored !== undefined) sv.needs = stored;
      await game.open({ save: sv });
      expect(await game.eval(() => __T.save.needs)).toEqual(want);
      expect(await game.eval(() => __T.save.cr)).toBe(5000);
    });
});

test.describe("needs: the pause menu's Needs screen", () => {
  const read = (game) =>
    game.eval(() => ({
      open: !document.getElementById("needs").classList.contains("hide"),
      mood: document.getElementById("ndMood").textContent,
      tip: document.getElementById("ndTip").textContent,
      rows: [...document.querySelectorAll("#ndList .ndr")].map((r) => [r.querySelector(".ndl").textContent, r.querySelector("b").textContent, r.querySelector("em").textContent, r.querySelector(".ndb").getAttribute("aria-valuenow")]),
      focus: document.activeElement && document.activeElement.id,
      state: __T.state,
    }));

  test("four labelled bars with their numbers and a word for each colour, the mood and one suggestion; Escape goes back to the NEEDS button", async ({ game, page }) => {
    await out(game);
    await setNeeds(game, { energy: 20, hunger: 90, fun: 50, social: 10 });
    await game.eval(() => __T.pauseOn());
    await expect(page.locator("#pNeeds")).toHaveText("NEEDS · LONELY");
    await page.locator("#pNeeds").click();
    const r = await read(game);
    expect(r).toMatchObject({ open: true, mood: "Lonely", focus: "ndClose", state: "PAUSE" });
    expect(r.rows).toEqual([["Energy", "20", "Low", "20"], ["Hunger", "90", "Good", "90"], ["Fun", "50", "Okay", "50"], ["Social", "10", "Very low", "10"]]);
    expect(r.tip).toMatch(/talk/);
    await game.key("Escape");
    expect(await read(game)).toMatchObject({ open: false, focus: "pNeeds", state: "PAUSE" });
    // Content, and a chase
    await setNeeds(game, { energy: 90, hunger: 90, fun: 90, social: 90 });
    await game.eval(() => __T.needsOpen());
    expect((await read(game)).mood).toBe("Content");
    await game.eval(() => { __T.needsClose(); __T.pauseOff(); __T.WANTED.lvl = 2; __T.wantedHud(); __T.pauseOn(); });
    await expect(page.locator("#pNeeds")).toHaveText("NEEDS · TENSE");
    await game.eval(() => __T.needsOpen());
    expect(await read(game)).toMatchObject({ mood: "Tense", tip: expect.stringMatching(/police/) });
    await game.eval(() => { __T.needsClose(); __T.copClear(); });
  });

  test("with the keyboard alone: Tab to NEEDS, Enter opens it, Escape closes it on NEEDS again", async ({ game, page }) => {
    await out(game);
    await game.key("Escape");
    await game.waitState("PAUSE");
    for (let i = 0; i < 12 && (await game.eval(() => document.activeElement && document.activeElement.id)) !== "pNeeds"; i++) await page.keyboard.press("Tab");
    expect(await game.eval(() => document.activeElement.id)).toBe("pNeeds");
    await page.keyboard.press("Enter");
    expect(await read(game)).toMatchObject({ open: true, focus: "ndClose" });
    await page.keyboard.press("Escape");
    expect(await read(game)).toMatchObject({ open: false, focus: "pNeeds", state: "PAUSE" });
    // Enter on CLOSE closes it too
    await page.keyboard.press("Enter");
    expect((await read(game)).open).toBe(true);
    await page.keyboard.press("Enter");
    expect(await read(game)).toMatchObject({ open: false, focus: "pNeeds" });
  });

  test("with a controller: the D-pad moves through the pause menu, A opens NEEDS, B closes it on NEEDS again, B again resumes", async ({ game }) => {
    await out(game);
    await game.eval(() => __T.pauseOn());
    // down from nothing picked: RESUME, then MAP & GPS, PHOTO MODE, NEEDS
    for (let i = 0; i < 4; i++) await game.eval(PAD, 13);
    expect(await game.eval(() => ({ id: document.activeElement.id, sel: document.activeElement.classList.contains("padSel") }))).toEqual({ id: "pNeeds", sel: true });
    await game.eval(PAD, 0);
    expect(await read(game)).toMatchObject({ open: true, focus: "ndClose" });
    await game.eval(PAD, 1);
    expect(await read(game)).toMatchObject({ open: false, focus: "pNeeds", state: "PAUSE" });
    await game.eval(PAD, 12);
    expect(await game.eval(() => document.activeElement.id)).toBe("pPhoto");
    await game.eval(PAD, 1);
    expect(await game.state()).toBe("DRIVE");
  });

  for (const size of [{ name: "portrait phone", width: 360, height: 640 }, { name: "landscape phone", width: 640, height: 360 }])
    test.describe(size.name, () => {
      test.use({ viewport: { width: size.width, height: size.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      test(`fits a ${size.width}x${size.height} phone with a contract and wanted stars on, with touch targets of 44 px; at twice the size it scrolls`, async ({ game, page }) => {
        await out(game);
        await game.eval(() => { __T.jobStart(__T.JOBS.find((j) => j.type === "courier")); __T.WANTED.lvl = 2; __T.wantedHud(); });
        await game.eval(() => __T.pauseOn());
        await page.locator("#pNeeds").tap();
        const box = () =>
          game.eval(() => {
            const card = document.querySelector("#needs .card"), r = (e) => e.getBoundingClientRect();
            const inView = (e) => { const b = r(e); return b.top >= -1 && b.left >= -1 && b.bottom <= innerHeight + 1 && b.right <= innerWidth + 1; };
            return {
              card: inView(card), scrolls: card.scrollHeight > card.clientHeight + 1, wide: card.scrollWidth > card.clientWidth + 1,
              close: inView(document.getElementById("ndClose")), closeH: r(document.getElementById("ndClose")).height,
              rows: [...document.querySelectorAll("#ndList .ndr")].every(inView), mood: document.getElementById("ndMood").textContent,
            };
          });
        const b = await box();
        expect(b).toMatchObject({ card: true, wide: false, mood: "Tense" });
        expect(b.closeH).toBeGreaterThanOrEqual(44);
        expect(b.rows && b.close, "everything on screen at once").toBe(true);
        // the NEEDS button is the same size as the rest of the pause menu
        expect(await game.eval(() => document.getElementById("pNeeds").getBoundingClientRect().height)).toBeCloseTo(await game.eval(() => document.getElementById("pPass").getBoundingClientRect().height), 0);
        // text twice the size: the card scrolls to CLOSE, nothing runs off the side, and CLOSE still closes it
        await game.eval(() => { document.documentElement.style.zoom = "2"; });
        const z = await box();
        expect(z.card).toBe(true);
        expect(z.wide).toBe(false);
        if (!z.close) expect(z.scrolls, "CLOSE is reachable by scrolling").toBe(true);
        await page.locator("#ndClose").scrollIntoViewIfNeeded();
        await page.locator("#ndClose").tap();
        expect((await read(game)).open).toBe(false);
        await game.eval(() => { document.documentElement.style.zoom = ""; __T.copClear(); });
      });
    });
});

test.describe("needs: the places", () => {
  test("the Market Kitchen stands on a market stall's own footprint, its counter is clear, and you can walk up from either end of the aisle and past it", async ({ game }) => {
    await onFoot(game);
    const r = await game.eval(() => {
      const T = __T, K = T.QUAY.kitchen, boxes = [];
      T.obstaclesNear(K.sx, K.sz, 0.5, (o) => { if (!o.c) boxes.push([o.hx, o.hz]); });
      const next = [];
      T.obstaclesNear(K.sx, K.sz - 8, 0.5, (o) => { if (!o.c) next.push([o.hx, o.hz]); });
      const c = T.footClear(K.x, K.z);
      return { boxes, next, clear: Math.hypot(c[0] - K.x, c[1] - K.z) < 1e-6 };
    });
    expect(r.boxes).toEqual(r.next);   // the same as the stall beside it
    expect(r.clear).toBe(true);
    for (const [from, h, to] of [[-9, 0, 5], [6, Math.PI, -5]]) {
      const walk = await game.eval(([from, h, to]) => {
        const T = __T, F = T.FOOT, K = T.QUAY.kitchen;
        F.x = K.x - 0.6; F.z = K.z + from; F.h = h; F.v = 0; F.y = T.footGround(F.x, F.z);
        T.keys.w = true;
        let seen = false, i = 0;
        for (; i < 900 && (h === 0 ? F.z < K.z + to : F.z > K.z + to); i++) {
          T.driveUpdate(1 / 60);
          if (document.getElementById("promptTxt").textContent === "Eat at the Market Kitchen · free" && !document.getElementById("prompt").classList.contains("hide")) seen = true;
        }
        T.keys.w = false;
        return { seen, past: h === 0 ? F.z >= K.z + to : F.z <= K.z + to, dx: Math.abs(F.x - (K.x - 0.6)) };
      }, [from, h, to]);
      expect(walk).toMatchObject({ seen: true, past: true });
      expect(walk.dx).toBeLessThan(0.05);
    }
  });

  test("the six benches round the fountain: each one seats you facing the fountain, and you walk round between them and the fountain", async ({ game }) => {
    await onFoot(game);
    expect(await game.eval(() => __T.QUAY.benches.length)).toBe(6);
    for (let b = 0; b < 6; b++) {
      expect(await toBench(game, b)).toBe("Sit on the bench");
      await game.key("e");
      const s = await game.eval(() => {
        const T = __T, F = T.FOOT, [fx, fz] = T.QUAY.fountain;
        const face = Math.atan2(fx - F.x, fz - F.z), off = Math.abs(Math.atan2(Math.sin(face - F.h), Math.cos(face - F.h)));
        return { on: T.SIT.on, off, y: T.FOOT.m.G.position.y, seat: T.SIT.b.y };
      });
      expect(s.on).toBe(true);
      expect(s.off).toBeLessThan(0.01);
      expect(s.seat - s.y).toBeCloseTo(0.84, 2);
      await game.eval(() => __T.sitEnd());
    }
    // a lap at 7 m from the fountain's middle, between its rim and the benches: nothing in the way
    const lap = await game.eval(() => {
      const T = __T, F = T.FOOT, [fx, fz] = T.QUAY.fountain;
      let worst = 0;
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2, x = fx + Math.sin(a) * 7, z = fz + Math.cos(a) * 7, c = T.footClear(x, z);
        worst = Math.max(worst, Math.hypot(c[0] - x, c[1] - z));
      }
      return worst;
    });
    expect(lap).toBeLessThan(1e-6);
  });
});

test("playing together: a friend driving fast beside you earns you nothing; only what you do counts", async ({ game, page, browser }) => {
  test.setTimeout(240000);
  const { Game } = require("./support/game");
  const PATH = "/index.html?mp=local";
  const ctx2 = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 720 } });
  const friend = new Game(await ctx2.newPage());
  await game.open({ path: PATH });
  await friend.open({ path: PATH });
  for (const g of [game, friend]) { await g.driveOut(); await g.park(); await quiet(g); }
  // Jo starts a room, Ali joins it
  await game.eval(() => __T.pauseOn());
  await page.locator("#pPlay").click();
  await page.locator("#plStart").click();
  await expect(page.locator("#plRoom")).toHaveText(/^[A-HJ-NP-Z2-9]{4}$/, { timeout: 10000 });
  const code = await page.locator("#plRoom").textContent();
  await friend.eval(() => __T.pauseOn());
  await friend.page.locator("#pPlay").click();
  await friend.page.locator("#plCode").fill(code);
  await friend.page.locator("#plJoin").click();
  await expect(page.locator("#plCount")).toHaveText("2 of 4 players", { timeout: 10000 });
  for (const g of [game, friend]) { await g.page.locator("#plClose").click(); await g.eval(() => __T.pauseOff()); await freeze(g); }
  // Ali, next to Jo, drives at 100 km/h for 10 s, then eats at the kitchen; Jo stands still for the same 10 s
  const at = await game.eval(() => ({ x: __T.P.x, z: __T.P.z }));
  await friend.park(at.x + 8, at.z);
  await setNeeds(game, {});
  await setNeeds(friend, {});
  await friend.eval(() => {
    const T = __T, P = T.P;
    for (let i = 0; i < 601; i++) { P.vx = Math.sin(P.h) * (100 / 3.6); P.vz = Math.cos(P.h) * (100 / 3.6); T.needsTick(1 / 60); }
    P.vx = P.vz = 0;
  });
  await friend.page.waitForTimeout(800);
  expect(await game.eval(() => [...__T.NET.peers.values()].length)).toBe(1);
  await steps(game, 601);
  const jo = await game.eval(() => __T.NEEDS.fun), ali = await friend.eval(() => __T.NEEDS.fun);
  expect(jo).toBeCloseTo(65 - 601 / 600, 5);
  expect(ali).toBeCloseTo(65 - 601 / 600 + 2, 5);
  await ctx2.close();
});

test("Needs keeps keyboard focus off Pause and the room code accepts D-pad focus", async ({ game, page }) => {
  await out(game);
  await game.eval(() => __T.pauseOn());
  await page.locator("#pNeeds").click();
  await page.locator("#pRes").evaluate(el => el.focus());
  await expect(page.locator("#ndClose")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pNeeds")).toBeFocused();
  await page.locator("#pPlay").click();
  await page.locator("#plStart").focus();
  await game.eval(PAD, 13);
  await expect(page.locator("#plCode")).toBeFocused();
});

test("standing up on the reward frame ends a bench interval before it pays", async ({ game }) => {
  await onFoot(game);
  await toBench(game);
  const result = await game.eval(() => {
    const T = __T;
    T.promptAct();
    T.SIT.t = 4.99;
    T.keys.w = true;
    T.driveUpdate(1 / 30);
    T.keys.w = false;
    return { sitting: T.SIT.on, gain: T.VISIT.got };
  });
  expect(result).toEqual({ sitting: false, gain: 0 });
});
