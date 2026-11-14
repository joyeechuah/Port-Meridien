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
