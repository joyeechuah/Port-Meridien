# Audio design: walking, footsteps and boat (no implementation)
13 November 2026. Sound design proposal only; do not change the Web Audio graph or ship sounds without separate approval.

## Existing mode ownership
`driveUpdate()` delegates to `footUpdate()` while `FOOT.on` and to `boatUpdate()` while `BOAT.on` (PR #12). Car `audioUpd` is called from `updateHUD()` only during driving. The synthesised car engine may continue at its previous values while walking/boating because mode entry does not explicitly crossfade the car's audio nodes. Keep `save.sound`, background-tab ownership, pause, map, photo and user gesture restrictions authoritative.

## Car fades with distance, not just mode
- A stopped/parked player's car can idle audibly near the walker. Relative distance `d = hypot(activeListener.x - P.x, activeListener.z - P.z)`; target gain: **1.0 below 4 m**, interpolate to 0.25 at 20 m, **0 by 65 m**. These are tuning suggestions, not measured constants.
- Use one persistent car-engine graph with gain automation over ~0.25–0.5 s. No nodes per frame; do not disconnect/rebuild each mode switch. Avoid clicking when entering/exiting vehicles.
- A taken car replaces the active engine owner; car meshes in `LEFT` are parked, silent by default. If individual idling engines are added later, cap the voice count; only play the nearest. Avoid accidental double-engine audio.
- Car audio fades to its parked ambience while on foot; when aboard the boat it goes to zero (unless parked audibly nearby) and the boat engine fades in.

## Footsteps
- Trigger cadence by **actual horizontal distance moved on a valid walkable surface**, not by W being held: walking ~1 step/0.8 m, running ~1 step/1.25 m (to tune by appearance). No sound when blocked by sea/pier barrier, stationary, frozen, in car or in boat.
- Surface lookup: town pavement, generic ground/beach, and `onPier(x,z)` = wood; map contact via current position and `footGround`. Distinct soft footstep timbres; limit concurrency and random variation; pause/photo/map must freeze cadence.
- Use original/licensed recordings or lightweight synthesis, not unverified reused media.

## Boat engine, hull and water
- Synthesise or license a small outboard motor: very low idle, power-dependent pitch/rpm and controlled noise; raise gain with throttle and speed, keep smooth transition between forward, coast and reverse.
- Small hull slap/water hiss at speed, filtered near shoreline; short splash or wash accents on turns; avoid sounding like a road car.
- No jet/propeller sound on land and no engine when player leaves the boat. `BOAT.v` and throttle are source values; boat wake rendering is independent of audio.
- Suggested source chain: oscillator + filtered noise → lowpass/drive → gain → sound effects bus. Use gain automation, no new oscillator every frame, and respect global mute.

## Acceptance before coding
1. Walk 0→10→40→75 m from idling car; monotonic falloff, smooth return and no duplicate oscillators.
2. Walk/run/stand/blocked terrain and wooden pier; footsteps only on actual movement, matching cadence and surface.
3. Board/accelerate/coast/reverse/land; clear boat pitch and clean transitions; no car audio stuck on at sea.
4. Test all menu states, Photo Mode, tab takeover and sound OFF/ON; no audio after inactive-tab ownership loss.
5. Profile mobile CPU and AudioContext count. Record audio asset provenance/licensing before any commercial build.

Status: **design awaiting approval**. No audio/gameplay code is changed in this PR.
