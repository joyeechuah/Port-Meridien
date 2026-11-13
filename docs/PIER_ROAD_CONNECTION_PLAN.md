# Road connection from Old Quay to the pier — exact proposal, no code
13 November 2026. Based on the checked `feat/boat` PR #12 geometry and the recorded, **unchanged** world in `tests/fixtures/world-baseline.json` (PR #10). Coordinates are [x,z] metres. **Proposal only:** no road, height mesh, or traffic code has been modified.

## Existing geometry, join and approach
- Existing town avenue is `ROADS[2]` (town): authored control points `(560,40) → (640,38) → (720,36) → (800,32) → (880,20) → (940,5)`. The recorded rendered/procedural road endpoint after network generation is approximately **(945.904,1.596)**, not exactly the authored (940,5). Keep the curved old avenue, highway finish near (930,10), town street grid and race gates unchanged.
- Pier in PR #12: deck **x=1176..1252, z=-4..4, y=1.55**. Landward bollards are x=1177, z=-3,-1.5,0,1.5,3; cars must stop **before** them. Boat starts near (1236,-5.6). The design's earlier x=1160..1235/y=2.5 proposal is obsolete for this PR.
- Proposed *new* access-road centre-line, as a **separate authored road** with existing geometry preserved: `[[945.904,1.596],[975,2],[1020,0],[1080,0],[1135,0],[1159,0]]`. Snap the first new endpoint to an actual existing network node at/near (945.904,1.596), or split the avenue edge at an exact junction. **Do not blindly introduce a second disconnected node**. Do not extend the drivable surface over x=1176: bollards must remain effective.
- Terminal turning court: centre **(1158,0)**, approximate outer bounds x=1145..1170 and z=-13..13, pending terrain/drivable height and turning-circle verification. Stop/parking point candidate **(1155,0)**. 17 m gap to the pier's start at x=1176 leaves a pedestrian-only transition; add a verified safe walkway/ramp from the court to deck at y=1.55.
- The approach may cross the procedural coast ring near the old town avenue's eastern end. The exact crossing must be obtained from `EDGES` after rebuilding; do not hard-code x=945 as a free-standing junction if a coast edge already intersects there.
- An added town-type road inherits half-width 5.2 m and pavement width 2.8 m, subject to `RT` verification. A courtyard's extra drivable geometry must have corresponding obstacle and terrain-grid updates. Do not change `PIER` or the boat collision model as part of this road proposal.

## What the approved baseline actually shows
The pre-road baseline fixture has **14 authored roads, 35 edges, 6 events, 18 landmarks, 8 generated job stops, 9 contracts**. Any new road produces a legitimate diff in `roads` and `edges` and can renumber existing edges after network splitting. This is **expected** and must be reviewed explicitly; never wholesale-rebaseline away unexpected changes.

The new direct access corridor was defined as **x=930..1176, |z|<=40** for the recorded data scan. Existing full event/contract polylines have **zero points** inside this corridor; this is not proof that none can reroute when topology changes. Static impact expectations:

| Activity | Baseline fact | After-road policy |
| --- | --- | --- |
| `oldtown` / Old Quay Dash | Route length ~832.828 m; starts (566,-120) | No intended change; unchanged route/medals/rewards and passage |
| `highway` / Coastal Highway | Route length ~1674.680 m; authored finish (930,10), immediately west of new access | No intended change: protect finish, gates, stopping area and record/ghost path |
| Other four events | No recorded route sample in access corridor | No intended change; rerun route comparison for shortest-path side effects |
| Old Quay stop `eivissa` | (760,-18) | No intended change in generated job point |
| `parcel_eivissa_santaeularia` | 1102.933 m, reward 4400 | No intended change |
| `courier_eivissa_santantoni` | 1671.462 m, limit 96 s, reward 10700 | No intended change |
| `courier_santaeularia_eivissa` | 1102.933 m, limit 75 s, reward 7600 | No intended change |
| `tour_eastside` | 1329.189 m, reward 5200 | No intended change |
| Remaining five contracts | No route sample in access corridor | No intended change; recalculate for alternate shortest paths |
| All 18 landmarks | Baseline IDs, positions and road tags recorded | No intended change; prohibit silent relocation or disappearance |

The road **must** change road/edge network data, and junction IDs/shortest paths **might** change. Contract payouts, timers, stops, medals, and route geometry are *not* approved to change merely to accommodate the access road. If a necessary change is found, document the old and new exact values, reason and gameplay impact in the road PR and secure approval before updating the golden fixture.

## Implementation gate / tests
1. Merge PR #10 and retain its pre-road JSON in Git history. No `UPDATE_WORLD_BASELINE` in CI.
2. Survey the current `EDGES`, `NODES`, `RT`, ground `meshH`, deck and approach grade on the actual target branch. Determine the road endpoint's safe terminal radius and ramp clearances.
3. Append only the access road and court; preserve existing road control points, event waypoints, IDs and job definitions. Regenerate network/road-grid/ground and avoid colliders that block the pier entrance.
4. Run the world-baseline test; classify **every** difference into intentional structural additions, incidental reindexing, or forbidden gameplay changes. Do not silently update the fixture.
5. Test drive to the court and stop, walk the pier ramp and deck, board/unboard, return to the car; verify cars never pass the bollards.
6. Re-drive Old Quay Dash and Coastal Highway and their cup rounds. Validate all nine contract routes and their original stops, limits and rewards under both driving-side settings. Test traffic at the new junction, phone controls, and performance.
7. If the golden baseline is intentionally revised, commit a separately reviewed snapshot with a precise explanation and keep the original baseline in Git history.
