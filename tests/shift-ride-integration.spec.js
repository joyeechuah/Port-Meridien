const { test, expect } = require("@playwright/test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function source(file, from, to) {
  const s = fs.readFileSync(path.join(__dirname, "../js", file + ".js"), "utf8");
  const a = s.indexOf(from), b = s.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error("Missing source boundary: " + from);
  return s.slice(a,b);
}
const noop = () => {};

test("automatic GET OUT ends the passenger ride and keeps the walking prompt on the exit frame", () => {
  const log = [], RIDE = {st:"ride"}, FOOT = {on:false,stop:4};
  const m = {G:{}}, part = {};
  const globals = {
    RIDE, FOOT, FOOT_V:{exitMax:6}, BOAT:{}, P:{x:0,z:0,h:0,hitT:0}, state:"DRIVE",
    pc:{inside:part,glass:part,shell:part}, autoHold:false, ev:null, testDrive:null,
    kphNow:()=>0, SIDE:()=>1, footClear:(x,z)=>[x,z], footGround:()=>1, footModel:()=>m,
    footPlace:noop, placeCarMesh:noop, footCam:noop, footHud:noop,
    rideEnd:why=>{log.push(why);RIDE.st="";}, footPrompt:()=>log.push("walk prompt"),
    skillMetres:{driving:0},skillDistance:noop,updatePrompt:()=>log.push("drive prompt"), rideTick:noop, needsTick:noop,
    tickDamage:noop, stepPlayer:noop, collidePlayer:noop, updateTraffic:noop, updateStreak:noop,
    updateRadars:noop, updatePassport:noop, jobTick:noop, updateGPS:noop, gunCar:noop,
    showDamageSmoke:noop, updateCam:noop, updateHUD:noop, drawMini:noop, waterT:0
  };
  vm.runInNewContext(source("people","function footBlocked(","function footEnter(") +
    source("main","function driveUpdate(","let prevTs=") + "\ndriveUpdate(1/60)",globals);
  expect(FOOT.on).toBe(true);
  expect(log).toEqual(["out","walk prompt"]);
});

test("a follower can stay at the kitchen through an automatic pause and a completed shift", () => {
  const p = {x:0,z:0,v:0,ph:0,h:0,m:{G:{position:{set:noop},rotation:{set:noop}},
    arms:[{rotation:{}},{rotation:{}}],legs:[{rotation:{}},{rotation:{}}]}};
  const RIDE={p,who:{},st:"follow",t:0,stuck:0}, payouts=[];
  const globals={wantEvent:noop,skillFactor:()=>1,skillAward:noop,window:{},document:{hidden:false,getElementById:()=>null},state:"DRIVE",save:{work:{completed:0,cool:0}},
    RIDE, RIDE_V:{wait:90,follow:2,hurry:3}, rideGoal:()=>({x:1,z:0,stop:.35}), footGround:()=>1,
    footClear:(x,z)=>[x,z], clamp:(x,a,b)=>Math.max(a,Math.min(x,b)), wrapA:x=>x,
    faceBlink:noop,emoteTick:noop,P:{vx:0,vz:0}, FOOT:{on:true,x:0,z:0}, BOAT:{on:false}, QUAY:{kitchen:{x:0,z:0}},
    FOOT_V:{reach:3.4}, TALK:{}, SIT:{}, ev:null, job:null,testDrive:null,WANTED:{lvl:0},HEALTH:{hp:100},
    show:noop,clearInput:noop,talkClose:noop,carIndoors:noop,promptAct:null,
    $:()=>({style:{},focus:noop}), earn:v=>payouts.push(v),toast:noop};
  const g=vm.runInNewContext(source("work",'"use strict";','$("wkEat").onclick')+
    source("screens","function setState(","function show(")+source("life","function rideTick(","function emoteTick(")+
    "\n({workOpen,workStart,workServe,workTick,rideTick,WORK,setState})",globals);
  g.workOpen();g.workStart();g.workServe(0);
  g.setState("PAUSE");g.workTick(60);g.rideTick(60);
  expect(g.WORK.panel).toBe(false);expect(g.WORK.active).toBe(true);expect(g.WORK.wait).toBe(10);
  g.setState("DRIVE");g.workOpen();
  for(const order of [1,2]){
    for(let f=0;f<600;f++){g.workTick(1/60);g.rideTick(1/60);}
    expect(g.workServe(order)).toBe(true);
  }
  expect(payouts).toEqual([300]);expect(RIDE.p===p).toBe(true);expect(p.x).toBeGreaterThan(0);
});

test("town updates exclude the companion while verge updates still run outside town",()=>{
  const rider={m:{G:{visible:true}}},town={m:{G:{visible:true}}}, moved=[], verges=[];
  const globals={PEDS:[rider,town],RIDE:{p:rider},BOAT:{},FOOT:{},P:{x:660,z:36,vx:0,vz:0},
    PED_V:{near:420},pedOn:false,vergeTick:dt=>verges.push(dt),pedStep:p=>moved.push(p),faceBlink:noop,lifeUpdate:noop};
  const tick=vm.runInNewContext(source("people","function pedUpdate(","function pedStep(")+"\npedUpdate",globals);
  tick(.02);globals.P.x=-700;tick(.02);
  expect(moved.length).toBe(1);expect(moved[0]===town).toBe(true);
  expect(rider.m.G.visible).toBe(true);expect(town.m.G.visible).toBe(false);expect(verges).toEqual([.02,.02]);
});

test("the passenger is excluded from pistol targeting while a nearby verge walker is eligible",()=>{
  const pedestrian = (z,st) => ({x:0,z,st,m:{G:{visible:true}}});
  const passenger=pedestrian(3,"ride"), walker=pedestrian(12,"walk");
  const pick=vm.runInNewContext(source("people","function gunPick(","function gunSpark(")+"\ngunPick",{
    PEDS:[passenger],VERGE:[walker],pedOn:true,TRAFFIC:[],OFFICER:{on:false},
    gunFrom:()=>({x:0,z:0,h:0}),gunClear:()=>true,GUN:{range:40,cone:.4},
    clamp:(v,a,b)=>Math.max(a,Math.min(v,b))
  });
  expect(pick().o===walker).toBe(true);
  walker.m.G.visible=false;
  expect(pick()).toBeNull();
});
