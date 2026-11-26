# Step 5: the life side

**Status: working decisions; talking, needs and rides with friends built.** Jo Yee wants Port Meridien to be a mix of GTA 6 and The Sims 4: the player chooses what to do, interacts with other people, and can also shoot, drive and travel. These choices follow the approach used for step 4 (suggestions first, changeable before release). Mechanics only: no names, characters or art from other games.

## Built: talking to people (`js/life.js`)

| Question | Decision for now |
| --- | --- |
| Who | Sixteen people, each with a name, a personality and their own face. A phone has six out walking at a time, a computer ten; each time you leave Old Quay, the ones out step aside for the next in turn, so over a few visits everyone comes round. Someone riding with you or mid-conversation stays |
| Personalities | Cheerful, Grumpy, Loves a joke, Chatty, Shy, Always in a hurry. Each changes how a line lands, and Grumpy turns a joke sour |
| How you talk | On foot, walk up to someone: the prompt says "Talk · name". They stop and face you, and you stand still. Six lines: say hello, chat, tell a joke, compliment, ask for a local tip, be rude. Goodbye with Escape, E, B or the button |
| Friendship | From -100 to 100, shown as a bar with a label: Stranger, Acquaintance, Friendly, Friend, Good friend, Best friend, or Dislikes you, Enemy. The same line twice in one conversation is worth less, and gains slow near the top |
| Reactions | A bubble over their head: smile, laugh, heart, shrug, frown or anger. Friends wave when you walk past |
| Tips | Friends point you towards a landmark you haven't found (its passport hint and which way it is). Others give general tips about the city |
| Ending a conversation | Someone who comes to dislike you badly (-50 or less) walks off; someone in a hurry leaves after three lines; walking away or getting into a car ends it |
| Violence | Knocking someone down, with the pistol or a car faster than about 20 km/h, costs 25 friendship; a slower bump 15. They show it the next time you meet them on their feet |
| Saving | Kept in the save as `rel` (friendship and conversations had), cleaned on loading, and counted as progress when choosing between a local and a cloud save |
| Controls | Keyboard 1 to 6, mouse or touch on the buttons, a controller's D-pad and A |

## Built: needs and moods (`js/life.js`)

Energy, hunger, fun and social, a mood from them, and the places that see to them: the decisions and how they were built are in [`docs/LIFE_NEEDS_DESIGN.md`](LIFE_NEEDS_DESIGN.md).

## Built: friends who ride with you (`js/life.js`)

Step 5, part 3. Working decisions, like the rest of this page: numbers are starting values.

| Question | Decision for now |
| --- | --- |
| Who comes | A friend (40 or more) can be asked "Come for a ride" (key 7, or the button, which only friends get). Someone always in a hurry needs a Good friend (70), a grumpy one 55. Not while the police are after you, not with your car more than 40 m away, and one friend at a time |
| Getting in | Yes ends the conversation. They walk beside you, then round to your car's passenger door, and get in once you're in and the car is still. Held up for 4 s, or more than 45 m away, they catch you up. Drive off without them and they're left behind (-4 friendship). They give up after 90 s on foot |
| Riding | They sit beside you (seen in an open car). Every 6 s of the ride is +1 social, every 20 s +1 friendship (up to +10 a ride). They chat every 26 to 40 s, in their own voice; a bubble shows over the car when they speak |
| Driving badly | 130 km/h or more gets a word (some like it). A crash gets a word and -2 friendship, at most every 6 s. The police coming after you: a word and -8, once a chase |
| A lift | Half the time they ask to go somewhere 300 m to 1.5 km away: a landmark, the harbour pier or the Auto Gallery. The GPS is set (not during a contract or race), and the HUD says where. Pull up within 30 m, slowly: +8 friendship, +6 social and 250 CR "for the fuel" |
| Getting out | Stopped for 5 s or more into the ride, the prompt offers "Drop off <name>". Getting out yourself, going home or into the Auto Gallery also ends the ride. In Old Quay they step onto the pavement and walk on; anywhere else they stay where they got out until you're next in town |
| Not saved | A ride ends with the session; the friendship it earned is saved |
| HUD | A line under the place and the clock: WITH <name>, and where to |

## Next, not decided

1. **Moods with effects**: today a mood only changes a suggestion and a hint. Small effects (prices, police, friends) are not decided.
2. **More places for needs**: a café with seats, more benches, the house's own bed.
3. **More with friends**: calling them, meeting at a place, friends who come to you. (Riding along is built, above. A paid shift at the Market Kitchen is approved as part 4: `docs/LIFE_NEXT_DESIGN.md`.)
4. **A home to run**: furniture in the house, bills, a bed to sleep in and skip the night.
5. **A job**: shifts that pay, alongside contracts.
6. **More people** in the new city and more lines (flirting, arguing), with a setting if any of it needs an age rating.
