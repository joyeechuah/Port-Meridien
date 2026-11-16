# Step 4, Part 2 — decisions needed before gameplay changes
Date: 15 November 2026. **Questions only. Nothing selected or authorised.**

## Existing decisions that remain in force unless explicitly changed
The merged Step 4 first slice includes an on-foot pistol with 48 rounds/garage refill, 40 m lock-on, six-second nonfatal civilian and officer down states, witnessed shooting offences, officer return fire at three stars, 100 player health, knockout at 0, arrest while carrying a pistol, and saved LOW/STANDARD/STRONG violence plus FLASHES ON/OFF. Refer to `docs/STEP4_DECISIONS.md` for the owner's **working**, not final, choices. Any new weapon, shooting source or health pickup must preserve these existing rules unless the owner changes them.

## 1. Police cars shooting
- Should any pursuing car fire, or only at a particular star threshold? Does a police car need a clear line of sight, or is proximity sufficient?
- May officers shoot through a windshield, from a passenger window, or only after their car stops? Are there separate passenger officers?
- Can a moving player vehicle be hit? Should bullets affect **player health**, **vehicle damage**, or both? How is double damage prevented?
- When the player is on foot, should police cars fire or deploy foot officers instead? May they shoot toward civilian NPCs or other traffic?
- What range, accuracy, shot cooldown, damage, warning time, and difficulty scaling are acceptable? Are they capped on low-end phones?
- What happens to firing when the patrol car becomes wrecked, stops chasing, loses line of sight, passes an occupied junction, or the player boards a boat?
- Is there a maximum number of simultaneously firing police vehicles, and should an accessibility setting suppress flashes without changing hit mechanics?

## 2. Shooting from cars and boats
- Can the player shoot **while driving**, while **stationary inside a car**, while **riding as passenger**, or only with a separate aim mode?
- Should steering, camera aim, target lock and fire controls share the same touch/gamepad buttons, or must the player choose a shooting mode?
- What happens when control mappings conflict with handbrake, rear-view, Photo Mode, touch rotation and controller right shoulder?
- Should firing be possible only from a side window/forward cone, or in a full 360° arc? Can bullets pass through the player's own car?
- Who receives damage when a shot returns through the window? How do vehicle damage and player health interact?
- Should boat shooting be available while moving, idling, at the pier, or never? Would water/boat cover affect ray/line of sight?
- Can shots begin/continue during racing, timed contracts, test drives, police arrest, respawn fades, background tab pause or game menus?
- Does an automatic lock-on choose police, cars or pedestrians first? Can the player opt out of locking onto civilians?

## 3. Health pickups and healing economy
- Are healing items freely found, purchased, rewarded by missions or tied to fixed service points?
- Do pickups restore a fixed amount, a percentage, or full health? Is there a maximum inventory size?
- May the player collect them while driving, boating or wanted? Can they be used while shooting or being shot?
- Does existing passive recovery (to 50 after six quiet seconds) remain unchanged? Can a pickup heal above 50 or provide temporary protection?
- On arrest, knockout, fast travel, save reload, car change or contract failure: are pickups lost, preserved or refunded?
- Should pickups respawn by time, each new session, mission completion, or never? What prevents unlimited farming?
- How will their locations be shown without cluttering the minimap or the mobile HUD?

## 4. Additional weapons
- Which category, if any, comes next: another pistol variant, slower rifle, shotgun, or only a nonlethal alternative?
- Does each use its own ammo pool, pickup rules, range, cooldown, hit strength, accuracy, recoil and animations?
- What inventory capacity is allowed? May players carry multiple weapons or only swap one at the garage?
- Are weapon upgrades, shops, prices or reload animations in scope? Where does ammunition come from?
- Should different weapon types change wanted escalation (e.g., carrying/brandishing, firing, hitting police or civilians), or keep the same one-event-per-four-seconds policy?
- Do all weapons use the same civilian nonlethal six-second down rule, regardless of strength?
- How should all options behave under LOW/STANDARD/STRONG violence and FLASHES OFF?
- Are distinct assets/sounds required, and is their provenance/licensing evidence available before distribution?

## 5. Cross-cutting decisions
- Does arrest always trigger if the player **has a gun selected at the garage**, even if its ammunition is empty or they are currently in a vehicle? Or only when physically holding it on foot?
- Should the police have finite ammo/reload and obey the same civilian-safety rules?
- What are the maximum simultaneous projectiles, visual effects, objects and active pursuers on Android?
- Should any option require a revised content rating, Steam survey entry, or separate family-friendly build?
- Which combinations must be tested with health = 0, wanted = 5, a disabled police car, damaged civilian, reload, an interrupted contract and mobile graphics mode?

## Approval gate
Owner records explicit choices in a follow-up versioned `docs/STEP4_DECISIONS.md` or separate signed-off decision record **before implementation begins**. This document intentionally contains no recommendations disguised as decisions. A mobile performance baseline and legal review of new assets are independent release gates.
