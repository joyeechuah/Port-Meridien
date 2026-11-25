const { test, expect } = require("@playwright/test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, "../js", name + ".js"), "utf8");
const core = read("core"), screens = read("screens");
function section(source, first, next) {
  const start = source.indexOf(first), end = source.indexOf(next, start);
  if (start < 0 || end < 0) throw Error("Missing game source at " + first);
  return source.slice(start, end);
}
const start = { v: 1, energy: 80, hunger: 75, fun: 65, social: 65 };
const remedies = { energy: /bench/, hunger: /Market Kitchen/, fun: /race/, social: /talk/ };
const moods = { energy: "Tired", hunger: "Hungry", fun: "Bored", social: "Lonely" };
function game(state = "GARAGE") {
  const save = { rel: {} }, CL = { meta: {} }, WANTED = { lvl: 0 };
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id, { appendChild() {}, addEventListener() {}, setAttribute() {} });
    return nodes.get(id);
  };
  const globals = { wantEvent:()=>false, window: {}, document: { createElement: () => ({ dataset: {} }) }, $, save, CL, WANTED,
    state, show(){}, FOOT: { on: true }, BOAT: { on: false }, persist() {} };
  const code = [
    section(core, "const clamp=", "\n"),
    section(core, "const NEEDS_START=", "\n"),section(core,"const SKILL_RATE=","function workClean("),"save.skills=skillsClean(null);",
    section(core, "function needsClean(", "\ntry{"),
    read("life"), read("home"), section(screens, "function clNeeds(", "\n// the account"),
    "({needsClean,needsLoad,needsCommit,needsMood,needsTip,needsKey,clNeeds,NEEDS,NS,TALK,PEOPLE,talkPick,needsTick})"
  ];
  const ctx = vm.createContext(globals);
  const api = vm.runInContext(code.join("\n"), ctx);
  vm.runInContext("emote=()=>{};talkShow=()=>{}", ctx);
  return { ...api, ...globals };
}

test("cleaning rejects invalid containers and defaults, rounds and clamps fields independently", () => {
  const g = game();
  const list = Object.assign([], { v: 1, energy: 0 });
  for (const n of [list, { v: 2, energy: 0 }, { v: "1", fun: 0 }, "broken", null, undefined])
    expect(g.needsClean(n)).toEqual(start);
  expect(g.needsClean({ v: 1, energy: "2", fun: NaN, hunger: Infinity, social: null })).toEqual(start);
  expect(g.needsClean({ v: 1, energy: -4, hunger: 121, fun: 24.49, social: 24.5, extra: 1 }))
    .toEqual({ v: 1, energy: 0, hunger: 100, fun: 24, social: 25 });
});

test("every low mood has its own tip and respects entry, recovery and the critical override", () => {
  const g = game(), keys = Object.keys(moods);
  for (const [i, k] of keys.entries()) {
    const other = keys[(i + 1) % keys.length];
    g.needsLoad({ ...start, [k]: 26 });
    expect(g.needsMood()).toBe("Okay");
    expect(g.needsTip()).toMatch(remedies[k]);
    g.NEEDS[k] = 25;
    expect(g.needsMood()).toBe(moods[k]);
    g.NEEDS[k] = 34; g.NEEDS[other] = 16;
    expect(g.needsTip()).toMatch(remedies[k]);
    g.NEEDS[k] = 15; g.NEEDS[other] = 15;
    expect(g.needsMood()).toBe(moods[k]);
    g.NEEDS[k] = 16;
    expect(g.needsMood()).toBe(moods[other]);
    g.NEEDS[k] = 70; g.NEEDS[other] = 35;
    expect(g.needsMood()).toBe("Okay");
    g.NEEDS[other] = 25;
    expect(g.needsTip()).toMatch(remedies[other]);
  }
});

test("fresh ties follow table order for both moods and suggestions; wanted takes precedence", () => {
  const g = game(), keys = Object.keys(moods);
  for (let i = 0; i < keys.length; i++) {
    for (const level of [25, 26]) {
      g.needsLoad(Object.assign({ v: 1 }, Object.fromEntries(keys.map((k, j) => [k, j < i ? 80 : level]))));
      expect(g.needsMood()).toBe(level === 25 ? moods[keys[i]] : "Okay");
      expect(g.needsTip()).toMatch(remedies[keys[i]]);
      g.WANTED.lvl = 2;
      expect(g.needsMood()).toBe("Tense");
      expect(g.needsTip()).toMatch(/police/);
      g.WANTED.lvl = 0;
    }
  }
  g.needsLoad({ v: 1, energy: 70, hunger: 70, fun: 70, social: 70 });
  expect(g.needsMood()).toBe("Content");
  expect(g.needsTip()).toMatch(/good shape/);
  g.NEEDS.fun = 69;
  expect(g.needsMood()).toBe("Okay");
  expect(g.needsTip()).toMatch(remedies.fun);
});

test("cloud adopts a whole remote set on unchanged local needs and refreshes garage REST", () => {
  const g = game();
  g.needsLoad({ ...start, energy: 100 });
  g.CL.meta.needs = g.needsKey(g.save);
  const remote = { ...start, energy: 20, social: 99 };
  g.clNeeds({ needs: remote });
  expect(g.save.needs).toEqual(remote);
  expect(g.CL.meta.needs).toBe(g.needsKey(g.save));
  expect(g.$("gRest").disabled).toBe(false);
  expect(g.$("gRest").textContent).toContain("20");
  g.clNeeds({});
  expect(g.save.needs).toEqual(start);
  expect(g.needsKey({})).toBe(g.needsKey({ needs: start }));
});

test("cloud keeps a local gain even between save checkpoints", () => {
  const g = game();
  g.CL.meta.needs = g.needsKey(g.save);
  g.NEEDS.energy += 3;
  g.clNeeds({ needs: { ...start, energy: 5, hunger: 99 } });
  expect(g.save.needs).toEqual({ ...start, energy: 83 });
  expect(g.NEEDS.energy).toBe(83);
  expect(g.CL.meta.needs).toBe(g.needsKey({ needs: start }));
});

test("a capped friendship or a repeated line after cooldown cannot award Social", () => {
  const g = game(), who = g.PEOPLE[0];
  Object.assign(g.TALK, { p: {}, person: who });
  g.save.rel[who.id] = { f: 100, n: 3 };
  g.talkPick("hello");
  expect(g.NEEDS.social).toBe(65);
  g.save.rel[who.id].f = 0;
  g.TALK.busy = 0;
  g.talkPick("hello");
  expect(g.NEEDS.social).toBe(65);
  g.TALK.busy = 0;
  g.talkPick("chat");
  expect(g.NEEDS.social).toBe(73);
});

test("a hidden tab in DRIVE does not advance needs or reward cooldowns", () => {
  const g = game("DRIVE");
  g.document.hidden = true;
  g.needsTick(1 / 30);
  expect(g.NS.t).toBe(0);
  expect(g.NEEDS.energy).toBe(80);
});
