const { test, expect } = require("./support/game");

test.describe.configure({ mode: "parallel" });

test("starting at sea, a waypoint is routed from the boat's coastal position", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(() => {
    if (!footExit() || !boatBoard()) throw new Error("Cannot board the boat");
    const marker = mapMarkers().find(m => m.kind === "dealer");
    openMap();
    setGPS(marker.x, marker.z, marker.name);
    const fromBoat = routeBetween(BOAT.x, BOAT.z, marker.x, marker.z).pts[0];
    const fromCar = routeBetween(P.x, P.z, marker.x, marker.z).pts[0];
    const actual = gps.route.pts[0];
    return { fromBoat, fromCar, actual };
  });
  expect(result.fromBoat).not.toEqual(result.fromCar);
  expect(result.actual).toEqual(result.fromBoat);
});

test("a cloud restore never races a local ghost against a different restored best", async ({ game }) => {
  await game.open();
  const diskBest = await game.eval(() => {
    const trial = EVENTS.find(e => e.type === "tt");
    save.rec[trial.id] = 90;
    save.ghost[trial.id] = { c: save.cur, t: 90, d: [1, 2, 0, 0, 3, 4, 0, 12] };
    const cloud = { ...save, rec: { [trial.id]: 70 }, ghost: {} };
    CL.user = { uid: "test-account" };
    window.__cloudNoReload = true;
    clApply({ rev: 3 }, cloud);
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY));
    return disk.rec[trial.id];
  });
  expect(diskBest).toBe(70);
  await game.reload();
  await game.driveOut();
  const ghost = await game.eval(() => {
    startEvent(EVENTS.find(e => e.type === "tt"));
    return ev.ghost?.t ?? null;
  });
  expect(ghost).toBeNull();
});

test("the tab takeover button stays operable while a cloud dialog is open", async ({ game, page }) => {
  await game.open();
  await game.eval(() => {
    clOpen();
    tabStop();
  });
  const takeover = page.locator("#tiHere");
  await expect(takeover).toBeVisible();
  const eligible = await takeover.evaluate(button => {
    button.focus();
    return { inert: !!button.closest("[inert]"), focused: document.activeElement === button };
  });
  expect(eligible).toEqual({ inert: false, focused: true });
});

test("showing the cloud chooser moves keyboard focus into it", async ({ game, page }) => {
  await game.open();
  await page.locator("#drive").focus();
  await game.eval(() => {
    CL.pick = { cloud: { ...save, cr: save.cr + 1000 }, doc: { rev: 2 } };
    clOpen();
  });
  await expect(page.locator("#cloudPick")).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement.closest("#cloudPick"))).toBe(true);
});

test("two middle clicks on the home designer floor cannot buy a bed", async ({ game, page }) => {
  await game.open();
  await page.locator("#gDesign").click();
  await page.locator('[data-k="i:single"]').click();
  await game.frames(100);
  const spot = await game.eval(() => {
    const p = hvSpot(HV.sel, HV.at.x, HV.at.z, HV.r).project(camera);
    return { x: (1 + p.x) * W / 2, y: (1 - p.y) * H / 2, before: save.home.items.length };
  });
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, spot)).toBe("c");
  await page.mouse.click(spot.x, spot.y, { button: "middle" });
  await page.mouse.click(spot.x, spot.y, { button: "middle" });
  expect(await game.eval(() => save.home.items.length)).toBe(spot.before);
});

test("turning a furniture preview cancels the old click confirmation", async ({ game }) => {
  await game.open();
  const result = await game.eval(() => {
    hvOpen();
    $('hdList').querySelector('[data-k="i:single"]').click();
    const aim = hvAim, initial = { ...HV.at }, count = save.home.items.length;
    const input = { cell: initial, raw: { x: initial.x + .5, z: initial.z + .5 }, hit: null };
    hvAim = () => input;
    try {
      hvTap(0, 0, false);
      hvTurn();
      hvTap(0, 0, false);
      return { rotation: HV.r, added: save.home.items.length - count };
    } finally {
      hvAim = aim;
    }
  });
  expect(result).toEqual({ rotation: 1, added: 0 });
});

test("selecting the current wall finish does not write a new save", async ({ game, page }) => {
  await game.open();
  await page.locator("#gDesign").click();
  await page.locator("#hdg_room").click();
  const generation = await game.eval(() => SAVE.gen);
  await page.locator('[data-k^="f:Walls:"][aria-pressed="true"]').click();
  expect(await game.eval(() => SAVE.gen)).toBe(generation);
});

test("opening invitations places focus on an enabled control", async ({ game, page }) => {
  await game.open();
  await game.eval(() => relSet(PEOPLE[0].id, 90, 3));
  await game.eval(() => partyButton());
  await page.locator("#gParty").click();
  await expect(page.locator("#party")).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement.closest("#party") && !document.activeElement.disabled)).toBe(true);
});

test("keyboard focus remains on a selected customisation option after its price updates", async ({ game, page }) => {
  await game.open();
  await page.locator("#gCust").click();
  const option = page.getByRole("button", { name: "finish: matte", exact: true });
  await option.focus();
  await page.keyboard.press("Enter");
  await expect(option).toHaveAttribute("aria-pressed", "true");
  await expect(option).toBeFocused({ timeout: 1500 });
});

test("a low Photo Mode orbit cannot put the lens underneath the pier deck", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(() => {
    if (!footExit() || !boatBoard()) throw new Error("Cannot board the boat");
    Object.assign(BOAT, { x: PIER.x1 - 12, z: PIER.z1 + 2, h: Math.PI / 2, v: 0 });
    boatPlace(0);
    photoEnter();
    Object.assign(PH, { yaw: Math.PI, pitch: .03, dist: 5 });
    photoFrame(0);
    return { aboveDeck: camera.position.y - PIER.y, overPier: onPier(camera.position.x, camera.position.z) };
  });
  expect(result.overPier && result.aboveDeck <= 0).toBe(false);
});

test("a recording whose last offline request settles during reconnect gets a new retry", async ({ game }) => {
  await game.open();
  const result = await game.eval(async () => {
    const S = SONGS.race;
    Object.assign(S, { st: null, tries: 3, retryAt: null });
    const fetchBefore = window.fetch;
    let fail, calls = 0;
    window.fetch = () => { calls++; return new Promise((resolve, reject) => { fail = reject; }); };
    try {
      songFetch("race");
      window.dispatchEvent(new Event("online"));
      fail(new TypeError("Connection lost while request was in flight"));
      await new Promise(resolve => setTimeout(resolve, 0));
      songFetch("race");
      const stateAfterReconnect = S.st;
      if (calls > 1) fail(new TypeError("End the fixture's second request"));
      return { calls, stateAfterReconnect };
    } finally {
      window.fetch = fetchBefore;
    }
  });
  expect(result).toEqual({ calls: 2, stateAfterReconnect: "loading" });
});

test("a stale room snapshot cannot move a peer back after a newer snapshot arrived", async ({ game }) => {
  await game.open();
  const result = await game.eval(() => {
    NET.room = "TEST";
    const common = { n: "Friend", o: "palms", m: 1, z: 0, y: 4, h: 0, v: 0 };
    netGot("peer", { ...common, x: 22, t: 2000 });
    netGot("peer", { ...common, x: 10, t: 1900 });
    const latest = netAt(NET.peers.get("peer"), performance.now() / 1000 + 1);
    return { x: latest.x, timestamp: latest.t };
  });
  expect(result).toEqual({ x: 22, timestamp: 2000 });
});

test("a multiplayer connection started before hiding announces the player as away at join", async ({ game }) => {
  await game.open(); await game.driveOut();
  const result = await game.eval(async () => {
    const original = netFirebase;
    let capture, ready;
    netFirebase = () => ({
      connect: () => new Promise(resolve => { ready = resolve; }),
      open: (code, create, listen) => { capture = listen.first(); return Promise.resolve(); },
      put() {},
      close() {},
    });
    try {
      netBegin("ABCD", false);
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      ready("test-user");
      await new Promise(resolve => setTimeout(resolve, 0));
      return capture?.m;
    } finally {
      delete document.hidden;
      netLeave();
      netFirebase = original;
    }
  });
  expect(result).toBe(3);
});

// Open: at 360 x 640 with every button's text doubled the garage can't hold its pills, car arrows and bottom bar
// on one screen as it is laid out (pills at fixed heights, two-column actions). OPTIONS (three pills fewer) isn't
// enough on its own: the pills at fixed heights still overlap, and the actions run off the side.
test.fixme("the garage controls remain reachable with large text, a bed and a waiting friend", async ({ game, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const home = { v: 1, items: [
    { id: "single", x: 4, z: 10, r: 0 },
    { id: "fridge", x: 16, z: 12, r: 0 },
    { id: "tv", x: 24, z: 14, r: 0 },
  ] };
  await game.open({ save: { tod: 22, todMode: 0, home } });
  await game.eval(() => {
    GUEST.who = PEOPLE[0];
    relSet(0, 90, 3);
    guestSync("GARAGE");
    show("gCloud", true);
    restSync();
    const controls = [...$("gui").querySelectorAll("button")].filter(el => el.offsetParent);
    for (const el of controls) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * 2 + "px";
  });
  // (SAVE MY PROGRESS is under OPTIONS on a phone: js/screens.js gMoreSet)
  const targets = ["gRest", "gSleep", "gGuest", "gMore", "gUp", "gprev", "gnext", "drive"];
  const blocked = await page.evaluate(ids => ids.filter(id => {
    const el = document.getElementById(id), r = el.getBoundingClientRect();
    return !r.width || !r.height || r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1
      || !el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      || el.scrollWidth > el.clientWidth + 1;
  }), targets);
  expect(blocked).toEqual([]);
});

test("a controller can navigate the open cloud chooser", async ({ game, page }) => {
  await game.open();
  await game.eval(() => {
    CL.pick = { cloud: { ...save, cr: save.cr + 1000 }, doc: { rev: 2 } };
    clOpen();
    $("cpkKeepDev").focus();
    const pad = { index: 0, connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: i === 15, value: i === 15 ? 1 : 0,
    })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    pollPad();
  });
  await expect(page.locator("#cpkKeepAcc")).toBeFocused({ timeout: 1500 });
});

test("Tab stays within party invitations opened while walking upstairs", async ({ game, page }) => {
  await game.open();
  await game.eval(() => {
    goUpstairs();
    relSet(0, 90, 3);
    partyPanel();
  });
  await page.locator("#pyClose").focus();
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#party"))).toBe(true);
  }
});

test("clicks over the mezzanine do not activate cars parked underneath the designer", async ({ game, page }) => {
  await game.open();
  await game.eval(() => {
    save.owned = CARS.slice(0, 12).map(car => car.id);
    parkAll(null);
    gPick(9);
    hvOpen();
  });
  await game.frames(100);
  const spot = await game.eval(() => {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    for (let y = 10; y < H; y += 5) {
      for (let x = 10; x < W; x += 5) {
        if (document.elementFromPoint(x, y) === $("c") && hvAim(x, y).cell && hitSlot(x, y) === gSel) return { x, y };
      }
    }
    return null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.click(spot.x, spot.y);
  expect(await game.eval(() => ({ state, designer: HV.on }))).toEqual({ state: "GARAGE", designer: true });
});
