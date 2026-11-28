# Notes for coding agents

- The game's code is in `js/*.js`: the classic scripts that `index.html` loads in order (fourteen at present). They share one global scope, so a name declared at the top of one file can be used in the others. [docs/CODE_LAYOUT.md](docs/CODE_LAYOUT.md) says what's in each file.
- Change game logic in `js/`. `index.html` holds the page's HTML and CSS, its security policy and the script tags.
- Script tags in `index.html` keep a fixed `?v=dev`: don't stamp them. The Pages workflow publishes a copy with each tag stamped from its file's contents, so players' browsers don't keep a stale copy (`tests/support/stage-site.js`, `docs/SCRIPT_RELEASES.md`). `npm run lint` fails on a stamped tag, and `npm run stamp` puts it back to `?v=dev`.
- Load order: code that runs while a file loads (not inside a function called later) may only use names from that file or earlier ones. `npm run lint` checks this.
- A new file in `js/` needs its script tag in `index.html` in load order, a row in `docs/CODE_LAYOUT.md`, and the same first lines as the others (`"use strict";` and the `window.__gameOff` check).
- `npm run lint` also type-checks the scripts with TypeScript (`npm run typecheck` alone; settings in `tsconfig.json`, outside code declared in `types/globals.d.ts`). Keep it at zero errors: settle a false report where it is, with a JSDoc cast such as `/** @type {any} */ (x)` or a typed default, not by turning checks off.
- Before opening a PR: `npm run lint`, then the Playwright tests for what changed (`npx playwright test tests/<name>.spec.js`). Run one Playwright instance at a time: the test server uses port 4173.
- Commits use the GitHub noreply address of whoever they are attributed to, never a personal email.
