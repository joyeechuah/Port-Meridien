// Bugs found in a full search of the game (27 Nov 2026), one regression each: a friend carried into a race, the
// boat frozen by a passing boat (and told it was shallow at the pier), Photo Mode's RESET aimed from the parked car,
// a controller's pick drifting after asking a friend over, reset to road sending an off-road police car back to where
// it left the road, and the pause menu's scroll timer starting from the last visit.
const { test, expect } = require("./support/game");

const steps = (game, n, dt = 1 / 60) => game.eval(([n, dt]) => { for (let i = 0; i < n; i++) __T.driveUpdate(dt); }, [n, dt]);
// on foot in Old Quay beside resident i (friendship f), your car on the road next to you, nobody else about
async function withFriend(game, i = 0, f = 50) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(([i, f]) => {
    const T = __T;
    window.__DTMAX = 1e-9;
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    T.RIDE_V.lift = 0;
    T.P.x = 600; T.P.z = 0; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
    const walks = T.PED_EDGES.filter((e) => !e.cross && e.len > 40), e = walks[i];
    T.PEDS.forEach((q, k) => { if (k !== i) { q.m.G.visible = false; q.x = q.z = 1e5; } });
    const p = T.PEDS[i];
    p.e = e; p.from = e.a; p.s = 20; p.st = "idle"; p.t = 999; p.hitAt = undefined; p.mad = false;
    T.save.rel[i] = { f, n: 3 };
    T.driveUpdate(1 / 60);
    const nr = T.nearestRoadGlobal(p.x, p.z, true);
    T.P.x = nr.x; T.P.z = nr.z; T.P.vx = T.P.vz = 0; T.driveUpdate(1 / 60);
  }, [i, f]);
  await game.key("f");
  await game.eval((i) => {
    const T = __T, F = T.FOOT, p = T.PEDS[i], e = p.e, ax = e.b.x - e.a.x, az = e.b.z - e.a.z, L = Math.hypot(ax, az);
    F.x = p.x - (ax / L) * 1.8; F.z = p.z - (az / L) * 1.8; F.h = Math.atan2(p.x - F.x, p.z - F.z); F.y = T.footGround(F.x, F.z);
    T.driveUpdate(1 / 60);
  }, i);
}
const getIn = (game) => game.eval(() => {
  const T = __T, F = T.FOOT;
  F.x = T.P.x + Math.cos(T.P.h) * 1.7; F.z = T.P.z - Math.sin(T.P.h) * 1.7; F.y = T.footGround(F.x, F.z);
  T.driveUpdate(1 / 60);
  return T.footEnter();
});

test("a friend with you gets out when a race or a time trial starts: none comes along into one", async ({ game }) => {
  await withFriend(game, 0, 50);
  expect(await game.eval(() => __T.talkOpen(__T.PEDS[0]))).toBe(true);
  await game.key("7");
  await getIn(game);
  await steps(game, 360);
  expect(await game.eval(() => __T.RIDE.st)).toBe("ride");
  await game.watchToasts();
  const r = await game.eval(() => {
    const T = __T, E = T.EVENTS.find((x) => x.type === "race");
    T.startEvent(E);
    for (let i = 0; i < 30; i++) T.driveUpdate(1 / 60);
    return { with: !!T.RIDE.p, inCar: T.pc.G.children.some((o) => o.userData && o.userData.rider), hud: document.getElementById("ride").classList.contains("hide") };
  });
  expect(r).toEqual({ with: false, inCar: false, hud: true });
  expect((await game.toastLog()).some((t) => /Thanks for the ride/.test(t))).toBe(true);
});

test("a friend still on their way to your car doesn't follow you to a race's grid either", async ({ game }) => {
  await withFriend(game, 0, 50);
  expect(await game.eval(() => __T.talkOpen(__T.PEDS[0]))).toBe(true);
  await game.key("7");
  expect(await game.eval(() => __T.RIDE.st)).toBe("follow");
  await getIn(game);
  const r = await game.eval(() => {
    const T = __T;
    T.startEvent(T.EVENTS.find((x) => x.type === "tt"));
    for (let i = 0; i < 400; i++) T.driveUpdate(1 / 60);
    return { with: !!T.RIDE.p, st: T.RIDE.st };
  });
  expect(r).toEqual({ with: false, st: "" });
});

// standing on the pier beside the moored boat, then aboard
async function aboard(game) {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.eval(() => {
    const T = __T, P = T.P;
    window.__DTMAX = 1e-9;
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; }
    P.x = T.PIER.x0 - 14; P.z = 0; P.h = Math.PI / 2; P.vx = P.vz = 0;
    T.driveUpdate(1 / 60);
  });
  await game.key("f");
  await game.eval(() => {
    const T = __T, F = T.FOOT;
    F.x = T.BOAT.x; F.z = T.PIER.z0 + 0.8; F.y = T.PIER.y; F.h = Math.PI;
    T.driveUpdate(1 / 60);
  });
  await game.key("e");
  expect(await game.eval(() => __T.BOAT.on)).toBe(true);
}

test("a cruising boat passing through yours no longer freezes it: you can sail away, and nobody says it's shallow", async ({ game }) => {
  await aboard(game);
  await game.watchToasts();
  const r = await game.eval(() => {
    const T = __T, B = T.BOAT;
    // out at sea, one of the boats that cruise round the island 6 m behind you (they sail their loop through
    // anything in the way, so one can end up this close), and you open the throttle
    B.x = 1500; B.z = 0; B.h = Math.PI / 2; B.v = 0; B.steer = 0;
    const o = T.BOATS.find((b) => b.move), keep = { move: o.move, x: o.x, z: o.z };
    o.move = false; o.x = B.x - Math.sin(B.h) * 6; o.z = B.z - Math.cos(B.h) * 6;
    const x0 = B.x, z0 = B.z;
    T.keys.w = true;
    for (let i = 0; i < 180; i++) T.driveUpdate(1 / 60);
    T.keys.w = false;
    const moved = Math.hypot(B.x - x0, B.z - z0);
    // and back towards it: a boat still keeps you from sailing into it
    B.h += Math.PI; B.v = 0;
    let near = 1e9;
    T.keys.w = true;
    for (let i = 0; i < 600; i++) { T.driveUpdate(1 / 60); near = Math.min(near, Math.hypot(B.x - o.x, B.z - o.z)); }
    T.keys.w = false;
    Object.assign(o, keep);
    return { moved: +moved.toFixed(1), near: +near.toFixed(1) };
  });
  expect(r.moved).toBeGreaterThan(8);
  expect(r.near).toBeGreaterThan(8.5);
  const log = await game.toastLog();
  expect(log.some((t) => /TOO SHALLOW/.test(t))).toBe(false);
  expect(log.some((t) => /ANOTHER BOAT/.test(t))).toBe(true);
});

test("running into the pier says it's the pier, not that the water is too shallow", async ({ game }) => {
  await aboard(game);
  await game.watchToasts();
  await game.eval(() => {
    const T = __T, B = T.BOAT;
    // from the north, full power straight at the middle of the pier
    B.x = 1225; B.z = -60; B.h = 0; B.v = 0; B.steer = 0;
    T.keys.w = true;
    for (let i = 0; i < 600; i++) T.driveUpdate(1 / 60);
    T.keys.w = false;
  });
  const log = await game.toastLog();
  expect(log.some((t) => /^THE PIER/.test(t))).toBe(true);
  expect(log.some((t) => /TOO SHALLOW/.test(t))).toBe(false);
});

test("Photo Mode's RESET frames you on foot from behind you, not from the parked car's heading", async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.key("f");
  const r = await game.eval(() => {
    const T = __T, F = T.FOOT, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    F.h = T.P.h + 1.6;   // turned away from the way the car faces
    T.photoEnter();
    T.photoReset();
    const out = { rel: +wrap(T.PH.yaw - F.h).toFixed(3), want: +wrap(Math.PI * 0.82).toFixed(3), dist: T.PH.dist };
    T.photoExit();
    return out;
  });
  expect(r.rel).toBeCloseTo(r.want, 2);
  expect(r.dist).toBeLessThan(6);
});

test("with a controller, asking a friend over keeps the picked line and the one A presses the same", async ({ game }) => {
  await withFriend(game, 0, 50);
  expect(await game.eval(() => __T.talkOpen(__T.PEDS[0]))).toBe(true);
  const r = await game.eval(() => {
    const T = __T, inv = document.getElementById("tkInvite");
    T.talkSel(T.tkButtons().indexOf(inv));
    T.tkButtons()[T.TALK.sel].click();   // A on "Come over to my place"
    const bs = T.tkButtons(), picked = document.querySelector("#tkActs .sel");
    return { asked: T.GUEST.who && T.GUEST.who.id, same: picked === bs[T.TALK.sel], pickedDisabled: !!(picked && picked.disabled), a: bs[T.TALK.sel] && bs[T.TALK.sel].id };
  });
  expect(r.asked).toBe(0);
  expect(r.same).toBe(true);
  expect(r.pickedDisabled).toBe(false);
});

test("reset to road beside a police car chasing you off the road drops it back 25 m, not to where it left the road", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T, P = T.P;
    window.__DTMAX = 1e-9;
    for (const t of T.TRAFFIC) { t.e = null; t.lost = false; t.wx = t.wz = 1e6; t.chase = false; t.free = false; }
    // you, 13.5 m off a road on open ground (out of a police car's road), and the road you'd be set down on
    let spot = null;
    for (const e of T.EDGES) {
      if (e.type === "drive" || e.len < 300 || spot) continue;
      for (let s = 60; s < e.len - 60 && !spot; s += 20)
        for (const sd of [1, -1]) {
          const q = T.edgePos(e, s), x = q.x - q.dz * sd * 13.5, z = q.z + q.dx * sd * 13.5;
          if (T.nearestRoad(x, z, 12) || T.copBlocked(x, z) || T.groundH(x, z) < 1) continue;
          const cx = q.x - q.dz * sd * 7.5, cz = q.z + q.dx * sd * 7.5;
          if (T.copBlocked(cx, cz)) continue;
          spot = { e, s, x, z, cx, cz, q };
          break;
        }
    }
    if (!spot) return null;
    P.x = spot.x; P.z = spot.z; P.vx = P.vz = 0;
    // a police car that left a road 200 m away and has come over the ground to 6 m from you: off the road, its road
    // and place along it are still where it left (copDrive keeps them for copRejoin)
    const far = T.EDGES.find((e) => e.type !== "drive" && e.len > 60 && Math.hypot(T.edgePos(e, e.len / 2).x - spot.x, T.edgePos(e, e.len / 2).z - spot.z) > 200);
    const cop = T.TRAFFIC.find((t) => t.cop);
    Object.assign(cop, { e: far, s: far.len / 2, dir: 1, lost: false, chase: true, free: true, v: 0, wx: spot.cx, wz: spot.cz, yaw: Math.atan2(spot.x - spot.cx, spot.z - spot.cz) });
    cop.c.G.visible = true;
    T.WANTED.lvl = 1; T.WANTED.seen = true;
    T.resetToRoad(false);
    return { d: +Math.hypot(cop.wx - P.x, cop.wz - P.z).toFixed(1), free: cop.free, onRoad: !!T.nearestRoad(cop.wx, cop.wz, 6) };
  });
  expect(r, "a spot off a road").not.toBeNull();
  expect(r.d).toBeLessThan(45);
  expect(r.d).toBeGreaterThan(15);
  expect(r.free).toBe(false);
  expect(r.onRoad).toBe(true);
});

test("the pause menu's controller scroll starts fresh on each visit (it carried the last one's time and jumped 84 px)", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    const T = __T;
    let stick = 0;
    const pad = { connected: true, index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    // a pause a minute ago left its clock behind
    T.GP.t = performance.now() - 60000;
    T.pollPad();   // driving
    T.pauseOn();
    T.collectionsOpen();
    const list = document.getElementById("cardList");
    list.style.maxHeight = "120px"; list.style.overflowY = "auto"; list.scrollTop = 0;
    pad.axes[3] = 1; stick = list.scrollTop;
    T.pollPad();
    const moved = list.scrollTop - stick;
    pad.axes[3] = 0;
    delete navigator.getGamepads;
    return { moved, scrollable: list.scrollHeight > list.clientHeight };
  });
  expect(r.scrollable).toBe(true);
  expect(r.moved).toBeGreaterThan(0);
  expect(r.moved).toBeLessThan(20);
});
