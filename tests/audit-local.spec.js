const {test,expect}=require("./support/game");

test("hard cup preview matches the award for a fresh Hard cup",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    save.diff=2;pauseOn();cupsOpen();
    const label=$("cpList").firstElementChild.textContent;
    const C=CUPS[0]; let res;
    for(let i=0;i<3;i++)res=cupScore({cls:C.cls,round:i},0,evById(C.ev[i]).type==="race"?2:null);
    return {label,award:fmtCr(res.prize)};
  });
  expect(r.label).toContain("prize "+r.award+" CR");
});

test("cancelling a cup intro from upstairs leaves the player upstairs",async({game})=>{
  await game.open();
  const r=await game.eval(()=>{
    goUpstairs();const previous=[FOOT.x,FOOT.y,FOOT.z];
    pauseOn();cupsOpen();$("cpList").querySelector("button").click();
    const opened=state==="INTRO";$("iNo").click();
    return {opened,onFoot:FOOT.on,position:[FOOT.x,FOOT.y,FOOT.z],previous};
  });
  expect(r.opened).toBe(true);expect(r.onFoot).toBe(true);expect(r.position).toEqual(r.previous);
});

test("returning to the garage from upstairs keeps an active party",async({game})=>{
  await game.open();
  const r=await game.eval(async()=>{
    relSet(0,90,3);partyInvite([0]);partyStart();
    goUpstairs();const upstairs=PARTY.active;
    goGarage(false);await new Promise(r=>setTimeout(r,580));
    return {upstairs,active:PARTY.active,where:state};
  });
  expect(r).toEqual({upstairs:true,active:true,where:"GARAGE"});
});

test("replaying a finished cup and cancelling preserves the last result",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(()=>{
    save.champ.A1={r:3,pts:[10,10,10],d:[1,1,null],won:true};
    pauseOn();cupsOpen();$("cpList").querySelector("button").click();
    const opened=state==="INTRO";$("iNo").click();
    return {opened,points:save.champ.A1.pts,disk:JSON.parse(localStorage.getItem(SAVE_KEY)).champ.A1.pts};
  });
  expect(r).toEqual({opened:true,points:[10,10,10],disk:[10,10,10]});
});

test("Space activates a party button while its invitations are open on foot",async({game,page})=>{
  await game.open();
  await game.eval(()=>{goUpstairs();relSet(0,90,3);partyPanel();});
  const friend=page.locator("#pyList .pyp").first();
  await friend.focus();await page.keyboard.press("Space");
  await expect(friend).toHaveAttribute("aria-pressed","true",{timeout:2500});
});
