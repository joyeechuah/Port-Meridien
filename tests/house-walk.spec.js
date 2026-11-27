// Walking into the house (js/people.js houseClear, houseFloor): in through the garage door, which opens as you come
// near on foot, round your cars, up the stairs and onto the room upstairs; its walls, railing and furniture hold you,
// and cars still can't drive in. In the garage's own frame: x across, z from the door into the room, y up from its floor.
const { test, expect } = require("./support/game");

// headings for the garage's directions (its z runs along the world's +x, its x along the world's -z)
// (set in the page as H_IN, H_OUT, H_RIGHT and H_LEFT: the page has its own LEFT, the cars left standing)

async function onFoot(game) {
  await game.open();
  await game.driveOut();
  // stopped on the driveway, about 16 m outside the door
  await game.eval(() => { P.vx = P.vz = 0; P.thr = 0; driveUpdate(1 / 60); });
  await game.key("f");
  await game.eval(() => {
    window.__DTMAX = 1e-9;   // the page's own frames hand the game almost no time: only the test's steps count
    for (const t of TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    // helpers for the steps below: put the walker somewhere (garage frame), walk a heading for n frames, where they are
    Object.assign(window, { H_IN: Math.PI / 2, H_OUT: -Math.PI / 2, H_RIGHT: Math.PI, H_LEFT: 0 });
    window.__at = (x, z, h, y = 0) => { const p = gW(x, z); Object.assign(FOOT, { x: p.x, z: p.z, y: gY + y, h, cy: h, v: 0 }); driveUpdate(1 / 60); };
    window.__walk = (h, n) => { FOOT.h = FOOT.cy = h; keys.w = true; for (let i = 0; i < n; i++) driveUpdate(1 / 60); keys.w = false; for (let i = 0; i < 20; i++) driveUpdate(1 / 60); };
    window.__where = () => { const l = houseLocal(FOOT.x, FOOT.z); return { x: +l.x.toFixed(2), z: +l.z.toFixed(2), y: +(FOOT.y - gY).toFixed(2) }; };
  });
  expect(await game.eval(() => FOOT.on)).toBe(true);
}

test("the garage door opens as you come near on foot, and you walk in through it", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(async () => {
    __at(0, -5, H_IN);
    const shut = doorOpen;
    // real frames for a moment, so the door has time to rise
    window.__DTMAX = 0;
    await new Promise((res) => setTimeout(res, 2500));
    const open = doorOpen;
    window.__DTMAX = 1e-9;
    __walk(H_IN, 60 * 5);
    return { shut: +shut.toFixed(2), open: +open.toFixed(2), at: __where(), prompt: document.getElementById("promptTxt").textContent };
  });
  expect(r.open).toBeGreaterThan(0.9);
  expect(r.at.z).toBeGreaterThan(4);
  expect(Math.abs(r.at.y)).toBeLessThan(0.05);
  expect(r.prompt).toBe("Garage · your cars and your home");
});

test("the closed door and the walls keep you out, and in", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(() => {
    doorOpen = 0;
    __at(0, -4, H_IN); __walk(H_IN, 60 * 4); const door = __where();
    __at(15, -4, H_IN); __walk(H_IN, 60 * 4); const front = __where();
    doorOpen = 1;
    __at(18, 8, H_RIGHT); __walk(H_RIGHT, 60 * 5); const side = __where();
    __at(-10, 25, H_IN); __walk(H_IN, 60 * 5); const back = __where();
    return { door, front, side, back };
  });
  expect(r.door.z).toBeLessThan(-0.5);
  expect(r.front.z).toBeLessThan(-0.6);
  expect(r.side.x).toBeLessThan(22.75);
  expect(r.side.x).toBeGreaterThan(21.5);
  expect(r.back.z).toBeLessThan(29.75);
  expect(r.back.z).toBeGreaterThan(28.5);
});

test("up the stairs and onto the room upstairs, 5.25 m up", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(() => {
    __at(-1.6, 16, H_IN);
    __walk(H_IN, 60 * 8);
    const top = __where();
    __walk(H_RIGHT, 60 * 2);
    const landing = __where();
    __walk(H_RIGHT, 60 * 2);
    const room = __where();
    return { top, landing, room };
  });
  // up to the top step (the far end of the stairs holds you there)
  expect(r.top.z).toBeGreaterThan(27);
  expect(r.top.z).toBeLessThan(27.95);
  expect(r.top.y).toBeGreaterThan(4.6);
  // and across onto the room's floor
  expect(r.landing.x).toBeGreaterThan(0.5);
  expect(r.room.y).toBeCloseTo(5.25, 2);
  expect(r.room.x).toBeGreaterThan(3);
});

test("upstairs, the railing and the room's open edge hold you; downstairs you walk under it, round the aquarium", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(() => {
    __at(10, 23, H_OUT, 5.25); __walk(H_OUT, 60 * 4); const railing = __where();
    __at(10, 23, H_RIGHT, 5.25); __walk(H_RIGHT, 60 * 5); const edge = __where();
    __at(4, 23, H_LEFT, 5.25); __walk(H_LEFT, 60 * 5); const left = __where();
    __at(10, 21, H_IN); __walk(H_IN, 60 * 5); const under = __where();
    return { railing, edge, left, under };
  });
  expect(r.railing.z).toBeGreaterThan(19.3);
  expect(r.railing.y).toBeCloseTo(5.25, 2);
  expect(r.edge.x).toBeLessThan(21.5);
  expect(r.edge.y).toBeCloseTo(5.25, 2);
  // the room's left edge beside the stairs, away from the landing: no stepping off
  expect(r.left.x).toBeGreaterThan(0.5);
  expect(r.left.y).toBeCloseTo(5.25, 2);
  // below the room: on the floor, stopped at the aquarium
  expect(r.under.y).toBeCloseTo(0, 2);
  expect(r.under.z).toBeLessThan(27.8);
  expect(r.under.z).toBeGreaterThan(26.5);
});

test("furniture upstairs and your cars in their bays are solid", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(() => {
    // a sofa (4 by 2 cells, 2 m by 1 m) in the middle of the room
    save.home.items = [{ id: "sofa", x: 16, z: 10, r: 0 }];
    const x0 = HOME_ORIGIN.x + 16 * HOME_CELL, z0 = HOME_ORIGIN.z + 10 * HOME_CELL;
    __at(x0 + 1, z0 - 2.5, H_IN, 5.25); __walk(H_IN, 60 * 4); const sofa = __where();
    // a car of yours in its bay
    const i = save.owned.findIndex((id) => id !== curId), s = SPOTS[i], c = carMeshes[save.owned[i]];
    __at(s[0], s[1] - 6, H_IN); __walk(H_IN, 60 * 5); const at = __where();
    // and the room's furniture is drawn while you're about the house (it was only drawn on the garage screen)
    homeBuild(); cullParked();
    return { sofa, front: +(z0).toFixed(2), car: Math.hypot(at.x - s[0], at.z - s[1]), shown: c.G.visible, room: HV.root.visible };
  });
  expect(r.sofa.z).toBeLessThan(r.front);
  expect(r.sofa.z).toBeGreaterThan(r.front - 1);
  expect(r.shown).toBe(true);
  expect(r.room).toBe(true);
  expect(r.car).toBeGreaterThan(2);
});

test("cars still can't drive in, the door up or not", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const z = await game.eval(() => {
    window.__DTMAX = 1e-9;
    for (const t of TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    doorOpen = 1;
    const p = gW(0, -12);
    Object.assign(P, { x: p.x, z: p.z, h: Math.PI / 2, vx: 0, vz: 0 });
    keys.w = true;
    for (let i = 0; i < 60 * 6; i++) driveUpdate(1 / 60);
    keys.w = false;
    return houseLocal(P.x, P.z).z;
  });
  expect(z).toBeLessThan(0);
});

test("indoors the camera stays inside the walls, and below the room upstairs while you're under it", async ({ game }) => {
  await onFoot(game);
  const r = await game.eval(() => {
    const cam = () => { const l = houseLocal(camera.position.x, camera.position.z); return { x: l.x, z: l.z, y: camera.position.y - gY }; };
    __at(21.5, 8, H_LEFT); for (let i = 0; i < 30; i++) driveUpdate(1 / 60); const wall = cam();
    __at(10, 24, H_IN); for (let i = 0; i < 30; i++) driveUpdate(1 / 60); const under = cam();
    return { wall, under };
  });
  expect(r.wall.x).toBeLessThan(22.3);
  expect(r.under.y).toBeLessThan(4.5);
});

test("E inside opens the garage screen", async ({ game }) => {
  await onFoot(game);
  await game.eval(() => { __at(0, 10, H_IN); });
  expect(await game.eval(() => document.getElementById("promptTxt").textContent)).toBe("Garage · your cars and your home");
  await game.eval(() => { window.__DTMAX = 0; });
  await game.key("e");
  await game.waitState("GARAGE");
  expect(await game.eval(() => FOOT.on)).toBe(false);
});
