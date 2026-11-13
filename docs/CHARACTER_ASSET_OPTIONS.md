# Rigged character art options for Port Meridien
13 November 2026 — asset evaluation only. No model selected or licensed source downloaded.

## Recommended technical format

Use **.glb (binary glTF 2.0)** with embedded textures, a humanoid rig and clips for idle/walk/run/turn. A glb is a **separate local static asset**, not inline base64 inside the existing `index.html`. The app remains a one-HTML-page *code entry point*, but a model file belongs under `assets/characters/`; its path is loaded at runtime with a three.js **r128-compatible** `GLTFLoader` script from the same trusted version. Don't import a loader from current latest three.js against an r128 `THREE` namespace. For a strict one-file *distribution*, convert the GLB to a data URI at build/packaging time, rather than bloating hand-maintained shipping HTML.

Pipeline: source glTF/FBX → inspect license and author → Blender (if conversion needed) → embed/compress model/textures → GLB → `GLTFLoader` → `SkeletonUtils.clone` for skinned NPC instances if needed → `AnimationMixer` / AnimationActions (idle, walk, run). Keep the player's capsule, camera and `footGround`/collision authoritative; the visual rig is not physics. Load once, reuse base geometry and texture resources; dispose per-instance mixer/scene ownership appropriately.

**Provisional mobile performance budget**, subject to measurement (not a supplier promise): aim for <= 5–15k triangles per unique player mesh, <= 1–2 material draws, 512–1024px atlas, GLB <= 2–4 MB after texture/geometry optimization and a small shared locomotion clip set. Prefer lower-detail NPC versions and far-distance LOD/impostors. Require measured download bytes, 10-minute GPU/memory plateau and p95 frame time on actual Android hardware before adopting.

## Three candidates

| Option | Official source / licence | Art and animation | Port Meridien fit | Risk / trade-off |
| --- | --- | --- | --- | --- |
| **A. Quaternius Universal Base Characters** (recommended pilot) | https://quaternius.com/packs/universalbasecharacters.html — source declares **CC0**, 6 base humanoids, 20 hairstyles and glTF/FBX formats. Average ~13k triangles reported by creator. | Rigged and retargetable; pair with Quaternius Universal Animation Library (check its particular license/format). | Strong urban adult NPC/player prototype; consistent full-body rig; direct glTF and no upfront licensing fee for CC0 assets. | ~13k tris can be heavy for 12–24 simultaneous NPCs without LOD; stylised, not truly photorealistic. |
| **B. Kenney Animated Characters Protagonists / Retro** | https://kenney.nl/assets/animated-characters-protagonists and https://kenney.nl/assets/animated-characters-retro — both pack pages label **CC0**. Kenney general CC0/commercial support: https://kenney.nl/support . | Prebuilt animated, low-poly characters; downloads documented as FBX plus textures, so conversion to GLB is needed. | Lightweight style and faster test of imported/skinned animation; ideal fallback for weaker phones. | Not lifelike; simple styling may still feel toy-like next to realistic cars; extra conversion step. |
| **C. Adobe Mixamo rig/animation route** | https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html — Adobe says characters/animations can be used royalty-free in video games including commercial projects. | Choose a humanoid character and animations, or upload your own; export FBX, convert/retarget to GLB. | Best for improving gait and upper-body motion quality (natural idle/walk/run), potentially pairing with a separate character author. | Asset provenance/restrictions must be documented per exported character; retargeting increases rigging and pipeline complexity. Source FAQ is dated; reconfirm terms before release. |

This is a **source comparison, not permission to copy any trademarked character or commercial game figure**. Confirm the exact pack/download license file, date and author; store evidence and exported-asset hashes in `docs/licenses/`. For Adobe/Mixamo retain your account/export evidence and restrictions.

## Implementation sequencing (after owner selects a candidate)
1. Keep PR #15 procedural character as safe fallback. Test just one GLB on screen at normal/running speed, inside the same player capsule and camera.
2. Add an asset loader helper: version-pinned r128 `GLTFLoader`, loading/error fallback, skeleton and animations. Do not replace the one-page game architecture or add a build system unless the cost is justified.
3. Match scale to 1.76m character at idle; feet at `FOOT.y`; no drift from root motion; clamp play speed to `FOOT.v`. Blend in-place locomotion clips through `AnimationMixer`.
4. Protect frame time with a cache, texture limit and explicit NPC budgets before using the same asset for all crowd members; avoid a new complete skeleton mesh per frame.
5. Accessibility and input tests stay unchanged; add asset load/failure, mode switching, pause/photo, close-up shadow/material, 10-minute resource plateau and mobile landscape renders.
6. Include licence evidence, attribution if the particular asset requires it, and reject anything with unclear ownership.

### Reference sources
- three.js guide recommends glTF and explains models, skins, morphs and animation support: https://threejs.org/manual/#en/loading-3d-models
- three.js GLTFLoader docs: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- three.js animation system manual: https://threejs.org/manual/#en/animation-system

**Recommendation:** Test A for city-compatible proportions; B as a performance reference; C for motion improvement if procedural animations still look artificial. None has been imported or performance-tested in this project.
