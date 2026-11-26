# Parties at home

In the garage, choose up to three Old Quay residents. Anyone invited must be a Friend (at least one conversation and 40 friendship). An invitation and its guest list last for this garage visit. A single invited visitor gets the room to themselves until their visit ends. Parties invite residents by permanent id, including people whose pedestrian slot is currently off screen.

| Personality | Minimum friendship to accept |
| --- | ---: |
| Cheerful, joker | 40 |
| Chatty | 45 |
| Shy | 55 |
| Grumpy | 60 |
| Busy | 65 |

Each reply includes its reason. Responses are deterministic. Sending the same invitation repeatedly does not improve the odds.

## Panel and seating API

- `partyInvite(ids)` replaces the pending selection and returns one `{id,accepted,reason}` per invitation, in selection order. An empty selection clears it. Duplicate, unknown or excessive ids reject the entire request without changing the selection. A blocked action returns an empty array.
- `partyStart()` rechecks attendance and returns true only on starting a party with at least one willing guest. While `PARTY.active` is true, seat the residents in `PARTY.ids`. A second start or invitation leaves the party alone.
- `partyScore()` previews the current group's score. It returns zero for an empty group.
- `partyEnd()` settles an active party at home and returns `{score,guests,happy}`. An invalid or repeated end returns false. Leaving the garage or reloading cancels without an award. The existing HANG OUT action remains available for a single private visit.

## In the game

**THROW A PARTY** in the garage takes the place HANG OUT has for a single guest (the two never show together), once you have a Friend. It opens a panel listing your Friends with their personality and how close you are. Choose up to three and **SEND INVITATIONS**: each answers with their reason. If anyone is coming, **START THE PARTY** (with the score so far) takes SEND's place; choosing again brings SEND back. When nobody can come, the panel says so.

The guests take your seats, comfiest first (a sofa, then a reading chair, a window bench, a stool), one each. The rest stand by the railing, a metre clear of each other and of the seats in use. Moving or selling furniture seats them again. The button then reads **SEE THEM OFF · PARTY** and the score; pressing it ends the party, with a message giving the score and who you got closer to. While the next one waits, it reads **PARTY · AGAIN IN** and the minutes left.

With a controller, Y presses HANG OUT or the party's button; in the panel the D-pad and A choose, and B closes it. Escape closes it too.

## Score and rewards

Start at 25. Add 5 per guest, one point per 3⅓ home comfort (rounded down in total), and 3 per Charisma level. Each pair counts once. Cheerful with Chatty, Cheerful with Joker, or Busy with Shy adds 6. Grumpy with Joker, Chatty with Shy, or Busy with Chatty subtracts 6. Other pairs score zero. Clamp the total to 0–100.

Finishing adds 8 Social plus 4 per guest, 5 Fun plus one per five score points, and 3 base Charisma XP per guest. Each guest gains 2 friendship plus one per 20 score points and one recorded social encounter. The social and skill gains use the existing caps and skill modifiers. A score of 60 or higher gives Happy after the XP award. Parties pay no direct credits.

## Cooldown and saving

The next party can start after 180 seconds on the active-play needs clock. Garage time, menus, offline time and hidden tabs do not advance it. Invitations, attendance and score stay in memory. Settlement clears attendance and starts the wait before awarding and saving. Earned friendship, needs and XP use their ordinary save fields.

The remaining wait is optional `homeWait.party`. `homeWaitClean` rounds finite seconds up and clamps them to 0–180. Zero, invalid and legacy values omit the field. The needs fingerprint includes a positive party wait. It follows the same whole-set cloud decision as the other home waits. The encompassing homeWait field is excluded from both progress comparison and freshness, so a cooldown alone cannot trigger a conflict or make a new device look played.
