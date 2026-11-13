# Pavement coordinate audit against the captured pre-Old Quay network
13 November 2026 · Static geometry test, not collision/playability certification

## Source and scope

Compared every point in `docs/OLD_QUAY_PAVEMENT_DATA.json` against `tests/fixtures/world-baseline.json` generated in PR #10 and now merged on `main`. The baseline contains the generated town **edge polylines**, not just the authored avenue control points.

For each point, the audit searched every segment of every `type:"town"` edge and calculated shortest point-to-segment distance. This checks whether schematic coordinates are geographically plausible relative to the network but does **not** verify an actual sidewalk mesh, building/tree colliders, vertical clearance, or connection continuity.

## Results

| Dataset | Count | Distance to nearest town-road centre line | Assessment |
| --- | ---: | --- | --- |
| Sidewalk corner anchors | 24 | **6.384–7.000 m** | Inside proposed pavement band of 5.2–8.0 m from road centre |
| Crossing centre anchors | 17 | **0–0.480 m** | Centres lie on or very near a road centre line |
| Crossing endpoints (2 each) | 34 | **5–10 m** | All are in the nominal 7 m pavement-offset vicinity; no outliers outside 5–10 m |
| Candidate building entrances | 7 | **6.752–7.245 m** | All within the proposed pavement-offset band |
| Junction anchors | 12 | **0 m** | Geometrically snapped to existing road intersections |

**Important:** The 17 crossings are *proposals* and are not connected to a validated graph or traffic controller. The current crossing endpoints were not proven reachable through walls, trees or a safe curb cut. A correct centreline distance alone cannot guarantee a safe or accessible crossing.

## Remaining draft blockers

1. Project each pavement corner and entrance to a verified, walkable sidewalk area from the generated road edges; use `surfH` and slope/kerb checks to determine a physical elevation.
2. Sweep a capsule against `OGRID` / `obstaclesNear` and parked/dealer exclusion zones at each anchor and along every sidewalk segment. A simple point-to-centre-line metric cannot detect walls or shop front obstructions.
3. Validate both crossing endpoints and sightlines under left- and right-driving-side traffic. Include moving cars, `LEFT` parked vehicles and recently taken `STREET` vehicles in hazard checks.
4. Keep stable IDs and replace approximate lines around curved avenue using surveyed intersections rather than global axis-parallel interpolation.
5. On the harbour extension, defer all road/ramp/pier connection tests to Claude's road and Old Quay PR; existing draft #11 covers the original six town blocks only.

**Decision:** The candidate coordinates are structurally consistent with the stored town road geometry. Keep #11 **draft** until actual sidewalk/collision and crossing continuity validation is complete. A data-only draft is useful for NPC design but is not enough to mark playable or production-ready.
