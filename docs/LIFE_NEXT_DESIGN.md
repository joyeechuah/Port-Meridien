# Step 5, part 3: a shift at the Market Kitchen

**Proposed for Jo Yee's approval.** Give someone exploring Old Quay on foot a short paid job. The free meal already brings players to the counter. A shift gives them a second reason to stay and a way to earn credits without a car.

| Decision | Working recommendation |
| --- | --- |
| Where and when | Use the existing Market Kitchen interaction point. Keep Eat as the first choice and add Work a shift. Offer work only on foot in free ride with zero wanted stars. |
| What the player does | Serve three orders. For each, show a named item from the counter (bread, bowl or stew) and three labelled buttons. Cycle the items once each. A wrong selection leaves the order open. |
| Pace | The first order is ready immediately. Each later order becomes ready after 10 active seconds. After the third correct order, close the panel and pay once. Release the input before serving the next order. |
| Pay | 300 CR per completed shift. Wait 120 active seconds from completion before starting another. Earliest repeat payout is 140 active seconds later. No entry fee or partial pay. |
| Needs and danger | Ordinary needs decay continues during work. Work grants no meal or Social recovery. A wanted star, injury, knock-out, arrest, entering a vehicle or walking more than 3.4 m from the counter cancels the shift. |
| Other activities | While working, the counter offers Continue and Leave shift. Decline new contracts, races, test drives and conversations until the shift ends. Leave shift is immediate. Pause, map and Photo Mode freeze the order clock. Fast travel or going home cancels. |
| Saving | Keep the order and elapsed time in memory. Reload cancels an unfinished shift. Save the existing credit balance and a versioned work record together at payout. Store completed shifts as an integer from 0 to 9999 and remaining cooldown as 0 to 120 active seconds, rounded up at existing checkpoints. Default invalid fields to zero. Count completed shifts as progress, exclude passive cooldown from conflict detection and retain the whole selected save. |
| Phone and controls | One panel at the counter, one text order, three item buttons and Leave. Minimum 44 CSS px targets. Keyboard 1 to 3 or D-pad and A serve. Escape or B closes the panel. Restore focus to the counter prompt. No permanent HUD row. |
| World and multiplayer | Reuse the counter, its interaction point and collider. Each client manages its own orders, timer and payout. |

## Acceptance tests

1. At zero credits, finish bread, bowl and stew. The balance rises by exactly 300. A wrong pick, repeated tap, held A or two input sources in the same frame cannot advance an extra order or pay twice.
2. At 30, 60 and 120 fps, hold order two until 10 active seconds have elapsed. Pause for 60 wall seconds at 9.9 active seconds, then resume. Repeat in Photo Mode, on the map and with a hidden tab.
3. Complete a shift, reload, and try again at 119 and 120 active seconds. Quitting before order three, reloading mid-shift or travelling home pays zero.
4. Trigger each cancellation in the table. Check that the first-aid kit, police response, free meal and ordinary delivery jobs still work after leaving.
5. Load a legacy save and malformed work fields. Choose device and account in separate cloud-conflict tests. Credits and completed shifts must come from the same chosen save.
6. At 360 by 640 and 640 by 360, reach every action at 200% text, close the panel by keyboard and controller, and verify that a second room client earns zero. Compare world fixtures with main.

Approval would cover the working recommendations together. This proposal adds no gameplay code.
