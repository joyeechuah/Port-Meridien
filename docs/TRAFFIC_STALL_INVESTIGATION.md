# Traffic stall investigation — evidence and hypotheses
Date: 15 November 2026. Static source audit of merged island; **not a confirmed root-cause fix**.

## Observed evidence
The first `tests/traffic.spec.js` test simulates six minutes and fails if an ambient car remains stopped for 60 seconds. A rare long stop was reported once in 78 runs. The test was amended to print the index, car and junction coordinates, road type, distance from node, adjacent road types, junction reservation holder (`jn.res`), stop and passing timers and player position. **No failure log with those coordinates was available during this audit.** Do not claim any particular junction or car was found without that artifact.

## High-priority code paths to inspect when a failing trace is available
1. **Reservation remains held by another car.** `updateTraffic()` (index.html, `jn.res` section) releases a reservation only if the holder is absent from its road or more than 14 m from the junction; if the holder is stopped on that road close to the node, it may retain the reservation indefinitely. Compare the printed holder speed, `stopT`, distance and its own target node.
2. **Exit deadlock.** `exitsAt(t,jn)` reports no free outgoing lanes (`ex.opts.length && !ex.free.length`), causing traffic to stop 7.5 m short. Two cars with mutually blocked exits may never advance. Inspect the printed neighboring node arms and adjacent-car trajectories.
3. **Following a stationary car.** The following loop caps speed based on a lead vehicle's position and alignment, including a car stopped near the following car's junction; a stopped leader can propagate a queue indefinitely if no recovery path is available.
4. **Player/parked-car yield.** Traffic queues behind the player and `LEFT` cars; `waitT` triggers a temporary pass after two seconds, but a vehicle may oscillate between passing and yielding. Reproduce with the `passT` and `waitT` values in the failure.
5. **NPC crossing wait.** An Old Quay crossing pedestrian in `down` or `cross` state stops traffic. In this six-minute test, unarmed police are disabled from detecting crimes but normal pedestrians still move. Verify whether a continually occupied crossing is blocking a junction.

## Reliable next investigation
- Capture the full failing assertion text from the GitHub job's Playwright report / test-results JSON, especially `stuck`. It is not recoverable by guessing from the 1-in-78 statistic.
- For the failure node, add a **seeded deterministic test** that constructs the same reservation holder, node, lane occupancy and player position. Step `updateTraffic(1/60)` and assert the queue clears within the approved recovery time. First reproduce failure on old source before changing traffic code.
- Log `jn.res` index, holder `e/s/dir/v/stopT`, `exitsAt` opt/free counts and near-vehicle IDs if the existing failure text is insufficient. Avoid broad random fixes to traffic behavior without a reproducer.

**No traffic physics code changed in this investigation.** `tests/racing.spec.js` stabilization in a separate test-only PR isolates ambient traffic so a race test can fail only on its four intended blockers; it does not cure any genuine six-minute traffic deadlock.
