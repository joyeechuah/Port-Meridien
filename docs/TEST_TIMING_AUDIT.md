# Test timing audit

Reviewed main `20fde21` and #4 `6b403ea`, 13 November 2026. Static audit; no measured flake rate is claimed. Browser launch is blocked in this environment.

| Location | Observation | Recommended change |
| --- | --- | --- |
| `tests/cars.spec.js`, graphics rebuild test | `park()` changes physics position; mesh placement comes on a later frame. #4 adds three frames before its first snapshot, addressing the reported stale position. There is still a separate evaluate between baseline capture and pausing. | After waiting for placement, pause and capture baseline in the same evaluate. Compare rebuild against a frozen snapshot. |
| `tests/on-foot.spec.js`, walking/running test | `steps()` releases keys then returns; `foot()` reads in a later evaluate. Real frames can run in between, so walk distance includes an uncontrolled deceleration interval. | Capture FOOT position and state in the same evaluate as the last simulated step; compare snapshots from those deterministic boundaries. Candidate timing sensitivity, not a reproduced failure. |
| `tests/take-cars.spec.js`, first takeover test | After `game.key('e')`, `now()` expects the traffic slot still to have no edge. Live updates can respawn that slot before the snapshot. | Invoke takeover and capture its synchronous result in one evaluate for lifecycle assertions; separately test input via a retrying selected-car assertion. Assert replacement traffic is elsewhere rather than requiring its slot to remain empty. |
| `tests/take-cars.spec.js`, STAGE / prompt checks | STAGE calls `driveUpdate` before returning. That synchronously updates the foot prompt, so it already crosses the needed update boundary. | Do not add arbitrary delays here. Freeze the staged simulation if later snapshots depend on unchanged traffic state. |
| `tests/on-foot.spec.js`, immediate exit prompt | #6 deliberately fixes immediate input availability. | Keep a same-task assertion of prompt availability and re-entry. Waiting a frame would mask a product defect. |
| `tests/input-handoffs.spec.js`, controller transition | Setup, `pollPad`, and snapshots occur in one evaluate. | Keep this deterministic pattern. |
| `tests/graphics.spec.js`, paused model rebuild | Setup, pause, mutation and rebuild snapshot occur together. | Keep; immediate read is valid because rebuild is synchronous. |
| `tests/support/game.js`, `key`, `steps`, `park` | A keyboard press does not promise an animation frame; steps are deterministic only within their single evaluation; park does not promise mesh placement. | Document these contracts. Add purpose-specific snapshot helpers instead of unconditional sleeps in every helper. |

Use `await expect(locator).toHaveText(...)` or `expect.poll` for eventual UI changes. Use one evaluate for exact simulation boundaries. Use real frames only for code whose contract is frame-driven. Do not blanket-replace immediate assertions: that can conceal actual bugs like #6.

Suggested verification in an environment that supports Chromium: repeat on-foot, cars and take-cars suites 10 times with one worker; repeat under CPU throttling; then run the full suite. Report first-attempt failures separately from retry successes. No test code or reserved gameplay code was changed by this audit.
