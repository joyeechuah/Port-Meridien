const { test, expect } = require("./support/game");

test.describe.configure({ mode: "parallel" });

function lift(target) {
  const p = PEDS[0], who = personOf(p);
  relSet(who.id, 60, 3);
  Object.assign(RIDE, { p, who, st: "ride", car: curId, t: 7, dest: target, chat: 30, dmg: P.damage });
  rideSeat();
  return who.id;
}

test("a completed lift writes the reward and friendship in one save", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(source => {
    const board = new Function("return (" + source + ")")();
    const id = board({ x: P.x, z: P.z, name: "Lift stop" });
    persist();
    const generation = SAVE.gen, credits = save.cr;
    rideTick(1 / 60);
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY));
    return { ended: !RIDE.p, gained: disk.cr - credits, tip: RIDE_V.tip, friendship: disk.rel[id].f, writes: SAVE.gen - generation };
  }, lift.toString());
  expect(result.ended).toBe(true);
  expect(result.gained).toBe(result.tip);
  expect(result.friendship).toBe(68);
  expect(result.writes).toBe(1);
});

test("a passenger cannot get out or complete a lift during a high-speed lateral slide", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(source => {
    const board = new Function("return (" + source + ")")();
    board({ x: P.x, z: P.z, name: "Lift stop" });
    Object.assign(P, { h: 0, vx: 20, vz: 0 });
    const prompt = !!ridePrompt();
    rideTick(1 / 60);
    return { prompt, stillRiding: RIDE.st === "ride" };
  }, lift.toString());
  expect(result).toEqual({ prompt: false, stillRiding: true });
});

test("ending a contract restores the GPS for a requested lift still in progress", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(source => {
    const board = new Function("return (" + source + ")")();
    const stop = LANDMARKS[0], name = stop.name;
    board({ x: stop.x, z: stop.z, name });
    setGPS(stop.x, stop.z, name);
    const started = jobStart(JOBS[0]), contractGPS = gps.job;
    jobEnd("abandoned");
    return { started, contractGPS, stillRiding: RIDE.st === "ride", liftGPS: gps.t && gps.label, name };
  }, lift.toString());
  expect(result).toEqual({ started: true, contractGPS: true, stillRiding: true, liftGPS: result.name, name: result.name });
});

test("a meal's play-time wait survives a reload", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const first = await game.eval(() => {
    const k = QUAY.kitchen;
    footExit();
    Object.assign(FOOT, { x: k.x, z: k.z, y: footGround(k.x, k.z) });
    NEEDS.hunger = 12;
    return kitchenMeal();
  });
  expect(first).toBe(true);
  await game.reload(); await game.driveOut(); await game.park();
  const second = await game.eval(() => {
    const k = QUAY.kitchen;
    footExit();
    Object.assign(FOOT, { x: k.x, z: k.z, y: footGround(k.x, k.z) });
    return kitchenMeal();
  });
  expect(second).toBe(false);
});

test("a cancelled home visit immediately gives the party button back to remaining friends", async ({ game }) => {
  await game.open(); await game.driveOut();
  const result = await game.eval(() => {
    relSet(0, 39, 3);
    relSet(1, 90, 3);
    Object.assign(GUEST, { who: PEOPLE[0], done: false });
    goGarage(true);
    return { visitCancelled: !GUEST.who, partiesAvailable: !$("gParty").classList.contains("hide"), eligible: partyFriends().map(p => p.id) };
  });
  expect(result.visitCancelled).toBe(true);
  expect(result.eligible).toContain(1);
  expect(result.partiesAvailable).toBe(true);
});

test("a loaded passport already completed cannot retain an unfulfillable landmark want", async ({ game }) => {
  await game.open();
  await game.eval(() => {
    save.found = Object.fromEntries(LANDMARKS.map(landmark => [landmark.id, 1]));
    save.passBonus = true;
    save.wants.active = ["landmark", "walk", "photo"];
    persist();
  });
  await game.reload();
  const result = await game.eval(() => ({ complete: foundCount() === LANDMARKS.length, wants: save.wants.active }));
  expect(result.complete).toBe(true);
  expect(result.wants).not.toContain("landmark");
});

test("an airborne car cannot offer its passenger a drop-off", async ({ game }) => {
  await game.open(); await game.driveOut(); await game.park();
  const result = await game.eval(source => {
    const board = new Function("return (" + source + ")")();
    board(null);
    Object.assign(P, { air: true, vy: -3, y: P.y + 2, vx: 0, vz: 0 });
    return !!ridePrompt();
  }, lift.toString());
  expect(result).toBe(false);
});
