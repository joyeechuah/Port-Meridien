const {test,expect}=require("@playwright/test");
const fs=require("node:fs"), vm=require("node:vm");
function section(file,start,end){
  const src=fs.readFileSync(require.resolve("../js/"+file+".js"),"utf8");
  const a=src.indexOf(start),b=src.indexOf(end,a);
  if(a<0||b<0)throw Error(start);
  return src.slice(a,b);
}
test("completed one-time activities leave the active wants and future draws",()=>{
  const landmarks=require("./fixtures/world-baseline.json").landmarks;
  const g=vm.createContext({LANDMARKS:landmarks,save:{
    rel:Object.fromEntries(Array.from({length:16},(_,id)=>[id,{n:1,f:40}])),
    skills:{v:1,driving:2750,cooking:2750,fitness:2750,charisma:2750,handiness:2750,photography:2750},
    found:Object.fromEntries(landmarks.map(l=>[l.id,1])),passBonus:true,
    wants:{active:["meet","landmark","level"]}}});
  vm.runInContext(section("life","const PEOPLE=","const TRAIT_LABEL=")+
    section("core","const WANT_CATALOG=","const TRAITS=")+
    section("core","const skillThreshold=","// Units of 1/400 XP")+
    section("progress","const foundCount=","function discoverLandmark("),g);
  const remaining=vm.runInContext('wantsTidy(); ["meet","landmark","level"].filter(id=>wantOpen(id)||save.wants.active.includes(id))',g);
  expect(remaining).toEqual([]);
});
test("the cloud comparison counts friends at the same threshold as the game",()=>{
  const g=vm.createContext({save:{rel:{}},PEOPLE:[]});
  vm.runInContext(section("life","function relLabel(","/* ================================================================ TALKING")+
    section("screens","function clPeople(","function clPickShow("),g);
  const result=vm.runInContext('const sv={rel:{0:{n:1,f:35},1:{n:1,f:39},2:{n:1,f:40}}}; [relLabel(sv.rel[1]),relLabel(sv.rel[2]),clPeople(sv,null)]',g);
  expect(result).toEqual(["Friendly","Friend","3 people met · 1 friend"]);
});
