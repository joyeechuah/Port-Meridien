# Port Meridien — Architecture and Developer Guide

This is a guide to the **current merged implementation on `main`**, not a roadmap. Port Meridien currently runs as a static browser driving game, starting from White Isle Drive’s code. It can be served by GitHub Pages; repository hosting must be enabled separately. Walking and taking traffic cars are merged. The harbour boat and pier are implemented in PR #12 and must be merged before the boat-specific portions of this guide describe `main`; the new city remains planned in [ROADMAP.md](../ROADMAP.md). The game itself needs no build step.

Return to [README](../README.md) · Set up [Cloud Save](../CLOUD_SETUP.md).

## Technology and entry points

| Area | Implementation | Main entry point |
| --- | --- | --- |
| Game UI and control surfaces | HTML, CSS, vanilla JavaScript | `index.html` |
| 3D renderer, camera, scene graph | three.js r128, WebGL | `index.html` |
| Terrain, roads, town props, cars | Procedural geometry / generated textures | `index.html` |
| Physics-style driving, collisions and AI | Frame-based JavaScript simulation | `index.html` |
| Audio | Web Audio API, pre-recorded music and synthesised fallback | `index.html`, `audio/` |
| Guest progress | Validated browser `localStorage` save | `index.html` |
| Optional cloud backup | Firebase Auth + Firestore (disabled until configured) | `index.html`, `firestore.rules`, `CLOUD_SETUP.md` |
| Automation | Playwright / ESLint / GitHub Actions | `tests/`, `playwright.config.js`, `.github/workflows/test.yml` |

The sizeable `index.html` contains the production game, not a framework application with separate ES modules. Search the section comments and functions listed below rather than expecting `src/` or a bundler.

## Boot and the main loop

The page loads the three.js library from cdnjs with a Subresource Integrity hash. Startup checks for WebGL support, restores and sanitises saved progress, then `boot()` executes the staged `STEPS` initialisation. These stages construct road networks, terrain, scenery, landmarks, events, traffic and parked vehicles. The `requestAnimationFrame(frame)` loop drives the simulation.

`frame(ts)` clamps the elapsed time, applies day/night and environment updates, delegates based on the current game state, and renders. Representative states are `LOAD`, `GARAGE`, `EXIT`, `DRIVE`, `DEALER`, `MAP`, `PHOTO`, `PAUSE` and `FADE`. `setState()` coordinates state transitions and interaction availability. Photo mode pauses world clocks; a tab that is no longer the active session skips its frame work.

### Player movement modes, pier and parked/taken cars

The game uses one `DRIVE` state with three mutually exclusive player movement paths; **never infer movement from `state` alone**:

| Mode | Runtime selector | Update handler | Position and controls |
| --- | --- | --- | --- |
| Car | neither `FOOT.on` nor `BOAT.on` | normal `driveUpdate` physics | `P` and `pc`; steering, throttle, brake |
| Walking | `FOOT.on` | `footUpdate(dt)` | `FOOT.{x,y,z,h,v}`; gas walks, brake steps backward, Shift/handbrake runs |
| Boat (#12) | `BOAT.on` | `boatUpdate(dt)` | `BOAT.{x,y,z,h,v}`; gas powers forward, brake reverses, steering turns while moving |

`FOOT` is a singleton **player** entity with animation, camera and input state, not a reusable NPC class. `footClear` resolves collisions against scenery, vehicle and traffic blockers; `footGround` resolves terrain/road height and, after #12, a supported over-water `PIER` deck. A height query alone is **not** an NPC pathfinding interface. `footTarget` and `footPrompt` select reachable car/boat actions; the prompt action is available synchronously on exit (important to #6).

Taking stopped traffic cars creates session-only temporary IDs such as `st0`, recorded in `STREET`; their model data borrows from a stable base `CARS` ID. `LEFT` holds up to three parked-out cars not currently driven, including owned cars. `takeTraffic`, `takeLeft`, `leaveCar`, `driveCar` and `streetReset` handle possession, lifetime and home cleanup. The save must never persist a temporary `st*` current ID: `save.cur` stays an owned car, while ghost records use a stable borrowed base model. The dealer's `parkAll()` transitions must release discarded temporary entries and meshes (fixed in the #4 follow-up). Regression tests cover repeated dealer swaps and temporary car bounds.

The pier and boat code in PR #12 is in the `HARBOUR + BOAT` section. `buildHarbour()` constructs a pier deck and boat; `onPier` / `footGround` treat the dock as walkable over water. `boatFree` enforces underwater clearance and world bounds, `boatBoard` and `boatLand` switch modes, `boatPlace` renders the hull and wake, `boatEnd` returns to mooring on forced exit. `drawMini` and `syncRenderView` follow the active boat/player; car controls should not run while `BOAT.on`. There is **no drivable road to the pier yet**; see `PIER_ROAD_CONNECTION_PLAN.md`. Boat wake rendering requires a scene-attached mesh and visual testing.

**Mode integration watch-outs:** `jobTick` currently runs from the car-only update path; job timers may stop while walking or boating. Car engine sound may continue without distance falloff after exiting a vehicle. Both should be handled in a separate reviewed PR rather than silently changing car/boat mechanics. Photo Mode targets the car by default; confirm desired behavior in foot/boat modes.

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

The game uses Web Audio for engine, tyres, ambient sound and music, with three soundtrack assets in `audio/` and synthesised fallback tracks. Sound effects and music have separate settings. The page fetches three.js and Google Fonts on startup; Firebase authentication/downloads are disabled until a separate project is configured, and then occur only on cloud use. There is no analytics beacon or Cloudflare analytics token. cdnjs remains the renderer/library CDN; it is not an analytics integration. See [README Privacy](../README.md#privacy) for the user-facing explanation and `index.html`'s Content Security Policy for permitted network origins.

## Tests and continuous integration

Production `index.html` is loaded fresh for browser tests. `tests/support/instrument.js` inserts controlled inspection hooks into an **in-memory copy**; it does **not** modify the shipping HTML file. Tests can then inspect internal state using `window.__T`. `tests/support/game.js` contains test-driving helpers. `tests/on-foot.spec.js` tests player mobility and the immediate exit prompt; `tests/take-cars.spec.js` covers temporary ownership, model/save/ghost invariants and dealer lifecycle; PR #12 adds `tests/boat.spec.js`. The world-baseline regression in PR #10 records authored roads, generated edges, all event polylines, landmarks, contract points and complete contract legs; do not regenerate it automatically when adding the pier-access road. The Playwright server is in `tests/support/server.js`.

`playwright.config.js` defines two projects: `chromium` for logic and interaction without 3D rendering, and `webgl` for tests tagged `@webgl`, drawing with WebGL/SwiftShader as needed. The workflow `.github/workflows/test.yml` installs dependencies, runs lint, then runs `npx playwright test` (both `chromium` and `webgl` projects), and uploads reports and failure artifacts. Its job label says Chromium, but it does not filter out WebGL tests. Run only one Playwright instance at a time because the server uses port 4173. Do not edit the served `index.html` during a test run.

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

The current terrain and road layout remain the inherited island until the waterfront replacement is approved and implemented. Display names now use Port Meridien locations, but event, landmark and contract IDs such as `cubells`, `eivissa_town` and `parcel_eivissa_santaeularia` remain stable to preserve saved progress and route lookups. `ibizaHouse` is an inherited geometry helper, not a network integration. Rename internal identifiers only with a separate compatibility plan. The old save fixture documents its White Isle Drive provenance; it tests schema compatibility, not automatic cross-game save sharing.

The player walking and taking-cars features are merged on `main`. Claude owns gameplay evolution for walking, taking cars, pier and boat, plus subsequent Old Quay district implementation. Codex owns tests, architecture/docs, review and approved isolated wake work. The design in `PEDESTRIAN_INTERFACE_AUDIT.md` is a proposal only; no NPC, police or weapon implementation is authorised by documentation. Jo Yee controls merge/release decisions.
