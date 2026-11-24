# Step 5: the life side

**Status: working decisions; talking and needs built.** Jo Yee wants Port Meridien to be a mix of GTA 6 and The Sims 4: the player chooses what to do, interacts with other people, and can also shoot, drive and travel. These choices follow the approach used for step 4 (suggestions first, changeable before release). Mechanics only: no names, characters or art from other games.

## Built: talking to people (`js/life.js`)

| Question | Decision for now |
| --- | --- |
| Who | Sixteen people, each with a name and a personality, tied to a pedestrian slot so the same face is always the same person. A phone shows six of them, a computer ten |
| Personalities | Cheerful, Grumpy, Loves a joke, Chatty, Shy, Always in a hurry. Each changes how a line lands, and Grumpy turns a joke sour |
| How you talk | On foot, walk up to someone: the prompt says "Talk · name". They stop and face you, and you stand still. Six lines: say hello, chat, tell a joke, compliment, ask for a local tip, be rude. Goodbye with Escape, E, B or the button |
| Friendship | From -100 to 100, shown as a bar with a label: Stranger, Acquaintance, Friendly, Friend, Good friend, Best friend, or Dislikes you, Enemy. The same line twice in one conversation is worth less, and gains slow near the top |
| Reactions | A bubble over their head: smile, laugh, heart, shrug, frown or anger. Friends wave when you walk past |
| Tips | Friends point you towards a landmark you haven't found (its passport hint and which way it is). Others give general tips about the city |
| Ending a conversation | Someone who comes to dislike you badly (-50 or less) walks off; someone in a hurry leaves after three lines; walking away or getting into a car ends it |
| Violence | Knocking someone down with the pistol costs 25 friendship, running into them with your car 15. They show it once they're back on their feet |
| Saving | Kept in the save as `rel` (friendship and conversations had), cleaned on loading, and counted as progress when choosing between a local and a cloud save |
| Controls | Keyboard 1 to 6, mouse or touch on the buttons, a controller's D-pad and A |

## Built: needs and moods (`js/life.js`)

Energy, hunger, fun and social, a mood from them, and the places that see to them: the decisions and how they were built are in [`docs/LIFE_NEEDS_DESIGN.md`](LIFE_NEEDS_DESIGN.md).

## Next, not decided

1. **Moods with effects**: today a mood only changes a suggestion and a hint. Small effects (prices, police, friends) are not decided.
2. **More places for needs**: a café with seats, more benches, the house's own bed.
3. **Friends doing things with you**: ride along, call them, meet at a place.
4. **A home to run**: furniture in the house, bills, a bed to sleep in and skip the night.
5. **A job**: shifts that pay, alongside contracts.
6. **More people** in the new city and more lines (flirting, arguing), with a setting if any of it needs an age rating.
