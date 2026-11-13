# Old Quay on the island — proposed implementation plan

13 November 2026. Grounded in main `20fde21`, the naming proposal in #2, and the decision recorded on `docs/world-plan`: first replace the island town; later build a separate city world and retain the island. This supersedes the earlier proposal to replace the whole island with an 800 × 600 map. Coordinates below are (x,z), with negative z north. This is a design for approval, not permission to implement boats or other reserved systems.

## Boundary and retained roads

Replace town buildings and street furniture within x=550–770, z=-130–200. Keep terrain pads, road centre lines, collision margins and race waypoints unchanged in this first pass. Existing town roads occupy x=560–760 and z=-120–190; their connecting avenue continues east to (940,5). Preserve the dealer at (722,84), its forecourt and trigger; preserve the safehouse at (430,-430). Do not relocate either for this district.

| Connection | Exact existing geometry to retain | Role |
| --- | --- | --- |
| West entrance | Highway ends at (560,40) | Island cross-highway access |
| Main avenue | (560,40), (640,38), (720,36), (800,32), (880,20), (940,5) | Curved spine; do not replace with a straight z=38 road |
| North street | (560,-120) to (760,-120) | Race loop and neighbourhood access |
| South street | (560,190) to (760,190) | Race loop and service access |
| Four cross streets | x=560,620,690,760, each z=-120 to190 | Preserve existing junctions and connectivity |
| Coast ring | Existing procedural loop and network intersections | Keep its location; join harbour access through the existing avenue |

Town roads have half-width 5.2 and pavements 2.8 beyond the kerb. Keep frontage outside those clearances and preserve visibility at crossings. Treat generated scenery obstacles and visual meshes together; removing a building mesh must remove its old collider.

## Blocks

| Block interior (before pavement setbacks) | Proposed use | Constraints |
| --- | --- | --- |
| x560–620, z-120–38 | Older terraces and small shops | Keep west entrance sightlines |
| x620–690, z-120–38 | Market courtyard with two pedestrian entrances | No stalls in roadway or crossing approaches |
| x690–760, z-120–38 | Warehouses converted to workshops | Retain north/east race-loop clearances |
| x560–620, z38–190 | Residential courtyards | No change to south race turn |
| x620–690, z38–190 | Civic square; reserve a future police frontage | Reservation only; no police logic or new trigger |
| x690–760, z38–190 | Existing Auto Gallery | Preserve its current exclusion rectangle and functioning forecourt |

## Harbour: actual coast, not the inland town

The existing east avenue endpoint (940,5) is inland. The source `coastR` places the shoreline approximately at x=1110.15 for z=-80, x=1181.23 for z=0, and x=1230.42 for z=80. These are mathematical coastline samples, not a rendered terrain survey; the ground/water crossing must be checked against the final meshes.

Propose a narrow harbour annex east of the town, without changing the rest of the island:

- Access centre line: existing (940,5) → (1020,0) → (1100,0) → (1160,0). Retain the highway event finish near (930,10), with clear run-out and no new prompt competing at that finish.
- Arrival court: centre (1150,0), nominal 24 × 30 metres; road termination and vehicle turning area before the quay.
- Raised pier: x=1160–1235, z=-6–6. Deck proposal y=2.5, subject to maximum water animation height and approach-grade checks. Do not classify the water beneath as ordinary drivable terrain.
- Boarding point: (1222,-6) on the north edge of the pier. Reserve boat centre near (1222,-16), heading east/west alongside the pier, and an unobstructed outward route toward x≥1280.
- Berth reserve: x=1208–1245, z=-30 to-8; no static scenery, decorative boat route or collision blocker in this rectangle. Final size depends on Claude's boat dimensions and turn radius.
- Use a straight quay wall and simple pier initially; no excavated basin, coastline rewrite or large reclaimed landmass.

This explicitly extends beyond the old town only along the harbour access and pier corridor. The pier requires a walkable support surface; existing foot-ground sampling alone may reject it over water. Claude must integrate that with the boat work. This document does not implement it.

## Activities that must survive

| Activity | Relationship to district | Required check |
| --- | --- | --- |
| `oldtown` / Dalt Vila Dash → Old Quay Dash | Entire loop: (566,-118), (757,-118), (757,186), (566,186), (566,60) | Keep full drivable envelope, gates, start and run-out. Preserve geometry so existing records/ghosts remain meaningful. |
| `highway` | Ends via (560,40) at (930,10), along main avenue | Keep finish and stopping area clear; harbour access must not alter the existing event route. |
| A1 championship | Includes `oldtown` | Complete the round and advance normally. |
| A2, A3, A6 and A7 championships | Include `highway` | Verify event transition and finish access. |
| A4 championship | Includes both `oldtown` and `highway` | Verify both rounds. |
| `parcel_eivissa_santaeularia` | Old Quay pickup | Preserve generated pickup access and route to Eastbank. |
| `courier_eivissa_santantoni` | Old Quay pickup | Preserve route west through highway entrance. |
| `courier_santaeularia_eivissa` | Old Quay delivery | Preserve arrival and stop clearance. |
| `tour_eastside` | Old Quay first stop | Preserve stop and onward GPS route. |
| `eivissa_town` landmark | Town discovery landmark | Preserve stable ID, marker and discovery approach. |

Other events (`cubells`, `talaia`, `south`, `antoni`) have no authored waypoints in the replacement town. Other contracts have no explicit Old Quay stop; their computed routes still need a before/after comparison. Do not claim an exact generated pickup coordinate from the zone centre: `buildJobs` samples roads every 6 metres and excludes event starts, dealer/home, landmarks and other job points. Adding roads can change those selections even when old roads remain.

## Implementation acceptance gate

Before changing roads, export EDGES, event routes/checkpoints, LANDMARKS, JOB_PTS and all nine contract leg polylines from a running build. Compare the same data after changes; flag any route intersecting the town/harbour rectangles, including contracts with no named local stop. Check all nine jobs still exist; all 18 landmarks remain reachable; contract timers/rewards do not silently change. Static review identifies the four explicit local contracts above; a complete computed pass-through list is still pending that runtime export.

Drive both local events and their championship rounds; run each affected contract in both driving-side settings. Walk all pavements, court and proposed pier; check sea rejection still works away from supported surfaces. Validate traffic lanes, parked-car clearance, mobile performance and harbour camera views. No boat, pedestrian, police or weapon implementation is included here. For the later second world, introduce world-scoped records/routes before loading a separate city.
