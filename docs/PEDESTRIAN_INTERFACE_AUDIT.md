# Step 2 API audit against merged player walking, taking-cars and boat PR #12
13 November 2026. Review of `docs/PEDESTRIAN_DESIGN.md` against current `main` (walking + car-taking), plus boat code in PR #12. Interface design only: do not change player/boat implementations.

## Grounded source observations
- `state === "DRIVE"` is shared by player car, `FOOT.on` and `BOAT.on`. `driveUpdate(dt)` early-returns from one mode handler. Do not assume `state` identifies the occupant.
- `FOOT` is one singleton with player input, camera, and mesh. `footClear(x,z)` is collision/push-out against nearby geometry and active traffic; `footGround(x,z)` is an elevation query and, after #12, uses `onPier(x,z) ? PIER.y : ...`. Neither function is a navigable pavement graph or a safe NPC destination oracle.
- Vehicle classes: `TRAFFIC` AI cars with transient positions; `LEFT` includes player-owned and borrowed parked cars; `STREET` stores temporary IDs `st*`, not persistent saved cars; `P/pc` is the driven car even while the player walks or sails. Avoid double counting an AI traffic slot after it converts into `STREET`.
- `BOAT` has world position/orientation and speed only while #12 is active; the boarding point and pier are water-adjacent. Do not put NPCs on the boat collision path or in dock exit space.
- `setState()`, `tabIdle`, and `frame(ts)` control suspension. In Photo Mode the scenery clock freezes; MAP/PAUSE have no gameplay `driveUpdate`. NPCs need one central tick, not one tick in each of car/foot/boat loops.
- A new road can change `NODES` / `EDGES`, generated job points and routing. Pedestrian graph node IDs must be world-owned and independent from volatile road/mesh indices.

## Minimal interface contracts to agree with Claude before Step 2
1. `activeActor()` (name illustrative): `{mode:"car"|"foot"|"boat", x,z,y,heading,velocity}`; resolve `BOAT.on` first, then `FOOT.on`, else `P`. Do not assume camera follows the car when sailing.
2. `walkableAt(x,z)`: tagged surface/height, clearance radius, accessibility and **connected surface id** (pavement, crossing, dock), with correct pier geometry and terrain/water rejection. Not a wrapper of only `footGround`.
3. `nearVehicles(region)`: one stable runtime ID and previous/current transforms for driven `P`, AI `TRAFFIC`, parked `LEFT`, and temporary `STREET`, with ownership handoff when a car is taken. Boat can be a separate actor hazard near docks. Use spatial indexing, not all-pairs every frame.
4. `worldTick(dt)`: called exactly once per unpaused DRIVE simulation tick irrespective of car/foot/boat mode; freeze in MAP/PAUSE/PHOTO, inactive tab and loading transitions. Use simulation time for crossing reservations.
5. `worldGeneration` / `resetPedestrians(reason)`: invalidate graph caches and crossing reservations on fast travel, garage/dealer, active tab loss and eventual separate-city load.
6. `crossingRequest(crossingId, group, expectedClearTime)`: traffic yields within physical stopping capability, admission only after observed safe gap. If a borrowed car stops over a crossing, reject entry rather than trying to path through it.
7. `poseAt(entityId)` plus previous transform: swept collision handling of fast/reversing player car, taken cars, AI. Event IDs deduplicate reactions, not money or damage rewards.

## Current gaps / tests to demand
- `footClear` returns corrected points but is tied to the player's radius and current car; extracting reusable collision helpers must not modify reserved player behavior without Claude review.
- Pier geometry in PR #12 has deck but no sidewalk graph and no ramp connection from existing town. The draft pavement map #11 has candidate corners/crossings only; **not** a validated connected navigation graph. Do not populate the harbour until road/walkway is surveyed.
- PR #12 now calls `jobTick(dt)` from the car, walking and boat paths, with a regression for timed deliveries during mode changes. Preserve that fix during Step 2 extraction: an NPC world tick must not double-count contract time.
- The boat exit and foot prompts share proximity selection, so pedestrians must never prevent the player from disembarking; reserve a bounded dock exclusion polygon.
- Controller and touch transitions must not consume a single prompt twice.
- Run lifecycle test over repeated take-car → leave → board boat → land → return car → garage → fast travel, plus population plateau and no lingering collider/reservation.
- Perform a realistic walk onto/off the pier from shore; PR #12 boat tests stage FOOT directly on the deck and do not cover landfall approach.
- Profile weak mobile landscape; proposed 12/24 NPC caps in the previous design are experiments, not performance commitments.

**No pedestrian implementation authorized here.** First prerequisite: merged baseline #10 before road changes, then validated road/path graph and pedestrian interface review.
