const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),vm=require("node:vm");
function section(f,from,to){
  const src=fs.readFileSync(require.resolve("../js/"+f+".js"),"utf8"),a=src.indexOf(from),b=src.indexOf(to,a);
  if(a<0||b<0)throw Error("Missing source marker "+from);
  return src.slice(a,b);
}
function game(){
  const nodes={},writes=[];
  const g={save:{cr:5,postcards:[]},FOOT:{on:true,x:0,z:0},BOAT:{on:false},state:"DRIVE",tabIdle:false,
    document:{hidden:false,createElement:()=>({})},toast(){},updateMoney(){},fmtCr:String,
    persist:()=>writes.push(JSON.parse(JSON.stringify(g.save))),
    $:id=>nodes[id]??={children:[],replaceChildren(){this.children=[]},appendChild(n){this.children.push(n)},focus(){g.focus=id}},
    show:(id,v)=>{g.$(id).visible=v}};
  vm.createContext(g);
  const run=s=>vm.runInContext(s,g);
  run(section("core","const POSTCARD_REWARD=","const save="));
  run(section("progress","function postcardPickup()","/* ================================================================ CONTRACTS"));
  return {g,run,writes};
}
test("12 different reachable road shoulders match the checked-in world",()=>{
  const {run}=game(),cards=run("POSTCARDS"),world=require("./fixtures/world-baseline.json");
  expect(new Set(cards.map(c=>c.id)).size).toBe(12);
  for(const c of cards){
    const lm=world.landmarks.find(l=>l.name===c.place);
    expect(lm,c.place).toBeTruthy();
    expect(Math.hypot(c.x-lm.position[0],c.z-lm.position[1])).toBeLessThan(8);
    let best=Infinity,verge;
    for(const e of world.edges)for(let i=1;i<e.points.length;i++){
      const [x,z]=e.points[i-1],[u,v]=e.points[i],dx=u-x,dz=v-z;
      const t=Math.max(0,Math.min(1,((c.x-x)*dx+(c.z-z)*dz)/(dx*dx+dz*dz||1)));
      const d=Math.hypot(c.x-x-t*dx,c.z-z-t*dz);
      if(d<best){best=d;verge=d-e.halfWidth}
    }
    expect(verge,c.id).toBeGreaterThan(1);expect(verge,c.id).toBeLessThan(1.6);
    expect(cards.filter(o=>Math.hypot(o.x-c.x,o.z-c.z)<5)).toHaveLength(1);
  }
});
test("collection requires active on-foot play and the 2.5 m radius",()=>{
  const {g,run}=game(),c=run("POSTCARDS[0]");Object.assign(g.FOOT,{x:c.x+2.51,z:c.z});
  expect(run("postcardPickup()")).toBe(false);g.FOOT.x=c.x+2.5;
  for(const [obj,key,val] of [[g.FOOT,"on",false],[g.BOAT,"on",true],[g,"state","FADE"],[g,"state","PAUSE"],[g,"tabIdle",true],[g.document,"hidden",true]]){
    const before=obj[key];obj[key]=val;expect(run("postcardPickup()")).toBe(false);obj[key]=before;
  }
  expect(run("postcardPickup()")).toBe(true);expect(run("postcardPickup()")).toBe(false);
});
test("the twelfth card and set reward share a write; duplicates and reloads never pay again",()=>{
  const {g,run,writes}=game();
  for(const c of run("POSTCARDS")){Object.assign(g.FOOT,{x:c.x,z:c.z});expect(run("postcardPickup()")).toBe(true)}
  expect(writes).toHaveLength(12);expect(writes[10].cr).toBe(5);expect(writes[11].cr).toBe(12005);
  g.save=JSON.parse(JSON.stringify(writes[11]));run("save.postcards=postcardsClean(save.postcards)");
  expect(run("postcardPickup()")).toBe(false);expect(writes).toHaveLength(12);
});
test("legacy, malformed and reordered albums have canonical cloud progress",()=>{
  const {g,run}=game();
  Object.assign(g,{homeProgress:()=>null,workClean:()=>({completed:0}),skillsClean:()=>({}),SKILL_RATE:{},STARTERS:[]});
  run(section("screens","const CL_PREFS=","function clSummary("));
  expect(run('postcardsClean([{},null,"summit","fake","summit"])')).toEqual(["summit"]);
  expect(run('clProg({})===clProg({postcards:[]})')).toBe(true);
  expect(run('clProg({postcards:["cove","summit"]})===clProg({postcards:["summit","cove"]})')).toBe(true);
  expect(run('clProg({})!==clProg({postcards:["summit"]})')).toBe(true);
  expect(run('clFresh({postcards:["summit"]})')).toBe(false);
});
test("Collections opens from Pause, pages through the 12 clues and returns focus",()=>{
  const {g,run}=game();g.state="PAUSE";g.save.postcards=["summit"];run("collectionsOpen()");
  expect(g.$("pause").inert).toBe(true);expect(g.focus).toBe("cardClose");
  const lines=[];for(let i=0;i<3;i++){lines.push(...g.$("cardList").children.map(n=>n.textContent));g.$("cardNext").onclick()}
  expect(new Set(lines).size).toBe(12);expect(lines[0]).toContain("The Ridge Line");expect(lines[1]).toContain("Undiscovered");
  run("collectionsClose()");expect(g.focus).toBe("pCollections");expect(g.$("pause").inert).toBe(false);
});
