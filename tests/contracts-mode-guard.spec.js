// Contracts are driven by the player's vehicle. Timed deliveries still count down
// while walking/sailing, but a parked car must not pick up or deliver by itself.
const { test, expect } = require("./support/game");

test("parked car cannot pick up or deliver a parcel while the player is on foot or on the boat", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const T = __T, J = T.JOBS.find(j => j.type === "parcel");
    if (!J || !T.jobStart(J)) throw new Error("Could not start parcel contract");
    const credits0 = T.save.cr, runs0 = T.save.jobs.runs[J.id] || 0;
    const parkAt = stop => {
      T.P.x = stop.x; T.P.z = stop.z; T.P.vx = T.P.vz = 0;
    };
    parkAt(J.stops[0]);
    T.FOOT.on = true;
    T.FOOT.x = J.stops[0].x + 90; T.FOOT.z = J.stops[0].z + 90;
    T.jobTick(1 / 60);
    const onFoot = { stop: T.job?.stop, completed: !T.job, credits: T.save.cr };
    T.FOOT.on = false;
    T.jobTick(1 / 60);
    const collected = { stop: T.job?.stop, completed: !T.job };
    parkAt(J.stops[1]);
    T.BOAT.on = true;
    T.BOAT.x = J.stops[1].x + 100; T.BOAT.z = J.stops[1].z + 100;
    T.jobTick(1 / 60);
    const onBoat = { stop: T.job?.stop, completed: !T.job, credits: T.save.cr };
    T.BOAT.on = false;
    T.jobTick(1 / 60);
    return {
      onFoot, collected, onBoat, done: !T.job,
      creditsBefore: credits0, creditsAfter: T.save.cr,
      expectedReward: J.reward,
      runsBefore: runs0, runsAfter: T.save.jobs.runs[J.id] || 0
    };
  });
  expect(result.onFoot).toEqual({ stop: 0, completed: false, credits: result.creditsBefore });
  expect(result.collected).toEqual({ stop: 1, completed: false });
  expect(result.onBoat).toEqual({ stop: 1, completed: false, credits: result.creditsBefore });
  expect(result.done).toBe(true);
  expect(result.creditsAfter - result.creditsBefore).toBe(result.expectedReward);
  expect(result.runsAfter - result.runsBefore).toBe(1);
});

test("courier deadline continues and can expire on foot or on the boat without a false delivery", async ({ game }) => {
  await game.open();
  await game.driveOut();
  const result = await game.eval(() => {
    const T = __T, J = T.JOBS.find(j => j.type === "courier");
    if (!J || !T.jobStart(J)) throw new Error("Could not start courier contract");
    const credits0 = T.save.cr, failed0 = T.save.jobs.failed, runs0 = T.save.jobs.runs[J.id] || 0;
    T.P.x = J.stops[0].x; T.P.z = J.stops[0].z; T.P.vx = T.P.vz = 0;
    T.jobTick(.1); // collect the parcel in the vehicle: starts the courier deadline
    if (!T.job?.timing || T.job.stop !== 1) throw new Error("Courier did not start timing");
    T.P.x = J.stops[1].x; T.P.z = J.stops[1].z; T.P.vx = T.P.vz = 0;
    T.job.left = 1.5;
    T.FOOT.on = true; T.FOOT.x = T.P.x + 80; T.FOOT.z = T.P.z + 80;
    T.jobTick(.5);
    const foot = { stop: T.job?.stop, left: T.job?.left, completed: !T.job };
    T.FOOT.on = false; T.BOAT.on = true;
    T.BOAT.x = T.P.x + 90; T.BOAT.z = T.P.z + 90;
    T.jobTick(.4);
    const boat = { stop: T.job?.stop, left: T.job?.left, completed: !T.job };
    T.jobTick(1);
    T.BOAT.on = false;
    return { foot, boat, failed: T.save.jobs.failed - failed0,
      done: !T.job, creditsDelta: T.save.cr - credits0,
      completedRunsDelta: (T.save.jobs.runs[J.id] || 0) - runs0 };
  });
  expect(result.foot.stop).toBe(1);
  expect(result.foot.completed).toBe(false);
  expect(result.foot.left).toBeCloseTo(1, 6);
  expect(result.boat.stop).toBe(1);
  expect(result.boat.completed).toBe(false);
  expect(result.boat.left).toBeCloseTo(.6, 6);
  expect(result.failed).toBe(1);
  expect(result.done).toBe(true);
  expect(result.creditsDelta).toBe(0);
  expect(result.completedRunsDelta).toBe(0);
});
