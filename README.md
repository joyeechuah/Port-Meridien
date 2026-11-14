# Port Meridien

**[▶ Play Now](https://joyeechuah.github.io/Port-Meridien/)** · in the browser, on a computer or a phone, no install

An open-world city game for the browser: walk the streets, take any car, and sail from the harbour. Built with three.js as a single `index.html`, with no install and no build step.

> **Status: early.** Port Meridien builds on the foundation of [White Isle Drive](https://github.com/joyeechuah/white-isle-drive). Walking, running, taking cars, the harbour boat, the Old Quay district and people on its streets are in. The police are being built; weapons come after them. See [What's next](#whats-next) and [ROADMAP.md](ROADMAP.md).

Port Meridien is an original game. Its name, city, characters and story are its own.

## Play

**Online:** [joyeechuah.github.io/Port-Meridien](https://joyeechuah.github.io/Port-Meridien/). It updates a minute or two after each change to `main`. Your progress is saved in that browser.

**Locally:** clone the repository and run:

```
npm ci
npm start        # http://127.0.0.1:4173/index.html
```

Or open `index.html` directly in Chrome, Edge, Firefox or Safari. It needs an internet connection to load three.js and the fonts.

## Controls

| | Keyboard | Touch | Controller |
| --- | --- | --- | --- |
| Gas / brake, reverse | `W` / `S` (or arrows) | GAS / BRAKE pads | Triggers |
| Steer | `A` / `D` (or arrows) | Steering pads, or tilt | Left stick |
| Handbrake | `Space` | HANDBRAKE pad | `A` |
| Get out | `F` | GET OUT | `B` |
| Get in, board, step off, enter | `E`, `Enter` or `F` | Tap the prompt | `X` |
| Map and GPS | `M` | MAP | View / Back |
| Camera | `C` | CAM | `Y` |
| Look behind | Hold `B` | REAR | Hold left shoulder |
| Photo Mode | `V` | PHOTO | |
| Back to the road | `R` | Pause menu | |
| Pause | `Esc` or `P` | PAUSE | Menu / Start |

On foot and on the boat the same controls walk and sail: see below.

## On foot

Stop the car and get out. Gas walks forward, brake steps back, steering turns, and `Shift` or the handbrake runs. Walk back to the car and get in. Traffic stops for you if you stand in the road. The car you got out of falls silent while you're away from it.

On foot you can also take any traffic car that has stopped: stand in its lane so it stops, walk to it and get in. The car you came from stays where you left it, and you can walk back and drive it again. Up to three taken cars stay where you left them. A taken car isn't yours: it is not saved, and it's gone when you go home.

## The harbour and the boat

A pier stands on the east coast, straight out from the town past the end of its main avenue: look for the mast with a red marker. A lane runs down to the shore from where the avenue meets the coast road: park at its end and walk on (cars don't fit between the bollards).

Walk along the pier to the motorboat and board it. The driving controls sail it: gas for power, brake for reverse, steering to turn (a boat only turns while it's moving). You hear its motor and the water along the hull. It stays in deep water and turns back at the open sea. To get off, come back beside the pier, slow to a stop, and step off. The boat stays where you leave it.

## Old Quay

The port town on the east side has six blocks between its streets:

| Block | What's there |
| --- | --- |
| North-west | Terraces with shops, two to four floors |
| North-middle | A market yard round a clock tower, with stalls. Ways in from both side streets and from the avenue |
| North-east | Workshops in four old warehouses, with lanes between them |
| South-west | Houses round a garden |
| South-middle | A civic square: the Harbour Hall, a fountain, benches and palms |
| South-east | The Auto Gallery, where you buy and test-drive cars |

You can walk or drive into the market, the square, the garden and the lanes.

### People

Up to ten people (six on a phone) walk the pavements round the six blocks. They cross the streets on the zebra crossings, and wait while a car is on the stripes, close by, or heading for the crossing; after 10 seconds of waiting they give up and walk on. Traffic stops for someone crossing. A car can't hurt them yet: drive at one and they step in towards the houses, or hurry off the crossing. They're only there while you're near the town.

## What works today

- **Driving:** 24 cars with made-up names, paint and customisation; collision damage and roadside repairs; keyboard, touch pads, tilt and game controllers.
- **On foot:** walking and running, getting in and out, taking stopped traffic cars, and going back to cars you left.
- **The boat:** a motorboat from the pier, with its own sound.
- **The world:** an island with roads, traffic, day and night, a map with GPS, Photo Mode, and the Old Quay district with people walking its streets.
- **Things to do:** races, time trials, championships, delivery contracts, speed radars and an explorer passport of 18 landmarks.
- **Saves** in the browser. Optional cloud saves are built in but switched off until this game has its own Firebase project (see [CLOUD_SETUP.md](CLOUD_SETUP.md)).

## What's next

| Step | What you'll be able to do | State |
| --- | --- | --- |
| 3 | Police patrols and a wanted level: crimes they see bring a chase; get caught and you're fined, or lose them | Being built |
| 4 | Weapons, health, arrest, and one setting for how violence is shown | Planned |
| Later | The full city as its own world, with the island kept as a second place to drive | Planned |

Not yet tested on a real phone.

## Development

```
npm run lint                                  # must be 0 errors, 0 warnings
npx playwright install chromium               # once
npx playwright test --project=chromium        # logic tests (about 25 min)
npx playwright test --project=webgl           # drawn tests, slow with a software GPU
```

GitHub Actions runs lint and both test projects on every pull request. The drawn tests can also be run on their own: Actions → **Drawn browser tests (WebGL)** → Run workflow.

Run one Playwright instance at a time: the test server uses port 4173 and reads `index.html` from disk on each page load, so don't edit it during a run.

- The game is `index.html` and nothing else. `package.json` holds only test tooling.
- Every fix or feature comes with a test that fails without it.
- Tests reach the game's internals through `window.__T`; add a name to the list in `tests/support/instrument.js` when a test needs one.
- `tests/world-baseline.spec.js` guards the roads, races, landmarks and contracts. A change to the world that moves any of them must update `tests/fixtures/world-baseline.json` on purpose (see `tests/fixtures/WORLD_BASELINE_README.md`).

### Documents

| File | What it covers |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | Steps, decisions, and the list of things to check before selling the game |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is laid out: game states, movement modes, the frame loop, tests |
| [docs/OLD_QUAY_PLAN.md](docs/OLD_QUAY_PLAN.md) | The Old Quay district plan and what it had to keep working |
| [docs/PIER_ROAD_CONNECTION_PLAN.md](docs/PIER_ROAD_CONNECTION_PLAN.md) | How the harbour lane joins the roads |
| [docs/PEDESTRIAN_DESIGN.md](docs/PEDESTRIAN_DESIGN.md) | The full design for people in the city |
| [docs/CITY_DESIGN.md](docs/CITY_DESIGN.md) | The design for the separate city world |
| [docs/DISTRIBUTION_REVIEW.md](docs/DISTRIBUTION_REVIEW.md) | Stores, age ratings and selling |
| [docs/CAR_TRADEMARK_SEARCH_WORKSHEET.md](docs/CAR_TRADEMARK_SEARCH_WORKSHEET.md) | Trademark checks for the 24 car names (none done yet) |
| [docs/ASSET_INVENTORY.md](docs/ASSET_INVENTORY.md) | Every asset and where it came from |

## Privacy

The game stores your progress in your browser's local storage and nowhere else. It has no ads, no analytics and no accounts. It loads three.js from cdnjs and fonts from Google Fonts.

## Content

Port Meridien is planned as a mature game: later steps add weapons and police. A setting will control how violence is shown.
