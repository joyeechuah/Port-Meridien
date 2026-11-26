const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), vm = require("node:vm");
function part(file, from, until) {
  const src = fs.readFileSync(require.resolve("../js/" + file + ".js"), "utf8");
  const i = src.indexOf(from), j = src.indexOf(until, i);
  if (i < 0 || j < 0) throw Error(from);
  return src.slice(i, j);
}
test("failed staging preserves the previous output", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-stage-"));
  try {
    const out = path.join(temp, "out"), previous = path.join(out, "index.html");
    fs.mkdirSync(out);
    fs.writeFileSync(previous, "previous valid build");
    expect(() => require("./support/stage-site").stageSite(path.join(temp, "missing"), out)).toThrow();
    expect(fs.existsSync(previous)).toBe(true);
  } finally { fs.rmSync(temp, { recursive:true, force:true }); }
});
test("same-account restore keeps elapsed time for the same party", () => {
  const g = {save:{homeWait:{party:10,partyAt:100}},homeUntil:{party:10,partyAt:100},NS:{t:0},
    homeClean:()=>({}),photoDayClean:()=>({day:0,count:0}),CL:{other:false,meta:{}},window:{__cloudNoReload:true},
    clearTimeout(){},clOwn(){},clAt:()=>1,clSaveMeta(){},clSet(){},saveWrite:s=>{g.disk=s;return 2}};
  vm.runInNewContext(part("screens","function clApply(","// this device's save goes")+
    'clApply({rev:2},{homeWait:{party:170,partyAt:100},cr:2000})',g);
  expect(g.disk.homeWait.party).toBe(10);
});
test("a newer expired party checkpoint survives a restart", () => {
  const g={NS:{t:0},save:{homeWait:{partyAt:100}},CL:{meta:{}},state:"DRIVE",
    clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),NEED_ORDER:["energy"],needsOfSave:()=>({energy:65}),needOf:()=>65,
    persist(){g.disk=JSON.parse(JSON.stringify(g.save))},disk:{homeWait:{partyAt:100}}};
  vm.runInNewContext(part("life","function homeWaitClean(","// adds to a need")+
    part("screens","function clNeeds(","// the account's save becomes")+
    'clNeeds({homeWait:{partyAt:200}})',g);
  expect(g.disk.homeWait.partyAt).toBe(200);
});
test("a race cannot consume the free-ride postcard tutorial", () => {
  const g={postcardT:0,postcardCalm:true,save:{postcards:[]},camera:{position:{x:0,z:0}},P:{x:0,z:0},FOOT:{on:false},
    state:"DRIVE",ev:{phase:"run"},job:null,testDrive:null,HINTS:{},POSTCARD_MARKS:new Map([["summit",{G:{position:{x:0,z:0}}}]]),
    hint:id=>{g.HINTS[id]=1}};
  vm.runInNewContext(part("progress","function postcardTick(","// Postcard collection")+"postcardTick(0.016)",g);
  expect(g.HINTS.postcard).toBeUndefined();
});
test("the pause menu shows the repaired vehicle's current damage", () => {
  const nodes={},g={$:id=>nodes[id]??={classList:{contains:()=>false}},P:{damage:35},save:{cr:4000},pc:null,
    state:"PAUSE",tabIdle:false,repairReturnPause:true,repairConfirm:true,repairWarnLevel:0,repairPrice:()=>1700,
    repairBlocked:()=>"",wantEvent(){},skillAward(){},persist(){},updateMoney(){},show(){},toast(){},fmtCr:String};
  g.$("pRepair").textContent="VEHICLE CONDITION · 35%";
  vm.runInNewContext(part("screens",'$("repairNow").onclick=',"function pauseOn(")+'$("repairNow").onclick()',g);
  expect(g.P.damage).toBe(0);
  expect(nodes.pRepair.textContent).toBe("VEHICLE CONDITION · 0%");
});
test("one second of controller scrolling covers the same distance at 30 and 120 fps", () => {
  function distance(fps){
    const list={scrollTop:0,scrollHeight:10000,clientHeight:100};
    const g={PAUSE_SUBS:[["collections"]],$:()=>({classList:{contains:()=>false},querySelectorAll:()=>[list]}),
      getComputedStyle:()=>({overflowY:"auto"}),fps};
    vm.runInNewContext(part("cars","function padScroll(","function pollPad(")+
      'for(let i=0;i<fps;i++)padScroll({axes:[0,1,0,0]},1/fps)',g);
    return list.scrollTop;
  }
  expect(distance(120)).toBe(distance(30));
});
test("a nearby friend's birthday cake stays up for its announced duration", () => {
  const p={x:1,z:0,st:"walk",m:{G:{visible:true}},emo:{sp:{material:{},visible:false},kind:"",t:0,T:0}};
  const g={PEDS:[p],FOOT:{on:true,x:0,z:0},BOAT:{on:false},RIDE:{p:null},TALK:{p:null},
    LIFE:{t:0},save:{rel:{0:{f:80}}},personOf:()=>({id:0}),isBirthday:()=>true,
    emoTex:kind=>kind,emoteTick(p,dt){p.emo.t+=dt}};
  vm.runInNewContext(part("life","function emote(p,kind","/* ================================================================ NEEDS")+
    "lifeUpdate(1/60);lifeUpdate(1/60)",g);
  expect(p.emo.kind).toBe("cake");
});
