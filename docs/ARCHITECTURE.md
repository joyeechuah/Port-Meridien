# Port Meridien — Architecture and Developer Guide

This guide describes the **merged island implementation on `main`** as of 14 November 2026, not the proposed police or separate-city features. Port Meridien is a static browser game based on the White Isle Drive foundation: driving, walking, temporary car-taking, the harbour boat, the pier access lane, Old Quay and its first ambient pedestrians are playable. The project can be served through GitHub Pages; no game build step is required. The larger separate-city world remains planned in [ROADMAP.md](../ROADMAP.md).

Return to [README](../README.md) · Set up [Cloud Save](../CLOUD_SETUP.md).

## Technology and entry points

| Area | Implementation | Main entry point |
| --- | --- | --- |
| Game UI and control surfaces | HTML, CSS, vanilla JavaScript | `index.html` |
| 3D renderer, camera, scene graph | three.js r128, WebGL | `index.html` |
| Terrain, roads, Old Quay buildings, NPCs, cars and harbour | Procedural geometry / generated textures | `index.html` |
| Physics-style driving, collisions and AI | Frame-based JavaScript simulation | `index.html` |
| Audio | Web Audio API, pre-recorded music and synthesised fallback | `index.html`, `audio/` |
| Guest progress | Validated browser `localStorage` save | `index.html` |
| Optional cloud backup | Firebase Auth + Firestore (disabled until configured) | `index.html`, `firestore.rules`, `CLOUD_SETUP.md` |
| Automation | Playwright / ESLint / GitHub Actions, including manual rendered-only runs | `tests/`, `playwright.config.js`, `.github/workflows/test.yml`, `.github/workflows/drawn-webgl.yml` |

The sizeable `index.html` contains the production game, not a framework application with separate ES modules. Search the section comments and functions listed below rather than expecting `src/` or a bundler.

## Boot and the main loop

The page loads the three.js library from cdnjs with a Subresource Integrity hash. Startup checks for WebGL support, restores and sanitises saved progress, then `boot()` executes the staged `STEPS` initialisation. These stages construct the road network, terrain, Old Quay scenery, harbour, pedestrians, events, traffic and parked vehicles. The **final `Warming up` step** invokes `warmUp()` after `carLights()` has already created the player's lights: it traverses scene materials, calls `renderer.initTexture()` for unique loaded textures, and calls `renderer.compile(scene,camera)` to prepare shader programs before the first drive. `WARM` tracks `{textures, failed, ms}` and a failed precompile logs a console warning rather than silently hiding the issue. Warm-up shifts graphics work to loading; it is not a guarantee that a later first-seen car, quality change or WebGL context restoration cannot compile additional programs. Software-GPU numbers must not be presented as physical-phone benchmarks. The `requestAnimationFrame(frame)` loop drives the simulation.

`frame(ts)` clamps the elapsed time, applies day/night and environment updates, delegates based on the current game state, and renders. Representative states are `LOAD`, `GARAGE`, `EXIT`, `DRIVE`, `DEALER`, `MAP`, `PHOTO`, `PAUSE` and `FADE`. `setState()` coordinates state transitions and interaction availability. Photo mode pauses world clocks; a tab that is no longer the active session skips its frame work.

### Player movement modes, pier and parked/taken cars

The game uses one `DRIVE` state with three mutually exclusive player movement paths; **never infer movement from `state` alone**:

| Mode | Runtime selector | Update handler | Position and controls |
| --- | --- | --- | --- |
| Car | neither `FOOT.on` nor `BOAT.on` | normal `driveUpdate` physics | `P` and `pc`; steering, throttle, brake |
| Walking | `FOOT.on` | `footUpdate(dt)` | `FOOT.{x,y,z,h,v}`; gas walks, brake steps backward, Shift/handbrake runs |
| Boat | `BOAT.on` | `boatUpdate(dt)` | `BOAT.{x,y,z,h,v}`; gas powers forward, brake reverses, steering turns while moving |

`FOOT` is a singleton **player** entity with animation, camera and input state, not a reusable NPC class. `footClear` resolves collisions against scenery, vehicle and traffic blockers; `footGround` resolves terrain/road height plus the supported over-water `PIER` deck. A height query alone is **not** an NPC pathfinding interface. `footTarget` and `footPrompt` select reachable car/boat actions; the prompt action is available synchronously on exit (important to #6).

Taking stopped traffic cars creates session-only temporary IDs such as `st0`, recorded in `STREET`; their model data borrows from a stable base `CARS` ID. `LEFT` holds up to three parked-out cars not currently driven, including owned cars. `takeTraffic`, `takeLeft`, `leaveCar`, `driveCar` and `streetReset` handle possession, lifetime and home cleanup. The save must never persist a temporary `st*` current ID: `save.cur` stays an owned car, while ghost records use a stable borrowed base model. The dealer's `parkAll()` transitions must release discarded temporary entries and meshes (fixed in the #4 follow-up). Regression tests cover repeated dealer swaps and temporary car bounds.

The pier and boat code is in the `HARBOUR + BOAT` section. `buildHarbour()` constructs a pier deck and boat; `onPier` / `footGround` treat the dock as walkable over water. `boatFree` enforces underwater clearance and world bounds, `boatBoard` and `boatLand` switch modes, `boatPlace` renders the hull and wake, `boatEnd` returns to mooring on forced exit. `drawMini` and `syncRenderView` follow the active boat/player; car controls should not run while `BOAT.on`. A **drivable lane to the pier** now connects the east avenue and the harbour landing; cars stop before the deck's bollards and people continue on foot. The original road/race/contract baseline is protected by `tests/world-baseline.spec.js` and the approved post-lane fixture. The boat wake is attached and kept near the sea plane rather than tilted into the water with the hull.

**Mode integration:** `jobTick(dt)` advances while walking or boating. Photo Mode targets the walker or boat and keeps the camera above the sea. When the player walks away, `footUpdate()` sets engine/tyre output to zero using `audioUpd(...,vol=0)`; this is **not** spatial distance attenuation. `boatUpdate()` reuses the existing Web Audio engine/noise graph with a boat-like rpm/throttle profile and speed-dependent water wash. There is no separately imported outboard recording or general footstep-sound subsystem in the merged code.

### Old Quay district and pedestrian simulation

`buildScenery()` calls `buildOldQuay()` for six existing-street blocks: north-west terraces and shops; north-middle market and clock tower; north-east four workshops; south-west garden housing; south-middle Harbour Hall, civic square and fountain; and south-east housing around the unchanged Auto Gallery. `QUAY` stores house count, tower, fountain, hall, market, plaza, entrance gaps and shed footprints for geometry tests and later systems. Shop/house rows use batched solid colliders; buildings are set back from the curved main avenue and retained junctions. The road network, race routes and event/contract identifiers remain protected by the baseline fixture. `tests/old-quay.spec.js` checks geometry, passage access and colliders; `tests/old-quay-access-regressions.spec.js` checks dealer marker/forecourt interaction and Old Quay Dash completion with both driving-side settings.

`buildPeds()` creates a **district-specific graph of 72 nodes, 72 pavement edges and 14 marked zebra-crossing links**. `PEDS` contains at most **10 characters, or 6 in touch mode**. Each character has seeded per-instance route decisions and a small, shared-material/geometry procedural body (`pedLook`/`pedModel`); they are distinct from the player's `FOOT` object. `pedUpdate(dt)` is invoked once through `updateTraffic(dt)` in car, walker and boat modes. It uses the active player/boat position for activation around Old Quay (420 m), hides distant meshes outside a 260 m visibility threshold, and freezes with normal gameplay suspension.

The first-version pedestrian states are walking, idling, waiting at a crossing and crossing, with short avoidance/hurry behaviour. `pedClear(e)` checks moving and stationary ambient cars, the player vehicle, and `LEFT` parked/borrowed cars; it also projects approaching car velocity, including reversing, to defer unsafe crossing entry. `updateTraffic()` yields to people already crossing. `footClear` resolves position overlaps at each update. This is **not** full swept collision safety: reservations, NPC-NPC separation, `YIELD`/`RECOVER`, blocked-route replanning, per-quality NPC caps and population reset on fast travel/garage are not implemented. There are no pedestrians inside the market yard or civic square, outside Old Quay, or on the pier. `tests/pedestrians.spec.js` supplies eight gameplay cases; no physical-phone frame-time or memory plateau has been measured.

### Driving and traffic

- `driveUpdate()` handles active driving; the input handlers combine keyboard, on-screen touch pads and standard gamepad state.
- `collidePlayer()`, `damageVehicle()`, `damagePower()` and `showDamageSmoke()` model contact, damage penalties and smoke. Damage is **session-only**. `goGarage()` repairs the current car free of charge; `openRepair()`, `repairPanel()`, `repairBlocked()` and `repairPrice()` handle the condition dialog, roadside repair restrictions and credit pricing. Roadside repairs require a stopped car and explicit payment confirmation; no credit is deducted on cancellation.
- `initTraffic()`, `spawnTraffic()` and `updateTraffic()` handle ambient vehicles and placement/retry behaviour.
- `startEvent()` and `updateEvent()` handle races, rivals and their finishing behaviour.
- `openMap()` / `fastTravel()`, `goGarage()` and `goDrive()` coordinate movement between gameplay screens.
- `garageCam()` and garage pointer handlers implement rotation and pinch zoom. Two-finger touches are tracked by pointer IDs to prevent zoom jumps.

**State transition caution:** Input that changes screens must not continue into controls belonging to the new screen during the same frame (for example, the controller dealership-entry bug addressed in White Isle Drive PR #35). Similar care is needed for asynchronous fade callbacks and inactive tabs.

## Save data and cloud backup

The local game save uses `localStorage` key `port-meridien-v1`, with sanitisation of loaded values. `persist()` saves locally and notifies the optional cloud layer of relevant changes. Runtime driving damage is not part of saved progress. Cloud metadata uses `port-meridien-cloud`. These keys are separate from White Isle Drive’s; there is no automatic import from that game.

Cloud saving is currently disabled: all values in `FIREBASE_CONFIG` are empty and the entry buttons hide themselves. Port Meridien must use its own Firebase project, never White Isle Drive’s. If configured following `CLOUD_SETUP.md` (including the CSP changes), cloud saving becomes opt-in through `SAVE MY PROGRESS`. The Firebase libraries load only when that feature is used on an authorised host. Firestore stores a per-user document under `saves/{uid}`; `firestore.rules` restricts access to the signed-in owner and requires an incrementing revision number. When local and remote progress differ, the game asks the player which to keep rather than merging balances. Ghost replay data is intentionally excluded from cloud payloads to limit record size.

`BroadcastChannel` named `port-meridien-tabs` (with a storage-event fallback using `port-meridien-tab`) prevents an older tab from continuing to overwrite a newer tab's progress. An inactive tab suspends relevant gameplay/audio and must not resume pending work.

For Firebase provisioning, rules and supported domains, use [CLOUD_SETUP.md](../CLOUD_SETUP.md), not this overview.

## Sound and external resources

The game uses one Web Audio oscillator/filter/noise graph for engine, tyres and scrape effects. Walking mutes the parked car's synthesized engine and tyres; the boat uses adjusted engine pitch/throttle and noise wash tied to hull speed. No new boat sample file or footstep recording is referenced. Three soundtrack MP3s remain in `audio/`, alongside procedural fallback music. Sound effects and music have separate settings. The page fetches three.js and Google Fonts on startup; Firebase authentication/downloads are disabled until a separate project is configured, and then occur only on cloud use. There is no analytics beacon or Cloudflare analytics token. cdnjs remains the renderer/library CDN; it is not an analytics integration. See [README Privacy](../README.md#privacy) for the user-facing explanation and `index.html`'s Content Security Policy for permitted network origins.

## Tests and continuous integration

Production `index.html` is loaded fresh for browser tests. `tests/support/instrument.js` inserts controlled inspection hooks into an **in-memory copy**; it does **not** modify the shipping HTML file. Tests can then inspect internal state using `window.__T`. `tests/support/game.js` contains test-driving helpers. `tests/on-foot.spec.js` tests player mobility and exit prompts; `tests/take-cars.spec.js` covers temporary ownership, model/save/ghost invariants and dealer lifecycle; `tests/boat.spec.js` and `tests/boat-input.spec.js` cover navigation and controller/touch input. `tests/old-quay.spec.js`, `tests/old-quay-access-regressions.spec.js` and `tests/pedestrians.spec.js` cover district clearance, dealer access, race finish and the first NPC crossing behaviours. The world-baseline regression compares authored roads, generated edges, events, landmarks, stop points and contract legs against a reviewed fixture. Do **not** silently regenerate it during geometry changes. The Playwright server is in `tests/support/server.js`.

`playwright.config.js` defines two projects: `chromium` for logic and interaction without 3D rendering, and `webgl` for tests tagged `@webgl`, drawing with WebGL/SwiftShader as needed. The workflow `.github/workflows/test.yml` installs dependencies, runs lint, then runs `npx playwright test` (both `chromium` and `webgl` projects), and uploads reports and failure artifacts. The separate workflow `.github/workflows/drawn-webgl.yml` is a **manual, rendered-only** run of `npx playwright test --project=webgl --workers=1`; it does not fill a gap in the normal CI because the normal workflow already runs WebGL tests. Its job label says Chromium, but it does not filter out WebGL tests. Run only one Playwright instance at a time because the server uses port 4173. Do not edit the served `index.html` during a test run.

```sh
npm ci
npx playwright install --with-deps chromium
npm run lint
npm test
npx playwright test tests/collision-rear-view.spec.js
npx playwright test tests/damage-repairs.spec.js
npx playwright test --project=webgl
npm run test:report
```

Automated mobile cases use emulated viewports and touch events, **not physical mobile browsers**. Firefox and Safari are not part of the automated suite. `tests/damage-repairs.spec.js` covers payment confirmation, full repair effects, free garage recovery, conditions that block roadside repairs and insufficient credits.

## Working safely on the project

1. Make a feature branch from the **current** `main`; don't edit `main` directly.
2. Keep game logic changes and test expectations in the same pull request.
3. Update any exact-match hooks in `tests/support/instrument.js` if modifying the associated production source string.
4. For input/camera changes, test mouse, touch, controllers and short phone landscape layouts.
5. For save or cloud changes, test migrations, corrupt saves, offline behaviour and multi-tab ownership.
6. Run lint and relevant targeted tests first, then the complete suite and GitHub Actions before merging.
7. When multiple PRs touch `index.html`, merge one and update the others against the latest `main`; preserve both sides of the change.
8. Describe user-visible behaviour in the README and keep implementation status in [ROADMAP.md](../ROADMAP.md) accurate. There is no changelog file in this repository.

## Known constraints

The game relies on WebGL and a modern browser; a low-power device may need the SMOOTH graphics setting. The CDN-hosted renderer requires connectivity at load time. Browser local storage can be cleared, and guest progress does not sync across devices. Automation does not currently exercise actual mobile Safari or Firefox, and GPU-less CI performance is not representative of physical devices.

## AI-assisted development and human direction

The project uses AI coding assistants for implementation. Human project work includes requirements and UX direction, playtesting, reproduction of reported issues, reviewing fixes, regression-test strategy and deciding merge readiness. Preserve that distinction in project documentation and portfolio descriptions.

## Inherited identifiers and world

The current world retains the inherited island topology but now has the new pier access lane and the six-block Old Quay district, with pedestrians limited to Old Quay. A separate city world has not been implemented. Display names now use Port Meridien locations, but event, landmark and contract IDs such as `cubells`, `eivissa_town` and `parcel_eivissa_santaeularia` remain stable to preserve saved progress and route lookups. `ibizaHouse` is an inherited geometry helper, not a network integration. Rename internal identifiers only with a separate compatibility plan. The old save fixture documents its White Isle Drive provenance; it tests schema compatibility, not automatic cross-game save sharing.

Walking, taking cars, boat/pier, Old Quay and first-version ambient pedestrians are merged on `main`. A police/wanted-level feature is not merged as of this guide's revision; review its eventual PR separately for chase behaviour, fines and access restrictions. The broader `PEDESTRIAN_DESIGN.md` describes features that are not all implemented in this MVP. Claude develops gameplay changes; Codex contributes reviews, scoped tests and documentation. The project owner controls merge and release decisions.
