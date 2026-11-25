// Splits the tests into one list per CI shard (node tests/support/ci-shards.js DIR COUNT writes DIR/1 … DIR/COUNT for
// `playwright test --test-list`), balanced by the running times in ci-file-seconds.json, which ci-weights.js
// measures from a passing run's logs. A Chromium file stays together, in its order, as Playwright runs it; each WebGL
// test is a unit of its own (that project runs fully parallel, and one software-drawn test can take five minutes, so
// a whole WebGL file on one shard set the whole run's length). Tests are discovered afresh each time, so a new test or
// file is placed too, at a guessed cost.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const seconds = require("./ci-file-seconds.json");
const [directory, countArg] = process.argv.slice(2);
const count = Number(countArg);
if (!directory || !Number.isInteger(count) || count < 1) throw Error("Expected directory and shard count");
const listing = execFileSync(process.execPath, [require.resolve("@playwright/test/cli"), "test", "--list", "--reporter=list"], { encoding: "utf8" });
const units = new Map();
let tests = 0;
for (const raw of listing.split("\n")) {
  const line = raw.trim(),
    m = line.match(/^\[([^\]]+)\] › (.+?):\d+:\d+ › (.+)$/);
  if (!m) continue;
  const [, project, file, title] = m,
    alone = project === "webgl",
    key = project + "/" + file + (alone ? " › " + title : "");
  if (!units.has(key)) units.set(key, { project, key, line: alone ? line : "[" + project + "] › " + file, order: units.size, tests: 0 });
  units.get(key).tests++;
  tests++;
}
if (!tests || tests !== Number(listing.match(/Total: (\d+) tests? in/)?.[1])) throw Error("Incomplete Playwright discovery");
const groups = [...units.values()];
for (const g of groups) g.cost = seconds[g.key] ?? g.tests * (g.project === "webgl" ? 60 : 8);

// Estimate completion with the two configured workers in discovery order.
// A long WebGL test at the end of a queue can leave the other worker idle.
function finish(groups) {
  const lanes = [0, 0];
  for (const g of [...groups].sort((a, b) => a.order - b.order)) lanes[lanes[0] <= lanes[1] ? 0 : 1] += g.cost;
  return Math.max(...lanes);
}
const shards = Array.from({ length: count }, () => []);
for (const g of groups.sort((a, b) => b.cost - a.cost)) {
  let best = 0,
    bestTime = Infinity;
  for (let i = 0; i < count; i++) {
    const time = finish([...shards[i], g]);
    if (time < bestTime) {
      best = i;
      bestTime = time;
    }
  }
  shards[best].push(g);
}
fs.mkdirSync(directory, { recursive: true });
for (const [i, shard] of shards.entries()) {
  if (!shard.length) throw Error("Empty shard");
  fs.writeFileSync(path.join(directory, String(i + 1)), shard.map((g) => g.line).join("\n") + "\n");
  console.log("Shard", i + 1, "tests", shard.reduce((n, g) => n + g.tests, 0), "estimated test seconds", Math.round(finish(shard)));
}
