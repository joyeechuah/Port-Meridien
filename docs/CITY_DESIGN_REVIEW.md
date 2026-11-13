# City transition decision brief

13 November 2026 · Proposal only · Companion to the earlier CITY_DESIGN.md

This document adds evidence and implementation gates to the first waterfront proposal. It does not replace Claude's files or approve city code. The earlier 800 × 600 m plan is a greybox candidate, not a verified replacement for the entire inherited world.

## The conflict is structural

Baseline examined: main commit 406bc76. The earlier cleanup changes names only. The EVENTS array still contains these coordinates:

| Existing activity | Evidence | Conflict with proposed x ±400, z ±300 land |
| --- | --- | --- |
| Old town time trial | x 566–757 | Entire listed route lies east of the new footprint |
| Northern climb | final waypoint (-20, -845) | Extends 545 m beyond its northern bound |
| Highway race | from x -690 to x 930 | Both ends lie outside the new footprint |
| Southern descent | final waypoint (24, 795) | Extends 495 m beyond its southern bound |
| Coastal and western events | use ringPt(...) on the inherited road ring | Require new routes or preservation of that ring |

Renaming locations cannot make these routes valid in a smaller map. buildLandmarks also chooses 18 sites from the actual road network; buildJobs selects stops near named zones and excludes activity areas. A layout can look complete while silently losing contracts or landmarks.

My earlier document required preserving every activity while replacing the map. That needs an explicit transition plan. It should not be interpreted as a request to squeeze the existing routes into the new district unchanged.

## Three options

| Option | Product result | Technical cost | Approval consequence |
| --- | --- | --- | --- |
| A. New city replaces the island | Closest to the agreed new-city direction | Reauthor routes, landmarks and contracts; version records/ghosts; safely migrate positions | Recommended direction if the new city is the priority; approve activity changes before release |
| B. Retain island and add waterfront | Existing activities can remain in place, subject to changed road connections | Added terrain/roads and traffic joins; larger scene and render budget; old routes can still change if navigation changes | Changes the agreed direction; not selected automatically |
| C. New city plus separate legacy driving world | New city identity with optional access to unchanged old activities | World loading/unloading, world-specific state, entity cleanup and record namespaces | Highest scope; defer unless preserving every old route is essential |

Recommendation: retain A as the intended destination. Build its greybox as a development-only test world until its activities and migration pass validation. Keep the existing released world intact during that work. This is a staging method, not a commitment to ship two worlds. If retaining all old activities unchanged is non-negotiable, A is not ready for approval; B or C needs an explicit product decision.

No island retention, new world selector, activity deletion or save reset is approved by this brief.

## Low-cost greybox evaluation

Reuse the earlier street grid and destination placement as a candidate. Test the district without detailed facades or decorative meshes first. Treat each listed requirement below as a required report from the greybox, not a claim that it has already passed.

| Evaluation | Evidence required |
| --- | --- |
| Road connectivity | All intended junctions connected; no unintended dead ends; each drivable destination reachable |
| Safehouse → car → harbour → boat → return | Keyboard, touch and controller recordings; valid entry/exit points and no duplicate vehicle |
| Longest car turns | Swept hull clears the kerb and parked cars; road dimensions adjusted instead of vehicle physics |
| Walking distances | Actual path length and timed walk/run between key entrances |
| Water geometry | Boat hull clears berth and channel; camera and disembark points stay clear of pier meshes |
| Activity coverage | Inventory below has no missing or unresolved entries |
| Performance | Same device/settings route compared with current baseline; record frame-time percentiles, mesh/texture counts and active agents |

The city map must distinguish vehicle roads, pavements, marked crossings, dock surfaces and non-walkable water. Generate map labels and navigation from the same layout identifiers. Do not derive a walking path solely from the nearest vehicle road centreline.

## Activity inventory before implementation approval

Record each item as retained unchanged, remapped, replaced with an approved equivalent, or deferred with explicit approval. Nothing may disappear through a failed generator lookup.

- Six event IDs: cubells, talaia, oldtown, highway, south, antoni. Record route geometry, length, gate sequence, race/time-trial type, rival navigation and championship references.
- Nine contract IDs: parcel_eivissa_santaeularia, parcel_santantoni_santjosep, parcel_santllorenc_portinatx, courier_eivissa_santantoni, courier_santaeularia_eivissa, courier_santjoan_escubells, tour_north, tour_southwest, tour_eastside. Record every pickup/drop-off and reachable leg.
- Eighteen exploration landmarks: retain their progress IDs unless an approved migration maps them. Check actual placement and pairwise spacing, not just array length.
- Speed radars, dealership test-drive circuit and house exit path: enumerate from the baseline at implementation time; verify their new geometry separately.
- Championship and reward balance: shorter routes must not multiply credits per minute unintentionally. Present old/new completion-time measurements before changing payouts.

## Record and save design proposal

Use a world/route revision for geometry-dependent records. Conceptually identify a time or ghost by (worldId, routeId, routeRevision); preserve car ownership, credits and customisation independently. Archive earlier records rather than displaying them as achievements on a different route. A display-name change alone does not require a revision.

Migration should be idempotent: loading the same old save twice must not award credits twice, duplicate owned cars or erase its archived records. Retain a validated backup before a destructive schema transition. If storage is full or unavailable, keep the loaded session playable and explain that progress was not saved.

Borrowed vehicles, walkers and boats need safe re-entry rules agreed with Claude's merged implementation. Never serialize live mesh references, traffic-array indices or transient NPC objects. Cloud integration remains separate and disabled as currently configured.

## Original identity and commercial readiness

The new city should use original silhouettes, businesses, street signs and fictional institutions. Existing real vehicle makes/models and the three audio tracks still need an asset-rights inventory before a paid launch. The new place names alone do not establish rights to every inherited asset.

## Implementation boundary

Claude owns walking, vehicle possession and boat work. This brief introduces no function signatures and no changes to index.html, test hooks, physics or save code. After the on-foot and vehicle work lands, agree on the world-transition option and activity inventory before starting city implementation.
