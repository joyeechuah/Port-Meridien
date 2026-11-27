const {test,expect}=require("./support/game");

test("cloud dialog keeps keyboard focus off the garage underneath",async({game,page})=>{
  await game.open();
  await game.eval(()=>{CL.ad=null;clOpen();});
  await page.locator("#clClose").focus();
  const escaped=[];
  for(let i=0;i<10;i++){
    await page.keyboard.press("Tab");
    escaped.push(await game.eval(()=>document.activeElement.closest("#gui")?.id??null));
  }
  expect(escaped).not.toContain("gui");
});

test("an airborne car cannot offer to let the driver out",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    window.__DTMAX=1e-9;Object.assign(P,{air:true,y:surfH(P.x,P.z)+2,vx:0,vz:0,vy:-2,water:false});
    return {blocked:footBlocked(),exited:footExit()};
  });
  expect(r.blocked).toBeTruthy();expect(r.exited).toBe(false);
});

test("first aid reports the actual health recovered at the cap",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    const k=KITS[0];Object.assign(P,{x:k.x,z:k.z});HEALTH.hp=99;
    kitTick(.01);
    return {hp:HEALTH.hp,label:$("toasts").firstElementChild.textContent};
  });
  expect(r.hp).toBe(100);expect(r.label).toContain("+1 health");
});

test("ME can centre the map at the outer sailing boundary",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    BOAT.on=true;BOAT.x=BOAT_V.edge-15;BOAT.z=0;openMap();$("mapMe").click();
    return {x:BOAT.x,centre:MV.cx,zoom:MV.z};
  });
  expect(r.centre).toBeCloseTo(r.x);
});

test("a friend's car snaps across a travel jump instead of crossing the island between packets",async({game})=>{
  await game.open();
  const distance=await game.eval(()=>{
    const a={m:0,x:0,y:0,z:0,h:0,v:0},b={...a,x:900};
    const d=netAt({buf:[{t:10,d:a},{t:10.15,d:b}]},10.075);
    return Math.min(Math.abs(d.x-a.x),Math.abs(d.x-b.x));
  });
  expect(distance).toBeLessThan(1);
});

test("audio remains suspended while the document is hidden",async({game})=>{
  await game.open();await game.driveOut();
  const called=await game.eval(()=>{
    if(!AC||!AU)return null;
    const old=AC.resume;let n=0;
    Object.defineProperty(document,"hidden",{configurable:true,value:true});
    Object.defineProperty(AC,"state",{configurable:true,value:"suspended"});
    AC.resume=()=>{n++;return Promise.resolve()};
    try{audioOn(true);return n}
    finally{AC.resume=old;delete AC.state;delete document.hidden}
  });
  expect(called).toBe(0);
});

test("road placement clears the passport's driven-distance accumulator immediately",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    const L=LANDMARKS[0],nr=nearestRoadGlobal(L.x,L.z,true);
    delete save.found[L.id];PZ.driven=500;PZ.lx=nr.x;PZ.lz=nr.z;
    placeOnRoad(nr,1);updatePassport();
    return {found:!!save.found[L.id],travel:PZ.driven};
  });
  expect(r.found).toBe(false);
});

test("a disconnected soundtrack recovers when the browser comes back online",async({game})=>{
  await game.open();
  const mode=await game.eval(()=>{
    const S=SONGS.coast;
    Object.assign(S,{st:"failed",err:"network",tries:4,retryAt:null});
    window.dispatchEvent(new Event("online"));songFetch("coast");
    return S.st;
  });
  expect(mode).toBe("loading");
});
