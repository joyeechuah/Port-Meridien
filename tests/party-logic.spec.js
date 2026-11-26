const {test,expect}=require("@playwright/test");
const fs=require("node:fs"),vm=require("node:vm");
const src=n=>fs.readFileSync(require.resolve("../js/"+n+".js"),"utf8");
function part(n,a,b){const s=src(n),i=s.indexOf(a),j=b?s.indexOf(b,i):s.length;if(i<0||j<0)throw Error(a);return s.slice(i,j)}
function home(){
  const g={save:{rel:{},home:{},homeWait:{}},NS:{t:10},state:"GARAGE",tabIdle:false,document:{hidden:false},GUEST:{},WANTED:{lvl:0},RIDE_AT:40,
    homeEditable:()=>g.state==="GARAGE"&&!g.tabIdle,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),homeComfort:()=>80,skillLevel:()=>3,
    gains:{},needsAdd:(k,v)=>g.gains[k]=(g.gains[k]||0)+v,feel:(id)=>g.emotion=id,skillAward:(k,n)=>g.xp=n,persist:()=>g.writes++,writes:0};
  const run=s=>vm.runInContext(s,g);vm.createContext(g);
  run(part("life","const PEOPLE=","const TRAIT_LABEL")+part("life","const rel=id","function relLabel")+
    part("life","function homeWaitClean","const needsKey=")+part("life","const PARTY=","/* ---------- the party at home: its button"));
  for(let i=0;i<16;i++)g.save.rel[i]={n:1,f:75};
  return {g,run};
}
test("RSVPs give reasons, enforce distinct Friends and check each trait threshold",()=>{
  const {g,run}=home();
  for(const [id,threshold] of [[0,40],[1,60],[2,40],[3,45],[4,55],[5,65]]){
    g.save.rel[id].f=threshold-1;const [no]=run('partyInvite(['+id+'])');expect(no.accepted).toBe(false);expect(no.reason).toBeTruthy();
    g.save.rel[id].f++;expect(run('partyInvite(['+id+'])[0].accepted')).toBe(true);
  }
  for(const input of ["[1,2,3,4]","[1,1]","[-1]","[16]","[1.5]","null"])expect(run("partyInvite("+input+")")).toEqual([]);
  g.save.rel[0].n=0;expect(run("partyInvite([0])[0].accepted")).toBe(false);
  run("partyInvite([5]);save.rel[5].f=50");expect(run("partyStart()")).toBe(false);
});
test("comfort, guest pairs and Charisma affect score; one end settles every guest once",()=>{
  const {g,run}=home();
  run("partyInvite([2,1])");const clash=run("partyScore()");
  run("partyInvite([2,0])");expect(run("partyScore()-"+clash)).toBe(12);
  g.homeComfort=()=>0;g.skillLevel=()=>0;expect(run("partyScore()")).toBe(41);
  g.homeComfort=()=>100;g.skillLevel=()=>10;
  expect(run("partyStart()")).toBe(true);expect(run("partyStart()")).toBe(false);
  expect(run("partyInvite([1])")).toEqual([]);
  expect(run("partyEnd()")).toEqual({score:100,guests:[2,0],happy:true});
  expect(run("partyEnd()")).toBe(false);expect(run("partyInvite([1])")).toEqual([]);
  expect([g.gains,g.xp,g.save.rel[0],g.save.rel[2],g.emotion,g.writes]).toEqual([{social:16,fun:25},6,{n:2,f:82},{n:2,f:82},"happy",1]);
});
test("session invitations, cancellation, single guests and cooldown",()=>{
  const {g,run}=home();g.GUEST={who:{},done:false};expect(run("partyInvite([0])")).toEqual([]);
  g.GUEST.done=true;run("partyInvite([0]);partyStart();partyClear()");expect(run("partyEnd()")).toBe(false);expect(g.writes).toBe(0);
  g.homeComfort=()=>0;g.skillLevel=()=>0;run("partyInvite([0]);partyStart()");expect(run("partyEnd().happy")).toBe(false);
  run("NS.t+=179");expect(run("partyInvite([0])")).toEqual([]);
  run("NS.t++");expect(run("partyInvite([0])[0].accepted")).toBe(true);
  for(const prop of ["tabIdle=true","document.hidden=true",'state="DRIVE"',"WANTED.lvl=1"]){
    const other=home();other.run(prop);expect(other.run("partyInvite([0])")).toEqual([]);
  }
});
test("only the active-time wait survives reload and participates in needs sync",()=>{
  const {g,run}=home();Object.assign(g,{needOf:()=>65,needsOfSave:()=>({energy:65}),NEED_ORDER:["energy"]});
  run(part("life","const needsKey=","// the save's needs")+part("life","function needsCommit()","// adds to a need"));
  run("partyInvite([0]);partyStart();partyEnd();NS.t+=50;needsCommit()");
  expect(g.save.homeWait.party).toBe(130);expect(run("needsKey(save)===needsKey({})")).toBe(false);
  const fresh=home();fresh.g.save.homeWait=g.save.homeWait;fresh.run("homeWaitLoad(save.homeWait)");
  expect(fresh.run("PARTY.ids")).toEqual([]);expect(fresh.run("partyInvite([0])")).toEqual([]);
  expect(run("homeWaitClean({party:Infinity})")).toEqual({snack:0,play:0});expect(run("homeWaitClean({party:999}).party")).toBe(180);
  Object.assign(g,{homeProgress:()=>null,workClean:()=>({completed:0}),skillsClean:()=>({}),SKILL_RATE:{},STARTERS:[]});
  run(part("screens","const CL_PREFS=","function clSummary("));
  expect(run("clProg({homeWait:save.homeWait})===clProg({})")).toBe(true);
  expect(run("clFresh({homeWait:save.homeWait,cr:120000,owned:[]})")).toBe(true);
});
