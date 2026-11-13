# Port Meridien

An open-world city game for the browser: walk the streets, take any car, and sail from the harbour. Built with three.js as a single `index.html`, with no install and no build step.

> **Status: early.** This repository starts from the code of [White Isle Drive](https://github.com/joyeechuah/white-isle-drive), a free-roam driving game by the same author. Right now it plays as that game under a new name. The city, the character on foot, and the boats arrive in the steps listed in [ROADMAP.md](ROADMAP.md).

Port Meridien is an original game. Its name, city, characters and story are its own.

## Play

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

A pier stands on the east coast, straight out from the town past the end of its main avenue: look for the mast with a red marker. There is no road to it yet, so drive down across the open ground, park on the shore, and walk on (cars don't fit between the bollards).

Walk along the pier to the motorboat and press `E` or `F` to board. The driving controls sail it: gas for power, brake for reverse, steering to turn (a boat only turns while it's moving). It stays in deep water and turns back at the open sea. To get off, come back beside the pier, slow to a stop, and press `E` or `F`. The boat stays where you leave it.

## What works today

- Driving: keyboard, touch pads, tilt and game controllers; 24 cars with paint and customisation; collision damage and repairs.
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
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the current implementation and development constraints.

## Privacy

The game stores your progress in your browser's local storage and nowhere else. It has no ads, no analytics and no accounts. It loads three.js from cdnjs and fonts from Google Fonts.

## Content

Port Meridien is planned as a mature game: later steps add weapons and police. A setting will control how violence is shown.
