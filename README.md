# Port Meridien

**[▶ Play Now](https://joyeechuah.github.io/Port-Meridien/)** · in the browser, on a computer or a phone, no install

An open-world city game for the browser: walk the streets, take any car, and sail from the harbour. Built with three.js as a single `index.html`, with no install and no build step.

> **Status: early.** Port Meridien builds on the foundation of [White Isle Drive](https://github.com/joyeechuah/white-isle-drive). Walking, running, taking stopped traffic cars, the harbour boat and the Old Quay district are in. Pedestrians, police and weapons are not. See [ROADMAP.md](ROADMAP.md).

Port Meridien is an original game. Its name, city, characters and story are its own.

## Play

**Online:** [https://joyeechuah.github.io/Port-Meridien/](https://joyeechuah.github.io/Port-Meridien/). It updates a minute or two after each change to `main`. Your progress is saved in that browser.

**Locally:** clone the repository and run:

```
npm ci
npm start        # http://127.0.0.1:4173/index.html
```

Or open `index.html` directly in Chrome, Edge, Firefox or Safari. It needs an internet connection to load three.js and the fonts.

## On foot

Stop the car and press `F` (or tap **GET OUT**, or `B` on a controller) to get out. The driving controls walk: gas goes forward, brake steps back, steering turns, and `Shift` or the handbrake runs. Walk back to the car and press `E` or `F` (or tap the prompt) to get in. Traffic stops for you if you stand in the road.

On foot you can also take any traffic car that has stopped: stand in its lane so it stops, walk to it and press `E` or `F`. The car you came from stays where you left it, and you can walk back and drive it again. A taken car isn't yours: it is not saved, and it's gone when you go home.

## The harbour and the boat

A pier stands on the east coast, straight out from the town past the end of its main avenue: look for the mast with a red marker. A lane runs down to the shore from where the avenue meets the coast road: park at its end and walk on (cars don't fit between the bollards).

Walk along the pier to the motorboat and press `E` or `F` to board. The driving controls sail it: gas for power, brake for reverse, steering to turn (a boat only turns while it's moving). It stays in deep water and turns back at the open sea. To get off, come back beside the pier, slow to a stop, and press `E` or `F`. The boat stays where you leave it.

## Old Quay

The port town on the east side has six blocks between its streets: terraces with shops, a market yard round a clock tower (ways in from both side streets and from the avenue), workshops in old warehouses with lanes between them, houses round a garden, a civic square with the Harbour Hall and a fountain, and the Auto Gallery's block. You can walk or drive into the market, the square and the lanes.

## What works today

- Driving: keyboard, touch pads, tilt and game controllers; 24 fictional-name cars with paint and customisation; collision damage and repairs.
- On-foot exploration, walking and running, stopped-traffic takeovers and reclaiming parked cars. Taken cars are temporary and do not alter saved ownership.
- A world with roads, traffic, day and night, a map with GPS, and Photo Mode.
- Races, time trials, championships and delivery contracts.
- Saves in the browser. Optional cloud saves are built in but switched off until this game has its own Firebase project (see [CLOUD_SETUP.md](CLOUD_SETUP.md)).

## Development

```
npm run lint                                  # must be 0 errors, 0 warnings
npx playwright install chromium               # once
npx playwright test --project=chromium        # logic tests (about 25 min)
npx playwright test --project=webgl           # drawn tests, slow with a software GPU
```

Run one Playwright instance at a time: the test server uses port 4173.

- The game is `index.html` and nothing else. `package.json` holds only test tooling.
- Every fix or feature comes with a test that fails without it.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the current and PR #12 movement implementations, lifecycle rules and test boundaries.
- The proposed pier-road plan and baseline-sensitive route checks are in the documents PR #13; its final file path is `docs/PIER_ROAD_CONNECTION_PLAN.md`.
- Each approved car name still requires trademark clearance; fictional naming does not itself clear car visuals or music licensing.

## Privacy

The game stores your progress in your browser's local storage and nowhere else. It has no ads, no analytics and no accounts. It loads three.js from cdnjs and fonts from Google Fonts.

## Content

Port Meridien is planned as a mature game: later steps add weapons and police. A setting will control how violence is shown.
