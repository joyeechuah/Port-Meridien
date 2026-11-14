# Roadmap

Each step ships as its own pull requests, with tests. Earlier steps are playable before later ones start.

| Step | What you can play | Status |
| --- | --- | --- |
| 0 | White Isle Drive's game under the new name, with its tests passing | Done |
| 1 | A character who walks and runs in a first waterfront district, gets in and out of cars, takes any parked or traffic car, and sails a boat from the harbour | Done on the island: walking, taking cars, the boat and pier, the harbour lane, and the Old Quay district's six blocks. Not yet tested on a real phone |
| 2 | The city at full size: more districts, pedestrians on the pavements | Started: people walk Old Quay's pavements and cross on its zebra crossings (first version). More districts not started |
| 3 | Police and a wanted level: patrol cars chase you, and losing them clears it | Done on the island: patrols, one to five stars, chases by car and on foot, fines, losing them. No roadblocks or arrest yet |
| 4 | Weapons: pick up guns, shoot on foot, health, being arrested or taken out. One setting controls how violence is shown | Planned |

## How the new city arrives (decided 13 Nov 2026)

Jo Yee's decision, after Codex's review showed the first district is too small to hold today's races, contracts and landmarks:

1. **First, the city is built on the island.** The Old Quay waterfront district replaces the island's existing town. The rest of the island stays as it is, so every race, contract and landmark keeps working. This is temporary.
2. **Then the new city is built as its own world**, with its own routes and activities designed for it.
3. **The game ends up with two worlds**: the new city, and the island as a second place to drive.

What this means for the work:

- Step 1's district goes where the island's town is now, not on an empty map.
- Nothing is removed from the island to make room for the city beyond that town.
- Records and ghosts belong to the world and route they were set on. That needs a world id in the save before the second world exists.
- Loading and unloading a world, and travelling between the two, is part of building the second world, not of step 1.

## Before selling the game

Not legal advice: a list of things to check and record.

| Item | State | To do |
| --- | --- | --- |
| Music (`audio/cruise.mp3`, `highway.mp3`, `showroom.mp3`) | Jo Yee believes they were made with Google's Flow Music under a paid Google AI plan, for White Isle Drive's Ibiza setting. Not confirmed | Confirm the tool and the account; save proof of the plan and its commercial-use terms on the day of release; consider new tracks made for this city |
| Car names | Made-up makes and models for all 24 cars, approved 13 Nov 2026 (`docs/CAR_NAME_PROPOSAL.md`). Not checked against trademark registers | Search each make and model in the trademark registers of the countries you'll sell in; review the body shapes, lights and badges separately |
| Fonts and three.js | Loaded from Google Fonts and cdnjs | Record their licences; bundle them for a downloadable edition |
| Age rating and stores | See `docs/DISTRIBUTION_REVIEW.md` | Decide the first sales channel before building weapons |

## Decisions

- **A new city, arriving in two stages.** See "How the new city arrives" above.
- **Original content only.** No names, places, characters or layouts from other games.
- **Mature violence, behind one setting**, so a no-gore version can ship without rework.
- **Racing features stay for now** (events, championships, contracts). Whether they belong in this game is decided in step 2.
