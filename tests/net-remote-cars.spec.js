const { test, expect } = require("@playwright/test");
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "../js/net.js"), "utf8");
function run(from, to, globals) {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw Error("Missing source for " + from);
  return vm.runInNewContext(src.slice(a, b) + "\n;(" + from.split(" ")[1].split("(")[0] + ")", globals);
}
test("a peer disposes its owned car on replacement and departure, and detaches its shared boat", () => {
  const freed = [], removed = [];
  const boat = { traverse() {} };
  const g = { BOAT: { m: { clone: () => boat } }, scene: { add() {}, remove: obj => removed.push(obj) },
    carById: () => ({}), MOD_STOCK: {}, buildHeroCar: () => ({ G: {} }), disposeHeroCar: car => freed.push(car.G) };
  g.netDropModel = run("function netDropModel(", "function netDrop(", g);
  const model = run("function netModel(", "// where a friend", g);
  const drop = run("function netDrop(", "// a name above", g);
  const p = {}, car = { m: 0, c: "golf", p: 1 };
  model(p, car);
  const first = p.model.G;
  model(p, car);
  expect(freed).toHaveLength(0);
  model(p, { m: 2 });
  expect(freed).toEqual([first]);
  model(p, car);
  expect(removed).toContain(boat);
  const last = p.model.G;
  drop(p); drop(p);
  expect(freed).toEqual([first, last]);
});
test("the sender freezes velocity in each stopped view for every travel mode", () => {
  const g = { state: "DRIVE", BOAT: { m: { position: { y: 1 } }, v: 5 }, FOOT: { y: 3, v: 2 },
    pc: { G: { position: { y: 2 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } } }, STREET: new Map(),
    save: {}, netMyName: () => "", activePlayer: () => ({ x: 12, z: 13, h: 1 }), speedF: () => 30,
    curId: "golf", curCar: () => ({id:"golf"}), paintOf: () => 1, testDrive: null };
  const send = run("function netState(", "function netSend(", g);
  for (const m of [0,1,2]) {
    g.FOOT.on = m === 1; g.BOAT.on = m === 2; g.state = "DRIVE";
    const moving = send();
    expect(moving.v).toBe([30,2,5][m]);
    for (const s of ["PAUSE","MAP","PHOTO"]) { g.state=s; expect(send()).toEqual({...moving,v:0}); }
  }
});
test("test drive paint is sent until the loan ends", () => {
  const g = { state:"DRIVE", BOAT:{}, FOOT:{}, pc:{G:{position:{y:0},quaternion:{x:0,y:0,z:0,w:1}}},
    save:{}, netMyName:()=>"", activePlayer:()=>({x:0,z:0,h:0}), speedF:()=>0, curId:"golf", STREET:new Map(),
    curCar:()=>({id:"golf"}), paintOf:()=>111, testDrive:{paint:0} };
  const send=run("function netState(", "function netSend(",g);
  expect(send().p).toBe(0); g.testDrive=null; expect(send().p).toBe(111);
});
