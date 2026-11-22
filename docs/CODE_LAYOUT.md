# How the game's code is laid out

Port Meridien is still a static page with no build step: `index.html` holds the markup and styles, and the game's code is in nine scripts in `js/`, which the page loads in order. Until 21 November 2026 all of it was one script inside `index.html`.

## The scripts, in the order they load

| File | What's in it |
| --- | --- |
| `js/core.js` | Shared helpers, the car list, the save, the renderer, the sky and the day and night. It also checks that three.js and WebGL are there; if either is missing it shows why and stops the game |
| `js/world.js` | The island: terrain, the road network, scenery, the house, the dealership, plants, the sea and the roadside |
| `js/cars.js` | Car models and their looks, input, the player's car physics and traffic |
| `js/play.js` | Free-ride streaks, races and time trials, speed radars, the GPS, money and messages, the HUD canvases and the full map |
| `js/media.js` | Sound effects, music and Photo Mode |
| `js/progress.js` | The Explorer Passport, contracts and class championships |
| `js/screens.js` | Game states, the garage, the dealership, menus and prompts, one game tab at a time, and the cloud save |
| `js/people.js` | The HUD, on foot, the police, the pistol and health, pedestrians, and the harbour boat |
| `js/life.js` | The life side: the people of Old Quay with their names and personalities, talking to them, and the friendships they remember |
| `js/net.js` | Playing together: rooms on Firebase's Realtime Database (or, with `?mp=local`, the test server's relay), friends drawn where they are, and the PLAY TOGETHER panel |
| `js/main.js` | Each frame: the drive update, adaptive resolution, the `?perf` panel and the main loop, and `boot()`, which builds the world behind the loading screen |

## One global scope

The files are ordinary (classic) scripts, not modules. Everything a file declares at its top level (functions, `const`, `let`) is visible to every other file, so code calls across files as it did inside the one script. There are no imports or exports. Each file starts with `"use strict";`.

One rule follows from splitting the code: **code that runs while a file loads may only use names from the same file or an earlier one.** Inside one file a function declared further down can still be called early (declarations are hoisted), but a later file hasn't run yet. Code inside functions that run afterwards (event handlers, `boot()`'s steps, the frame loop) can use anything.

```js
// in js/screens.js, which loads before js/people.js
$("chFoot").onclick=footExit;          // wrong: footExit (js/people.js) doesn't exist yet
$("chFoot").onclick=()=>footExit();    // right: looked up when the button is pressed
```

`npm run lint` checks this rule. It follows what runs at load, including the functions it calls and callbacks that run straight away (`forEach`, `map`, `sort` and the like), and names the file and line.

## Stamps: `npm run stamp`

Each script tag in `index.html` carries a stamp of its file's contents, for example `js/play.js?v=ec7f41464c`. A browser that cached an older copy then fetches the new one together with the page that asks for it, so the page and its scripts never come from different versions.

After changing a file in `js/`, run `npm run stamp`, which updates the stamps. `npm run lint` fails while a stamp is out of date. Each script tag has a comment line above it, so two pull requests that change different files don't touch neighbouring lines in `index.html`.

## Adding code

- **New code:** put it in the file whose section it belongs to, next to the code it works with.
- **A new file:** add its script tag (with a comment line above it) to `index.html` at the point in the order where it belongs. Start the file with the same three-line header as the others, then run `npm run stamp`. Add it to the expected list in `tests/split-scripts.spec.js`.
- **If the game can't run** (no three.js or no WebGL), `js/core.js` calls `gameOff()`. That stops it, and every later file stops at its first line (`if(window.__gameOff)throw window.__gameOff;`) without reporting an error. Keep that line at the top of each file after `core.js`.

## Tests

`npm run lint` also type-checks the nine scripts with TypeScript, as plain JavaScript (`checkJs`), in load order and sharing one global scope as in the browser (`tests/support/typecheck.js`). Three.js and Firebase are declared loosely in `types/globals.d.ts`.

- **Hooks:** the tests serve the real `index.html` and add their hooks to the scripts in memory (`tests/support/instrument.js`). Each hook's text must appear exactly once across all the scripts.
- **Source text:** tests that read the game's source text use `gameSource()` from `tests/support/source.js` (the page followed by each script), not `index.html` alone.
- **Load order:** the load-order check is `tests/support/load-order.js`. The stamp helpers are in `tests/support/source.js` and `tests/support/stamp.js`.
