const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "../js/life.js"), "utf8");
function dialogue() {
  const save = { rel: {}, found: {} };
  const globals = {
    window: {}, save, WANTED: { lvl: 0 }, LANDMARKS: [], document: { createElement: () => ({ dataset: {} }) },
    // the needs (in the same file) start from these
    NEEDS_START: { energy: 80, hunger: 75, fun: 65, social: 65 }, needsClean: (n) => Object.assign({ v: 1, energy: 80, hunger: 75, fun: 65, social: 65 }, n),
    $: () => ({ appendChild() {}, addEventListener() {} })
  };
  return vm.runInNewContext(source + "\n;({ PEOPLE, TALKS, TALK, talkReaction, talkTip, TIPS, save, NEEDS, needsLoad, WANTED })", globals);
}

test("every resident has two repeatable reactions per action without changing the friendship", () => {
  const g = dialogue();
  for (const person of g.PEOPLE) {
    g.save.rel[person.id] = { f: 18, n: 2 };
    for (const action of g.TALKS) {
      const lines = [];
      for (const use of [1, 2, 3]) {
        g.TALK.used[action.id] = use;
        const render = () => g.talkReaction(person, action.id, action.base);
        const line = render();
        expect(line).toBe(render());
        expect(line).toContain(person.name);
        expect(line).not.toContain("undefined");
        lines.push(line);
      }
      expect(lines[0]).not.toBe(lines[1]);
      expect(lines[2]).toBe(lines[0]);
    }
    expect(g.save.rel[person.id]).toEqual({ f: 18, n: 2 });
  }
});

test("general tips can all be reached before befriending a resident", () => {
  const g = dialogue(), who = g.PEOPLE[0], seen = new Set();
  for (let count = 1; count <= g.TIPS.length; count++) {
    g.save.rel[who.id] = { f: 0, n: count };
    g.TALK.n = 1;
    seen.add(g.talkTip(who));
  }
  expect(seen.size).toBeGreaterThan(6);
  expect([...seen].sort()).toEqual([...g.TIPS].sort());
});

test("each personality gives two repeatable remedies per low mood and falls back during a chase", () => {
  const g = dialogue(), cases = { hunger: /kitchen|meal|food|stall/i, energy: /bench|rest|seat|sit by/i,
    fun: /race|boat|time trial/i, social: /chat|hello|talk|kind word|friendly word|compliment|joke|ask someone/i };
  for (const who of g.PEOPLE) {
    for (const [need, remedy] of Object.entries(cases)) {
      g.needsLoad({ v: 1, [need]: 10 });
      const lines = [1, 2].map(count => {
        g.TALK.used.tip = count;
        const line = g.talkTip(who);
        expect(g.talkTip(who)).toBe(line);
        expect(line).toMatch(remedy);
        return line;
      });
      expect(new Set(lines).size).toBe(2);
      g.WANTED.lvl = 1;
      expect(g.TIPS).toContain(g.talkTip(who));
      g.WANTED.lvl = 0;
    }
  }
});
