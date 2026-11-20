# Port Meridien

**[▶ Play Now](https://joyeechuah.github.io/Port-Meridien/)** · in the browser, on a computer or a phone, no install

An open-world city game for the browser: walk the streets, take any car, and sail from the harbour. Built with three.js as a single `index.html`, with no install and no build step.

> **Status: early.** Port Meridien builds on the foundation of [White Isle Drive](https://github.com/joyeechuah/white-isle-drive). Walking, running, taking cars, the harbour boat, the Old Quay district, people on its streets, the police, and a pistol with health and arrest are in. See [What's next](#whats-next) and [ROADMAP.md](ROADMAP.md).

Port Meridien is an original game. Its name, city, characters and story are its own.

## Play

**Online:** [joyeechuah.github.io/Port-Meridien](https://joyeechuah.github.io/Port-Meridien/). It updates a minute or two after each change to `main`. Your progress is saved in that browser.

**Locally:** clone the repository and run:

```
npm ci
npm start        # http://127.0.0.1:4173/index.html
```

Or open `index.html` directly in Chrome, Edge, Firefox or Safari. It needs an internet connection to load three.js and the fonts.

Play opens with a 7.6-second harbour flyover and a street-level reveal of your saved car in Old Quay. Select **Skip intro**, press Escape, or use A, B or Start on a controller to drive immediately. Reduced-motion mode goes straight to free roam. Use the pause menu’s home action to visit the garage and customise your cars.

### Graphics and saved settings

In the pause menu, select **GRAPHICS** to cycle through the three modes.

| Mode | What it does |
| --- | --- |
| AUTO | Tries a lower resolution when frames stay slow. If the typical frame time barely changes, it restores the previous resolution. |
| SHARP | Keeps the game at its highest supported resolution for this display. |
| SMOOTH | Caps rendering at one game pixel per CSS pixel to reduce the graphics workload on high-density screens. |

The browser remembers your graphics mode, FLASHES setting, VIOLENCE level and pistol selection when you reload.

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
| Fire (on foot or in free driving) | `G` | FIRE | Right shoulder |
| Pause | `Esc` or `P` | PAUSE | Menu / Start |

On smaller screens, **Map Key** opens the legend and Explorer Passport. Open the map and select **ME** to centre it on your current position. The arrow follows your position and heading while driving, walking or sailing. GPS routes follow the road network. On touchscreens, you can hold RUN or HANDBRAKE while tapping FIRE with another finger.

## On foot

Stop the car and get out. Gas walks forward, brake steps back, steering turns, and holding `Shift`, `Space`, the RUN pad or controller `A` makes you run forward. Walk back to the car and get in. Traffic stops for you if you stand in the road. The car you got out of falls silent while you're away from it.

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

## The police

Two patrol cars drive with the traffic: white, with a blue band and a light bar, and blue dots on the minimap. A crime one of them sees makes you **wanted**, shown as stars under the district name:

| Crime (seen by a patrol within about 90 m) | Stars |
| --- | --- |
| Crashing into a car | 1 |
| Running into someone on foot | 1 |
| Taking a car | 1 |
| Speeding past a patrol (over 110 km/h, within 45 m) | 1 |
| Hitting a police car | 2 |

Each further crime adds a star, up to five. Nothing counts during a race or a test drive.

While you're wanted, police cars chase you along the roads, more of them the more stars you have, with lights and sirens. Stop and let one pull up beside you, and you're **caught**: a fine of 500 CR a star, and the stars are gone. Off the road, an officer gets out and comes for you on foot. You can outrun them, but not for ever.

Get out of their reach and stay out of it long enough (the stars blink meanwhile) and they **lose you**. The boat is out of their reach.

While you're wanted, your house, the Auto Gallery, races, contracts, going home and map travel are closed: lose the police first. A reload clears a wanted level.

## The pistol and health

Take the pistol from the garage with **PISTOL**, top right under MUSIC (it stays chosen until you change it). You can use it on foot and while driving outside races and test drives. You leave the house with 48 rounds.

It locks onto the nearest target in front of you, shown by a red ring: a car, a police car, someone walking, or an officer. Walls and cars are cover. Fire with `G`, the **FIRE** pad, or the controller's right shoulder. A car stops after about nine hits; someone shot is knocked down for 6 s and gets up again.

The police see shooting as they see any crime: firing is one star, hitting a car or a person one, shooting at the police two. At three stars, an officer on foot fires back.

Your **health** is 100, shown as a bar under the place and clock. After 6 s with nothing hurting you it comes back to 50; it's full again at the house. At 0 you're **knocked out** and wake at home, 10% of your credits poorer (at most 5,000). Caught by the police while carrying the pistol, you're **arrested**: the fine, the pistol back in the garage, and you start again outside the Harbour Hall.

Two settings in the pause menu, both saved:

| Setting | Choices |
| --- | --- |
| VIOLENCE | **LOW**: nobody falls. **STANDARD** (the default): people fall, no blood. **STRONG**: hits also leave a red mark that fades. It changes only what you see |
| FLASHES | **ON**, or **OFF**: no muzzle flash and no red flash when you're hit |

These rules are working decisions, recorded in [docs/STEP4_DECISIONS.md](docs/STEP4_DECISIONS.md), and may change before release.

## What works today

- **Driving:** 24 cars with made-up names, paint and customisation; collision damage and roadside repairs; keyboard, touch pads, tilt and game controllers.
- **On foot:** walking and running, getting in and out, taking stopped traffic cars, and going back to cars you left.
- **The boat:** a motorboat from the pier, with its own sound.
- **The world:** an island with roads, traffic, day and night, a map with GPS, Photo Mode, and the Old Quay district with people walking its streets.
- **The police:** patrols, a wanted level of one to five stars, chases by car and on foot, fines, and losing them.
- **The pistol:** lock-on aiming, health, being knocked out, arrest, and settings for violence and flashes.
- **Things to do:** races, time trials, championships, delivery contracts, speed radars and an explorer passport of 18 landmarks.
- **Saves** in the browser. Optional cloud saves are built in but switched off until this game has its own Firebase project (see [CLOUD_SETUP.md](CLOUD_SETUP.md)).

## What's next

| Step | What you'll be able to do | State |
| --- | --- | --- |
| 4 | More weapons, shooting from a car or the boat, police cars that shoot, health pickups | Not decided yet |
| Later | The full city as its own world, with the island kept as a second place to drive | Planned |

The opening sequence and audio have been tested on an Android phone. The AUTO resolution change and Old Quay junction traffic still need a driving check on a physical phone.

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
- In tests the police ignore crimes unless a test opens the game with `game.open({ police: true })`, so a crash in an unrelated test never starts a chase.
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

The default build saves progress in this browser’s local storage. It has no ads or analytics. It loads three.js from cdnjs and fonts from Google Fonts. Deployments configured for optional Google sign-in can also back up progress to Firestore. If the game asks which save to keep, **Decide Later** postpones the choice. Reopen Cloud Save to compare the two copies. Ghost laps stay on the device. See [cloud save setup](CLOUD_SETUP.md).

## Content

Port Meridien is a mature game: you can shoot cars, people and the police. VIOLENCE in the pause menu controls how it's shown, from LOW to STRONG, with STANDARD as the default. It shows no blood by default.
