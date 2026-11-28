// Regression tests for the five high-severity bugs found in the 28 Nov 2026 audit:
// 1. House palms render visually instead of leaving four invisible solid colliders.
// 2. Clicking the canvas in DESIGN HOME does not trigger garage car selection or goDrive().
// 3. Talking to a friend dropped off outside Old Quay still ticks TALK.busy / TALK.end and auto-closes.
// 4. netFirebase().close() during in-flight async seat acquisition does not throw TypeError or leak seats.
// 5. Traffic bubble respawns around activePlayer() rather than parked car P when walking or sailing > 720 m away.
const { test, expect } = require("./support/game");

test("house palms are rendered into scene meshes alongside their collision circles", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    const spots = [[-28, -4], [-40, -4], [28, -6], [-30, 26]].map(([x, z]) => gW(x, z));
    let meshCount = 0;
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.boundingBox) return;
      o.geometry.computeBoundingBox();
    });
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const box = new THREE.Box3().setFromObject(o);
      if (spots.some((p) => box.min.x <= p.x && box.max.x >= p.x && box.min.z <= p.z && box.max.z >= p.z && box.max.y > gY + 6)) {
        meshCount++;
      }
    });
    return { meshCount };
  });
  expect(r.meshCount).toBeGreaterThan(0);
});

test("clicking the canvas in DESIGN HOME does not switch garage slot or launch goDrive()", async ({ game }) => {
  await game.open();
  const r = await game.eval(() => {
    hvOpen();
    const beforeState = state;
    const beforeSel = gSel;
    const beforeHv = HV.on;
    const c = document.getElementById("c");
    const rect = c.getBoundingClientRect();
    // Simulate a direct click over the canvas center / lower mezzanine area where garage pickers sit underneath
    for (const [fx, fy] of [[0.5, 0.5], [0.4, 0.65], [0.6, 0.65]]) {
      c.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width * fx,
        clientY: rect.top + rect.height * fy,
      }));
    }
    return { beforeState, beforeSel, beforeHv, afterState: state, afterSel: gSel, afterHv: HV.on };
  });
  expect(r.beforeHv).toBe(true);
  expect(r.afterHv).toBe(true);
  expect(r.afterState).toBe("GARAGE");
  expect(r.afterSel).toBe(r.beforeSel);
});

test("talking to a friend dropped off outside Old Quay ticks down TALK.busy and auto-closes when leaving", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    window.__DTMAX = 1e-9;
    // Move car far outside Old Quay (> 420 m from (660, 36))
    P.x = -120; P.z = -120; P.vx = P.vz = 0; P.thr = 0;
    const p = PEDS[0];
    p.x = P.x + 2; p.z = P.z + 2; p.y = footGround(p.x, p.z);
    p.m.G.position.set(p.x, p.y, p.z); p.m.G.visible = true;
    FOOT.on = true; FOOT.car = [P.x, P.z]; FOOT.v = 0; footModel().G.visible = true;   // (on foot beside the car: there is no footStart)
    FOOT.x = p.x - 1.2; FOOT.z = p.z; FOOT.y = footGround(FOOT.x, FOOT.z);
    talkOpen(p);
    TALK.busy = 0.7;
    pedUpdate(0.5);
    const busyAfterHalf = TALK.busy;
    pedUpdate(0.5);
    const busyAfterFull = TALK.busy;
    // Walking away should auto-close dialogue even outside Old Quay
    FOOT.x += 12;
    pedUpdate(0.1);
    return { busyAfterHalf, busyAfterFull, talkClosed: TALK.p === null };
  });
  expect(r.busyAfterHalf).toBeLessThan(0.3);
  expect(r.busyAfterFull).toBe(0);
  expect(r.talkClosed).toBe(true);
});

test("traffic bubble respawns around activePlayer() when on foot far from the parked car", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const r = await game.eval(() => {
    window.__DTMAX = 1e-9;
    // Park car at one end of the island and move player on foot > 900 m away near Old Quay
    P.x = -400; P.z = -400; P.vx = P.vz = 0;
    FOOT.on = true; FOOT.car = [P.x, P.z]; FOOT.v = 0; footModel().G.visible = true;   // (on foot beside the car: there is no footStart)
    FOOT.x = 640; FOOT.z = 20; FOOT.y = footGround(FOOT.x, FOOT.z);
    let ok = false;
    const t = TRAFFIC.find((c) => !c.cop);
    for (let i = 0; i < 10 && !ok; i++) ok = spawnTraffic(t, 220, 560, false);
    const distFromFoot = Math.hypot(t.wx - FOOT.x, t.wz - FOOT.z);
    const distFromCar = Math.hypot(t.wx - P.x, t.wz - P.z);
    return { ok, distFromFoot, distFromCar };
  });
  expect(r.ok).toBe(true);
  expect(r.distFromFoot).toBeGreaterThanOrEqual(210);
  expect(r.distFromFoot).toBeLessThanOrEqual(570);
  expect(r.distFromCar).toBeGreaterThan(600);
});

test("netFirebase().close() while seat acquisition is in flight does not throw or leak seat", async ({ game }) => {
  await game.open();
  const r = await game.eval(async () => {
    let errors = [];
    const onRej = (e) => errors.push(String(e.reason || e));
    addEventListener("unhandledrejection", onRej);
    let resolveSet;
    let removed = false;
    let offlineCalled = false;
    const fakeRef = {
      set: () => new Promise((res) => { resolveSet = res; }),
      remove: () => { removed = true; return Promise.resolve(); },
      onDisconnect: () => ({ remove: () => Promise.resolve(), cancel: () => Promise.resolve() }),
    };
    const fakeRoom = {
      once: () => Promise.resolve({ child: () => ({ val: () => null }) }),
      child: () => fakeRef,
      on: () => {},
      off: () => {},
    };
    const fakeDb = {
      goOnline: () => {},
      goOffline: () => { offlineCalled = true; },
      ref: () => fakeRoom,
    };
    // Verify netFirebase handles close() mid-take cleanly when firebase is stubbed
    const savedFb = window.firebase;
    const savedLoad = window.fbLoad;
    window.fbLoad = () => Promise.resolve();
    window.firebase = {
      apps: [{
        name: "play",
        auth: () => ({ currentUser: { uid: "u1" } }),
        database: () => fakeDb,
      }],
    };
    try {
      const tx = netFirebase();
      await tx.connect();
      const openP = tx.open("ABCD", true, { first: () => ({ x: 0 }), state: () => {}, leave: () => {}, lost: () => {} });
      await new Promise((res) => setTimeout(res, 10));
      tx.close();
      if (resolveSet) resolveSet();
      await openP.catch(() => {});
      await new Promise((res) => setTimeout(res, 20));
      return { errors, removed, offlineCalled };
    } finally {
      removeEventListener("unhandledrejection", onRej);
      window.firebase = savedFb;
      window.fbLoad = savedLoad;
    }
  });
  expect(r.errors).toEqual([]);
  expect(r.removed).toBe(true);
});