const { test, expect }=require("@playwright/test");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"../js/play.js"),"utf8");
test("touching the speed radar plane counts once only after reaching its other side",()=>{
  const P={x:0,z:-1,vx:0,vz:10},rad={id:"r0",x:0,z:0,dx:0,dz:1,half:5,prev:null},awards=[];
  const g={P,RADARS:[rad],ev:null,testDrive:null,save:{radar:{}},kphNow:()=>Math.abs(P.vz)*3.6,earn:c=>awards.push(c),toast(){},fmtCr:String};
  const tick=vm.runInNewContext(src.slice(src.indexOf("let radLast="),src.indexOf("/* ================================================================ GPS"))+"\nupdateRadars",g);
  for(const z of [-1,0,-1,0,0]){P.z=z;tick(.1)}
  expect(awards).toEqual([]);
  P.z=1;tick(.1);expect(awards).toEqual([36*18]);
  P.vz=-20;P.z=0;tick(.1);P.z=-1;tick(.1);expect(awards).toEqual([36*18,72*12]);
});
