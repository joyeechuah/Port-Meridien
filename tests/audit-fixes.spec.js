// Fixes from Codex's audit of main at 3da4726: the cloud save's keys over repairs, a friend's walker freeing what it
// owns, the room list noticing a friend gone quiet, and the repair sum agreeing with its price
const { test, expect } = require("./support/game");
const fs = require("node:fs"),
  vm = require("node:vm");

test("an invitation from a room on the local relay keeps ?mp=local in its link", () => {
  const src = fs.readFileSync(require.resolve("../js/net.js"), "utf8"),
    line = (a) => { const i = src.indexOf(a); return src.slice(i, src.indexOf("\n", i)); };
  const run = (search) => vm.runInNewContext(line("const netLocal=") + "\n" + line("const netInvite=") + "\nnetInvite()",
    { NET: { room: "QX7P" }, location: { origin: "https://joyeechuah.github.io", pathname: "/Port-Meridien/", search } });
  expect(run("?mp=local")).toBe("Play Port Meridien with me: room QX7P. https://joyeechuah.github.io/Port-Meridien/?mp=local");
  expect(run("")).toBe("Play Port Meridien with me: room QX7P. https://joyeechuah.github.io/Port-Meridien/");
});

test("Escape over repairs with the cloud's choice open closes the choice; repairs stay open and the game stays paused", async ({ game, page }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => { __T.openRepair(); __T.show("cloudPick", true); });
  const read = () => game.eval(() => ({ pick: __T.clOverlayOpen(), repair: !document.getElementById("repair").classList.contains("hide"), state: __T.state }));
  expect(await read()).toEqual({ pick: true, repair: true, state: "PAUSE" });
  await page.keyboard.press("Escape");
  expect(await read()).toEqual({ pick: false, repair: true, state: "PAUSE" });
  await page.keyboard.press("Escape");
  expect(await read()).toEqual({ pick: false, repair: false, state: "DRIVE" });
});

test("the repair sum shows the rule, what it comes to and the Handiness discount, and ends on the button's price", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T;
    T.P.damage = 50;
    T.save.skills.handiness = T.skillThreshold(10);
    T.openRepair();
    return { hint: document.getElementById("repairHint").textContent, button: document.getElementById("repairNow").textContent };
  });
  expect(r.hint).toBe("Garage repairs are FREE. Roadside repairs cost 1,000 + 20 credits per damage percentage point: 2,000 CR, less 30% for your Handiness: 1,400 CR.");
  expect(r.button).toBe("ROADSIDE REPAIR · 1,400 CR");
  // and a Gearhead's 10% after it (js/core.js traits)
  const g = await game.eval(() => { const T = __T; T.save.traits = { v: 1, ids: ["gearhead"], day: -1 }; T.repairPanel(); return [document.getElementById("repairHint").textContent, document.getElementById("repairNow").textContent]; });
  expect(g).toEqual(["Garage repairs are FREE. Roadside repairs cost 1,000 + 20 credits per damage percentage point: 2,000 CR, less 30% for your Handiness and 10% as a Gearhead: 1,260 CR.", "ROADSIDE REPAIR · 1,260 CR"]);
});

test("a friend getting out of a car twenty times is one set of shapes for their outfit, and each walker's face material is freed", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const T = __T, p = { uid: "t", buf: [], model: null, key: "", tag: null, name: "", phase: 0, seen: 0, shown: false, lost: false };
    const shapes = new Set();
    let freed = 0;
    for (let i = 0; i < 20; i++) {
      T.netModel(p, { m: 1, o: T.OUTFITS[i % 2].id });
      for (const c of p.model.G.children) if (c.material !== p.model.face.m) shapes.add(c.geometry);
      const m = p.model.face.m, free = m.dispose.bind(m);
      m.dispose = () => { freed++; free(); };
      T.netModel(p, { m: 3 });
    }
    return { shapes: shapes.size, freed, model: p.model };
  });
  // body, leg and arm for each of the two outfits
  expect(r).toEqual({ shapes: 6, freed: 20, model: null });
});

test("the open room list says a friend is not responding as soon as they go quiet", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const status = () => game.eval(() => [...document.querySelectorAll("#plList .plRow:not(.me) span")].map((s) => s.textContent));
  await game.eval(() => {
    const T = __T, now = performance.now() / 1000;
    T.NET.room = "TEST";
    T.NET.peers.set("f", { uid: "f", buf: [{ t: now, d: { m: 3, x: 0, y: 0, z: 0, h: 0, v: 0 } }], model: null, key: "", tag: null, name: "Friend", phase: 0, seen: now, shown: false, lost: false });
    T.pauseOn();
    T.netOpen();
  });
  expect(await status()).toEqual(["in a menu"]);
  await game.eval(() => { __T.NET.peers.get("f").seen -= 10; });
  await expect.poll(status, { timeout: 5000 }).toEqual(["not responding"]);
  await game.eval(() => { const T = __T; T.NET.peers.clear(); T.NET.room = null; });
});

test("restoring the same account's save keeps this device's photos counted today; another account's save keeps its own", () => {
  const src = (n) => fs.readFileSync(require.resolve("../js/" + n + ".js"), "utf8"),
    cut = (f, a, b) => { const s = src(f), i = s.indexOf(a); return s.slice(i, s.indexOf(b, i)); };
  const today = 20000, run = (other, mine, theirs) => {
    let stored = null;
    const g = { Date: { now: () => today * 86400000 }, CL: { other, meta: {} }, save: { photoDay: mine, ghost: {} }, SAVE_KEY: "k", window: { __cloudNoReload: true },
      localStorage: { setItem: (k, v) => { stored = JSON.parse(v); } }, homeClean: (h) => h, homeRefund: () => 0, clearTimeout() {}, setTimeout() {},
      clOwn() {}, clAt: () => 0, clSaveMeta() {}, clSet() {}, tabIdle: false, clamp: (v, a, b) => Math.min(b, Math.max(a, v)) };
    vm.runInNewContext(cut("core", "function photoDayClean(", "function skillPhoto(") + cut("screens", "function clApply(", "\n// this device") +
      "\nclApply({rev:1},{cr:1,owned:[],photoDay:" + JSON.stringify(theirs) + "})", g);
    return stored.photoDay;
  };
  expect(run(false, { day: today, count: 5 }, { day: today, count: 1 })).toEqual({ day: today, count: 5 });
  expect(run(false, { day: today, count: 1 }, { day: today, count: 4 })).toEqual({ day: today, count: 4 });
  expect(run(false, { day: today, count: 3 }, { day: today - 1, count: 5 })).toEqual({ day: today, count: 3 });
  expect(run(true, { day: today, count: 5 }, { day: today, count: 1 })).toEqual({ day: today, count: 1 });
});

// the cloud's reconcile on equal progress (js/screens.js clReconcile), with the account's transport stubbed
function reconcile(other) {
  const src = (n) => fs.readFileSync(require.resolve("../js/" + n + ".js"), "utf8"),
    cut = (f, a, b) => { const s = src(f), i = s.indexOf(a); return s.slice(i, s.indexOf(b, i)); },
    line = (f, a) => cut(f, a, "\n");
  const base = { v: 3, owned: ["starter"], cr: 120000, skills: { v: 1, photography: 2750 } };
  let uploaded = null;
  const save = JSON.parse(JSON.stringify(base)), ctx = vm.createContext({ save, Date, Math, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    CL: { meta: {}, user: { uid: "B" }, other }, clAt: () => 0, clWork() {}, clNeeds() {}, clSaveMeta() {}, clUpload() { uploaded = JSON.parse(JSON.stringify(save)); },
    homeProgress: () => null, persist() {}, clPickShow() {}, clSet() {}, updateMoney() {}, toast() {} });
  const run = (s) => vm.runInContext(s, ctx);
  run([cut("core", "const fmtCr=", "\n"), cut("core", "function photoDayClean(", "function skillPhoto("), cut("core", "const WANT_CATALOG=", "const save="),
    cut("screens", "const CL_PREFS=", "function clSummary("), line("screens", "const clOwn="), cut("screens", "function clReconcile(", "// With the same completed")].join("\n"));
  return { ctx, run, save, base, uploaded: () => uploaded };
}
test("on equal progress, another account's save keeps its own photo count; the same account keeps the higher", () => {
  const today = Math.floor(Date.now() / 86400000);
  for (const [other, mine, theirs, want] of [[true, 5, 0, 0], [true, 0, 3, 3], [false, 5, 0, 5], [false, 1, 4, 4]]) {
    const { ctx, run, save, base, uploaded } = reconcile(other);
    save.photoDay = { day: today, count: mine };
    ctx.remote = { ...base, photoDay: { day: today, count: theirs } };
    run("clReconcile({rev:1,save:JSON.stringify(remote)})");
    expect(uploaded().photoDay.count, (other ? "another" : "the same") + " account, " + mine + " here, " + theirs + " there").toBe(want);
    expect(ctx.CL.meta.owner).toBe("B");
  }
});
test("a head chef syncing the account's newer reroll with a promotion want in it gets another want instead", () => {
  const today = Math.floor(Date.now() / 86400000);
  const { ctx, run, save } = reconcile(false);
  save.work = { completed: 25 }; save.skills.cooking = 1050;
  const work = fs.readFileSync(require.resolve("../js/work.js"), "utf8");
  run(work.slice(work.indexOf("const WORK_RANKS="), work.indexOf("const workPay=")));
  save.wants = run("wantsClean(null)");
  ctx.remote = { ...save, wants: { v: 1, active: ["meet", "promote", "walk"], day: today } };
  run("wantsTidy();clReconcile({rev:1,save:JSON.stringify(remote)})");
  expect(save.wants.day).toBe(today);
  expect(save.wants.active).not.toContain("promote");
  expect(save.wants.active.length).toBe(3);
});

