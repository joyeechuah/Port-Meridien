const {test,expect}=require("@playwright/test");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
test("selling the selected owned car while driving a street car saves an owned replacement",()=>{
  const s=fs.readFileSync(path.join(__dirname,"../js/screens.js"),"utf8"), log=[],sell={};
  const save={cur:"golf",owned:["golf","other"],mods:{}};
  const record=()=>log.push({cur:save.cur,owned:[...save.owned]});
  const g={CARS:[{id:"golf",price:10000}],dSel:0,save,curId:"st0",carMeshes:{},showMeshes:{},
    $:()=>sell,earn:record,persist:record,parkAll(){},toast(){},fmtCr:String,dPick(){}};
  vm.runInNewContext(s.slice(s.indexOf('$("dSell").onclick'),s.indexOf('$("dTest").onclick')),g);
  sell.onclick();
  expect(log.length).toBeGreaterThan(0);
  expect(log.every(snapshot=>snapshot.owned.includes(snapshot.cur))).toBe(true);
  expect(save.cur).toBe("other");expect(g.curId).toBe("st0");
});
