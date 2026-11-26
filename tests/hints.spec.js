// First-time hints (js/screens.js): each newer part of life is pointed out once on a device, as it comes into reach
const { test, expect } = require("./support/game");
const shown = (game) => game.eval(() => [...document.querySelectorAll("#toasts .toast b")].map((b) => b.textContent));

async function withFriend(game, i = 0, f = 50) {
  await game.open({ hints: true });
  await game.driveOut();
  await game.park();
  await game.eval(([i, f]) => {
    const T = __T;
    window.__DTMAX = 1e-9;   // the page's own frames hand the game almost no time: only the test's steps count
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    T.RIDE_V.lift = 0;
    // into Old Quay first, so its people are about
    T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
    const walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40), e = walks[i];
    T.PEDS.forEach((q, k) => { if (k !== i) { q.m.G.visible = false; q.x = q.z = 1e5; } });
    const p = T.PEDS[i];
    p.e = e; p.from = e.a; p.s = 20; p.st = "idle"; p.t = 999; p.hitAt = undefined; p.mad = false;
    if (f !== null) T.save.rel[i] = { f, n: 3 };
    // the car on the nearest road, you beside the person
    T.driveUpdate(1 / 60);
    const nr = T.nearestRoadGlobal(p.x, p.z, true);
    T.P.x = nr.x; T.P.z = nr.z; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
  }, [i, f]);
  await game.key("f");
  return game.eval((i) => {
    const T = __T, F = T.FOOT, p = T.PEDS[i], e = p.e, ax = e.b.x - e.a.x, az = e.b.z - e.a.z, L = Math.hypot(ax, az);
    F.x = p.x - (ax / L) * 1.8; F.z = p.z - (az / L) * 1.8; F.h = Math.atan2(p.x - F.x, p.z - F.z); F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
    return { name: T.PEOPLE[i].name, prompt: document.getElementById("promptTxt").textContent, car: Math.hypot(T.P.x - F.x, T.P.z - F.z) };
  }, i);
}
test("the garage and the pause menu each point out what's new, once on this device", async ({ game }) => {
  await game.open({ hints: true });
  await expect.poll(() => shown(game), { timeout: 8000 }).toContain("NEW AT HOME");
  await game.driveOut();
  await game.eval(() => __T.pauseOn());
  await expect.poll(() => shown(game)).toContain("YOU");
  expect(await game.eval(() => JSON.parse(localStorage.getItem(__T.HINT_KEY)))).toEqual({ home: 1, you: 1 });
  // again, on the same device: neither comes back
  await game.reload();
  await game.eval(() => document.getElementById("toasts").replaceChildren());
  await game.driveOut();
  await game.eval(() => __T.pauseOn());
  await new Promise((r) => setTimeout(r, 2000));
  expect(await shown(game)).not.toContain("YOU");
  expect(await shown(game)).not.toContain("NEW AT HOME");
});

test("talking to a friend points out the ride and the invitation home; the kitchen, its career", async ({ game }) => {
  await withFriend(game, 0, 50);
  await game.eval(() => __T.talkOpen(__T.PEDS[0]));
  await expect.poll(() => shown(game)).toContain("FRIENDS");
  await game.eval(() => { const T = __T; T.talkClose(); const k = T.QUAY.kitchen; T.FOOT.x = k.x; T.FOOT.z = k.z; T.workOpen(); });
  await expect.poll(() => shown(game)).toContain("KITCHEN CAREER");
});

test("off in the tests unless a test asks for them", async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => __T.pauseOn());
  await new Promise((r) => setTimeout(r, 1800));
  expect(await shown(game)).not.toContain("YOU");
});

test("a hint learnt in another tab isn't shown again here, nor wiped out by this tab's older copy", async ({ game }) => {
  await game.open({ hints: true });
  const r = await game.eval(() => {
    const T = __T;
    // another tab of the game has since shown the kitchen's
    localStorage.setItem(T.HINT_KEY, JSON.stringify({ kitchen: 1 }));
    return { kitchen: T.hint("kitchen"), you: T.hint("you"), stored: JSON.parse(localStorage.getItem(T.HINT_KEY)) };
  });
  expect(r).toEqual({ kitchen: false, you: true, stored: { kitchen: 1, you: 1 } });
});

test("a hint isn't used up in a hidden tab, and NEW AT HOME waits while Customise or Design Home is open", async ({ game, page }) => {
  await game.open({ hints: true });
  const hidden = await game.eval(() => {
    const T = __T;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    const r = T.hint("you");
    delete document.hidden;
    return { r, stored: localStorage.getItem(T.HINT_KEY) };
  });
  expect(hidden.r).toBe(false);
  expect(JSON.parse(hidden.stored || "{}").you).toBeUndefined();
  for (const panel of ["cust-on", "designing"]) {
    await game.eval((panel) => { document.getElementById("gui").classList.add(panel); __T.hintHome(); }, panel);
    await page.waitForTimeout(1700);
    expect(await game.eval((panel) => { document.getElementById("gui").classList.remove(panel); return __T.HINTS.home; }, panel)).toBeUndefined();
  }
  // and once nothing is open, it comes
  await game.eval(() => __T.hintHome());
  await expect.poll(() => shown(game), { timeout: 4000 }).toContain("NEW AT HOME");
});

test("driving up to a postcard points out that it's collected on foot, once", async ({ game }) => {
  await game.open({ hints: true });
  await game.driveOut();
  const card = await game.eval(() => __T.POSTCARDS[0]);
  await game.park(card.x, card.z);
  const seen = await game.eval(() => {
    const T = __T,
      out = [];
    T.camera.position.set(T.P.x, T.P.y + 3, T.P.z);
    T.postcardTick(0);
    out.push(!!T.HINTS.postcard);
    return out;
  });
  expect(seen).toEqual([true]);
  await expect.poll(() => shown(game)).toContain("A POSTCARD");
  // learnt: not again
  await game.eval(() => {
    for (const t of document.querySelectorAll("#toasts .toast")) t.remove();
    __T.postcardTick(0);
  });
  expect(await shown(game)).not.toContain("A POSTCARD");
});
