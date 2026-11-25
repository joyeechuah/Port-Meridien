const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createDrivingSim } = require("./support/sim");
const { measureBends, measureJunctions } = require("./support/drive-scenarios");

test("corner assist sheds speed gently on long roads", t => {
  const result = measureBends(createDrivingSim());
  t.diagnostic(JSON.stringify(result));
  for (const car of ["golf", "gtr"]) {
    assert.ok(result[car].runs > 0);
    assert.ok(result[car].peak < 8, car + " lost 8 m/s or more in a second");
  }
  assert.ok(result.gtr.drops < 16);
  assert.ok(result.golf.drops < 9);
});

test("Old Quay T-junctions from 130 km/h with gas held", t => {
  const turns = measureJunctions(createDrivingSim());
  t.diagnostic(JSON.stringify(turns));
  assert.ok(turns.length >= 8);
  for (const turn of turns) {
    assert.ok(turn.made, JSON.stringify(turn));
    if (turn.lead === 1) {
      assert.ok(turn.vMin >= 50, JSON.stringify(turn));
      assert.ok(turn.slow < 2, JSON.stringify(turn));
    }
  }
});

test("country T-junctions at nodes 1 and 2 from 180 and 200 km/h", () => {
  const sim = createDrivingSim();
  for (const speed of [180, 200]) {
    const turns = measureJunctions(sim, speed);
    assert.deepEqual(turns.map(turn => turn.n), [1, 1, 2, 2]);
    for (const turn of turns) assert.ok(turn.made, JSON.stringify({speed, ...turn}));
  }
});
