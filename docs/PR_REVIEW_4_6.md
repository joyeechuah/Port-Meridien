# Review of PRs #4 and #6

Reviewed 13 November 2026. Main: `20fde21`. #4: `6b403ea743268a6938a2301f294fddec911c0065`. #6: `e9c9d38053a49d7bc70277aa2d9f7b251996fc1f`. Findings apply to those commits, not future updates. No gameplay files changed.

## Recommendation

Hold #4 for the two save-path bugs below. #6 has no blocking defect identified in its diff; its synchronous prompt update is appropriate. Merge #6 first once its checks pass. This is not an unconditional approval: local Chromium exits with `socket() failed: Operation not permitted`, so browser regressions were not run here. GitHub runs 43369902323 (#4), 43369446284 (#6) and 43368062143 (main) were still running when checked.

## P1 — dealer test-drive return turns a temporary car into the saved current car

Location: `finishTestDrive` calls `attachCar(td.prev)` without the temporary flag. PR #4 introduces `st0` and similar IDs which can now be `td.prev`.

User path: take a traffic car; enter the dealer; test-drive an unowned car; return it or let its timer expire. `attachCar` assigns `save.cur = st0`. `streetReset` then restores `save.cur`, which is itself temporary, and frees its mesh. This breaks the invariant that going home restores an owned car and can leave `pc` pointing at disposed geometry. Any intervening persistence also writes the invalid current ID to storage.

Confirmed by executing the actual `finishTestDrive` and `attachCar` functions extracted from #4, with rendering dependencies stubbed. See `review/reproduce-pr4.cjs`.

Fix direction for Claude: preserve temporary status when restoring a dealer test drive; make garage reset select a valid owned ID independently of temporary IDs. Browser regression: take car → dealer test drive → return → home → reload. Assert owned `save.cur` throughout, no temporary IDs in saved selection, and `pc` is a live owned mesh after returning home.

## P2 — record ghosts save temporary car IDs and disappear on reload

Location: `finishEvent`, assignment `save.ghost[E.id] = {c:curId,...}`; save validation accepts ghost cars only if present in `CARS`.

User path: set a time-trial record in a taken car. Its ghost gets `c:st0`. Reload rejects that ghost while retaining the record time. Before reload, reuse of `st0` for another taken model can also make the replay resolve to a different model.

Confirmed by executing the actual `finishEvent` with a record time-trial state. Fix direction: store a stable base model ID for ghost identity, optionally separate appearance metadata; never persist the temporary slot. Regression: record → garage cleanup → reload → replay; verify record and ghost both survive with the original base model.

## Further coverage required

- Dealer buy/sell/swap calls `parkAll`, which now clears LEFT but does not free all STREET entries. Repeated take → dealer swap cycles should assert bounded STREET and mesh counts, not only the direct six-take loop already tested.
- Buying and selling while driving a taken car, fast travel, graphics rebuild while cars stand outside, and cloud account switching need lifecycle coverage.
- Existing take tests mostly invoke helpers or stage traffic. Add normal keyboard/touch/controller paths and confirm selected targets remain reachable at activation.
- #6 moves the same reach check into `footPrompt` and calls it immediately after exit. Keep a synchronous same-evaluation exit/prompt/re-enter assertion: waiting a frame would hide the original bug.

## Validation

Both exact PR snapshots pass the repository lint command with 0 errors and 0 warnings. The two isolated source reproductions confirm their reported assignments. No browser pass is claimed.

## Reproduction

With development dependencies installed, run:

```sh
node docs/review/reproduce-pr4.cjs /path/to/pr4/index.html
```

The script asserts the two observed faulty states, so success means the reviewed bug is reproduced. It is a diagnostic, not a regression pass or browser test. Rendering and persistence side effects are stubbed; the assignments and control flow under review are real extracted source.
