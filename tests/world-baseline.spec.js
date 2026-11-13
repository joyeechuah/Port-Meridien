// Lock the complete existing world before Old Quay construction changes the map.
// This test intentionally fails without the committed fixture. A developer with Chromium
// must first run it with UPDATE_WORLD_BASELINE=1, inspect the generated file, and commit it.
// Never regenerate the baseline as part of ordinary CI.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("./support/game");

const BASELINE = path.join(__dirname, "fixtures", "world-baseline.json");
const UPDATE = process.env.UPDATE_WORLD_BASELINE === "1";

test("all roads, races, landmarks and contract routes match the approved world baseline", async ({ game }) => {
  await game.open();
  const actual = await game.eval(() => {
    const T = __T;
    const q = (value) => Math.round(value * 1000) / 1000;
    const xy = (p) => [q(p.x), q(p.z)];
    const route = (r) => (r ? { len: q(r.len), points: r.pts.map(xy) } : null);
    return {
      schema: 1,
      // Keep both authored roads and their generated junction-split edges.
      roads: T.ROADS.map((r) => ({
        type: r.type, closed: r.closed, points: r.pts.map(xy), heights: r.ys.map(q),
      })),
      edges: T.EDGES.map((e) => ({
        id: e.id, roadIndex: e.ri, type: e.type,
        from: e.a.id, to: e.b.id, halfWidth: q(e.half),
        len: q(e.len), points: e.pts.map(xy), heights: e.ys.map(q),
      })),
      // Compare the full computed polyline, not only authored race waypoints.
      events: T.EVENTS.map((e) => ({
        id: e.id, type: e.type, name: e.name,
        waypoints: e.wp().map(([x, z]) => [q(x), q(z)]),
        start: xy(e), checkpoints: e.cps.map(q), route: route(e.route),
        medals: [q(e.gold), q(e.silver), q(e.bronze)],
        rewards: e.rewards,
      })),
      landmarks: T.LANDMARKS.map((l) => ({
        id: l.id, name: l.name, position: xy(l), road: l.road,
      })),
      // JOB_PTS is procedural. These are the exact generated pickup/dropoff points.
      jobPoints: Object.keys(T.JOB_PTS).sort().map((id) => ({
        id, name: T.JOB_PTS[id].name, position: xy(T.JOB_PTS[id]),
      })),
      jobs: T.JOBS.map((j) => ({
        id: j.id, type: j.type, title: j.title,
        stops: j.stops.map((s) => ({ id: s.id, position: xy(s) })),
        // Routes can pass THROUGH the district even if no stop is named Old Quay.
        legs: j.stops.slice(1).map((s, i) => {
          const a = j.stops[i];
          return route(T.routeBetween(a.x, a.z, s.x, s.z));
        }),
        totalLen: q(j.len), reward: j.reward, limit: j.limit ?? null,
      })),
    };
  });

  expect(actual.events.length, "race/time-trial route coverage").toBe(6);
  expect(actual.landmarks.length, "landmark coverage").toBe(18);
  expect(actual.jobs.length, "all contract routes must exist").toBe(9);
  expect(actual.jobs.every((j) => j.legs.every(Boolean)), "all contract legs must route").toBe(true);

  if (UPDATE) {
    fs.writeFileSync(BASELINE, JSON.stringify(actual, null, 2) + "\n");
    console.log("Recorded existing world baseline at " + BASELINE);
  } else {
    expect(fs.existsSync(BASELINE),
      "Missing committed world baseline. Run UPDATE_WORLD_BASELINE=1 npx playwright test tests/world-baseline.spec.js, review and commit tests/fixtures/world-baseline.json before merging."
    ).toBe(true);
    const expected = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    expect(actual).toEqual(expected);
  }
});
