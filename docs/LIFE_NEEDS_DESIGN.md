# Step 5, part 2: needs and moods

**Status: approved by Jo Yee (23 Nov 2026) and built** (`js/life.js`). Needs give free play a reason to stop at home, spend time at the quay or call on a friend. All numbers below are starting values for playtesting. How the build settled the points this page left open is under [Built](#built) at the end.

| Need (100 is full) | Start | Loss per active game hour | Recovery |
| --- | ---: | ---: | --- |
| Energy | 80 | 3 | Choose Rest at the house for +40 once. Sit on an Old Quay bench for +3 per 5 continuous simulation seconds, up to +15 per visit. |
| Hunger (100 means fed) | 75 | 2 (5 until Jo Yee's change on 24 Nov 2026) | Eat at a proposed counter beside the Old Quay market for +35. The basic meal is free, including at zero credits. |
| Fun | 65 | 3 | Finish a race for +15 once per result, regardless of placing. Driving at or above 80 km/h or sailing at or above 3 m/s awards +1 per 5 continuous simulation seconds. |
| Social | 65 | 2 | In a conversation, the first accepted non-rude line with a positive friendship change gives +8; opening, repeating, or saying goodbye gives zero. |

## Working decisions

| Question | Recommendation |
| --- | --- |
| Which clock? | Use simulation dt for active DRIVE, including walking, sailing, races and contracts. One needs-hour is 30 simulation seconds at every time of day, matching the normal daytime clock. Apply decay and activity rewards independently of the visible clock, its night acceleration, photo presets and changes across midnight. Pause in menus, garage, wardrobe, photo mode, loading and background tabs. Never catch up from wall time. |
| Repeated actions | House rest and meals require a deliberate press. After a successful gain, each has a separate 30-active-second cooldown. A bench visit ends on movement or danger. Releasing and re-pressing at the same bench does not reset its cap until leaving its interaction radius. A social award locks that person for 30 active seconds across conversations. A speed reward restarts its five-second interval when speed drops or mode changes. Count a race reward only at the existing result transition. |
| Which mood? | While actively wanted, show Tense. Otherwise the lowest need at or below 25 gives Tired, Hungry, Bored or Lonely; ties resolve in table order. Keep that mood until its need reaches 35, unless a different need falls to 15 or below and is lower. With no low mood, use Content when all four are at least 70, otherwise Okay. Derive mood on load; no saved mood or catch-up timer. |
| What does a mood do? | Give one contextual suggestion in the needs panel. No forced stops or speed, steering, aim, friendship or payout penalties. At zero a need stays at zero and its remedy remains available. |
| How does it meet policing and health? | A chase interrupts bench use and blocks starting rest, meals or a bench interaction. Preserve earned gains. Existing police timers, health, arrest, fines and knock-out rules own their outcomes. A forced trip home grants no rest bonus. First-aid kits heal health only. Needs create no damage, wanted stars or immunity. Contracts continue normally. |
| Phone and inputs | Put Needs in the pause menu with four labelled 0–100 bars, numbers and the mood in text. In free roam only, show at most one brief low-need hint after crossing a threshold. Rearm at 35, suppress during action, dialogue or another modal, and never stack over score, map, car or walker. No permanent HUD bars. Provide keyboard, controller and touch access, 44 CSS px controls, safe-area padding, scrolling at large text sizes, focus restoration and a text label for every colour. |
| Where are the venues? | Use the existing house and plaza benches. Propose one food counter at the market edge facing the pedestrian walkway, with an interaction point on the accessible side. Add venue art to existing tile batches after approval. Reuse existing footprints or decorative clearance, leaving roads, route samples, existing collision shapes, crossings and the fountain kit accessible. |
| Save and cloud | Proposed optional field: `needs: {v:1, energy:80, hunger:75, fun:65, social:65}`. Require a plain object and the supported version. Default missing, nonnumeric or nonfinite fields individually; clamp finite numbers to 0–100 and round to integers when serialising. Reject arrays and unknown keys. Keep fractions in memory; use existing save checkpoints and persist discrete venue rewards. Transient cooldowns and partial intervals are session-local. |
| Which cloud copy wins? | Carry needs with the whole save selected by the existing conflict resolver. Exclude needs from the progression fingerprint and fresh-save check. On equal progression, a passive needs difference alone must neither trigger a conflict nor overwrite a newer remote needs snapshot with stale local data. Preserve the remote snapshot on preference-only uploads unless this device has an explicit needs change since the last sync. Legacy absence and clean defaults compare equally. Never merge per-field maxima. |
| Multiplayer | Needs are personal save data. A remote avatar's speed, dialogue or visit earns nothing locally. Use no new room fields or network writes. |

## Acceptance tests

- Clock: replay identical activity at 30, 60 and 120 fps. After two active hours from defaults expect 74 energy, 71 hunger, 59 fun and 61 social before rewards. Check menu, hidden-tab, frozen sky and midnight cases.
- Rewards: exercise each normal input path, caps at 100, the zero-credit meal, race finish versus abort, interrupted bench use, speed boundaries and reconnecting to a person during cooldown. Repeated input in one frame awards once.
- Safety: repeat with an active delivery, police pursuit, arrest and knock-out. Check the existing timer, fines and health, and that a forced return home does not count as rest.
- Saves: round-trip zero and 100, legacy saves, malformed values, arrays and unknown versions. Test equal-progress divergent needs, an older local save plus a preference change, and both explicit cloud choices with different friendships and needs.
- Presentation: test 360x640 and 640x360, long text at 200%, safe areas, touch, keyboard-only and D-pad. Include a live courier HUD and wanted stars. Verify focus returns to Pause after closing Needs.
- World and multiplayer: render the counter and benches on a phone, approach from both sides and walk past them. Compare route fixtures and colliders with main; verify a second room client earns no local recovery.

Approval covers the table as a unit. Venue implementation and dialogue content ship separately.

## Built

| Point | As built |
| --- | --- |
| Rest at the house | **REST** in the garage, beside MUSIC and PISTOL: +40 energy, then RESTED until 30 s of play have passed. A controller's X does the same. Arriving home by GO HOME, a knock-out or an arrest gives nothing by itself |
| The bench | The six benches round the civic square's fountain. On foot the prompt says "Sit on the bench"; you sit facing the fountain and the prompt becomes "Stand up · energy". Walking, turning, E, getting hurt or the police get you up. The pistol is held while you sit, as while talking |
| The food counter | The Market Kitchen: the market stall nearest the avenue's arch on the east side, with a yellow and white awning, a pot, bowls and bread, and KITCHEN boards facing the aisle and the arch. Its counter, posts and collider are the stall's own. The prompt is "Eat at the Market Kitchen · free", and it serves at any balance |
| Races | Time trials count as well as races: both end at the same result |
| The map | The map shows the Market Kitchen and the benches, with a line each in its key, so a hint can be followed |
| Hints | A short message in the usual message column, only when no other message is showing |
| Pause menu | **NEEDS · <mood>** under PHOTO MODE. The screen lists the four needs, each with its bar, number and a word for its colour (Very low, Low, Okay, Good), then the mood and one suggestion. A controller's D-pad now moves through the pause menu and the screens opened from it, and A presses the button picked |
| Cloud | `CL_PREFS` includes `needs`. The cloud note keeps the needs this device last synced, to tell whether its own changed since |
