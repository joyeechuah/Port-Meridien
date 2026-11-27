const {test, expect}=require("./support/game");

test("Homebody's faster fun drain applies outside the house only",async({game})=>{
  await game.open();
  const r=await game.eval(()=>{
    goUpstairs();save.traits.ids=["homebody"];
    const inside=traitLoss("fun");
    FOOT.x-=80;
    return {inside,outside:traitLoss("fun")};
  });
  expect(r).toEqual({inside:1,outside:1.1});
});

test("a counted championship round keeps its own difficulty through recovery of a malformed round", async({game})=>{
  await game.open({save:{champ:{A1:{r:3,pts:[10,5,10],d:[2,0,2],won:false}}}});
  const r=await game.eval(()=>({points:save.champ.A1.pts,difficulty:save.champ.A1.d}));
  expect(r).toEqual({points:[10,10],difficulty:[2,2]});
});

test("a held tilt reading does not turn the walker behind party invitations",async({game})=>{
  await game.open();
  const r=await game.eval(()=>{
    goUpstairs();window.__DTMAX=1e-9;
    relSet(0,90,3);partyPanel();
    const before=FOOT.h;
    // Substitute the tilt sensor's already-calibrated output for a tilted phone.
    TILT.zero=0;TILT.phi=.8;save.tilt=true;
    for(let i=0;i<20;i++)driveUpdate(1/60);
    return {open:partyOpen(),touch:isTouch,before,after:FOOT.h};
  });
  expect(r.open).toBe(true);expect(r.touch).toBe(true);expect(r.after).toBe(r.before);
});

test("re-selecting the same race difficulty does not write a new checkpoint",async({game})=>{
  await game.open();await game.driveOut();
  const writes=await game.eval(()=>{
    const E=EVENTS.find(e=>e.type==="race");openIntro(E);
    const old=SAVE.gen;document.querySelector("#iDiff .on").click();
    return SAVE.gen-old;
  });
  expect(writes).toBe(0);
});

test.use({hasTouch:true,isMobile:true});
