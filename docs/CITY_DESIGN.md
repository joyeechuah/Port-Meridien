# Port Meridien city design

**Status: proposal awaiting Jo Yee's approval. No map implementation is authorised by this document.**

## Player experience and scope

The first city release is a compact waterfront district: leave a safehouse, walk to a parked car, drive a connected street loop, park by the harbour, board a boat, sail a short coastal circuit, dock and return on foot. All three movement modes must connect without reloading or losing the vehicle left behind. Original geography and landmarks define the city; no existing game's map is a template.

Step 1 includes streets, pavements, exterior buildings, a safehouse/garage, dealership, harbour, navigable water, parking and readable landmarks. Reserve a police-station site but ship only its exterior: no police AI, wanted levels, weapons, pedestrians or building interiors in this step. Keep racing, deliveries, repairs, Photo Mode and exploration progress functional.

## Scale and coordinates

Proposed units are metres, using the existing x/z plane: +x east, -z north. Confirm the inherited scene's effective scale with a timed walk and a vehicle turning test before building detailed geometry. These are design targets, not measured performance claims.

| Area | Proposed bounds | Purpose |
| --- | --- | --- |
| Old Quay land district | x -400 to 400; z -300 to 300 | 800 × 600 m of playable land |
| Harbour basin | x -160 to 160; z 300 to 500 | Sheltered first boat route |
| Coastal water | x -550 to 550; z 300 to 850, excluding piers | Room to turn and sail beyond the basin |
| Quay edge | z 300, broken only by marked dock access | Clear land/water boundary |

The initial footprint is about 0.48 km² of land. At an assumed 1.5 m/s walk speed, 200 m takes about 133 seconds; at an assumed 4 m/s run, 50 seconds. Tune block spacing after measuring the merged walker, not by changing vehicle physics to fit the map. Keep essential activities within roughly 100–250 m of one another by actual walkable routes.

## Street layout

Use a connected grid with one irregular market block and a waterfront boulevard. Terrain is nearly level around the quay, gently rising inland; no steep intersections in the first district.

| Street | Centreline | Connections |
| --- | --- | --- |
| North Street | z -220, x -320 to 320 | Northern cross-town route and future expansion |
| Market Street | z -60, x -320 to 320 | Safehouse, dealership and market frontage |
| Dock Street | z 100, x -320 to 320 | Harbour access and delivery bays |
| Quay Boulevard | z 240, x -320 to 320 | Waterfront drive and parking |
| West Avenue | x -320, z -220 to 240 | Western return route |
| Foundry Avenue | x -120, z -220 to 240 | Safehouse-to-harbour route |
| Civic Avenue | x 120, z -220 to 240 | Police reserve and market access |
| East Avenue | x 320, z -220 to 240 | Eastern return route |

All listed crossings join the road graph. Keep the perimeter loop continuous; no decorative road may appear drivable while missing from navigation. The 200–240 m-wide blocks receive pedestrian passages and service lanes where needed, targeting an uninterrupted walking segment below 100 m in the activity core.

Local roads: proposed 7 m carriageway and at least 2.5 m pavement each side. Quay Boulevard: 10 m carriageway and 4 m promenade on the water side. Start with 12 m corner radii, then test the longest existing vehicles and adjust road geometry. Parking bays sit outside travel lanes. Keep kerbs, collision surfaces and visual pavement edges aligned.

## Destinations

Coordinates below are proposed site centres, not automatic road nodes or final door positions. Entrances must be positioned on the nearest pavement and tested with the merged walker.

| Place | Centre (x, z) | Access and role |
| --- | --- | --- |
| Safehouse and garage | (-200, -100) | Door faces Market Street; driveway joins Foundry Avenue; protected spawn away from traffic |
| Auto Gallery | (220, -100) | Forecourt faces Market Street; separate test-drive departure bay |
| Market courtyard | (0, 10) | Pedestrian passages to Market and Dock Streets; recognisable clock tower |
| Police station reserve | (220, -180) | Civic Avenue access; exterior only until Step 3 |
| Harbour office and parking | (-40, 190) | Dock Street entrance; short marked path to boarding |
| Boat boarding point | (-80, 320) | Dock extending from the quay; level, unobstructed land spawn |
| Repair lay-by | (-260, 150) | Off West Avenue, clear of junctions; existing repair rules remain |
| Harbour beacon | (150, 470) | Visible navigation landmark; its breakwater leaves a wide channel |

Harbour breakwaters must leave an opening at least 40 m wide. Keep a minimum 20 m unobstructed turning area around the starter boat berth. Boat hull clearance, not just its centre, determines collision and boundary checks. Final berth and channel dimensions follow the implemented boat's measured turning circle.

## Mode transitions and boundaries

- Walking → car: use the merged on-foot interaction rules; require a clear entry point and explicit action. A moving vehicle cannot become a safe boarding target simply because its centre is nearby.
- Car → walking: find a pavement or clear roadside exit; refuse with readable feedback if all candidates intersect traffic, walls or water. Never move the car to conceal an invalid exit.
- Walking → boat: explicit boarding at the dock. Driving a car into the boarding trigger must not board it.
- Boat → walking: explicit disembark at a valid dock point, with a clear standing area. No placing the player over open water or inside a pier.
- Without swimming in Step 1, use visible quay barriers except at controlled boarding points. Test diagonal movement and running against corners.
- Land expansion ends use visible construction gates beyond turning space. Water boundaries use buoys, early feedback and a reversible turn-back region, not an abrupt teleport.
- Recovery returns to a verified safe point for the active mode. Existing garage/map recovery must be reconciled with the merged on-foot and boat implementations before the city change.

## Navigation, events and compatibility

Build roads, collision boundaries, pavement access and map imagery from the same approved layout data. Vehicle GPS uses road edges; a walking destination must not direct a player across water or an inaccessible building. If pedestrian routing is not implemented, use a clearly labelled destination marker rather than pretending the car route is a walking route.

The interim branding cleanup renames current zones but does not move them. It does not establish the final city geography. Old Quay is the proposed first district; Eastbank, Westhaven and the other interim labels are reserved names, not a requirement to cram ten districts into this footprint.

The replacement must retain all six race/time-trial events and existing championship dependencies, all nine contracts, all 18 exploration landmarks and speed-radar functionality. Current generation relies on spacing and road length; a smaller city may fail those constraints. Before approval to implement, produce a placement check for every event start, contract stop and landmark. Keep stable IDs. Do not silently drop an event or relax spacing/reward rules just to make generation succeed. If the layout cannot accommodate them, expand its drivable footprint or submit an explicit activity redesign for approval.

Save migration requires a separate implementation decision: preserve money, ownership, paint, upgrades and discovered IDs. Reposition world-dependent spawn/vehicle locations safely. Old race times and radar records cannot fairly compete against new geometry: propose a world-version field and archived legacy records before resetting anything. Do not reuse a record ID for a different route without versioning its records and ghosts. Cloud saving stays disabled until a separate Port Meridien Firebase project is configured.

## Expansion after Step 1

| District | Connection | Distinct purpose |
| --- | --- | --- |
| Eastbank | Extend Market Street east | Residential streets and small businesses |
| Westhaven | Extend Dock Street west | Freight yards and longer commercial roads |
| Crown Ridge | Inland connection north of North Street | Elevation and scenic driving |
| North Common | Later northern connector | Parkland and civic spaces |

Add one connected district at a time. Use landmark silhouettes and street signs rather than density alone to distinguish areas. Pedestrian design follows the merged walker and must define pavement routes, crossings, collision and traffic interactions before code begins.

## Performance and implementation sequence

Use repeated building modules with shared geometry/materials, instancing where suitable, limited shadow-casting lights and distance-based visibility. Keep physics and navigation active where required even when decorative meshes are hidden. Avoid generating a large city and then hiding most of it as the default strategy.

Proposed acceptance targets: at least 30 fps during the central route on a named representative Android device at SMOOTH settings, and no sustained growth in geometry, textures or entity counts after repeated district circuits and mode switches. These are targets, not a claim that the current game meets them. Record device, resolution, graphics setting, browser and baseline before setting numeric budgets.

1. Merge and verify on-foot, taking vehicles and boat support in Claude's planned order.
2. Approve this design and resolve the activity-placement/record-migration constraints.
3. Build a greybox layout on a dedicated branch: road graph, simple blocks, dock and water boundaries first.
4. Validate the complete walk–drive–sail–return loop and all retained activities before detailed scenery.
5. Add architecture, signage, lighting and sound; repeat performance and visual checks.

## Acceptance checks before the city PR can merge

- Keyboard, touch and controller complete the safehouse → car → harbour → boat → dock → safehouse loop without a stuck mode or duplicate player vehicle.
- Every street crossing is routable in both intended directions; every destination has a reachable entrance and safe exit.
- Long vehicles complete corners and the harbour loop without pavement traps. Traffic does not spawn inside the player or park across boarding access.
- Walk/run boundary tests cover walls, quay corners, steps and moving traffic; boat tests cover pier corners, channel clearance and failed disembarkation.
- All retained events, contracts, landmarks and championship references resolve; rewards cannot be duplicated by mode changes.
- Loading a pre-city save preserves progress and recovers invalid positions; record/ghost versioning follows the approved migration.
- Photo Mode, map travel, repairs, garage transitions and inactive-tab handling work in each supported mode.
- Day/night and short phone landscape views keep signage, prompts and dock access readable.
- Lint, full Chromium suite, relevant WebGL checks and GitHub CI pass; manual playtesting includes the target mobile device.

Approval covers the footprint, street grid, destination placement and three-mode loop. Event placement and save/record migration remain explicit implementation gates. No city, police, weapon or pedestrian code is included in this proposal.
