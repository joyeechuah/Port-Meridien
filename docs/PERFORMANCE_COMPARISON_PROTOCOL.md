# Step 2 → Step 4 performance comparison — measurement protocol
Date: 15 November 2026. **No new measurements are claimed.** The existing `tests/performance.spec.js` records simulation step cost, no-render RAF callback cost, SwiftShader software-GPU draw calls/triangles/frame callback times, heap and photo capture. The existing output is insufficient for a rigorous **before-pedestrians vs with pedestrians/police/pistol** comparison without running matched builds.

## Experiment design
Compare a fixed pre-Step-2 commit (record exact SHA), post-pedestrians and current merged Step 4 build (record exact SHAs), on the **same phone** and the same controlled Playwright/SwiftShader runner. Do not compare unrelated hardware or call SwiftShader results device FPS.

| Scenario | Player position and actors | Captures |
| --- | --- | --- |
| A: inherited quiet island | Same road, 100 m clear of town, neutral weather, steady camera and no wanted state | Frame callback p50/p95/p99, simulation ms, heap MB, renderer draw calls, triangles |
| B: Old Quay pedestrian density | Player in town, all first-version mobile NPCs active, fixed camera and traffic count | Same metrics; NPC count; NPC update cost if instrumented |
| C: police chase | Same town, wanted level 4–5, number of active patrol/chase cars fixed or recorded | Same metrics, active chasers and officers |
| D: full Step 4 | Same location, officer shooting, armed player firing, visible marks/sparks, NPCs and police all active | Same metrics, temporary meshes/texture/heap plateau |
| E: 10-minute loop | Repeat a consistent sequence of driving/foot/chase/shots without reload | Scene and memory plateau, long-task count, worst sustained frame times, screen temperature/battery note |

## Execution and reporting
- Real-device: use Chrome on Android, record model/SoC, OS/browser version, CSS/device pixels, DPR, battery, thermal and graphics mode. Record screen with GPU/FPS overlay only if available. Time the **game frame**, not Playwright waiting/initial page boot.
- Software runner: use `npx playwright test tests/performance.spec.js --project=webgl` for graphics metrics, and `--project=chromium` for headless simulation. Capture the test annotation output and compare like-for-like scenario distributions.
- Repeat each build/scenario at least three times on an idle machine. Report medians, p95, sample count and range. A run under load can give false regressions.
- A renderer with drawing disabled does **not** measure GPU pressure or mobile smoothness. The four-minute random soak in PR #32 tests **correctness invariants**, not FPS.
- Treat a slowdown as actionable only after confirming the same build exhibits it in repeated runs, and identify the affected subsystem with profiling.

## Known limits / next decision
The current record supports only the existence of performance tests and warm-up metrics, **not** quantified "faster/slower than before Step 2" conclusions. A trustworthy comparison requires execution on controlled versions; no numerical claims are made here.
