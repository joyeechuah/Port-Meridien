# Commercial asset inventory

13 November 2026. Scope: tracked files and runtime references on main `20fde21`; #4 and #6 introduce no external asset files. This is an evidence register, not a certificate of ownership or permission to sell. No licence was assigned to the project by this review.

## External runtime dependencies and fonts

| Asset | Exact use/source | Licence evidence | Release action |
| --- | --- | --- | --- |
| three.js r128 / 0.128.0 | `cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`, index.html | Installed matching npm package LICENSE: MIT, copyright 2010–2021 three.js authors; [upstream](https://github.com/mrdoob/three.js/blob/r128/LICENSE) | Keep copyright and MIT text when bundling; retain SRI or verify a bundled copy. |
| Firebase 10.12.2 app compat | cdnjs, lazy cloud setup | Matching npm package declares Apache-2.0; [SDK licence](https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE) also contains third-party notices | Preserve applicable licence/NOTICE content for the exact distributed bundle. Cloud disabled by empty configuration today. |
| Firebase 10.12.2 auth compat | Same CDN/version | Same evidence | Same; service terms are separate from SDK licence. |
| Firebase 10.12.2 firestore compat | Same CDN/version | Same evidence; upstream includes protobuf BSD notice | Check bundled third-party notices, not just package-level SPDX. |
| Barlow 400/600/700 | Google Fonts CSS → fonts.gstatic.com | [Barlow Project OFL.txt](https://github.com/jpt/barlow/blob/main/OFL.txt), SIL OFL 1.1 | Include copyright and OFL when bundling. Current CSS request is not an immutable font binary pin; archive chosen WOFF2 files and hashes for downloadable release. |
| Barlow Condensed 600/700/800 | Same Google Fonts request | Same family project, OFL 1.1 | Same. |
| System fallback fonts | system-ui, -apple-system, Segoe UI, Arial Narrow, Arial, Helvetica, sans-serif; CSS and canvas text | Resolved from the user's device; no font files supplied by this repo | Do not copy OS font binaries into the release. Use licensed bundled Barlow for consistent downloadable rendering if needed. |

MIT permits commercial distribution subject to its notice condition. OFL permits software bundling under its conditions, including retaining licence/copyright and not selling the font alone. Firebase's package declaration does not replace review of its embedded notices. Sources were checked alongside local dependency metadata; latest upstream Firebase licence is not proof of every historical bundle's exact contents.

## Recorded music — clearance remains open

The source comment describes these as Google Flow Music tracks; `docs/world-plan` says the exact tool/account/plan is still unconfirmed. No generation receipt or commercial-use licence is committed. Do not infer clearance merely from a paid subscription or that comment.

| File | In-game title/use | SHA-256 |
| --- | --- | --- |
| `audio/showroom.mp3` | Mediterranean Showroom; garage/dealer | `01b88c0f085e7887b518ad10937c6d48d25deaf149cccf6e6e36dce49cbf5248` |
| `audio/cruise.mp3` | Coastal Cruise Loop; driving | `1bf54392a3e8b6c8202351e3632c2381605bde0994d580edd69123a9e5d6f26f` |
| `audio/highway.mp3` | Island Highway Run; racing | `c276a8b73f2bdad5ca67f013df7ccb1795404ff084578fe4e9e7602ffa53879e` |

For each file record: actual generating product/model, generation/export date, account plan at generation, output identifier, source inputs, and applicable terms/version. Keep account receipts private; public credits need only attribution required by the actual licence. Until this evidence exists, status is **unverified**, not “free to sell”.

## Code-generated sound and imagery

No tracked raster image, external 3D model, sampled sound-effect file or bundled font file was found. Assets below originate in index.html code; that establishes implementation source, not independent proof of authorship. Confirm inherited White Isle Drive code/assets and any contributor or generator terms.

| Asset group | Generators/content | Source/licence status |
| --- | --- | --- |
| Engine, tyre/skid, brush, impact, UI beep | Web Audio oscillators, generated noise buffers, filters | Repository code; no imported sample found. Project licence/ownership record absent. |
| Fallback procedural music | `makeMusic`: Cala Lounge and Coast Road; generated instruments/reverb/sequencing | Repository code describes these as original; provenance evidence still belongs in release records. The old comment saying “no audio files” is contradicted by the three MP3s used later. |
| Favicon | Inline road-symbol SVG data URL | Repository markup; no external icon package found. |
| Sky/cloud/terrain | `cloudTex`, `groundDetailTex`, terrain vertex colours | Canvas/noise generation in repository. |
| Roads and buildings | `asphaltTex`, road gutter canvas, `windowTex`, lighting pool gradient | Repository canvas generation. |
| House/dealer screens and signs | `tvTex`, Auto Gallery canvas sign | Repository drawing code and system font text. |
| Vegetation/water | `grassTex`, `waveNormalTex`, `foamTex` | Repository procedural textures. |
| Stone and road signage | `stoneTex`, `signAtlas` | Repository drawing code; signs use Arial/Helvetica fallbacks. |
| Car surfaces/instruments | metal texture, `gaugeTex`, environment map, body/material canvases, plate textures, wheel badge canvas | Repository drawing code; inspect actual badges, silhouettes and plate wording as well as make/model strings before sale. |
| Light/smoke/race graphics | radial sprite texture, smoke canvas, finish banner canvas | Repository drawing code. |
| HUD/maps/icons | CSS, canvas paths, text and Unicode symbols | Repository code; fonts above; no separate icon library found. |
| 3D world and vehicles | Procedural scenery, boats, player walker, traffic, hero cars | Repository geometry construction. Real car names remain; see CAR_NAME_PROPOSAL.md. No third-party model file found. |
| Photo mode outputs | Runtime screenshots generated from the scene | Derived from all displayed assets; no independent asset clearance. |

## Tooling and transitive dependencies

[DEPENDENCY_INVENTORY.md](DEPENDENCY_INVENTORY.md) lists all 173 lockfile package entries with version, declared licence and registry source. Direct tooling: @playwright/test 1.63.0 (Apache-2.0), ESLint 9.39.4 (MIT), globals 15.15.0 (MIT), plus the Firebase/three packages used to serve matching offline test fixtures. These are development dependencies, not a reason to include node_modules in a game package. Browser binaries and CI runner software are external test infrastructure and not shipped assets here.

The lock inventory is metadata, not a full notice bundle. Before shipping any package beyond index.html/audio and chosen vendored runtime files, inspect its actual licence files and embedded notices. No broad “all assets cleared” conclusion is supported by this repository.

## Release blockers and records

1. Resolve the three MP3 provenance/permission records or replace them with documented assets.
2. Approve fictional vehicle names and separately review visual vehicle references.
3. Prepare THIRD_PARTY_NOTICES and licence copies for the exact release files; pin/hashes for fonts and vendored JS.
4. Confirm ownership/contributor permissions for inherited project code and generated assets. Missing project LICENSE does not require making the game open source; it means this audit cannot infer a distribution grant from the repo.
5. Capture a final shipped-file manifest with hashes. Re-audit additions from boat/city work rather than treating this snapshot as permanent.
