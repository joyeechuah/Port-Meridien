# Step 4 — Weapons, health, arrest and violence settings (decision draft)
Date: 15 November 2026. **Design only. No implementation or policy selected.**

## Boundary: existing systems
The merged island supports player walking (`FOOT`), driving (`P`), boats (`BOAT`), ambient NPCs (`PEDS`), and a pending police/wanted feature (#28). That feature provides police chases, on-foot officers and a 500 CR × wanted stars fine; it currently clears wanted when caught, has no combat/health, and excludes arrests at sea. A separate #29 reverses the foot/boat steering sign and adjusts phone HUD/wake; do not make Step 4 depend on unmerged logic. A new weapons system must not bypass wanted restrictions, overwrite vehicle damage or turn save files into broken states.

## Owner decisions — deliberately unanswered
| Decision | Questions to decide before any code |
|---|---|
| Scope of combat | Are weapons available to the player at all? Nonlethal tools only, stylised firearms, or a broader inventory? Can enemies/police use the same categories? |
| Allowed targets | May the player target only enemies, also officers, also civilian pedestrians, vehicles, or nobody outside missions? Should civilian NPCs be completely invulnerable? |
| Visual intensity | No visible injury, stylised hit effects, or blood/gore? May bodies fall, disappear, or recover? |
| Violence setting | Always one fixed age-appropriate version, or a setting controlling blood, effects, audio and ragdoll? Should it default to minimal and persist across sessions? Should controls be parental/age-gated? |
| Health | Player-only health, shared NPC/player health, or stamina and temporary incapacitation? Starting values, regeneration, health pickups and healing cost? |
| Death/defeat | When health reaches zero, respawn safely, checkpoint reload, hospital/cost, or arrest? Which progress, contracts, stolen vehicles and credits survive? |
| Police capture | Retain immediate fine at 500 CR/star, convert to arrest screen, or escalate based on actions? How do foot-officer and patrol-car captures differ? |
| Weapons ↔ wanted | Does aiming count, firing count, hitting a target count, or only police-witnessed acts? Distinguish accidents and justified defence? |
| Inventory | Number of slots, pickups, purchase/sales, permitted use on foot/in vehicle/boat, storage, saves and ammo persistence? |
| Platform target | Are CrazyGames/Poki family-oriented distribution targets, or is mature-rated Steam/itch.io a priority? Should platform-specific violence builds be maintained? |
| Age/content disclosures | Which intended rating and regions, and who prepares official content surveys/rating declarations before shipping? |
| Accessibility | Controller/touch aiming, remapping, motion comfort, flash suppression, sound controls and clear non-graphic feedback? |

No decision above is implied by this proposal. A "violence OFF" toggle cannot silently remove essential mechanics if a level requires them; specify deterministic alternatives and test both variants.

## Proposed architecture for evaluation, not implementation
- Isolate gameplay rules from effects: `COMBAT_CONFIG` and `VIOLENCE_POLICY` are serialisable settings; visual/sound intensity does not silently change hit detection or score. Prefer a mode-independent `activeActor()` adapter rather than duplicating damage logic in foot/car/boat branches.
- Single authoritative player health `HEALTH` distinct from `P.damage` (vehicle wear); never subtract twice for the same collision in a single simulation frame. Validate health clamping, invincibility windows, save schema migration and respawn location.
- A single `capture(reason,source)` transaction handles wanted clearing, fines, health changes and recovery exactly once, including simultaneous officer + car capture. Keep the current `copCaught()` behavior until a new policy is approved.
- Collision and safety: use time-of-impact or swept checks for fast-moving entities; handle NPC invulnerability and collision resolution consistently with pedestrian safety claims. Keep projectiles/effects capped, pooled and disposed. No heap/scene growth during a 10-minute encounter loop.
- Prevent starting combat in races, tutorials, test drives, pause/photo/map, inactive tabs and menus unless explicitly approved. Never fire from pointer releases belonging to an old touch session.
- Use original/licensed animations and audio. No external assets introduced by this document.

## Sequencing and test gates
1. **Decision record approved**: owner fills all open questions; target platforms chosen; intended age descriptors documented.
2. **Health/arrest model only**: deterministic save migration, damage accounting, loss/respawn screen and fine-once regression, with no weapons.
3. **Input/state prototype**: single optional action, touch/controller/keyboard behavior, accessibility and camera, no civilian interaction by default until target rules approved.
4. **Violence presentation**: implement only approved visual/aural levels and verify both settings (screenshots, physics parity and descriptions).
5. **Police integration**: wanted escalation, foot officers, car pursuit, chaser cleanup and escape; stress-test crowded Old Quay and junctions.
6. **Release gating**: platform-specific content forms, artwork and music rights, device performance, age-disclosure audit.

## Acceptance coverage
- 10-minute busy-city test with repeated capture/death/respawn → stable mesh/audio/context counts; no duplicate debit or invulnerability carryover.
- A caught player cannot reach house, dealer, fast travel or free repair through any alternate button/state callback before wanted clears.
- Every supported input (touch landscape/portrait, keyboard, controller) behaves consistently; pause/background and network disconnection do not change player state.
- Off/low/intense violence setting (if selected) changes only permitted presentation, without bypassing content declarations or cheating gameplay.
- Civilian and officer behavior, accessibility, soft-lock handling and economy impacts are explicitly asserted before release.

**Status:** Questions open. Nothing in this document authorises weapon, health or arrest implementation.
