const { test, expect } = require("@playwright/test");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname,"../js",name+".js"),"utf8");
function part(s, start, end) {
  const a=s.indexOf(start), b=s.indexOf(end,a);
  if(a<0||b<0)throw Error(start);
  return s.slice(a,b);
}
function kitchen(stored) {
  const nodes = new Map(), payments=[];
  const g = { needsMood:()=>"Okay", wantEvent:()=>false, window:{}, document:{hidden:false}, state:"DRIVE", save:{cr:0}, QUAY:{kitchen:{x:0,z:0}},
    FOOT:{on:true,x:0,z:0}, BOAT:{on:false}, FOOT_V:{reach:3.4}, WANTED:{lvl:0}, HEALTH:{hp:100},
    ev:null, job:null, testDrive:null, TALK:{}, SIT:{}, STARTERS:[], show(){},toast(){},clearInput(){},persist(){},
    $: id=>{if(!nodes.has(id))nodes.set(id,{focus(){}});return nodes.get(id);},
    earn: amount=>{g.save.cr+=amount;payments.push({...g.save.work});}, payments, stored };
  const core=read("core"),screens=read("screens");
  Object.assign(g,{P:{x:0,z:0},pc:null,autoHold:false,promptAct:null,
    OFFICER:{on:false},COP_V:{fine:200},fadeThen(){},closeMap(){},updateMoney(){},
    talkClose(){},sitEnd(){},footHud(){},copClear(){g.WANTED.lvl=0;}});
  const people=read("people");
  const api=vm.runInNewContext([
    part(core,"const clamp=","\n"),part(core,"const SKILL_RATE=","const save="),"save.skills=skillsClean(null);",
    "save.work=workClean(stored);",read("home"),read("work"),part(screens,"const CL_PREFS=","const clPayload="),
    part(screens,"function clWork(","// Your needs"),
    part(screens,"function fastTravel(","/* ---------- cameras"),part(screens,"function goGarage(","function gunSync"),
    part(people,"function hurt(","function drawDamageEdge"),part(people,"function copCaught(","function wantedHud"),
    part(people,"function footEnter(","// what the screen shows"),
    "({WORK,workServe,workStart,workOpen,workClose,workCancel,workTick,workClean,clProg,clWork,goGarage,fastTravel,hurt,copCaught,footEnter})"
  ].join("\n"),g);
  return Object.assign(g,api);
}
function begin(g){expect(g.workOpen()).toBe(true);expect(g.workStart()).toBe(true);}
for (const fps of [30,60,120]) test("three distinct orders and one atomic payment at "+fps+" fps",()=>{
  const g=kitchen();begin(g);
  for(let i=0;i<3;i++){
    expect(g.workServe((i+1)%3)).toBe(false);expect(g.workServe(i)).toBe(true);expect(g.workServe(i)).toBe(false);
    if(i===2)break;
    for(let f=0;f<fps*10-1;f++)g.workTick(1/fps);
    for(const state of ["PAUSE","MAP","PHOTO"]){g.state=state;g.workTick(60);}
    g.state="DRIVE";g.document.hidden=true;g.workTick(60);g.document.hidden=false;
    expect(g.workServe(i+1)).toBe(false);g.workTick(1/fps);
  }
  expect(g.payments).toEqual([{v:1,completed:1,cool:120}]);expect(g.save.cr).toBe(300);
  const reload=kitchen(g.save.work);reload.workOpen();reload.workTick(119);
  expect(reload.workStart()).toBe(false);reload.workTick(1);expect(reload.workStart()).toBe(true);
});
test("leave, distance, vehicle, pursuit, injury and reload forfeit the unfinished order",()=>{
  for(const interrupt of [g=>g.workCancel(),g=>g.FOOT.x=3.41,g=>g.FOOT.on=false,g=>g.BOAT.on=true,g=>g.WANTED.lvl=1,g=>g.HEALTH.hp--]){
    const g=kitchen();begin(g);g.workServe(0);interrupt(g);g.workTick(.02);
    expect(g.WORK.active).toBe(false);expect(g.payments).toEqual([]);
  }
  const g=kitchen();begin(g);g.workServe(0);expect(kitchen(g.save.work).WORK.active).toBe(false);
});
test("free ride only and a closed panel cannot take input",()=>{
  for(const patch of [{job:{}},{ev:{}},{testDrive:{}},{TALK:{p:{}}},{SIT:{on:true}},{WANTED:{lvl:1}}]){
    const g=kitchen();Object.assign(g,patch);g.workOpen();expect(g.workStart()).toBe(false);
  }
  const g=kitchen();begin(g);g.workClose();expect(g.workServe(0)).toBe(false);
  g.workOpen();expect(g.workServe(0)).toBe(true);
});
test("work migration, completed shifts fingerprint and monotonic cooldown",()=>{
  const g=kitchen();
  for(const bad of [null,[],{v:2,completed:6},{v:1,completed:"5",cool:Infinity}])
    expect(g.workClean(bad)).toEqual({v:1,completed:0,cool:0});
  expect(g.workClean({v:1,completed:10000,cool:-1,foo:4})).toEqual({v:1,completed:9999,cool:0});
  expect(g.workClean({v:1,completed:2.9,cool:7.2})).toEqual({v:1,completed:2,cool:8});
  expect(g.workClean({v:1,cool:999} ).cool).toBe(120);
  const withWork=(n,c)=>({work:{v:1,completed:n,cool:c}});
  expect(g.clProg({})).toBe(g.clProg(withWork(0,30)));
  expect(g.clProg(withWork(1,0))).toBe(g.clProg(withWork(1,119)));
  expect(g.clProg(withWork(1,0))).not.toBe(g.clProg({}));
  const old=kitchen(withWork(1,100).work);
  old.clWork(withWork(1,40));old.clWork(withWork(1,90));expect(old.WORK.cool).toBe(40);
});

test("travel, arrest, home, injury, knockout and entering the parked car cancel before payout",()=>{
  for(const stop of [g=>g.fastTravel({}),g=>g.goGarage(false),g=>g.hurt(1),g=>g.hurt(110),
    g=>{g.save.armed=true;g.WANTED.lvl=1;g.copCaught()},g=>g.footEnter()]){
    const g=kitchen();begin(g);g.workServe(0);stop(g);
    expect(g.WORK.active).toBe(false);expect(g.WORK.panel).toBe(false);
    expect(g.save.work.completed).toBe(0);expect(g.payments).toEqual([]);
  }
});
