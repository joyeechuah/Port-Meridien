const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");

function segment(file, start, end) {
  const source = fs.readFileSync(require.resolve(file), "utf8");
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw Error("Missing source boundary " + start);
  return source.slice(a, b);
}
const net = (a, b) => segment("../js/net.js", a, b);
const screens = (a, b) => segment("../js/screens.js", a, b);

test("a newer same-account snapshot keeps elapsed time for the same kitchen shift", () => {
  const g = { save: { work: { v: 1, completed: 4, cool: 5 } }, WORK: { cool: 5 },
    CL: { other: false, meta: {} }, homeClean: () => ({}), photoDayClean: () => ({ day: 0, count: 0 }),
    clearTimeout() {}, clOwn() {}, clAt: () => 0, clSaveMeta() {}, clSet() {},
    window: { __cloudNoReload: true }, saveWrite: () => 2 };
  vm.runInNewContext(screens("function clApply(", "// this device's save goes") +
    "clApply({rev:3},{work:{v:1,completed:4,cool:90}})", g);
  expect(g.window.__cloudApplied.work.cool).toBe(5);
});

test("post-restore backup sends daily claims merged locally that the account lacks", async () => {
  const cloud = { v: 3, gift: { v: 1, day: 50, ids: [0] } };
  const sent = [];
  const adapter = { put: async (_, doc) => { sent.push(JSON.parse(doc.save)); return { ok: true, rev: 4 }; } };
  const g = { save: { ...cloud, gift: { ...cloud.gift, ids: [0, 1] } }, SAVE: { gen: 1 },
    CL: { user: { uid: "fixture" }, meta: { rev: 3, rehash: true } }, tabIdle: false,
    clAdapter: () => adapter, clPayload: v => v, clProg: () => "same",
    needsKey: () => "", clSummary: () => ({}), clSaveMeta() {}, clRender() {}, clSet() {}, clOwn() {},
    clForUser: (_, f) => f(), clConnect() {}, addEventListener() {}, document: {addEventListener() {}}, setInterval() {} };
  await vm.runInNewContext(screens("function clCanon(", "// (the save's number") +
    screens("function clBoot()", "function clStartScreen") +
    screens("function clUpload(", "// the progress of the save") +
    "clBoot(); clUpload(3,true)", g);
  expect(sent.map(s => s.gift.ids)).toEqual([[0, 1]]);
});

test("returning from the showroom preserves a failed render-scale trial's retry delay", () => {
  const g = { PR_MAX: 2, PR_MIN: 0.75, prNow: 2, W: 800, H: 600, document: { hidden: false },
    renderer: {setPixelRatio() {}, setSize() {}} };
  const scale = vm.runInNewContext(segment("../js/main.js", "const RES=", "// Measurement panel") +
    "for(let i=0;i<201;i++) adaptRes(.04); resStill(true); resStill(false);" +
    "for(let i=0;i<77;i++) adaptRes(.04); prNow", g);
  expect(scale).toBe(2);
});

test("a remote mode switch appears when its sample reaches the playback clock", () => {
  const buf = [{ t: 1, d: { m: 0 } }, { t: 2, d: { m: 1 } }];
  const mode = vm.runInNewContext(net("function netAt(", "// every frame") + "netAt({buf},1.01).m", { buf });
  expect(mode).toBe(0);
});

test("a frame while hidden keeps the last outbound status away", () => {
  const sent = [];
  const g = { NET: { room: "ABCD", tx: {put: d => sent.push(d.m)}, beatT: 1, BEAT: 1 },
    document: {hidden: true}, netState: () => ({m: 0}), addEventListener: (_, f) => f() };
  vm.runInNewContext(net("function netSend(", "/* ---------- the others") + "netSend(false)", g);
  expect(sent.at(-1)).toBe(3);
});

test("a local relay replacement becomes visible after a peer disconnects without a goodbye", () => {
  const peers = new Map();
  const d = {m: 3, x: 0, y: 0, z: 0, h: 0, v: 0, n: "Test"};
  const g = { NET: {room: "ABCD", MAX: 4, STALE: 6, peers, sendT: 0, beatT: 0, RATE: 1},
    state: "PAUSE", d, now: 0, activePlayer: () => ({}), performance: {now: () => g.now},
    netLocal: () => true, netAt: p => p.buf.at(-1).d, netName: s => s, toast() {}, netTag() {},
    $: () => ({classList: {contains: () => true}}) };
  vm.runInNewContext(net("const NET_LIM=", "function netGone(") +
    net("function netTick(", "// friends on the minimap") +
    'for(const id of ["one","two","gone"]) netGot(id,d);now=60000;' +
    'netGot("one",d);netGot("two",d);netTick(0);netGot("replacement",d)',g);
  expect(peers.has("replacement")).toBe(true);
});

test("a Unicode name truncated at the length limit remains well-formed", () => {
  const name = vm.runInNewContext(net("const netName=", "const netMyName") + 'netName("abcdefghijk𠮷")');
  expect(Buffer.from(name).toString("utf8")).toBe(name);
});

test("the local relay preserves a name split across UTF-8 network chunks", () => {
  const req = Object.assign(new EventEmitter(), {method: "POST"});
  const writes = [];
  const source = segment("./support/server.js", "const ROOMS", "const server");
  vm.runInNewContext(source + 'ROOMS.set("ABCD",new Set([{write:s=>writes.push(s)}]));relay(req,res,"ABCD")',
    {req, writes, res: {writeHead() {return this}, end() {}}});
  const body = Buffer.from(JSON.stringify({n: "Inês"}));
  const split = body.indexOf(Buffer.from("ê")) + 1;
  req.emit("data",body.subarray(0,split));
  req.emit("data",body.subarray(split));
  req.emit("end");
  expect(JSON.parse(writes[0].slice(6)).n).toBe("Inês");
});

function residents() {
  const THREE = require("three");
  const scene = new THREE.Scene();
  const pedModel = () => {
    const G = new THREE.Group();
    scene.add(G);
    return { G, face: {m: new THREE.MeshBasicMaterial()} };
  };
  const p = { pid: 0, m: pedModel(), st: "walk" };
  const g = vm.createContext({ THREE, scene, pedModel, p, PEDS: [p], PEOPLE: [{}, {}],
    RIDE: {}, TALK: {}, rnd: () => 0, emoTex: () => null });
  vm.runInContext(segment("../js/people.js", "let pedTurn=", "function buildPeds") +
    segment("../js/life.js", "function emote(", "/* ================================================================ EACH FRAME"), g);
  return g;
}

test("a replacement resident displays their emote on their own model", () => {
  const g = residents();
  vm.runInContext('emote(p,"smile"); pedRotate(); emote(p,"cake")', g);
  expect(g.p.pid).toBe(1);
  expect(g.p.emo.sp.parent === g.p.m.G).toBe(true);
});

test("rotating residents does not transfer a prior resident's knockdown", () => {
  const g = residents();
  g.save = { violence: 0 };
  const source = fs.readFileSync(require.resolve("../js/people.js"), "utf8");
  const start = source.indexOf("function pedKnock(");
  vm.runInContext(source.slice(start, source.indexOf("\n", start)) + "\npedKnock(p);pedRotate()", g);
  expect(g.p.pid).toBe(1);
  expect(g.p.st).not.toBe("down");
});
