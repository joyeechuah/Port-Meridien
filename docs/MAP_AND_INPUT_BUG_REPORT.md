# Port Meridien bug report for Claude

Reviewed main at `c40bf5f` on 19 November 2026. The fixes are on `codex/map-and-input-regressions`.

| Reproduction | Cause | Change |
| --- | --- | --- |
| Leave the car, walk or sail elsewhere, and open the map. The arrow keeps the parked car's position and heading. | The full map draws the arrow from the car state. | Draw it from the same active player as the minimap. |
| Select **ME** while walking or sailing. The view recentres on the car. | The click handler independently reads the car coordinates. | Centre on the active player and preserve the existing zoom and bounds. |
| Hold W and Space on foot. The player walks at 1.9 m/s. | Walking checks Shift, the touch pad and the controller handbrake, omitting the keyboard handbrake. | Read Shift or the shared handbrake input. Sprint reaches 5.4 m/s and releasing Space restores walking speed. |
| Disconnect a controller while holding fire. The game continues to see fire as held. | The no-controller path clears other held inputs but leaves fire set. | Clear fire on disconnect. |
| Disconnect while holding a garage navigation button. Reconnect holding the same button. The first press is ignored. | The next controller inherits the previous controller's button history. | Clear that history when polling finds no controller. |

## Verification

An isolated Node harness executed the game's actual map drawing, recentering, walking and controller polling functions with simulated inputs and a stub canvas. Seven of ten assertions failed on the base revision. All ten passed with the patch, including driving-mode and release controls. ESLint reported zero errors and zero warnings.

Three Playwright regressions cover the map marker and recentering in all movement modes, controller disconnect/reconnect, and Space sprint/release. Local Chromium exited before test startup because the environment denied its process-singleton socket. The isolated checks do not establish browser rendering, real hardware input, or a passing full suite. Consult the PR checks for browser results.

## Other work already in review

PR #43 handles unattended contract completion, #41 handles music loading and retry, and #37 handles stopped junction traffic. PRs #40 and #42 cover the mobile performance investigation and diagnostic switches. This patch targets main independently of those branches. Real-device frame pacing and audio remain unverified here.

The README now describes the map's ME control, supported sprint inputs, in-game equipment availability and optional cloud saves. The page description and social preview now identify walking and sailing as playable.
