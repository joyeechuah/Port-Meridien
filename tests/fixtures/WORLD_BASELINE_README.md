# Old Quay world baseline

This test protects the existing island before Old Quay construction, including every authored road, every generated road edge, the full computed route and checkpoint geometry of all six races/time trials, all 18 landmarks, every generated town contract stop, and all nine contracts' complete leg polylines, lengths, limits, and rewards.

## Record the baseline once on the unchanged world

From the repository root (with Playwright browsers installed):

```bash
UPDATE_WORLD_BASELINE=1 npx playwright test tests/world-baseline.spec.js --workers=1
```

Review the generated `tests/fixtures/world-baseline.json`. Confirm counts, unusual coordinate changes and that it reflects the **pre-Old Quay** island. Commit the generated JSON to this pull request. Re-run without UPDATE to confirm the comparison passes.

## Guardrails

- The normal test **must fail** if the baseline file is absent or if any recorded value changes.
- Do not set `UPDATE_WORLD_BASELINE=1` in CI. Never regenerate during a feature test.
- Values use three-decimal-place precision to reduce floating-point noise; road/race/contract polylines are recorded in full.
- When deliberate map changes are approved, inspect every diff before replacing the baseline. Keep the original file in Git history.
- This is a static geometry and game-data regression gate, **not** a substitute for playable event completion, pedestrian paths, traffic behavior, and mobile performance tests.

## Changes to the baseline

| Date | Change | What differs from the file before it |
| --- | --- | --- |
| 13 Nov 2026 | The harbour lane: a `drive` road from the avenue's junction with the coast road, (945.904, 1.596), to the shore at (1160, 0) | One road added (index 14) and one edge added (id 35, 214.15 m). Every other road, edge, height, event, landmark, contract stop and contract is identical, value for value. Checked with a field-by-field comparison before the file was replaced |

The first version of this file, from the unchanged island, is at commit `4210869`.
