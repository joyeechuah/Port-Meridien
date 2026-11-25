// The kitchen career (js/work.js): five ranks from the shifts finished and the Cooking level, each with its own pay
// times Cooking's bonus; a shift is paid at the rank it was worked at, and may then promote you, once
const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  vm = require("node:vm");
const read = (n) => fs.readFileSync(require.resolve("../js/" + n + ".js"), "utf8");
const part = (file, a, b) => { const s = read(file), i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw Error("Missing " + a); return s.slice(i, j); };
function kitchen(completed = 0, cookXp = 0) {
  const toasts = [], wants = [], nodes = new Map();
  const g = {
    save: { cr: 0, work: { completed, cool: 0 } }, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), persist() {},
    toast: (...a) => toasts.push(a), wantEvent: (id) => { wants.push(id); return false; }, earn(v) { g.save.cr += v; },
    $: (id) => { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); },
    WORK_ITEMS: ["Bread", "Bowl", "Stew"], WORK: { panel: true, active: true, served: 2, wait: 0, hp: 1 }, HEALTH: { hp: 1 },
    workAvailable: () => true, workCancel() { g.WORK.active = false; },
  };
  const ctx = vm.createContext(g), run = (s) => vm.runInContext(s, ctx);
  run(part("core", "const SKILL_RATE=", "function workClean(") + "\nsave.skills=skillsClean(null);save.skills.cooking=" + cookXp + ";");
  run(part("work", "const WORK_RANKS=", "// Only called"));
  const shift = () => { g.WORK.active = true; g.WORK.served = 2; return run("workServe(2)"); };
  return { g, run, toasts, wants, shift };
}

test("each rank needs its shifts and its Cooking level, both", () => {
  const { run } = kitchen();
  for (const [done, cook, rank] of [[0, 0, 0], [2, 9, 0], [3, 0, 1], [8, 1, 1], [8, 2, 2], [14, 9, 2], [15, 4, 3], [25, 5, 3], [25, 6, 4], [9999, 10, 4]])
    expect(run(`workRank(${done},${cook})`), `${done} shifts, Cooking ${cook}`).toBe(rank);
});

test("pay is the rank's rate times Cooking's bonus, and the panel says what the next rank needs", () => {
  const cases = [[0, 0, 300, "Dishwasher. Prep cook after 3 more shifts."], [3, 0, 360, "Prep cook. Line cook after 5 more shifts and Cooking level 2."],
    [8, 150, 440 * 1.06, "Line cook. Sous chef after 7 more shifts and Cooking level 4."], [15, 500, 540 * 1.12, "Sous chef. Head chef after 10 more shifts and Cooking level 6."],
    [25, 1050, 660 * 1.18, "Head chef: the top of the kitchen."], [30, 300, 440 * 1.09, "Line cook. Sous chef after Cooking level 4."]];
  for (const [done, xp, pay, text] of cases) {
    const { run } = kitchen(done, xp);
    expect(run("workPay()")).toBe(Math.round(pay));
    expect(run("workRankText()")).toBe(text);
  }
});

test("the shift that reaches a rank is paid at the old one; the promotion is announced once and counts for a want", () => {
  const { g, shift, toasts, wants } = kitchen(2);
  expect(shift()).toBe(true);
  expect(g.save.cr).toBe(300);
  expect(g.save.work.completed).toBe(3);
  expect(toasts.filter((t) => t[0] === "PROMOTED")).toEqual([["PROMOTED", "Prep cook · 360 CR a shift", "gold"]]);
  expect(wants.filter((w) => w === "promote").length).toBe(1);
  shift();
  expect(g.save.cr).toBe(300 + 360);
  expect(toasts.filter((t) => t[0] === "PROMOTED").length).toBe(1);
});

test("the Cooking a shift teaches can be what promotes you", () => {
  // seven shifts done and 25 XP short of Cooking 2 (150): the eighth shift and its 25 XP give both
  const { g, shift, toasts } = kitchen(7, 125);
  shift();
  expect(g.save.cr).toBe(Math.round(360 * 1.03));
  expect(toasts.some((t) => t[0] === "PROMOTED" && t[1].startsWith("Line cook"))).toBe(true);
});

test("a want to be promoted isn't drawn for a head chef", () => {
  const { g, run } = kitchen(25, 1050);
  run(part("core", "const WANT_CATALOG=", "const SKILL_RATE="));
  const drawn = new Set();
  for (let i = 0; i < 400; i++) drawn.add(run("wantDraw([])"));
  expect(drawn.has("promote")).toBe(false);
  expect(drawn.size).toBe(11);
  run("save.work.completed=0");
  for (let i = 0; i < 400 && !drawn.has("promote"); i++) drawn.add(run("wantDraw([])"));
  expect(drawn.has("promote")).toBe(true);
});
