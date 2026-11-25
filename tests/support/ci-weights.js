// Refreshes ci-file-seconds.json, the running times ci-shards.js balances the CI shards by, from the logs of a passing
// run's shard jobs. Save each job's log, then run this on them:
//   gh api repos/joyeechuah/Port-Meridien/actions/runs/RUN_ID/jobs --jq '.jobs[] | select(.name|test("shard")) | .id'
//   gh api repos/joyeechuah/Port-Meridien/actions/jobs/JOB_ID/logs > shard-N.log   (for each id)
//   node tests/support/ci-weights.js shard-*.log
// It reads the list reporter's lines ("✓ 12 [chromium] › tests/x.spec.js:3:1 › title (5.2s)"). A Chromium file's
// time is the sum of its tests; a WebGL test keeps its own. A retry counts too: it costs the run that time.
const fs = require("node:fs");
const path = require("node:path");
const logs = process.argv.slice(2);
if (!logs.length) throw Error("Expected the shard jobs' log files");
const out = {};
let n = 0;
for (const f of logs)
  for (const raw of fs.readFileSync(f, "utf8").split("\n")) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, ""),
      m = line.match(/\[([^\]]+)\] › (?:tests\/)?(.+?):\d+:\d+ › (.+?)(?: \(retry #\d+\))? \((\d+(?:\.\d+)?)(ms|s|m)\)\s*$/);
    if (!m) continue;
    const [, project, file, title, v, unit] = m,
      s = Number(v) * (unit === "ms" ? 0.001 : unit === "m" ? 60 : 1),
      key = project + "/" + file + (project === "webgl" ? " › " + title : "");
    out[key] = (out[key] || 0) + s;
    n++;
  }
if (!n) throw Error("No test times found in the logs");
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, Math.max(1, Math.round(out[k]))]));
fs.writeFileSync(path.join(__dirname, "ci-file-seconds.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log(n + " test runs read, " + Object.keys(sorted).length + " entries written");
