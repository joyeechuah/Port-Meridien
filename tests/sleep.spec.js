const { test, expect } = require("./support/game");

const night = { tod: 22, todMode: 0, home: { v: 1, items: [{ id: "single", x: 2, z: 2, r: 0 }] } };

test("a bed offers sleep only at home during an automatic night", async ({ game, page }) => {
  await game.open({ save: night });
  await expect(page.locator("#gSleep")).toBeVisible();
  const states = await game.eval(() => {
    const visible = () => { restSync(); return !$("gSleep").classList.contains("hide"); };
    const times = [19.999,20,23.99,0,4.999,5,7].map(h => { save.tod=h; return visible(); });
    save.tod=22;
    const presets=[1,2,3,4].map(i=>{save.todMode=i;return visible()});
    save.todMode=0; setState("DEALER"); const away=visible(); setState("GARAGE");
    save.home.items=[]; return {times,presets,away,empty:visible()};
  });
  expect(states).toEqual({ times:[false,true,true,true,true,false,false], presets:[false,false,false,false],away:false,empty:false });
});

test("each refusal gives a reason and leaves the save and clocks untouched", async ({ game }) => {
  await game.open({ save: night });
  const rows = await game.eval(() => {
    const checks = [
      ["police", () => WANTED.lvl=1, () => WANTED.lvl=0],
      ["party", () => PARTY.active=true, () => PARTY.active=false],
      ["friend", () => GUEST.who=PEOPLE[0], () => GUEST.who=null],
      ["design", () => HV.on=true, () => HV.on=false],
      ["customis", () => cuId=curId, () => cuId=null],
      ["cloud", () => CL.applying=true, () => CL.applying=false],
      ["stopped", () => tabIdle=true, () => tabIdle=false],
      ["tab", () => Object.defineProperty(document,"hidden",{configurable:true,value:true}), () => delete document.hidden]
    ];
    const snapshot=()=>JSON.stringify([save,NEEDS,NS,FEEL,homeUntil]);
    return checks.map(([reason,on,off])=>{
      on(); const before=snapshot(); const ok=needsSleep(),same=before===snapshot();
      const explained=$("sleepNotice").textContent.toLowerCase().includes(reason);
      off(); return {reason,ok,same,explained};
    });
  });
  for(const row of rows) expect(row,row.reason).toMatchObject({ok:false,same:true,explained:true});
});

test("keyboard sleep writes once, leaves active waits alone and reloads at breakfast", async ({ game, page }) => {
  await game.open({ save: night });
  await game.eval(() => {
    window.__DTMAX=1e-9;
    Object.assign(NEEDS,{energy:9,hunger:43}); NS.t=70; NS.restAt=85;
    homeUntil.party=112;homeUntil.snack=130;
    window.sleepGen=SAVE.gen;
  });
  await page.keyboard.press("n");
  const r=await game.eval(()=>({gen:SAVE.gen-window.sleepGen,h:save.tod,e:NEEDS.energy,food:NEEDS.hunger,
    t:NS.t,rest:NS.restAt,party:homeUntil.party,snack:homeUntil.snack,feeling:feeling(),why:FEEL.why}));
  expect(r.h).toBeCloseTo(7,4);
  expect(r).toMatchObject({gen:1,e:100,food:28,t:70,rest:100,party:112,snack:130,feeling:"energised",why:"A good night's sleep"});
  await game.reload();
  expect(await game.eval(()=>[Math.floor(save.tod),NEEDS.energy,NEEDS.hunger,homeUntil.party-NS.t,homeUntil.snack-NS.t,NS.restAt-NS.t])).toEqual([7,100,28,42,60,30]);
  await expect(page.locator("#gSleep")).toBeHidden();
});

test("RB sleeps once with hunger clamped at zero and the cloud chooser stays closed", async ({ game }) => {
  await game.open({save:night});
  const result=await game.eval(async ()=>{
    NEEDS.hunger=8; needsCommit();
    CL.user={uid:"sleep-test"}; CL.meta.needs=needsKey(save);
    const sharedBefore=netState(),remote=structuredClone(save), pad={connected:true,index:0,axes:[0,0,0,0],
      buttons:Array.from({length:17},(_,i)=>({pressed:i===5,value:i===5?1:0}))};
    Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[pad]});
    const gen=SAVE.gen;pollPad();pollPad();const writes=SAVE.gen-gen;
    // Only the upload is replaced. The real chooser compares the two saves.
    const upload=clUpload;let uploads=0;
    try {clUpload=()=>{uploads++;return Promise.resolve()};await clReconcile({rev:2,save:JSON.stringify(remote)});}
    finally {clUpload=upload}
    return {localClockOnly:JSON.stringify(sharedBefore)===JSON.stringify(netState()),writes,uploads,chooser:!!CL.pick,clock:Math.floor(save.tod),hunger:JSON.parse(localStorage.getItem(SAVE_KEY)).needs.hunger};
  });
  expect(result).toEqual({localClockOnly:true,writes:1,uploads:1,chooser:false,clock:7,hunger:0});
});

test("at 360 by 640 both bedside controls fit with double-size text", async ({ game,page })=>{
  await page.setViewportSize({width:360,height:640});
  await game.open({save:night});
  for(const scale of [1,2]){
    const result=await game.eval(scale=>{
      const buttons=[$("gRest"),$("gSleep")];
      for(const b of buttons)b.style.fontSize=(10*scale)+"px";
      const [a,b]=buttons.map(el=>el.getBoundingClientRect());
      return a.left>=0&&a.right<=b.left&&b.right<=innerWidth&&b.bottom<=innerHeight&&buttons.every(el=>{
        const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el&&el.scrollWidth<=el.clientWidth+1;
      });
    },scale);
    expect(result).toBe(true);
  }
});
