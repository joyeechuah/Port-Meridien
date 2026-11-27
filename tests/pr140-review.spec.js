const { test, expect } = require("./support/game");

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.eval(() => { window.__DTMAX = 1e-9; });
});

test("the stern stays clear when reversing towards a yacht's transom", async ({ game }) => {
  const free = await game.eval(() => {
    // The yacht's square stern is at +8.5 and ours at -3.2. Start clear by 5 cm.
    const yacht = BOATS.filter(b => b.move)[0];
    Object.assign(yacht, { x: 1800, z: 0, yaw: 0 });
    Object.assign(BOAT, { x: 1800, z: 11.75, h: 0 });
    return boatFree(1800, 11.65, 0);
  });
  expect(free).toBe(false);
});

test("a turn with a blocked centre cannot swing the stern into a yacht", async ({ game }) => {
  const result = await game.eval(() => {
    const yacht = BOATS.filter(b => b.move)[0];
    Object.assign(yacht, { x: 1800, z: 0, yaw: 0 });
    // Alongside the rectangular aft section: the inboard stern corner starts
    // 5 cm beyond its side (2.3 + 1.15). A 0.03 rad turn sweeps it across.
    Object.assign(BOAT, { x: 1803.50, z: 1, h: 0 });
    return [boatFree(BOAT.x, BOAT.z, 0), boatFree(BOAT.x, BOAT.z, .03)];
  });
  expect(result).toEqual([true, false]);
});

test("two nearby boats allow a clear sideways escape and the whole pier reports its deck", async ({ game }) => {
  const result = await game.eval(() => {
    Object.assign(BOAT, { x: 1800, z: 0, h: 0 });
    for (const [i, offset] of [-7, 7].entries()) Object.assign(BOATS[i], { x: 1800 + offset, z: 0, yaw: 0 });
    const samples = [];
    for (let x = PIER.x0; x <= PIER.x1; x++)
      for (const z of [PIER.z0, 0, PIER.z1]) samples.push(boatBlock(x, z, Math.PI / 2));
    return { pier: [...new Set(samples)], mooring: boatFree(...BOAT.home),
      escape: boatFree(1800, .1, 0), nearer: boatFree(1800.1, 0, 0) };
  });
  expect(result).toEqual({ pier: ["pier"], mooring: true, escape: true, nearer: false });
});

test("map travel and cancelling an intro keep an ordinary passenger until the cup starts", async ({ game, page }) => {
  await game.eval(() => {
    const p = PEDS[0]; Object.assign(RIDE, { p, who: personOf(p), st: "follow" });
    RIDE_V.lift = 0; rideBoard(); openMap(); fastTravel({ act: "event", E: EVENTS[0] });
  });
  await game.waitState("DRIVE");
  expect(await game.eval(() => RIDE.st)).toBe("ride");
  await game.eval(() => { openIntro(EVENTS[0]); document.getElementById("iNo").click(); });
  expect(await game.eval(() => RIDE.st)).toBe("ride");
  await game.eval(() => { cupStart("A1"); document.getElementById("iGo").click(); });
  await game.waitState("DRIVE");
  expect(await game.eval(() => [RIDE.p, ev.cup.round])).toEqual([null, 0]);
  await game.eval(() => { finishEvent(); showResult(); document.getElementById("rNext").click(); });
  await expect(page.locator("#iType")).toContainText("ROUND 2");
  await game.eval(() => document.getElementById("iGo").click());
  await game.waitState("DRIVE");
  expect(await game.eval(() => [RIDE.p, ev.cup.round])).toEqual([null, 1]);
});

test("photo reset clears the terrain and deck and preserves the SUV framing", async ({ game }) => {
  const r = await game.eval(() => {
    photoEnter();
    const frame = () => { photoReset(); photoFrame(0); return camera.position; };
    pc.shape = "suv"; frame(); const suv = PH.dist;
    FOOT.on = true;
    let clearance = Infinity;
    for (let x = 200; x <= 500; x += 15) {
      Object.assign(FOOT, { x, z: 150, y: footGround(x, 150), h: x });
      const p = frame(); clearance = Math.min(clearance, p.y - Math.max(meshH(p.x,p.z),surfH(p.x,p.z)));
    }
    const foot = PH.dist; FOOT.on = false; BOAT.on = true;
    Object.assign(BOAT, { x: BOAT.home[0], z: BOAT.home[1], h: -Math.PI * .82 + .85 });
    const p = frame();
    return { suv, foot, boat: PH.dist, clearance, overDeck: onPier(p.x,p.z), deck: p.y - PIER.y, sea: p.y };
  });
  expect(r.suv).toBeCloseTo(8.28); expect(r.foot).toBe(4.2); expect(r.boat).toBe(9.5);
  expect(r.clearance).toBeGreaterThan(.34); expect(r.overDeck).toBe(true);
  expect(r.deck).toBeGreaterThan(.35); expect(r.sea).toBeGreaterThan(.5);
});

test("gift, friendship and goodbye keep the controller on an actionable choice", async ({ game }) => {
  const r = await game.eval(() => {
    FOOT.on = true;
    const p = PEDS.find(p => personOf(p)?.trait === "busy"), who = personOf(p);
    p.m.G.visible = true; p.st = "idle"; FOOT.x = p.x; FOOT.z = p.z;
    save.rel[who.id] = { f: 39, n: 2 }; save.cr = 1000;
    talkOpen(p);
    const selected = () => tkButtons()[TALK.sel] === document.querySelector("#tkActs .sel");
    const gift = document.getElementById("tkGift");
    talkSel(tkButtons().indexOf(gift)); talkPick("hello");
    const threshold = rel(who.id).f >= 40 && tkButtons()[TALK.sel] === gift;
    lifeUpdate(.8); talkPad(i => i === 0);
    const menu = document.getElementById("tkActs").classList.contains("giving") && selected();
    talkPad(i => i === 0);
    const given = gift.disabled && giftGiven(who.id) && selected();
    lifeUpdate(.8); talkPick("chat");
    const third = TALK.end > 0 && !talkGift("book");
    lifeUpdate(1.5); const closed = !TALK.p;
    talkOpen(p); p.x += 20; lifeUpdate(.01);
    return { threshold, menu, given, third, closed, walked: !TALK.p };
  });
  expect(r).toEqual({ threshold: true, menu: true, given: true, third: true, closed: true, walked: true });
});

for (const endpoint of [false, true]) {
  test(endpoint ? "a short drop at a road endpoint clears the player" : "a police drop leaves a parked traffic car clear", async ({ game }) => {
    const gap = await game.eval(endpoint => {
      const edge = EDGES.find(e => e.type === "town" && e.len > 100);
      const s = endpoint ? .5 : 60, q = edgePos(edge,s);
      for (const t of TRAFFIC) t.e = null;
      Object.assign(P,{ x:q.x, z:q.z, h:Math.atan2(q.dx,q.dz) });
      const cop = TRAFFIC.find(t => t.cop);
      const behind = edgePos(edge,s+3);
      Object.assign(cop,{ e:edge, s, wx:behind.x, wz:behind.z, yaw:P.h, chase:true, free:true, dir:1, hitT:0 });
      const other = TRAFFIC.find(t => !t.cop);
      if (!endpoint) {
        const b = edgePos(edge,s-25), off = RT[edge.type].lanes[0]*SIDE();
        Object.assign(other,{ e:edge, wx:b.x-b.dz*off, wz:b.z+b.dx*off });
      }
      resetToRoad(false);
      if (endpoint) { collidePlayer(); return cop.hitT > 0 ? 0 : Infinity; }
      return Math.hypot(cop.wx-other.wx,cop.wz-other.wz);
    }, endpoint);
    expect(gap).toBeGreaterThan(4);
  });
}

test("reconnecting a controller inside a pause sub-screen starts with one scroll step", async ({ game }) => {
  const moved = await game.eval(() => {
    let connected = true;
    const pad = { connected:true, index:0, buttons:Array.from({length:17},()=>({pressed:false,value:0})), axes:[0,0,0,0] };
    Object.defineProperty(navigator,"getGamepads",{ configurable:true, value:()=>connected?[pad]:[] });
    pauseOn(); pollPad(); connected = false; pollPad();
    collectionsOpen(); const list = document.getElementById("cardList");
    list.style.maxHeight = "100px"; list.style.overflowY = "auto"; list.scrollTop = 0;
    // Age the last connected sample without delaying the suite.
    if (GP.t) GP.t -= 60000;
    connected = true; pad.axes[3] = 1; pollPad(); return list.scrollTop;
  });
  expect(moved).toBeGreaterThan(0); expect(moved).toBeLessThan(20);
});

test("sea recovery returns the car to shore and clears a free pursuer at the landing", async ({ game }) => {
  await game.eval(() => {
    const x = PIER.x1 + 20, z = 15;
    Object.assign(P, { x, z, vx: 0, vz: 0, h: Math.PI / 2 });
    const road = nearestRoadGlobal(x,z,true);
    const cop = TRAFFIC.find(t => t.cop);
    Object.assign(cop, { e: EDGES[0], s: 0, wx: road.x, wz: road.z + 5, yaw: P.h, free: true, chase: true });
    for (let i = 0; i < 50 && state === "DRIVE"; i++) driveUpdate(.025);
  });
  await game.waitState("FADE");
  await game.waitState("DRIVE");
  const result = await game.eval(() => {
    const c = TRAFFIC.find(t => t.cop);
    return { land: surfH(P.x,P.z) > -.6, clear: Math.hypot(c.wx-P.x,c.wz-P.z) > 4 };
  });
  expect(result).toEqual({ land: true, clear: true });
});

test("the boat stops before its square stern enters the pier", async ({ game }) => {
  const free = await game.eval(() => {
    // Reversing towards the deck from open water. The motorboat's hull alone
    // extends 3.2 m aft, before even counting its outboard.
    const z = PIER.z1 + 3.15;
    Object.assign(BOAT, { x:1236, z:z+.1, h:0 });
    return boatFree(BOAT.x,z,0);
  });
  expect(free).toBe(false);
});

test("the pier does not hide the moored boat after resetting the photo camera", async ({ game }) => {
  const blocked = await game.eval(() => {
    BOAT.on = true;
    Object.assign(BOAT,{ x:BOAT.home[0], z:BOAT.home[1], h:-Math.PI/2 });
    photoEnter();photoReset();photoFrame(0);
    const from=camera.position,to=phTarget();
    // Intersect the actual camera-to-subject segment with the deck's top face.
    const f=(PIER.y-from.y)/(to.y-from.y);
    return f>0&&f<1&&onPier(from.x+f*(to.x-from.x),from.z+f*(to.z-from.z));
  });
  expect(blocked).toBe(false);
});
