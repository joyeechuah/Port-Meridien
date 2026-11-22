const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "../js/life.js"), "utf8");
function dialogue() {
  const save = { rel: {}, found: {} };
  const globals = {
    window: {}, save, LANDMARKS: [], document: { createElement: () => ({ dataset: {} }) },
    $: () => ({ appendChild() {}, addEventListener() {} })
  };
  return vm.runInNewContext(source + "\n;({ PEOPLE, TALKS, TALK, talkReaction, talkTip, TIPS, save })", globals);
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
