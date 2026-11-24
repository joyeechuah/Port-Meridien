const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const THREE = require("three");
const src = fs.readFileSync(path.join(__dirname, "../js/people.js"), "utf8");
const fragment = (a,b) => src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+1));
function countryside(touch=true) {
  const country = { type:"country", len:260, half:4.8 }, highway={...country,type:"highway"};
  const camera = new THREE.PerspectiveCamera(60,1,.25,4400);
  const env = {
    V3:THREE.Vector3, camera, isTouch:touch, EDGES:[country,highway], rnd:()=>.5,
    edgePos:(e,s)=>({x:0,z:s,dx:0,dz:1}), nearestRoad:(x,z)=>({e:z>180?highway:country,x:0,z}),
    zoneAt:(x,z)=>z<60?"OLD QUAY":"COUNTRY", meshH:()=>3, footGround:()=>3,
    footClear:(x,z)=>[x,z], wrapA:x=>x, clamp:(x,a,b)=>Math.max(a,Math.min(x,b)),
    PED_V:{walk:1.35}, P:{x:0,z:-75,h:0,vx:0,vz:0}, TRAFFIC:[], FOOT:{}, BOAT:{},
    save:{violence:1}, faceBlink(){}, copClock:10, crime(){}, pedModel:()=>({
      G:Object.assign(new THREE.Group(),{visible:false}),legs:[new THREE.Group(),new THREE.Group()],arms:[new THREE.Group(),new THREE.Group()]
    })
  };
  const code=fragment("const VERGE=","// each person's own")+fragment("function pedSpot(","// whether it is safe")+fragment("function pedStep(","/* ================================================================ HARBOUR");
  return {...vm.runInNewContext(code+"\nbuildVergeWalkers(); ({VERGE,vergeSites,vergeTick,pedStep})",env),env};
}
test("only country sites outside Old Quay qualify; the pools are fixed at four and eight",()=>{
  for(const touch of [true,false]){
    const w=countryside(touch);
    expect(w.VERGE.length).toBe(touch?4:8);
    expect(w.vergeSites.length).toBeGreaterThan(0);
    for(const e of w.vergeSites){
      expect(Math.abs(e.a.x)).toBeCloseTo(6.3);
      expect(e.a.z).toBeGreaterThanOrEqual(60);
      expect(e.b.z).toBeLessThanOrEqual(180);
    }
  }
});
test("a visible or nearby site waits; a distant off-camera figure is recycled in place",()=>{
  const w=countryside(),me=w.env.P,cam=w.env.camera;
  const e=w.vergeSites[0];w.vergeSites.splice(1);
  me.z=e.a.z-120;
  w.vergeTick(.4,me);expect(w.VERGE[0].e).toBeNull();
  me.z-=30;cam.position.set(0,4,me.z);cam.lookAt(e.a.x,4,e.a.z);cam.updateMatrixWorld();
  w.vergeTick(.4,me);expect(w.VERGE[0].e).toBeNull();
  cam.lookAt(0,4,me.z-10);cam.updateMatrixWorld();
  w.vergeTick(.4,me);const p=w.VERGE[0],model=p.m;
  expect(p.e).toBe(e);expect(p.m.G.visible).toBe(true);
  me.z-=310;w.vergeTick(.4,me);expect(p.e).toBeNull();expect(p.m.G.visible).toBe(false);
  me.z+=310;w.vergeTick(.4,me);expect(p.m===model && p.e===e).toBe(true);
});
test("an approaching vehicle makes a walker step outwards; an impact is counted once",()=>{
  const w=countryside(),car=w.env.P;let hits=0;
  w.env.lifeHurt=()=>{};w.env.crime=k=>{expect(k).toBe("ped");hits++};
  w.vergeTick(.4,car);const p=w.VERGE[0],x=p.x;
  car.x=x;car.z=p.z-5;car.vz=10;
  w.vergeTick(.1,car);
  expect(Math.abs(p.x)).toBeGreaterThan(Math.abs(x));
  car.x=p.x;car.z=p.z;
  w.vergeTick(.02,car);w.vergeTick(.02,car);expect(hits).toBe(1);
});
test("the pistol can select a country walker while the town population is asleep",()=>{
  const w=countryside(),car=w.env.P;
  w.vergeTick(.4,car);
  const p=w.VERGE[0];
  const pick=vm.runInNewContext(fragment("function gunPick(","function gunSpark(")+"\ngunPick",{
    ...w.env,VERGE:w.VERGE,pedOn:false,OFFICER:{on:false},gunClear:()=>true,
    gunFrom:()=>({x:p.x,z:p.z-10,h:0}),GUN:{range:40,cone:.3}
  });
  expect(pick().o===p).toBe(true);
  p.st="down";expect(pick()).toBeNull();
  p.st="walk";p.m.G.visible=false;expect(pick()).toBeNull();
});
