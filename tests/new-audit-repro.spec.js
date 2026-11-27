const { test, expect } = require("./support/game");

test("a patrol outside the rear wall cannot arrest a walker upstairs", async ({game}) => {
  await game.open({police:true});
  const result = await game.eval(() => {
    goUpstairs();
    const player=gW(10,28.5,5.25), patrol=gW(10,33);
    Object.assign(FOOT,{x:player.x,y:player.y,z:player.z});
    const t=TRAFFIC.find(c=>c.cop), e=EDGES.find(e=>e.len>100);
    for(const c of TRAFFIC)if(c!==t)c.chase=false;
    Object.assign(t,{e,chase:true,wx:patrol.x,wz:patrol.z});
    COPNAV=copNav();copNavT=100;WANTED.lvl=1;WANTED.caughtT=COP_V.caughtT-.01;
    const credits=save.cr;copUpdate(.02);
    return {stars:WANTED.lvl,fine:credits-save.cr,upstairs:FOOT.y-gY};
  });
  expect(result).toEqual({stars:1,fine:0,upstairs:5.25});
});

test("photo preview removes the camera controls from keyboard navigation",async({game,page})=>{
  await game.open();await game.driveOut();
  await game.eval(()=>{photoEnter();photoShotShow(new Blob(["photo"],{type:"image/png"}));});
  await page.locator("#phBack").focus();await page.keyboard.press("Shift+Tab");
  expect(await game.eval(()=>!!document.activeElement.closest("#phShot"))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await game.eval(()=>!!document.activeElement.closest("#phShot"))).toBe(true);
});

test("Photo Mode freezes the garage door when opening near the threshold",async({game})=>{
  await game.open();
  const result=await game.eval(()=>{
    goUpstairs();const q=gW(0,1);
    Object.assign(FOOT,{x:q.x,y:q.y,z:q.z});
    doorOpen=.94;photoEnter();
    const before=doorOpen;
    const raf=window.requestAnimationFrame;
    try {window.requestAnimationFrame=()=>0;for(let i=0;i<20;i++)frame(prevTs+16);}
    finally {window.requestAnimationFrame=raf;}
    return {before,after:doorOpen};
  });
  expect(result.after).toBe(result.before);
});

test("a new record without ghost samples clears the superseded ghost",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    window.__DTMAX=1e-9;
    const E=EVENTS.find(e=>e.type==="tt");
    save.rec[E.id]=360;
    save.ghost[E.id]={c:curId,t:360,d:[0,0,0,0,0,1,0,1]};
    startEvent(E);
    // More than five minutes of samples fills the current recorder. It cannot
    // publish a replacement, even if a slow prior record is finally beaten.
    ev.rec=Array(12000).fill(0);
    finishEvent(330);
    return {record:save.rec[E.id],ghost:save.ghost[E.id]?.t??null};
  });
  expect(r).toEqual({record:330,ghost:null});
});

test("a gallery round trip through another owned car preserves existing damage",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    window.__DTMAX=1e-9;
    const first=curId,other=save.owned.find(id=>id!==first);
    P.damage=63;openDealer(other);$("dDrive").click();
    dPick(CARS.findIndex(c=>c.id===first));$("dDrive").click();closeDealer();
    return {id:curId,first,damage:P.damage};
  });
  expect(r.id).toBe(r.first);expect(r.damage).toBe(63);
});
