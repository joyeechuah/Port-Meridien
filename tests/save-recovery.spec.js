// When the browser won't take the save (js/core.js persist): it goes in again without the time trial ghost laps;
// if it still won't, the last save that went in stays as it was, and NOT SAVED shows on the HUD and in the garage
// until one does (signed in: IN YOUR ACCOUNT ONLY, once the account holds all of it). And the save's size limits:
// js/progress.js saveTrim, and the friendships, wants and aspirations as js/core.js reads them
const { test, expect } = require("./support/game");

// this page's storage refuses the game's save while window.__refuse says so: "ghosts", a save with ghost laps in it;
// true, every save. All else is stored as usual. Every message is kept from the very start
const refuse = (page, how) =>
  page.addInitScript((how) => {
    const real = Storage.prototype.setItem;
    window.__refuse = how;
    Storage.prototype.setItem = function (k, v) {
      if (k === "port-meridien-v1" && (window.__refuse === true || (window.__refuse === "ghosts" && !String(v).includes('"ghost":{}'))))
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      return real.call(this, k, v);
    };
    window.__allToasts = [];
    document.addEventListener("DOMContentLoaded", () =>
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) if (n.querySelector && n.querySelector("b")) window.__allToasts.push(n.querySelector("b").textContent);
      }).observe(document.getElementById("toasts"), { childList: true })
    );
  }, how);
test("a save too big with its ghost laps goes in without them, says so once, and the progress loads back", async ({ game, page }) => {
  await refuse(page, "ghosts");
  await game.open();
  await game.driveOut();
  const r = await game.eval(async () => {
    const T = __T;
    T.save.ghost.south = { c: T.save.cur, t: 75, d: [0, 0, 0, 0, 1, 1, 0, 2] };
    T.earn(1500);
    T.persist();
    T.persist();
    await new Promise((r) => setTimeout(r, 0));
    const stored = JSON.parse(localStorage.getItem("port-meridien-v1"));
    return { ok: T.SAVE.ok, hud: !document.getElementById("saveHud").classList.contains("hide"), said: window.__allToasts.filter((t) => t === "GHOST LAPS NOT SAVED").length, ghost: stored.ghost, cr: stored.cr, kept: !!T.save.ghost.south };
  });
  // (the ghost lap stays for the rest of this visit)
  expect(r).toEqual({ ok: true, hud: false, said: 1, ghost: {}, cr: 121500, kept: true });
  await game.reload();
  expect(await game.eval(() => [__T.save.cr, __T.save.ghost])).toEqual([121500, {}]);
});

test("a browser taking no save keeps the last one, and NOT SAVED shows on the HUD and in the garage until one goes in", async ({ game, page }) => {
  await refuse(page, false);
  await game.open();
  await game.driveOut();
  const r = await game.eval(async () => {
    const T = __T, on = (id) => !document.getElementById(id).classList.contains("hide");
    T.persist();
    const before = localStorage.getItem("port-meridien-v1");
    window.__refuse = true;
    T.earn(2500);
    T.persist();
    T.persist();
    const hud = [on("saveHud"), document.getElementById("saveHud").textContent];
    document.getElementById("saveHud").click();
    await new Promise((r) => setTimeout(r, 0));
    return { ok: T.SAVE.ok, kept: localStorage.getItem("port-meridien-v1") === before, hud, said: window.__allToasts.filter((t) => t === "PROGRESS NOT SAVED").length };
  });
  // said once by itself, and again on the tap
  expect(r).toEqual({ ok: false, kept: true, hud: [true, "NOT SAVED"], said: 2 });
  await game.eval(() => __T.goGarage());
  await game.waitState("GARAGE");
  const g = await game.eval(() => {
    const on = (id) => !document.getElementById(id).classList.contains("hide"), b = document.getElementById("gSave").getBoundingClientRect();
    const before = on("gSave") && b.height > 0;
    window.__refuse = false;
    __T.persist();
    return { before, after: on("gSave") || on("saveHud"), cr: JSON.parse(localStorage.getItem("port-meridien-v1")).cr };
  });
  expect(g).toEqual({ before: true, after: false, cr: 122500 });
});

test("signed in, with the browser taking no save: IN YOUR ACCOUNT ONLY while the account holds all of it", async ({ game, page }) => {
  await refuse(page, false);
  await page.addInitScript(() => {
    // already signed in on this device, with an empty account
    localStorage.setItem("port-meridien-cloud", JSON.stringify({ uid: "u1" }));
    const me = { uid: "u1", name: "Jo" };
    window.__cloudGap = 0;
    window.__puts = 0;
    window.__cloudAdapter = {
      loaded: true,
      init: () => Promise.resolve(me),
      signIn: () => Promise.resolve(me),
      signOut: () => Promise.resolve(),
      get: () => Promise.resolve(window.__doc || null),
      put(uid, data, rev) {
        window.__doc = Object.assign({}, data, { rev: rev + 1, at: Date.now() });
        window.__puts++;
        return Promise.resolve({ ok: true, rev: rev + 1 });
      },
    };
  });
  await game.open();
  await game.driveOut();
  await expect.poll(() => game.eval(() => window.__puts)).toBeGreaterThan(0);
  const r = await game.eval(async () => {
    const T = __T, hud = document.getElementById("saveHud"), at = () => [!hud.classList.contains("hide"), hud.textContent, hud.classList.contains("acct")];
    window.__refuse = true;
    T.earn(2500);
    T.persist();
    // the account hasn't the 2,500 yet
    const behind = at();
    // the backup, a few seconds after a change (here at once); then the account has all of it
    await T.clSync();
    const synced = at();
    T.earn(100);
    T.persist();
    const again = at();
    window.__refuse = false;
    T.persist();
    return { behind, synced, again, after: at()[0], cloud: JSON.parse(window.__doc.save).cr };
  });
  expect(r).toEqual({
    behind: [true, "NOT SAVED", false],
    synced: [true, "IN YOUR ACCOUNT ONLY", true],
    again: [true, "NOT SAVED", false],
    after: false,
    cloud: 122500,
  });
});

test("a save keeps all of this version's records, discoveries and ghost laps, and at most 64 others of up to 64 characters", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T, s = T.save, lap = { c: s.cur, t: 70, d: [0, 0, 0, 0, 1, 1, 0, 2] };
    // a thousand entries nothing in this version reads, and one with a long id, ahead of the real ones
    const junk = (o, v) => {
      for (let i = 0; i < 1000; i++) o["old" + i] = v;
      o["x".repeat(65)] = v;
    };
    const lm = T.LANDMARKS.slice(0, 3).map((l) => l.id), known = () => T.LANDMARKS.filter((l) => s.found[l.id]).length, job = T.JOBS[0].id;
    junk(s.rec, 50); s.rec.south = 61.5; s.rec.talaia = 99;
    junk(s.radar, 100); s.radar.r0 = 180;
    junk(s.found, 1); for (const id of lm) s.found[id] = 1;
    junk(s.paint, 0x123456); s.paint[s.cur] = 0xabcdef;
    junk(s.jobs.runs, 2); s.jobs.runs[job] = 4;
    junk(s.ghost, lap); s.ghost.south = lap; s.ghost.talaia = lap;
    const before = { known: known(), bonus: s.passBonus };
    T.saveTrim();
    const others = (o, real) => Object.keys(o).filter((k) => !real.includes(k));
    return {
      before, after: { known: known(), bonus: s.passBonus },
      rec: [s.rec.south, s.rec.talaia, others(s.rec, ["south", "talaia"]).length], radar: [s.radar.r0, others(s.radar, ["r0"]).length],
      found: [lm.every((id) => s.found[id] === 1), others(s.found, lm).length], paint: [s.paint[s.cur], others(s.paint, [s.cur]).length],
      runs: [s.jobs.runs[job], others(s.jobs.runs, [job]).length], ghost: Object.keys(s.ghost),
      long: [s.rec, s.radar, s.found, s.paint, s.jobs.runs].some((o) => Object.keys(o).some((k) => k.length > 64)),
    };
  });
  expect(r.after).toEqual(r.before);
  expect(r.before.known).toBe(3);
  // talaia is a race: a record, but no ghost lap
  expect(r).toMatchObject({ rec: [61.5, 99, 64], radar: [180, 64], found: [true, 64], paint: [0xabcdef, 64], runs: [4, 64], ghost: ["south"], long: false });
});

test("friendships, wants and aspirations keep their limits, and the same save comes back after a save and a reload", async ({ game }) => {
  await game.open({
    save: {
      v: 3,
      rel: { 16: { f: 5, n: 3 }, 3: { f: 200, n: 10000 } },
      wants: { v: 1, active: ["meet", "walk", "friendly"], completed: { nope: 3, race: 2e9 } },
      aspire: { v: 1, claimed: { nope: 2, chef: 7 } },
    },
  });
  const read = () => game.eval(() => ({ rel: __T.save.rel, done: __T.save.wants.completed, claimed: __T.save.aspire.claimed }));
  await game.eval(() => __T.persist());
  const first = await read();
  expect(first).toMatchObject({ rel: { 3: { f: 100, n: 9999 } }, done: { race: 1e9 } });
  expect(Object.keys(first.rel)).toEqual(["3"]);
  // (the friend and the billion wants done pay their aspiration steps when the game saves)
  expect(first.claimed.chef).toBe(3);
  expect(first.claimed.nope).toBeUndefined();
  await game.reload();
  expect(await read()).toEqual(first);
});
