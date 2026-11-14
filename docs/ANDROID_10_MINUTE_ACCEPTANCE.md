# Ten-minute real-phone acceptance checklist
Date: 15 November 2026. Intended for the publicly deployed **Port Meridien** build on a physical Android device after PR #29 and #28 merge. Do not use it as evidence for unmerged features or call an emulator a physical-device test.

**Test record:** phone/model ___ · Android version ___ · Chrome version ___ · build commit ___ · date/time ___ · network ___ · battery ___% · screen orientation ___ · device thermal condition ___ · sound ON/OFF ___ · graphics AUTO/SHARP/SMOOTH ___.

Track each item as PASS / FAIL / NOT TESTED, attach screenshot or screen recording and note repro sequence. Measure with an on-device FPS overlay or browser/devtools if available; otherwise describe visual stutter without inventing an FPS number.

| Time | Procedure | Pass criteria | Result / evidence |
|---|---|---|---|
| 0:00–1:00 | Cold-open game with site cache/storage state noted; record when title, garage and first interactive frame appear. Press START then DRIVE. | No blank frame, crash, severe multi-second freeze or missing textures; record loading and first-drive timing separately. | ___ |
| 1:00–2:00 | Drive, brake and reverse; walk out, tap right then left, run, re-enter. Compare touch steering direction with car; walk near wall. | Right moves view/character right, left moves left; no stuck movement, wrong re-entry or unexpected clipping. | ___ |
| 2:00–3:00 | Drive the access lane to pier, leave car, walk beach→pier between bollards, board boat using touch. Sail, turn right and left, reverse, approach and step off. | Boat steering matches controls; visible wake tapers behind the stern, not a rigid glowing wedge; no pier/sea clipping; boat motor follows throttle/speed. | ___ |
| 3:00–4:00 | Damage car enough to reveal DAMAGE; inspect portrait 390-ish CSS px and landscape HUD. Switch graphics mode if safe; open and close minimap. | Minimap sits below location/clock and above messages, not hidden by damage/wanted indicators; touch pads and prompt remain readable. | ___ |
| 4:00–5:00 | Ride through Old Quay market/shops/square in moderate traffic; watch 6 mobile pedestrians cross and traffic yield. | No major frame drops, unexpected stuck traffic, NPCs inside houses or crossing through stationary cars. Count NPCs only if visible, not automatically 6. | ___ |
| 5:00–6:00 | With a patrol nearby, commit a police-visible speeding or low-speed collision in free roam. Observe stars, siren and chase car. | Correct level and clear HUD; police can turn at junctions, avoid obviously impossible teleportation and follow through urban traffic. | ___ |
| 6:00–7:00 | Park with pursuing cop close, allow capture. Record pre/post credit balance. | Single fine of 500 CR per star (never more than balance), wanted stars vanish and legal activities reopen. | ___ |
| 7:00–8:00 | Trigger wanted again, open Pause → Vehicle Condition. Check RETURN HOME disabled, dealership/race inaccessible. | No free-garage escape; controls visibly explain restriction. | ___ |
| 8:00–9:00 | Leave car near road while wanted, run off-road; let a patrol stop. Watch officer exit, pursue around obstacles; outrun beyond 48m or drive/sail away. | Officer follows on foot without perpetual wall stalemate, can catch when allowed, returns to cop car on escape; no repeated fine. | ___ |
| 9:00–10:00 | Trigger chase and outrun police beyond 110m, holding distance for 6+3×stars seconds; then revisit house/dealer/map. | Stars blink and clear after the correct loss interval; menus reopen; no stale officers, sirens or hidden cars left behind. | ___ |

**Quick diagnostics:** note warm-up timer/log if visible, peak browser memory only if observable with a device tool, approximate battery/heat changes and first 10-minute FPS range (measured values only). Save screen recordings of a wake defect, minimap overlap, steering reversal, freeze, chase path bug or duplicate fine.

**Interpretation:** a PASS in this ten-minute walkthrough is smoke-test evidence, not a 30–60-minute soak, thermal profile, accessibility assessment, or commercial-store certification. Repeat both orientations and at least one low-spec Android before wider launch.
