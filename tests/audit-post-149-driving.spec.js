const { test, expect } = require("./support/game");

test.describe.configure({ mode: "parallel" });

test("a sold car does not keep its previous owner's damage when bought again", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const original = curId, other = CARS.find(c => c.id !== original);
    save.cr = 1e6;
    if (!save.owned.includes(other.id)) save.owned.push(other.id);
    P.damage = 63;
    openDealer(other.id);
    $("dDrive").click();
    dPick(CARS.findIndex(c => c.id === original));
    $("dSell").click();
    const sold = !save.owned.includes(original);
    $("dBuy").click();
    $("dDrive").click();
    return { sold, drivingOriginal: curId === original, damage: P.damage };
  });
  expect(result).toEqual({ sold: true, drivingOriginal: true, damage: 0 });
});

test("a high-speed lateral slide prevents getting out", async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.park();
  const result = await game.eval(() => {
    Object.assign(P, { h: 0, vx: 20, vz: 0, air: false, water: false });
    const speed = Math.hypot(P.vx, P.vz) * 3.6;
    return { speed, exited: footExit(), walking: FOOT.on };
  });
  expect(result).toEqual({ speed: 72, exited: false, walking: false });
});

test("a race result waits for the car to stop sliding across the road", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const trial = EVENTS.find(e => e.type === "tt");
    startEvent(trial);
    finishEvent(trial.gold);
    Object.assign(P, { h: 0, vx: 20, vz: 0 });
    updateEvent(1 / 60);
    return { state, finishing: ev?.phase === "finish", speed: Math.hypot(P.vx, P.vz) * 3.6 };
  });
  expect(result).toEqual({ state: "DRIVE", finishing: true, speed: 72 });
});

test("the exact displayed time-trial target earns its displayed medal", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const trial = EVENTS.find(e => e.type === "tt" && Math.round(e.gold * 100) / 100 > e.gold);
    openIntro(trial);
    const shown = $("iRows").querySelectorAll(".row")[1].querySelector("b").textContent.split(" / ")[0];
    const [minutes, seconds] = shown.split(":").map(Number);
    setState("DRIVE");
    startEvent(trial);
    finishEvent(minutes * 60 + seconds);
    return { shown, actual: ev.fin.title, recorded: fmtT(ev.fin.t) };
  });
  expect(result.recorded).toBe(result.shown);
  expect(result.actual).toBe("GOLD");
});

test("Map travel returns a walker to the car even if the car is parked at the landing point", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(async () => {
    const marker = mapMarkers().find(m => m.act === "dealer");
    P.x = marker.x; P.z = marker.z; P.h = Math.atan2(1, 0);
    resetToRoad(false);
    const car = [P.x, P.z];
    if (!footExit()) throw new Error("Cannot exit the car at the travel point");
    FOOT.x += 15;
    openMap(); fastTravel(marker);
    await new Promise(resolve => setTimeout(resolve, 500));
    driveUpdate(1 / 60);
    return { walking: FOOT.on, movement: Math.hypot(P.x - car[0], P.z - car[1]) };
  });
  expect(result.movement).toBeLessThan(0.5);
  expect(result.walking).toBe(false);
});

test("hiding the tab during road recovery returns to a paused game", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(async () => {
    resetToRoad(true);
    const fading = state === "FADE";
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise(resolve => setTimeout(resolve, 500));
      return { fading, state, pauseShown: !$("pause").classList.contains("hide") };
    } finally {
      delete document.hidden;
    }
  });
  expect(result).toEqual({ fading: true, state: "PAUSE", pauseShown: true });
});

test("map travel does not teleport a friend who was still walking to the car", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(async () => {
    const p = PEDS[0], who = personOf(p);
    relSet(who.id, 60, 3);
    window.__DTMAX = 1e-9;
    const pick = mapMarkers().filter(m => m.act === "event").sort((a, b) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(p.x - a.x, p.z - a.z))[0];
    const before = { x: p.x, z: p.z };
    Object.assign(RIDE, { p, who, st: "follow", t: 2, dest: null, car: null });
    openMap(); fastTravel(pick);
    await new Promise(resolve => setTimeout(resolve, 500));
    rideTick(1 / 60);
    // (PEDS[0] may never have been placed yet, at 0,0: once you're near Old Quay it's drawn on its own pavement, so how
    // far it moved isn't the measure. Left behind, they're not brought to the event: the ride is over and they're far off)
    return { atEvent: Math.hypot(P.x - pick.x, P.z - pick.z) < 20, riding: !!RIDE.p, toCar: Math.hypot(p.x - P.x, p.z - P.z), moved: Math.hypot(p.x - before.x, p.z - before.z) };
  });
  expect(result.atEvent).toBe(true);
  expect(result.riding).toBe(false);
  expect(result.toCar).toBeGreaterThan(100);
});

test("the first frame of a race countdown applies the grid lock before controls", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const event = EVENTS.find(e => e.type === "tt");
    endEvent();
    startEvent(event);
    const atStart = locked;
    keys.w = true;
    driveUpdate(1 / 60);
    keys.w = false;
    return { atStart, inCountdown: ev.phase === "count" };
  });
  expect(result).toEqual({ atStart: true, inCountdown: true });
});

test("a new damage chip appears after a roadside repair even at the same damage percentage", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(() => {
    P.damage = 40;
    updateHUD(0);
    const shownFirst = !$("damageHud").classList.contains("hide");
    openRepair();
    $("repairNow").click();
    $("repairNow").click();
    const repaired = P.damage === 0;
    P.damage = 40;
    updateHUD(0);
    return { shownFirst, repaired, shownAgain: !$("damageHud").classList.contains("hide") };
  });
  expect(result).toEqual({ shownFirst: true, repaired: true, shownAgain: true });
});

test("boat movement also checks shoreline clearance at the edges of its hull", async ({ game }) => {
  await game.open(); await game.driveOut();
  const result = await game.eval(() => {
    let violation;
    for (let x = PIER.x0 - 6; x < PIER.x0 + 70 && !violation; x += .5) {
      for (let z = 8; z <= 40 && !violation; z += 2) {
        for (const h of [0, Math.PI / 6, Math.PI / 3]) {
          Object.assign(BOAT, { x: x + 3, z, h });
          if (!boatFree(x, z, h)) continue;
          const left = meshH(x - Math.cos(h) * .95, z + Math.sin(h) * .95);
          if (left > BOAT_V.depth + .08) {
            violation = { x, z, h, left, limit: BOAT_V.depth };
            break;
          }
        }
      }
    }
    return violation || null;
  });
  expect(result).toBeNull();
});
