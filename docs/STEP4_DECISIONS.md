# Step 4 decisions: weapons, health, arrest and the violence setting

**Status: working decisions.** Jo Yee chose on 15 Nov 2026 to "use your suggestions first at the moment". Every line below can change; nothing here is final until the game is rated for sale. It answers the questions in `docs/WEAPONS_DESIGN.md` (pull request #30).

## The five main choices

| Question | Decision for now |
| --- | --- |
| Platforms first | Steam and itch.io, rated for mature players. Not CrazyGames or Poki (they don't allow graphic violence); a milder version for them may come later |
| What can be shot | Police officers, police cars and other cars. Pedestrians are knocked down, never killed, and get up again |
| How graphic | Stylised: sparks and a flash where a shot hits, people fall. No blood by default. A setting turns effects down or up |
| Zero health | You wake up at your house and lose 10% of your credits (at most 5,000). Taken cars are gone; a contract in progress ends; the wanted level clears |
| Police capture | Keeps the fine. Once you have a weapon, being caught is an **arrest**: the fine, the weapon taken away, and you start again outside the Harbour Hall |

## The other questions

| Question | Decision for now |
| --- | --- |
| Scope | One weapon to start: a pistol. Others (a rifle) later. Police officers on foot draw the same pistol at three stars or more |
| Health | Yours only to start: 100. It slowly returns to 50 when nobody is shooting at you; full again at the house |
| Inventory | The pistol is kept at your house: take it from the garage. 48 rounds, refilled at the house. On foot only (no shooting from cars or the boat yet) |
| Weapons and the wanted level | Only what the police see counts, as now. Firing near the police: 1 star. Hitting a car or a person: 1 star. Hitting the police: 2 stars. Each further crime adds a star, up to five |
| Violence setting | Three levels in the pause menu: **Low** (no one falls; a hit only flashes), **Standard** (the default: people fall, no blood), **Strong** (adds small red hit marks that fade). Saved with your progress |
| Age and content disclosures | Jo Yee fills in the Steam content survey and itch.io's content settings before release, describing the Standard and Strong settings |
| Accessibility | Aiming locks onto the nearest target in front of you on touch, controller and keyboard; a setting turns off the muzzle flash and screen flashes |

## First slice to build

1. Health, and waking at the house at zero.
2. The pistol: taking it from the garage, aiming with lock-on, firing, ammunition, refilling.
3. Shooting cars and police cars (they stop when badly damaged); knocking pedestrians down; the wanted-level rules above.
4. Officers at three stars draw and fire back; arrest replaces the fine once you carry the pistol.
5. The violence setting, with tests for each level.

Each step is its own pull request with tests, after #28 (police) merges.

## Part 2: working decisions (16 Nov 2026)

Jo Yee chose "use your suggestions" for the questions in `docs/STEP4_PART2_QUESTIONS.md` (pull request #34). As with part 1, these are working choices and may change before release.

| Question | Decision for now |
| --- | --- |
| Police cars shooting | At **four stars or more**, a chasing police car within 30 m, with a clear line to you, fires every 1.5 s. At most two police cars fire at once. They never fire at anyone else, nor from a wrecked car, a car no longer chasing, or at you on the boat |
| What their hits do | In a car: damage to your car (6 a hit; it slows and finally stops it, as crashes do). On foot: 8 health a hit. Never both |
| Their accuracy | About one shot in three hits at 10 m, fewer further off, the same as officers on foot. No difference by phone or graphics setting |
| Shooting from a car | Yes, while driving or stopped, with the same lock-on, forward only (about 35°), and the same controls (`G`, the FIRE pad, the right shoulder). Your own car doesn't block your shots. Not during a race or a test drive |
| Shooting from the boat | Not yet |
| Health pickups | **First-aid kits** at four fixed places: the civic square, the harbour lane, beside your house, and the Auto Gallery. Walk or drive over one: +50 health, up to 100. Each comes back 2 minutes after it is taken. Shown on the minimap as a small green cross when within 150 m. Recovery to 50 when nothing hurts you for 6 s stays as it is |
| More weapons | Not yet: the pistol only |
| Arrest | As in part 1: if you took the pistol from the garage, being caught is an arrest, whether you are on foot or in a car and whatever rounds are left |
| The police's own rounds | Unlimited; they reload nothing |
| Limits | At most two police cars and one officer firing at once; six sparks and six marks on screen at a time (as now) |
| Settings | VIOLENCE and FLASHES apply to police fire as to yours: FLASHES OFF hides their muzzle flashes and the red flash when you're hit, and changes nothing else |
| Content disclosures | The Steam survey and itch.io settings describe police firing at the player as well as the player's pistol |

## Part 2 to build

1. Shooting from a car.
2. Police cars firing at four stars.
3. First-aid kits.

One pull request, with tests for each, after #32 merges.
