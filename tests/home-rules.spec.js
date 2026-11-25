const {test,expect}=require("@playwright/test");
const vm=require("node:vm"), fs=require("node:fs"), path=require("node:path");
const read=file=>fs.readFileSync(path.join(__dirname,"../js",file+".js"),"utf8");
function section(text,start,end){
  const a=text.indexOf(start), b=text.indexOf(end,a);
  if(a<0||b<0)throw Error("Missing "+start);
  return text.slice(a,b);
}
function game(stored={}){
  const nodes=new Map(),writes=[];
  const $=id=>{
    if(!nodes.has(id))nodes.set(id,{appendChild(){},addEventListener(){},setAttribute(){}});
    return nodes.get(id);
  };
  const ctx=vm.createContext({window:{},document:{hidden:false,createElement:()=>({dataset:{}})},
    save:{cr:10000,...stored},state:"GARAGE",WANTED:{lvl:0},CL:{meta:{}},tabIdle:false,$,
    STARTERS:["starter"],show(id,visible){$(id).visible=visible;},updateMoney(){},
    persist(){vm.runInContext("needsCommit()",ctx);writes.push(JSON.parse(JSON.stringify(ctx.save)));}});
  const core=read("core"),screens=read("screens");
  vm.runInContext([section(core,"const clamp=","\n"),section(core,"const NEEDS_START=","const save="),"save.skills=skillsClean(save.skills);",
    section(core,"function needsClean(","\ntry{"),read("life"),read("home"),
    section(screens,"const CL_PREFS=","function clSummary("),
    section(screens,"function clNeeds(","// the account")].join("\n"),ctx);
  return {ctx,$,writes,run:code=>vm.runInContext(code,ctx)};
}
test("24 catalogue entries describe six groups, positive prices, geometry, comfort and actions",()=>{
  const {run}=game(),items=run("HOME_ITEMS");
  expect(items).toHaveLength(24);
  expect(new Set(items.map(i=>i.id)).size).toBe(24);
  expect(new Set(items.map(i=>i.group)).size).toBe(6);
  for(const i of items){
    expect(i.name.length).toBeGreaterThan(0);
    for(const n of [i.w,i.d,i.price])expect(Number.isInteger(n)&&n>0).toBe(true);
    expect(i.height).toBeGreaterThan(0);expect(i.comfort).toBeGreaterThanOrEqual(0);
    expect([null,"rest","snack","play"]).toContain(i.effect);
  }
});
test("half-metre grid reserves the railing and top landing, including rotated footprints",()=>{
  const {run}=game();
  expect(run("[HOME_ORIGIN,HOME_CELL,HOME_COLS,HOME_ROWS]")).toEqual([{x:.5,y:5.25,z:19},.5,42,22]);
  for(const [x,z,r,ok] of [[40,18,0,true],[40,18,1,false],[38,20,1,true],[0,1,0,false],
    [3,14,0,false],[4,15,0,true],[-1,4,0,false],[4,4,4,false],[1.5,4,0,false]])
    expect(run(`homeFits(save.home,"single",${x},${z},${r})`)).toBe(ok);
});
test("placement, move, turn and sale commit the layout and wallet together",()=>{
  const {run,writes,ctx}=game();
  expect(run('homePlace("single",5,4)')).toBe(true);
  expect(writes[0]).toMatchObject({cr:9200,home:{items:[{id:"single",x:5,z:4,r:0}]}});
  expect(run('homePlace("stool",7,4)')).toBe(true);
  expect(run("homeTurn(0)")).toBe(false);
  expect(run("homeMove(0,6,4)")).toBe(false);
  expect(run("homeMove(0,10,4) && homeTurn(0)")).toBe(true);
  expect(ctx.save.home.items[0]).toMatchObject({x:10,z:4,r:1});
  expect(run("homeSell(0)")).toBe(true);
  expect(ctx.save.cr).toBe(9640);expect(ctx.save.home.items).toHaveLength(1);
  ctx.save.cr=0;const count=writes.length;
  expect(run('homePlace("single",8,8)||homeSell(-1)')).toBe(false);
  ctx.tabIdle=true;expect(run("homeSell(0)")).toBe(false);
  expect(writes.length).toBe(count);
});
test("save cleaning rejects malformed fields, overlaps, unknown ids and unsafe coordinates",()=>{
  const {run}=game(),empty=run("homeClean(null)");
  for(const raw of ["null","[]","{v:2}","42"])expect(run("homeClean("+raw+")")).toEqual(empty);
  const plan=run(`homeClean({v:1,wall:"sage",floor:"invalid",items:[
    null,{id:"__proto__",x:3,z:3,r:0},{id:"single",x:4,z:4,r:0,junk:"bad"},
    {id:"stool",x:5,z:5,r:0},{id:"stool",x:Infinity,z:4,r:0},
    {id:"stool",x:0,z:0,r:0},{id:"stool",x:41,z:21,r:0}]})`);
  expect(run('const sparse=[];sparse[4000000000]={id:"lamp",x:4,z:4,r:0};homeClean({v:1,items:sparse}).items.length')).toBe(1);
  expect(plan).toEqual({v:1,wall:"sage",floor:"oak",items:[
    {id:"single",x:4,z:4,r:0},{id:"stool",x:41,z:21,r:0}]});
});
test("cleaning and purchasing enforce the same 60-piece cap and comfort caps at 100",()=>{
  const {run}=game();
  expect(run(`save.home=homeClean({v:1,items:Array.from({length:80},(_,i)=>(
    {id:"stool",x:i%40,z:2+Math.floor(i/40),r:0}))}); save.home.items.length`)).toBe(60);
  expect(run('homePlace("stool",41,9)')).toBe(false);
  expect(run("homeComfort(save.home)")).toBe(100);
});
test("cloud compares whole rooms, ignoring empty legacy layouts and insertion order",()=>{
  const {run}=game();
  expect(run('clProg({})===clProg({home:homeClean(null)})')).toBe(true);
  expect(run('clFresh({cr:120000,owned:STARTERS,home:homeClean(null)})')).toBe(true);
  expect(run('homePlace("vase",8,5);homePlace("lamp",7,4); const key=clProg(save);save.home.items.reverse();clProg(save)===key')).toBe(true);
  expect(run('clFresh({cr:120000,owned:STARTERS,home:save.home})')).toBe(false);
  expect(run('homeMove(0,12,8);clProg(save)===key')).toBe(false);
  expect(run('clProg({home:{v:1,wall:"sage"}})===clProg({})')).toBe(false);
});
test("REST retains its base gain and lock; a bed and comfort improve it at home only",()=>{
  const {run}=game();
  expect(run('NEEDS.energy=0; needsRest() && NEEDS.energy')).toBe(40);
  expect(run('homePlace("single",4,4);needsRest()')).toBe(false);
  expect(run('NS.t=30;NEEDS.energy=0;needsRest();NEEDS.energy')).toBeCloseTo(60.24);
  expect(run('state="DRIVE";NS.t=65;needsRest()')).toBe(false);
});
test("furniture gates each button and reward; TV and computer share PLAY",()=>{
  const {run,$}=game();
  run("restSync()");expect($("gPlay").visible).toBe(false);expect($("gSnack").visible).toBe(false);
  expect(run('homeUse("snack")||homeUse("play")')).toBe(false);
  run('homePlace("computer",5,4);homePlace("fridge",10,4);NEEDS.hunger=0;NEEDS.fun=0');
  expect($("gPlay").visible&&$("gSnack").visible).toBe(true);
  expect(run('homeUse("play") && homeUse("snack") && [NEEDS.fun,NEEDS.hunger]')).toEqual([25,30]);
  expect(run('homeUse("snack");save.skills.cooking')).toBe(5);
  expect(run('homeSell(0);homePlace("tv",5,4);homeUse("play")')).toBe(false);
  run("homeSell(0)");expect($("gSnack").visible).toBe(false);
});
test("home cooldowns survive saving and reloading at the remaining active-play time",()=>{
  const g=game();g.run('homePlace("fridge",6,3);homePlace("tv",10,3);NEEDS.hunger=0;NEEDS.fun=0;homeUse("snack");NS.t=60;homeUse("play")');
  const h=game(g.writes.at(-1));
  expect(h.run('NS.t=119.9;homeUse("snack")')).toBe(false);
  expect(h.run('NS.t=120;homeUse("snack")')).toBe(true);
  expect(h.run('homeUse("play")')).toBe(false);
  expect(h.run('NS.t=180;homeUse("play")')).toBe(true);
});
test("full needs, hidden tabs and wanted status do not consume rewards; comfort gains clamp",()=>{
  const {run}=game();
  run('homePlace("fridge",7,7);homePlace("sofa",10,7);NEEDS.hunger=100');
  expect(run('homeUse("snack")')).toBe(false);
  expect(run('NEEDS.hunger=80;document.hidden=true;homeUse("snack")')).toBe(false);
  expect(run('document.hidden=false;WANTED.lvl=1;homeUse("snack")')).toBe(false);
  expect(run('WANTED.lvl=0;homeUse("snack") && NEEDS.hunger')).toBe(100);
  expect(run('homeGain("snack")')).toBeCloseTo(30.3);
});
test("equal-progress cloud adoption keeps needs and their remaining waits together",()=>{
  const {run}=game();
  run('needsCommit();CL.meta.needs=needsKey(save);clNeeds({needs:save.needs,homeWait:{snack:90,play:2000}})');
  expect(run("save.homeWait")).toEqual({snack:90,play:180});
  expect(run('clProg({homeWait:{snack:1}})===clProg({})')).toBe(true);
});

test("different local and account finishes trigger a whole-save choice",()=>{
  const {run,ctx}=game({cr:120000,owned:["starter"]});
  expect(run('homeFinish("unknown","tile")')).toBe(false);
  expect(run('homeFinish("sage","tile")')).toBe(true);
  ctx.clSet=st=>{ctx.CL.st=st;};ctx.clPickShow=()=>{};
  ctx.doc=run('({rev:7,save:JSON.stringify({...save,home:{...save.home,wall:"sand"}})})');
  vm.runInContext(section(read("screens"),"function clReconcile(","function clWork("),ctx);
  run("clReconcile(doc)");
  expect(ctx.CL.st).toBe("conflict");
  expect(ctx.CL.pick.cloud.home.wall).toBe("sand");
  expect(ctx.save.home.wall).toBe("sage");
});
test("the cooldown clock advances during visible play and stops while paused or hidden",()=>{
  const {run,ctx}=game();
  Object.assign(ctx,{workTick(){},BOAT:{on:false},FOOT:{on:true}});
  run('needsHints=()=>{};homePlace("fridge",8,4);NEEDS.hunger=0;homeUse("snack");state="PAUSE";needsTick(180)');
  run('state="DRIVE";document.hidden=true;needsTick(180);document.hidden=false;state="GARAGE"');
  expect(run('homeUse("snack")')).toBe(false);
  run('state="DRIVE";for(let i=0;i<180;i++)needsTick(1);state="GARAGE"');
  expect(run('homeUse("snack")')).toBe(true);
});
