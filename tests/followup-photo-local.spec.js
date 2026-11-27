const {test,expect}=require("./support/game");
test("one photo persists its want, XP and daily count in one checkpoint",async({game})=>{
  await game.open();await game.driveOut();
  const r=await game.eval(async()=>{
    save.wants.active=["photo"];
    save.photoDay.count=0;
    photoEnter();
    const before=SAVE.gen;
    const ok=await photoCapture();
    const disk=JSON.parse(localStorage.getItem(SAVE_KEY));
    return {ok,writes:SAVE.gen-before,photos:disk.photoDay.count,completed:disk.wants.completed.photo};
  });
  expect(r).toEqual({ok:true,writes:1,photos:1,completed:1});
});
