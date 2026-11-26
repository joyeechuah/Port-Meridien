const { test, expect } = require("@playwright/test");
const fs = require("node:fs"), vm = require("node:vm");
function source(file, start, end) {
  const code = fs.readFileSync(require.resolve("../js/" + file + ".js"), "utf8");
  const left = code.indexOf(start), right = code.indexOf(end, left);
  if (left < 0 || right < 0) throw Error("Missing source marker " + start);
  return code.slice(left, right);
}
function driver(n, freeSpirit = false) {
  const jobs = { parcel: n, courier: 0, tour: 0, runs: {}, earned: 0, failed: 0, abandoned: 0 };
  const messages = [], writes = [];
  const save = { cr: 0, xp: 0, jobs, traits: { ids: freeSpirit ? ["freeSpirit"] : [] } };
  const ctx = vm.createContext({ save, clearGPS() {}, jobMarker() {}, show() {}, updateMoney() {},
    fmtCr: String, lvlOf: () => 1, toast: title => messages.push(title),
    persist: () => writes.push(JSON.parse(JSON.stringify(save))), $: () => ({ classList: { contains: () => true } }) });
  const run = code => vm.runInContext(code, ctx);
  run(source("core", "const WANT_CATALOG=", "const SKILL_RATE="));
  run(source("progress", "const CONTRACT_RANKS=", "const JOB_TOWNS="));
  run(source("play", "function earn(cr)", "\n"));
  run(source("progress", "function jobEnd(", "// the same contract again"));
  save.wants = run('wantsClean({v:1,active:["contractPromotion","meet","photo"]})');
  function end(type, how = "completed") {
    ctx.job = { def: { id: type + "1", type, reward: 2300, title: "Test route" } };
    return run('jobEnd("' + how + '")');
  }
  return { save, run, end, messages, writes };
}
test("rank and quoted pay follow all five thresholds, including when loaded", () => {
  for (const [n,rank,pay] of [[0,0,2300],[2,0,2300],[3,1,2415],[7,1,2415],[8,2,2530],[14,2,2530],[15,3,2645],[24,3,2645],[25,4,2760],[100,4,2760]]) {
    const g=driver(n);
    expect(g.run("contractRank()")).toBe(rank);
    expect(g.run("contractPay({reward:2300})")).toBe(pay);
    expect(g.save.cr).toBe(0);
    g.end("parcel");
    expect(g.save.jobs.earned).toBe(pay);
  }
});
test("three different completed contracts promote once, with the old wage and the want in one save", () => {
  const g=driver(0,true);
  for(const type of ["parcel","tour","courier"]) g.end(type);
  expect(g.writes).toHaveLength(3);
  expect(g.writes[2]).toMatchObject({cr:8700,jobs:{parcel:1,tour:1,courier:1,earned:6900},wants:{completed:{contractPromotion:1}}});
  expect(g.messages.filter(m=>m==="CONTRACT PROMOTION")).toHaveLength(1);
  expect(g.run('jobEnd("completed")')).toBe(false);
  expect(g.writes).toHaveLength(3);
  g.end("tour");
  expect(g.save.cr).toBe(11115);
});
test("failures and abandonment do not advance the ladder; top rank retires the want", () => {
  const g=driver(24);
  g.end("courier","failed");g.end("tour","abandoned");
  expect(g.save.jobs).toMatchObject({parcel:24,failed:1,abandoned:1,earned:0});
  expect(g.messages).not.toContain("CONTRACT PROMOTION");
  g.end("parcel");
  expect(g.save.cr).toBe(2645+1500);
  expect(g.run('wantOpen("contractPromotion")')).toBe(false);
  g.save.wants.active[0]="contractPromotion";
  expect(g.run("wantsTidy()")).toBe(true);
  expect(g.save.wants.active).not.toContain("contractPromotion");
});
