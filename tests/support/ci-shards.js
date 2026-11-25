// Estimate file costs from the passing PR #85 run 45455836778. Playwright keeps
// a file together by default. Discover current tests so new files are included.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const seconds = require("./ci-file-seconds.json");
const [directory, countArg] = process.argv.slice(2);
const count = Number(countArg);
if (!directory || !Number.isInteger(count) || count < 1) throw Error("Expected directory and shard count");
const listing = execFileSync(process.execPath, [require.resolve("@playwright/test/cli"), "test", "--list", "--reporter=list"], {encoding:"utf8"});
const files = new Map();
let tests = 0;
for (const line of listing.split("\n")) {
  const match = line.match(/^\s*\[([^\]]+)\] › (.+?):\d+:\d+ › /);
  if (!match) continue;
  const [, project, file] = match, key = project + "/" + file;
  if (!files.has(key)) files.set(key, {project, file, key, order:files.size, tests:0});
  files.get(key).tests++;
  tests++;
}
if (!tests || tests !== Number(listing.match(/Total: (\d+) tests? in/)?.[1])) throw Error("Incomplete Playwright discovery");
const groups = Array.from(files.values());
for (const g of groups) g.cost = seconds[g.key] ?? g.tests * (g.project === "webgl" ? 50 : 8);

// Estimate completion with the two configured workers in discovery order.
// A long WebGL file at the end of a queue can leave the other worker idle.
function finish(groups) {
  const lanes = [0,0];
  for (const g of [...groups].sort((a,b)=>a.order-b.order)) lanes[lanes[0]<=lanes[1]?0:1] += g.cost;
  return Math.max(...lanes);
}
const shards = Array.from({length:count},()=>[]);
for (const g of groups.sort((a,b)=>b.cost-a.cost)) {
  let best = 0, bestTime = Infinity;
  for (let i=0;i<count;i++) {
    const time = finish([...shards[i],g]);
    if (time < bestTime) {best=i; bestTime=time;}
  }
  shards[best].push(g);
}
fs.mkdirSync(directory,{recursive:true});
for (const [i, shard] of shards.entries()) {
  if (!shard.length) throw Error("Empty shard");
  fs.writeFileSync(path.join(directory,String(i+1)),shard.map(g=>"["+g.project+"] › "+g.file).join("\n")+"\n");
  console.log("Shard", i+1, "tests",shard.reduce((n,g)=>n+g.tests,0),"estimated test seconds",finish(shard));
}
