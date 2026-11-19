# Bug hunt report, 17 to 19 November 2026

Jo Yee asked for a deep search for remaining bugs, with fixes and a report. This covers main at `0b78872` (with #40, #42, #43 and #45 merged) and the open #37 and #41.

## Found and fixed

| # | Bug | How it was found | Fix | Test |
| --- | --- | --- | --- | --- |
| 1 | **FLASHES OFF still flashed the screen red on a crash.** The setting promises no red flash when you're hit; it covered gunshots and police fire but not the crash edge | Reading every writer of the red screen edge | The crash edge is drawn only with FLASHES on (#46) | Fails on main (edge `rgba(226, 72, 61, 0.275)`), passes with the fix |
| 2 | **A fixed 12 s download limit would leave slow phones without music** (Codex's #44). A 2 MB song takes about 20 s at 100 KB/s | Throttling the connection to 100 KB/s: every attempt was cut off, 3 retries, never played | The limit now counts 12 s *without new data*, so stalls are caught and slow downloads finish. Codex's commits kept, in #41 | A 100 KB/s connection loads with no failed attempt; a download that stops halfway times out and recovers |
| 3 | **A parked car could complete a contract while you walked or sailed** (Codex's #43, merged) | Codex; verified here, since Codex couldn't run browsers | Codex's guard | Both of Codex's tests fail on main and pass with the fix |

## Checked and found sound

| Area | What was checked |
| --- | --- |
| Saved settings | Every field is type-checked and clamped on load, including the pistol, VIOLENCE and FLASHES |
| Mode changes | The garage, dealer, exit and loading screens end on-foot and boat mode (`setState`); being knocked out clears the wanted level before going home, which is otherwise blocked |
| Event listeners | All are added once at load; none are added again each time a screen opens |
| Police light bars | Each colour flashes twice a second, below the three-a-second seizure threshold |
| The red screen edge after a knock-out | Not a bug: it sits in the HUD, which the garage hides, and driving redraws it |
| Codex's #45 opening scene | Reads the same set-up as leaving the garage: the car, 48 rounds if armed, full health, then free ride with traffic |

## Randomized play

A wider version of `tests/soak.spec.js`, run on main with #46 (three seeds, 200 s each). The random actions:
- driving, getting out and in, taking traffic cars;
- the boat, boarding and stepping off;
- crimes, being caught, being hurt and knocked out;
- pausing, the map and Photo Mode;
- going home, contracts, races and ending them, and reset to the road.

Every second it checked:

- never on foot and on the boat at once; never home while wanted; never a race and a contract at once;
- every position, speed and the camera finite; no car over about 400 km/h (110 m/s);
- the wanted level, health, rounds and credits in range;
- the FIRE pad shown exactly when the pistol can be fired;
- no more than 10 people, 4 cars left standing or 8 messages on screen;
- the scene's object count not growing.

**Result: no failures in any seed, and no page errors.** The scene grew by at most 4 objects over 200 s, traffic stayed at 39 cars, people at 10 or fewer, and cars left standing at 2 or fewer. Every action ran 1 to 9 times in each seed.

## The open pull requests against the current main

#37 and #41 were written before #42, #43 and #45 merged. Main was merged into both on 19 Nov, and they were tested again:

| PR | Local tests on the merged code | CI |
| --- | --- | --- |
| #41 (music) | Music, panel and smoke tests: 16 of 16 | Running |
| #37 (traffic) | Traffic and smoke tests: 8 of 8; the six-minute overlap test 10 times in a row | Running |
| #46 (FLASHES) | Both FLASHES tests | Running |

## Still needs a phone

- **#41:** one minute on raw.githack.com with music on and `?perf`. Expect no breaks, and the panel's music line saying why the songs fail there.
- **#37:** a few minutes watching the junction at the highway's west end (560, 40).
- **The graphics runs G1 to G4** from #42 (MUSIC OFF, same route), before AUTO is changed.
- **Codex's #45 opening scene and restyled screens:** CI rendered them, but they haven't been seen on a phone.

## Not done

- The full logic suite on everything combined was started on 17 Nov, but the environment shut down at test 63 of 320. CI runs the full suite on each pull request instead.
