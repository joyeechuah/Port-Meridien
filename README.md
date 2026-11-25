# Port Meridien

![Port Meridien cover art with a sports coupe overlooking the harbour](docs/images/port-meridien.jpg)

**[Play Port Meridien in your browser](https://joyeechuah.github.io/Port-Meridien/)**

Race the coastal roads, explore Old Quay on foot, or take a boat across the harbour. Port Meridien is a 3D open-world browser game built with Three.js for desktop and mobile. It builds on [White Isle Drive](https://github.com/joyeechuah/white-isle-drive) with an original city, characters and activities.

## Play

1. Open the game and choose **Play as guest**. Progress saves in this browser. Watch the harbour flyover or select **Skip intro** to go straight to the wardrobe. Reduced motion also skips the flyover.
2. Choose **Harbour palms**, **Boardwalk stripe** or **Night shift**. Use **Turn around** to inspect the fit, then **Wear outfit & drive** to start in Old Quay. Left and right arrows or the controller D-pad change outfits. On a controller, Y turns the preview and A confirms.
3. Try a coastal drive. Accelerate with W, steer with A and D, and brake with S. To reverse after braking, stop, release the brake and press it again. On a phone, use the steering and pedal pads. The [driving assist](#driving-assist) is on at first: it keeps you in your lane and slows for bends and junctions.
4. Stop near the harbour and select **Get out** to walk. Follow the pier to the motorboat and use the boarding prompt. To return to your car, walk up to it and select **Get in**.
5. Open **Map** to plan a route. For a delivery or a race series, open **Pause → Contracts** or **Pause → Championships**. For car customisation or a free repair, choose **Pause → Go home**.

### Graphics and saved settings

In the pause menu, select **GRAPHICS** to cycle through the three modes.

| Mode | What it does |
| --- | --- |
| AUTO | Tries a lower resolution when frames stay slow. If the typical frame time barely changes, it restores the previous resolution. |
| SHARP | Keeps the game at its highest supported resolution for this display. |
| SMOOTH | Caps rendering at one game pixel per CSS pixel to reduce the graphics workload on high-density screens. |

The browser remembers your graphics mode, FLASHES setting, VIOLENCE level and pistol selection when you reload.

### Driving assist

**DRIVING ASSIST** in the pause menu is on until you turn it off. It keeps the car in its lane, turns with you through bends, and, with only the throttle held, eases off and brakes before a bend or a junction the car can't take at that speed.

At a T-junction you have to turn one way or the other, so it slows for the turn. From 130 km/h it brings the car to about 70 km/h by the junction, and the turn itself goes at 50 to 60 km/h if you start steering just before the zebra crossing. Start the turn on the crossing itself and it brakes harder, down to about 30 km/h, to make it. Turned off, the car never brakes or lifts by itself.

## Controls

| | Keyboard | Touch | Controller |
| --- | --- | --- | --- |
| Gas / brake, reverse | `W` / `S` (or arrows) | GAS / BRAKE pads | Right / left trigger |
| Steer | `A` / `D` (or arrows) | Steering pads, or tilt | Left stick |
| Run on foot | Hold `Shift` or `Space` | Hold RUN | Hold A |
| Handbrake | `Space` | HANDBRAKE pad | `A` |
| Get out | `F` | GET OUT | `B` |
| Use the nearby interaction prompt | `E` or `Enter` (also `F` on foot or aboard) | Tap the prompt | `X` |
| Map and GPS | `M` | MAP | View / Back |
| Camera | `C` | CAM | `Y` |
| Look behind | Hold `B` | REAR | Hold left shoulder |
| Photo Mode | `V` | PHOTO | |
| Return the car to the road outside an event | `R` | — | — |
| Fire (on foot or in free driving) | `G` | FIRE | Right shoulder |
| Pause | `Esc` or `P` | PAUSE | Menu / Start |

On smaller screens, **Map Key** opens the legend and Explorer Passport. Open the map and select **ME** to centre it on your current position. The arrow follows your position and heading while driving, walking or sailing. GPS routes follow the road network. On touchscreens, you can hold RUN or HANDBRAKE while tapping FIRE with another finger.

## On foot

Select **Get out** to walk. If the car is still rolling, up to 60 km/h, it brakes to a stop first and then you get out; faster than that, slow down first. Gas walks forward, brake steps back, steering turns, and holding `Shift`, `Space`, the RUN pad or controller `A` makes you run forward. Walk back to the car and get in. Traffic stops for you if you stand in the road. The car you got out of falls silent while you're away from it.

On foot you can also take any traffic car that has stopped: stand in its lane so it stops, walk to it and get in. The car you came from stays where you left it, and you can walk back and drive it again. Up to three taken cars stay where you left them. A taken car isn't yours: it is not saved, and it's gone when you go home.

## Needs

At the Market Kitchen, choose **Eat** for a free meal or **Work a shift**. Serve bread, bowl and stew for 300 CR, with ten seconds between orders and two minutes of play before the next shift.

Energy, hunger, fun and social each run from 0 to 100 and fall slowly while you play (not in menus, the garage or Photo Mode). See them, and your mood, under **NEEDS** in the pause menu. Low needs never slow or stop you: they only set your mood, a suggestion and a short hint.

| Need | What puts it back |
| --- | --- |
| Energy | **REST** in your garage (+40), or sit on a bench by the fountain in Old Quay's civic square (+3 every 5 seconds, up to +15) |
| Hunger | A free meal at the Market Kitchen, the yellow and white stall in Old Quay's market (+35) |
| Fun | Finishing a race or time trial (+15), and driving at 80 km/h or more (or 3 m/s on the boat) |
| Social | A friendly word with someone in Old Quay (+8 a conversation) |

The map shows the Market Kitchen and the benches. Nothing can be done about your needs while the police are after you.

## Friends who ride with you

Once someone in Old Quay is your friend, the conversation offers **Come for a ride** (key `7`). They walk with you to your car and get in beside you, chat as you drive, and sometimes ask for a lift somewhere: the GPS takes you, and they thank you with a little money for the fuel. Company lifts your Social and the friendship. Fast driving, crashes and the police get a word, and the police cost some friendship. Stop and choose **Drop off**, get out, or go home to end the ride.

## The harbour and the boat

A pier stands on the east coast, straight out from the town past the end of its main avenue: look for the mast with a red marker. A lane runs down to the shore from where the avenue meets the coast road: park at its end and walk on (cars don't fit between the bollards).

Walk along the pier to the motorboat and board it. The driving controls sail it: gas for power, brake for reverse, steering to turn (a boat only turns while it's moving). You hear its motor and the water along the hull. It stays in deep water and turns back at the open sea. To get off, come back beside the pier, slow to a stop, and step off. The boat stays where you leave it.

## Old Quay

The port town on the east side has six blocks between its streets:

| Block | What's there |
| --- | --- |
| North-west | Terraces with shops, two to four floors |
| North-middle | A market yard round a clock tower, with stalls. Ways in from both side streets and from the avenue |
| North-east | Workshops in four old warehouses, with lanes between them |
| South-west | Houses round a garden |
| South-middle | A civic square: the Harbour Hall, a fountain, benches and palms |
| South-east | The Auto Gallery, where you buy and test-drive cars |

You can walk or drive into the market, the square, the garden and the lanes.

### People

Up to ten people (six on a phone) walk the pavements round the six blocks. They cross the streets on the zebra crossings, and wait while a car is on the stripes, close by, or heading for the crossing; after 10 seconds of waiting they give up and walk on. Traffic stops for someone crossing. Drive at one and they step in towards the houses, or hurry off the crossing; run into someone slowly and they stagger and stand a while; faster than about 20 km/h you knock them down. Either is a crime if a patrol sees it. They're only there while you're near the town.

Out in the country, a few people walk the verges beside the country roads: four at a time on a phone, eight on a computer. They appear out of sight, between 120 and 300 m from you, and step further off the road when a car comes. Running into one is a crime if a patrol sees it, and the pistol treats them like anyone on foot. They don't have names or friendships: those are Old Quay's people.

## The police

Two patrol cars drive with the traffic: white, with a blue band and a light bar, and blue dots on the minimap. A crime one of them sees makes you **wanted**, shown as stars under the district name:

| Crime (seen by a patrol within about 90 m) | Stars |
| --- | --- |
| Crashing into a car | 1 |
| Running into someone on foot | 1 |
| Taking a car | 1 |
| Speeding past a patrol (over 110 km/h, within 45 m) | 1 |
| Hitting a police car | 2 |

Each further crime adds a star, up to five. Nothing counts during a race or a test drive.

While you're wanted, police cars chase you along the roads, more of them the more stars you have, with lights and sirens. Stop and let one pull up beside you, and you're **caught**: a fine of 500 CR a star, and the stars are gone. Off the road, an officer gets out and comes for you on foot. You can outrun them, but not for ever.

Get out of their reach and stay out of it long enough (the stars blink meanwhile) and they **lose you**. The boat is out of their reach.

While you're wanted, your house, the Auto Gallery, races, contracts, going home and map travel are closed: lose the police first. A reload clears a wanted level.

## The pistol and health

Take the pistol from the garage with **PISTOL**, top right under MUSIC (it stays chosen until you change it). You can use it on foot and while driving outside races and test drives. You leave the house with 48 rounds.

It locks onto the nearest target in front of you, shown by a red ring: a car, a police car, someone walking, or an officer. Walls and cars are cover. Fire with `G`, the **FIRE** pad, or the controller's right shoulder. A car stops after about nine hits; someone shot, an officer included, is knocked down and stays down while you're near or looking their way; once you've looked away they're gone (an officer's car with them), and people walk the town again later.

The police see shooting as they see any crime: firing is one star, hitting a car or a person one, shooting at the police or running into an officer two. At three stars, an officer on foot fires back.

Your **health** is 100, shown as a bar under the place and clock. After 6 s with nothing hurting you it comes back to 50; it's full again at the house. At 0 you're **knocked out** and wake at home, 10% of your credits poorer (at most 5,000). Caught by the police while carrying the pistol, you're **arrested**: the fine, the pistol back in the garage, and you start again outside the Harbour Hall.

Two settings in the pause menu, both saved:

| Setting | Choices |
| --- | --- |
| VIOLENCE | **LOW**: nobody falls; someone hit stands still a moment, then walks on. **STANDARD** (the default): people hit fall and stay down, no blood. **STRONG**: as STANDARD, with a red mark where a shot lands and a pool of blood under anyone lying down |
| FLASHES | **ON**, or **OFF**: no muzzle flash and no red flash when you're hit |

These rules are working decisions, recorded in [docs/STEP4_DECISIONS.md](docs/STEP4_DECISIONS.md), and may change before release.

## What works today

- **Driving:** 24 cars with made-up names, paint and customisation; collision damage and roadside repairs; keyboard, touch pads, tilt and game controllers.
- **On foot:** walking and running, getting in and out, taking stopped traffic cars, and going back to cars you left.
- **The boat:** a motorboat from the pier, with its own sound.
- **The world:** an island with roads, traffic, day and night, a map with GPS, Photo Mode, the Old Quay district with people walking its streets, and walkers on the country roads.
- **The police:** patrols, a wanted level of one to five stars, chases by car and on foot, fines, and losing them.
- **The pistol:** lock-on aiming, health, being knocked out, arrest, and settings for violence and flashes.
- **Things to do:** races, time trials, championships, delivery contracts, speed radars and an explorer passport of 18 landmarks.
- **Life:** the sixteen people of Old Quay, each with a name and a personality, to talk to and make friends with; friends who come for a ride and ask for lifts; and four needs of your own with a mood (see [Needs](#needs)). The mood speeds up or slows down your skills ([docs/MOODS.md](docs/MOODS.md)).
- **Home:** **DESIGN HOME** in the garage furnishes the mezzanine: 24 pieces to buy, place on a half-metre grid, move, turn and sell, and wall and floor finishes. A fridge brings SNACK and a TV or computer PLAY. A friend can be asked over to hang out ([docs/FRIENDS_OVER.md](docs/FRIENDS_OVER.md)).
- **Getting better at things:** six skills that grow as you drive, cook, talk, walk, take photos and repair, each with a bonus ([docs/SKILLS.md](docs/SKILLS.md)); a career at the Market Kitchen from Dishwasher to Head chef ([docs/CAREERS.md](docs/CAREERS.md)); three wants at a time that pay credits ([docs/WANTS.md](docs/WANTS.md)); six aspirations of three steps each ([docs/ASPIRATIONS.md](docs/ASPIRATIONS.md)); and up to two traits of eight, each speeding up a skill or changing how a need or your wants work ([docs/SKILLS.md](docs/SKILLS.md#traits)). Skills, traits and aspirations are under **SKILLS** in the pause menu, wants under **NEEDS**.
- **Playing together:** **PLAY TOGETHER** in the pause menu starts a room with a four-letter code. Up to three friends join with it from their own phones or computers, and everyone sees each other drive, walk and take the boat, with a name above each player. Traffic, the police, races and the time of day stay each player's own.
- **Saves** in the browser, with an optional cloud backup through Google sign-in on the game's own site (see [CLOUD_SETUP.md](CLOUD_SETUP.md)).

## What's next

| Step | What you'll be able to do | State |
| --- | --- | --- |
| 2 | More districts, with people on their pavements | Country-road walkers done; districts not started |
| 4 | More weapons, shooting from the boat, police cars that shoot, health pickups | Not decided yet |
| Later | The full city as its own world, with the island kept as a second place to drive | Planned |

The opening sequence and audio have been tested on an Android phone. The AUTO resolution change and Old Quay junction traffic still need a driving check on a physical phone.

## Development

To play locally, clone the repository, install Node.js 18 or later, then run these commands from the repository root.

```sh
npm ci
npm start
```

Open [the local game](http://127.0.0.1:4173/index.html). The page loads Three.js from a CDN, so the first load needs an internet connection.

```
npm run lint                                  # must be 0 errors, 0 warnings; it also type-checks js/ with TypeScript
npx playwright install chromium               # once
npx playwright test --project=chromium        # logic tests (about an hour on two workers, as on GitHub Actions)
npx playwright test --project=webgl           # drawn tests, slow with a software GPU
npm run test:physics                          # the driving assist scenarios in Node: about 10 s, no browser
```

GitHub Actions runs lint and both test projects on every pull request, in six shards at once, balanced by each test's measured time (`tests/support/ci-shards.js`; refresh the times with `tests/support/ci-weights.js`). The game is published to GitHub Pages by the **Pages** workflow, which copies index.html, 404.html, js/ and audio/ and stamps each script tag from its file (see [docs/SCRIPT_RELEASES.md](docs/SCRIPT_RELEASES.md)). The drawn tests can also be run on their own: Actions → **Drawn browser tests (WebGL)** → Run workflow.

Run one Playwright instance at a time: the test server uses port 4173 and reads `index.html` and `js/` from disk on each page load, so don't edit them during a run.

- The game is `index.html` and the scripts in `js/`, which share one global scope; [docs/CODE_LAYOUT.md](docs/CODE_LAYOUT.md) says what's where. Script tags in `index.html` keep `?v=dev`: the Pages workflow stamps the copy it publishes. The five recorded tracks live in `audio/`. `package.json` holds only test tooling.
- Every fix or feature comes with a test that fails without it.
- Tests reach the game's internals through `window.__T`; add a name to the list in `tests/support/instrument.js` when a test needs one.
- In tests the police ignore crimes unless a test opens the game with `game.open({ police: true })`, so a crash in an unrelated test never starts a chase.
- The first-time hints are off in tests unless a test opens the game with `game.open({ hints: true })`, so their notices don't mix with the ones other tests check.
- `tests/world-baseline.spec.js` guards the roads, races, landmarks and contracts. A change to the world that moves any of them must update `tests/fixtures/world-baseline.json` on purpose (see `tests/fixtures/WORLD_BASELINE_README.md`).

### Documents

| File | What it covers |
| --- | --- |
| [ROADMAP.md](ROADMAP.md) | Steps, decisions, and the list of things to check before selling the game |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is laid out: game states, movement modes, the frame loop, tests |
| [docs/OLD_QUAY_PLAN.md](docs/OLD_QUAY_PLAN.md) | The Old Quay district plan and what it had to keep working |
| [docs/PIER_ROAD_CONNECTION_PLAN.md](docs/PIER_ROAD_CONNECTION_PLAN.md) | How the harbour lane joins the roads |
| [docs/PEDESTRIAN_DESIGN.md](docs/PEDESTRIAN_DESIGN.md) | The full design for people in the city |
| [docs/CITY_DESIGN.md](docs/CITY_DESIGN.md) | The design for the separate city world |
| [docs/DISTRIBUTION_REVIEW.md](docs/DISTRIBUTION_REVIEW.md) | Stores, age ratings and selling |
| [docs/CAR_TRADEMARK_SEARCH_WORKSHEET.md](docs/CAR_TRADEMARK_SEARCH_WORKSHEET.md) | Trademark checks for the 24 car names (none done yet) |
| [docs/ASSET_INVENTORY.md](docs/ASSET_INVENTORY.md) | Every asset and where it came from |

## Privacy

The default build saves progress in this browser’s local storage. It has no ads. On the game's own site it counts visits with Cloudflare Web Analytics: page views, countries, devices and load times, with no cookies or storage and nothing about you or your progress. It doesn't count a browser that asks not to be tracked (Global Privacy Control or Do Not Track), or any copy of the game outside joyeechuah.github.io. It loads three.js from cdnjs and fonts from Google Fonts. Deployments configured for optional Google sign-in can also back up progress to Firestore. If the game asks which save to keep, **Decide Later** postpones the choice. Reopen Cloud Save to compare the two copies. Ghost laps stay on the device. See [cloud save setup](CLOUD_SETUP.md).

While you're signed in, this browser keeps your Google name and email to show who is signed in. Signing out clears them and keeps only your account's id, with no name or email, so if a different Google account signs in on this browser, the game asks before your progress goes to it.

In a room, **PLAY TOGETHER** sends the name you choose (up to 12 letters), your outfit, your car and paint, and where you are, about eight times a second, to Firebase's Realtime Database in Singapore. Anyone with the room's code can see them, and rooms can't be listed or searched. Leaving the room, closing the game or losing the connection removes them. Joining signs in anonymously: no Google account, name or email is involved.

## Content

Port Meridien is a mature game: you can shoot cars, people and the police. VIOLENCE in the pause menu controls how it's shown, from LOW to STRONG, with STANDARD as the default. It shows no blood by default.
