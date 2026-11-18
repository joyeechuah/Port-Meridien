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

## Follow-up review

Four more scenarios failed on the previous PR head, `9065aa9`, and passed after the follow-up fixes.

| Scenario | Previous behavior | Corrected behavior |
| --- | --- | --- |
| Disconnect the active controller while another is already connected | The replacement inherited held-button history and could lose its first menu input. | The selected controller slot owns its button history. Holding the button across subsequent polls still produces one press. |
| Hold the touch handbrake or RUN pad and tap FIRE with another finger | The second finger cancelled the first action. | Each button tracks its own pointers. The gas/brake and steering strips retain their sliding controls. |
| Trigger zoom recovery twice before the 300 ms restore | The second timer could leave the temporary viewport in place. | Concurrent requests share the original restore. |
| Choose DECIDE LATER during a cloud-save conflict | The 15-second refresh reopened the dialog. | This conflict stays deferred for the session. Reopening Cloud Save still presents both choices. |

The four before/after checks executed the production handlers with simulated controller, touch, timer and dialog state. All ten earlier assertions still passed. Local lint reported zero errors and zero warnings. Three additional Playwright cases cover the controller, touch and viewport scenarios. The existing cloud conflict test now advances the refresh clock and reopens the chooser. See the PR's current Actions run for full browser results.

## Interface review

The deployed game reached its WebGL fallback in the review browser. The loading bar still looked active and the screen offered no retry button. The revised entry screen makes the game name the heading, announces loading status, and offers Try Again after startup fails.

The garage gives Drive the amber primary treatment. On portrait phones, vehicle stats sit in three columns above equally sized action buttons. Desktop car selectors have larger hit areas and expose which car is selected.

At widths of 700 px or less, the previous stylesheet hid the legend and its Explorer Passport button. Map Key now reveals both. Escape collapses the key and restores keyboard focus. The desktop legend stays visible.

Verification included execution of the real startup failure paths and map disclosure handlers, all fourteen existing isolated checks, and lint. Four Playwright tests cover retry plus garage and map flows at 390×844, 667×375 and 1280×800. Successful viewport cases attach garage and map screenshots to the Playwright report. Local Chromium could not start; inspect CI for rendered results.

## Old Quay opening scene

Play now opens over the harbour, cuts to an elevated view along the avenue, and descends to the saved car. The player takes control in free roam. The intro uses the existing game world, camera and soundtrack. Touch, keyboard and controller skip are supported. Reduced motion bypasses the camera sequence. Cloud-save choices suspend it. Going home still opens the garage.

Local checks sampled the production camera with three.js at 231 points across portrait, landscape and desktop aspect ratios. The harbour and car targets stayed inside the camera frame. The handoff check verified that a cloud dialog blocks skipping and that repeated skip attempts enter driving only once. ESLint passed. Browser tests now cover automatic completion, skipping, reduced motion, cloud sign-in and returning home. The auto-start fixture still enters the garage for existing gameplay tests. Rendered playback has not been verified locally.
