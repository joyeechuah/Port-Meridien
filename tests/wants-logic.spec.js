const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
function source(file, first, next) {
  const code=fs.readFileSync(require.resolve("../js/"+file+".js"),"utf8");
  const a=code.indexOf(first), b=code.indexOf(next,a);
  if(a<0||b<0)throw Error("Missing "+first);
  return code.slice(a,b);
}
function game(id) {
  const g={save:{cr:5000},clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),state:"PAUSE",
    Date:{now:()=>20000*86400000},document:{hidden:false},tabIdle:false,toast(){},persist(){},updateMoney(){},
    fmtCr:n=>Math.round(n).toLocaleString("en-US")};
  const ctx=vm.createContext(g),run=s=>vm.runInContext(s,ctx);
  run(source("core","const WANT_CATALOG=","const SKILL_RATE="));
  g.save.wants=run('wantsClean(null)');
  if(id)g.save.wants.active=[id,...["repair","photo","race"].filter(k=>k!==id).slice(0,2)];
  return {g,run};
}
const hooks=[
  ["meet","life","if(!r.n&&now.n)",'\n',{r:{n:0},now:{n:1}},600],
  ["friendly","life","if(r.f<15&&now.f>=15)",'\n',{r:{f:14},now:{f:15}},1000],
  ["race","play",'if(E.type==="race"){rew=',"\n",{E:{type:"race"},rew:100,skillFactor:()=>1,skillAward(){}},1200],
  ["shift","work",'wantEvent("shift");',"\n",{skillAward(){}},1000],
  ["promote","work",'wantEvent("promote")',";if(now",{},1500],
  ["landmark","progress","save.found[L.id]=1;","\n",{L:{id:"pier"}},900],
  ["place","home","p.items.push(","\n",{p:{items:[]},id:"stool",x:0,z:2,r:0,item:{price:0},homeChanged(){}},650],
  ["home","life","needsAdd(need,homeGain(action));","\n",{need:"fun",action:"play",homeUntil:{},NS:{t:0},needsAdd(){},homeGain:()=>25,restSync(){}},500],
  ["walk","people",'if(wantEvent("walk",',"\n",{strideSpeed:5,dt:.2},750],
  ["level","core","const after=skillLevel(k);","\n",{k:"fitness",before:0,skillLevel:()=>1},1500],
  ["repair","screens",'wantEvent("repair");skillAward("handiness",15);save.cr','\n',{price:0,P:{},repairWarnLevel:0,skillAward(){}},800]
];
for(const [id,file,start,end,globals,reward] of hooks)test(id+" completion through its game hook pays once and replaces only that slot",()=>{
  const {run,g}=game(id);Object.assign(g,globals);g.save.found={};
  if(id==="walk")g.save.wants.metres=499;
  const other=g.save.wants.active.slice(1);
  const invoke='(function(){'+source(file,start,end)+'})()';run(invoke);run(invoke);
  expect(g.save.cr).toBe(5000+reward);expect(g.save.wants.completed).toEqual({[id]:1});
  expect(g.save.wants.active.slice(1)).toEqual(other);
  expect(new Set(g.save.wants.active).size).toBe(3);expect(g.save.wants.active).not.toContain(id);
});
test("only a successful current photo completes the want, including after daily skill XP is exhausted",async()=>{
  const {run,g}=game("photo");let cb;
  Object.assign(g,{PH:{on:true},prNow:1,PR_MAX:1,renderer:{render(){},domElement:{}},scene:{},camera:{},
    applyDayNight(){},updateLampLights(){},photoFrame(){},syncRenderView(){},photoShotShow(){},phMsg(){},skillPhoto(){}});
  g.document.createElement=()=>({getContext:()=>({drawImage(){}}),toBlob:f=>{cb=f}});
  run(source("media","function photoCapture(","function photoShotShow("));
  let p=run("photoCapture()");g.PH.busy=false;cb({});await p;
  p=run("photoCapture()");cb(null);await p;expect(g.save.cr).toBe(5000);
  p=run("photoCapture()");cb({});await p;expect(g.save.cr).toBe(5400);
});
test("partial walking survives loading and counts actual metres",()=>{
  const {run,g}=game("walk");run('wantEvent("walk",240);save.wants=wantsClean(save.wants);wantEvent("walk",259.5)');
  expect(g.save.cr).toBe(5000);run('wantEvent("walk",.5)');expect(g.save.cr).toBe(5750);
});
test("reroll replaces three slots and observes the saved UTC day",()=>{
  const {g,run}=game();const old=g.save.wants.active.slice();
  expect(run("wantsReroll()")).toBe(true);const next=g.save.wants.active;
  expect(new Set(next).size).toBe(3);expect(next.every(k=>!old.includes(k))).toBe(true);
  run("save.wants=wantsClean(save.wants)");expect(run("wantsReroll()")).toBe(false);
  g.Date.now=()=>20001*86400000;expect(run("wantsReroll()")).toBe(true);
});
test("malformed wants are cleaned and only completion counts affect cloud progress",()=>{
  const {g,run}=game();g.homeProgress=()=>null;g.workClean=()=>({completed:0});g.skillsClean=()=>({});g.SKILL_RATE={};g.STARTERS=[];
  run(source("screens","const CL_PREFS=","function clSummary("));
  expect(run('wantsClean({v:2,active:["walk"],completed:{walk:4}})')).toEqual(run("wantsClean(null)"));
  const fixed=run('wantsClean({v:1,active:["photo","photo","alien"],day:Infinity,metres:NaN,completed:{photo:2,shift:-1,walk:Infinity,fake:4}})');
  expect(fixed.completed).toEqual({photo:2});expect(new Set(fixed.active).size).toBe(3);expect(fixed.day).toBe(-1);expect(fixed.metres).toBe(0);
  expect(run('clProg({})===clProg({wants:save.wants})')).toBe(true);
  run("wantsReroll()");expect(run('clProg({})===clProg({wants:save.wants})')).toBe(true);
  run("save.wants.completed.photo=1");expect(run('clProg({})===clProg({wants:save.wants})')).toBe(false);
  expect(run('clFresh({cr:120000,owned:[],wants:save.wants})')).toBe(false);
});
test("equal-progress sync keeps the newer reroll and preserves partial walking across devices",()=>{
  const {g,run}=game("walk");g.save.wants.metres=250;
  const other={...g.save.wants,metres:320};g.other=other;
  expect(run("wantsSync(other)")).toBe(true);expect(g.save.wants.metres).toBe(320);
  g.other={v:1,day:19999,active:["shift","race","repair"],completed:{}};
  expect(run("wantsSync(other)")).toBe(true);expect(g.save.wants.active).toEqual(g.other.active);
  expect(g.save.wants.metres).toBe(0);expect(run("wantsSync(other)")).toBe(false);
});
test("a want drawn to replace one just done isn't done by the same action, only by a later one",async()=>{
  const {g,run}=game("shift");
  // the shift's slot is refilled with "level" (the draw picks it), and the same shift then levels Cooking
  const pick=run('wantIds.filter(id=>!save.wants.active.includes(id))').indexOf("level"),n=run('wantIds.length')-3;
  run("Math.random=()=>"+(pick+.5)/n);
  expect(run('[wantEvent("shift"),wantEvent("level")]')).toEqual([true,false]);
  expect(g.save.cr).toBe(6000);expect(g.save.wants.active[0]).toBe("level");
  await new Promise(r=>setTimeout(r,0));
  expect(run('wantEvent("level")')).toBe(true);expect(g.save.cr).toBe(7500);
});


test("Free spirit increases the paid reward and preserves the second reroll across load and sync",()=>{
  const {g,run}=game("walk");g.save.traits={v:1,ids:["freeSpirit"],day:-1};
  const before=g.save.cr;run('wantEvent("walk",500)');expect(g.save.cr-before).toBe(900);
  expect(run("wantsReroll()")).toBe(true);const first=JSON.parse(JSON.stringify(g.save.wants));
  expect(run("wantsReroll()")).toBe(true);g.remote=g.save.wants;g.save.wants=first;
  expect(run("wantsSync(remote)")).toBe(true);expect(run("save.wants=wantsClean(save.wants);wantsReroll()")).toBe(false);
});

test("a reroll day left ahead by a clock put back while playing frees the next day's reroll", () => {
  const { g, run } = game();
  g.save.wants.day = 20005;   // rerolled on a clock five days fast, which has since been put right
  expect(run("wantsReroll()")).toBe(false);   // today's is used, as a reload would say
  g.Date.now = () => 20001 * 86400000;
  expect(run("wantsReroll()")).toBe(true);
  expect(g.save.wants.day).toBe(20001);
});
