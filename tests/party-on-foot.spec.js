// A party in the house on foot (js/life.js partyHome, partyAbout; js/people.js footTarget): up in the room with
// nothing else in reach, THROW A PARTY opens the same invitations as the garage screen's button, the walker standing
// still behind them. The guests are in the room, a standing one is solid, SEE THEM OFF beside any of them ends it with
// its rewards, and walking out of the house calls it off. It used to need the garage screen.
const { test, expect } = require("./support/game");

async function upstairs(game) {
  await game.open();
  await game.driveOut();
  await game.eval(() => { P.vx = P.vz = 0; P.thr = 0; driveUpdate(1 / 60); });
  await game.key("f");
  await game.eval(() => {
    window.__DTMAX = 1e-9;
    for (const t of TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    save.home.items = [{ id: "sofa", x: 16, z: 8, r: 0 }]; homeBuild();
    for (const p of PEOPLE.filter((q) => q.trait === "cheerful" || q.trait === "chatty").slice(0, 2)) relSet(p.id, 80, 3);
    window.__at = (x, z, h, y = 5.25) => { const p = gW(x, z); Object.assign(FOOT, { x: p.x, z: p.z, y: gY + y, h, cy: h, v: 0 }); driveUpdate(1 / 60); };
    window.__prompt = () => document.getElementById("prompt").classList.contains("hide") ? null : document.getElementById("promptTxt").textContent;
  });
  expect(await game.eval(() => FOOT.on)).toBe(true);
}

test("THROW A PARTY upstairs, the guests in the room, SEE THEM OFF pays and starts the wait", async ({ game, page }) => {
  await upstairs(game);
  // the room's far end, clear of the sofa
  expect(await game.eval(() => { __at(19, 27, Math.PI); return __prompt(); })).toBe("Throw a party");
  await game.eval(() => { keys.w = true; promptAct(); });
  await expect(page.locator("#party")).toBeVisible();
  const still = await game.eval(() => { const x = FOOT.x, z = FOOT.z; driveUpdate(1 / 60); driveUpdate(1 / 60); return { held: !!keys.w, moved: Math.hypot(FOOT.x - x, FOOT.z - z) }; });
  expect(still).toEqual({ held: false, moved: 0 });
  await page.locator("#pyList .pyp").nth(0).click();
  await page.locator("#pyList .pyp").nth(1).click();
  await page.locator("#pyInvite").click();
  await page.locator("#pyStart").click();
  await expect(page.locator("#party")).toBeHidden();
  const on = await game.eval(() => { driveUpdate(1 / 60); return { active: PARTY.active, shown: [...PARTY_M.values()].filter((M) => M.G.visible).length, state }; });
  expect(on).toEqual({ active: true, shown: 2, state: "DRIVE" });
  // beside a guest: SEE THEM OFF
  const near = await game.eval(() => {
    const M = [...PARTY_M.values()].find((m) => m.G.visible && !m.seat), q = houseLocal(M.G.position.x, M.G.position.z);
    __at(q.x, q.z - 1.3 * Math.sign(q.z - 24 || 1), 0);
    return { prompt: __prompt() };
  });
  expect(near.prompt).toMatch(/^See them off · party \d+$/);
  const social0 = await game.eval(() => needOf("social"));
  await game.eval(() => promptAct());
  const after = await game.eval(() => ({ active: PARTY.active, shown: PARTY_M.size, social: needOf("social"), wait: homeUntil.party > NS.t }));
  expect(after.active).toBe(false);
  expect(after.shown).toBe(0);
  expect(after.social).toBeGreaterThan(social0);
  expect(after.wait).toBe(true);
});

test("walking out of the house calls the party off; the pause menu and the map don't", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    __at(19, 27, Math.PI);
    PARTY.ids = PEOPLE.filter((q) => rel(q.id).f >= 80).map((q) => q.id).slice(0, 2);
    const started = partyStart(); partySync(); driveUpdate(1 / 60);
    setState("PAUSE"); const paused = PARTY.active; setState("DRIVE");
    setState("MAP"); const map = PARTY.active; setState("DRIVE"); driveUpdate(1 / 60);
    // out in the drive
    const p = gW(0, -6); Object.assign(FOOT, { x: p.x, z: p.z, y: gY }); driveUpdate(1 / 60);
    return { started, paused, map, after: PARTY.active, models: PARTY_M.size };
  });
  expect(r).toEqual({ started: true, paused: true, map: true, after: false, models: 0 });
});

test("a standing party guest is solid to the walker", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    save.home.items = []; homeBuild();
    __at(19, 27, Math.PI);
    PARTY.ids = PEOPLE.filter((q) => rel(q.id).f >= 80).map((q) => q.id).slice(0, 1);
    partyStart(); partySync(); driveUpdate(1 / 60);
    const M = [...PARTY_M.values()][0], q = M.G.position;
    const [x, z] = footClear(q.x + 0.05, q.z, FOOT.y);
    return { seat: M.seat, d: Math.hypot(x - q.x, z - q.z) };
  });
  expect(r.seat).toBeNull();
  expect(r.d).toBeGreaterThan(0.5);
});

test("a seat a guest is on offers no Sit prompt: the guest's own prompt shows there", async ({ game }) => {
  await upstairs(game);
  const r = await game.eval(() => {
    __at(19, 27, Math.PI);
    PARTY.ids = PEOPLE.filter((q) => rel(q.id).f >= 80).map((q) => q.id).slice(0, 1);
    partyStart(); partySync(); driveUpdate(1 / 60);
    const M = [...PARTY_M.values()][0], p = save.home.items[0], it = homeById.get(p.id);
    return { seated: M.seat === p, use: houseUse(p, it) };
  });
  expect(r).toEqual({ seated: true, use: null });
});
