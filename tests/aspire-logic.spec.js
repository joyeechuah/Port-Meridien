// Aspirations (js/progress.js): six long goals of three steps, worked out from what the save already holds, each step
// paid once and in order when persist asks; the save keeps only how many steps were paid
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  vm = require("node:vm");
const read = (n) => fs.readFileSync(require.resolve("../js/" + n + ".js"), "utf8");
const part = (file, a, b) => { const s = read(file), i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw Error("Missing " + a); return s.slice(i, j); };
function game() {
  const toasts = [], nodes = new Map();
  const node = () => ({ children: [], style: {}, setAttribute() {}, append(...v) { this.children.push(...v); }, appendChild(v) { this.children.push(v); }, replaceChildren() { this.children = []; } });
  const g = {
    save: { cr: 1000, rel: {}, champ: {}, home: { items: [] }, wants: { completed: {} } }, tabIdle: false,
    toast: (...a) => toasts.push(a), updateMoney() {}, Date: { now: () => 20000 * 86400000 },
    $: (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, document: { createElement: () => node() },
  };
  const ctx = vm.createContext(g), run = (s) => vm.runInContext(s, ctx);
  run(part("core", "const clamp=", "\n") + "\n" + part("core", "const fmtCr=", "\n") + "\n" + part("core", "const SKILL_RATE=", "function workClean("));
  run("save.skills=skillsClean(null);" + part("progress", "const CUPS=", "}];") + "}];\n" + part("progress", "const ASPIRE_PAY=", "\n// in the Skills panel"));
  run(part("progress", "// in the Skills panel", "\n}\n") + "\n}");
  return { g, run, toasts };
}

test("the saved record keeps only steps paid, 0 to 3, for the six aspirations", () => {
  const { run } = game();
  const empty = { v: 1, claimed: {} };
  for (const raw of ["null", "[]", "{v:2,claimed:{chef:1}}", "{v:1}", "{v:1,claimed:[2]}"]) expect(run("aspireClean(" + raw + ")")).toEqual(empty);
  expect(run('aspireClean({v:1,claimed:{chef:2,racer:9,home:1.5,social:-1,wants:"2",alien:3}})')).toEqual({ v: 1, claimed: { chef: 2, racer: 3 } });
  expect(run('aspireClean({v:1,claimed:Object.assign(Object.create({chef:3}),{})})')).toEqual(empty);
});

test("steps are paid in order and once: three cups won pay two steps of Speed demon, and nothing more after", () => {
  const { g, run, toasts } = game();
  run('save.champ={A1:{won:true},A2:{won:true},A3:{won:true},A4:{won:false}}');
  run("aspireCheck()");
  expect(g.save.cr).toBe(1000 + 1500 + 4000);
  expect(g.save.aspire.claimed).toEqual({ racer: 2 });
  expect(toasts.map((t) => t.slice(0, 2))).toEqual([["ASPIRATION · SPEED DEMON", "Win a cup · +1,500 CR"], ["ASPIRATION · SPEED DEMON", "Win three cups · +4,000 CR"]]);
  run("aspireCheck()");
  expect(g.save.cr).toBe(6500);
  expect(toasts.length).toBe(2);
});

test("each aspiration's steps follow its own progress; the kitchen and the home wait for their scripts", () => {
  const { g, run } = game();
  // no js/work.js or js/home.js yet: their steps aren't met, and nothing breaks
  run("save.home.items=Array.from({length:15},()=>({id:'stool'}))");
  run("aspireCheck()");
  expect(g.save.aspire.claimed).toEqual({ home: 2 });
  g.workRank = () => 4;
  g.homeComfort = () => 100;
  // a stranger at 90 isn't a friend; Friendly is 15, Friends 40, a Best friend 90
  run("save.rel={1:{f:95,n:0},2:{f:15,n:1},3:{f:40,n:2},4:{f:41,n:1}}");
  run("save.skills.cooking=skillThreshold(5);save.skills.driving=skillThreshold(5);save.skills.fitness=skillThreshold(3)");
  run("save.wants.completed={shift:12,walk:20}");
  run("aspireCheck()");
  expect(g.save.aspire.claimed).toEqual({ chef: 3, home: 3, social: 1, skills: 1, wants: 2 });
  run("save.skills.fitness=skillThreshold(5);save.rel[3].f=90;save.rel[5]={f:40,n:1}");
  run("aspireCheck()");
  expect(g.save.aspire.claimed).toEqual({ chef: 3, home: 3, social: 3, skills: 2, wants: 2 });
});

test("the panel lists the six with their steps and the next reward", () => {
  const { g, run } = game();
  run("save.aspire={v:1,claimed:{chef:3,racer:1}};aspireRender()");
  const rows = g.$("skAsp").children;
  expect(rows.length).toBe(6);
  const text = (i) => rows[i].children.map((c) => c.textContent);
  expect(text(0)).toEqual(["Master chef", undefined, "3/3", "Complete"]);
  expect(text(3)).toEqual(["Speed demon", undefined, "1/3", "Next: Win three cups · 4,000 CR"]);
});

test("no step paid matches a save from before aspirations; a step paid is progress", () => {
  const { g, run } = game();
  Object.assign(g, { homeProgress: () => null, workClean: () => ({ completed: 0 }), wantsClean: (w) => ({ completed: (w && w.completed) || {} }), STARTERS: [] });
  run(part("screens", "const CL_PREFS=", "function clSummary("));
  expect(run("clProg({cr:5})===clProg({cr:5,aspire:{v:1,claimed:{}}})")).toBe(true);
  expect(run("clProg({cr:5})===clProg({cr:5,aspire:{v:1,claimed:{chef:1}}})")).toBe(false);
});

test("a save whose only sign of play is a paid aspiration step isn't fresh, so the account can't silently replace it", () => {
  const { g, run } = game();
  Object.assign(g, { homeProgress: () => null, workClean: () => ({ completed: 0 }), wantsClean: () => ({ completed: {} }), STARTERS: ["golf"] });
  run(part("screens", "const CL_PREFS=", "function clSummary("));
  // five daybeds bought, the first Home maker step paid, all five sold: the wallet is back where it started
  const start = '{cr:120000,owned:["golf"],paint:{},rec:{},found:{},radar:{},champ:{},mods:{},rel:{},xp:0';
  expect(run("clFresh(" + start + "})")).toBe(true);
  expect(run("clFresh(" + start + ',aspire:{v:1,claimed:{home:1}}})')).toBe(false);
  expect(run("clFresh(" + start + ',aspire:{v:1,claimed:{}}})')).toBe(true);
});

