const {test,expect}=require("./support/game");

test.beforeEach(async ({game})=>{
  await game.open();await game.driveOut();
  await game.eval(()=>{window.__DTMAX=1e-9});
});

test("a sideways slide cannot count as stopping at a contract pickup",async({game})=>{
  const r=await game.eval(()=>{
    const J=JOBS.find(j=>j.type==="courier");jobStart(J);
    const t=jobTarget();
    Object.assign(P,{x:t.x,z:t.z,h:0,vx:20,vz:0});
    jobTick(1/60);return {stop:job.stop,speed:Math.hypot(P.vx,P.vz)*3.6};
  });
  expect(r.speed).toBe(72);
  expect(r.stop).toBe(0);
});

test("a time exactly at the advertised gold target wins gold",async({game})=>{
  const title=await game.eval(()=>{
    startEvent(EVENTS.find(e=>e.type==="tt"));finishEvent(ev.tg.gold);
    return ev.fin.title;
  });
  expect(title).toBe("GOLD");
});

test("a stale GO timeout cannot hide another event countdown",async({game})=>{
  const r=await game.eval(async()=>{
    const E=EVENTS.find(e=>e.type==="tt");startEvent(E);
    ev.t=-.01;updateEvent(.02);
    endEvent();startEvent(E);updateEvent(.02);
    const before=$("count").classList.contains("hide");
    window.__DTMAX=0;
    // Hold the second countdown still, as when pausing to look at the map.
    setState("PAUSE");
    await new Promise(done=>setTimeout(done,650));
    return {before,after:$("count").classList.contains("hide"),text:$("count").textContent};
  });
  expect(r.before).toBe(false);expect(r.after).toBe(false);
});

test("a manual passenger drop saves earned friendship",async({game})=>{
  const r=await game.eval(()=>{
    const p=PEDS[0],who=personOf(p);
    relSet(who.id,65,3);persist();
    Object.assign(RIDE,{p,who,st:"follow"});RIDE_V.lift=0;rideBoard();
    P.vx=0;P.vz=0;
    RIDE.fr=RIDE_V.friend;RIDE.t=8;
    rideTick(.01);ridePrompt().a();
    return {live:rel(who.id).f,disk:JSON.parse(localStorage.getItem(SAVE_KEY)).rel[who.id].f};
  });
  expect(r.live).toBe(66);expect(r.disk).toBe(r.live);
});

test("a waypoint route starts at the walker when the parked car is elsewhere",async({game})=>{
  const r=await game.eval(()=>{
    const nr=nearestRoadGlobal(600,0,true),destination=nearestRoadGlobal(700,200,true);
    Object.assign(FOOT,{on:true,x:nr.x,z:nr.z});
    setGPS(destination.x,destination.z,"Waypoint");
    const pt=gps.route.pts[0];
    return {walker:Math.hypot(pt.x-FOOT.x,pt.z-FOOT.z),car:Math.hypot(pt.x-P.x,pt.z-P.z)};
  });
  expect(r.walker).toBeLessThan(r.car);
});
