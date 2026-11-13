# Planning handoff for Claude

13 November 2026. This is a second, documentation-only delivery. It does not contain or supersede the earlier branding patch.

## Files

| File | Purpose |
| --- | --- |
| CITY_DESIGN_REVIEW.md | Evidence for the map/legacy-activity conflict; options and approval gates accompanying the earlier CITY_DESIGN.md |
| DISTRIBUTION_REVIEW.md | Official-source research on stores, portals, payments, ads and launch constraints |
| PEDESTRIAN_DESIGN.md | Step 2 movement, crossing, lifecycle, performance and regression-test proposal |

All are proposals. No new city, combat, pedestrian or payment code is authorised by their contents. The user authorised this planning/research work; design choices still need approval before implementation.

## Work that remains yours

Continue your on-foot visual check and vehicle-taking work on your own branches. Do not interrupt that work to implement speculative pedestrian interfaces. This delivery does not alter index.html, ROADMAP.md, tests, instrumentation or your earlier design files.

An open PR #1 for on-foot was observed while preparing this delivery. Its current code was not reviewed in this task; the design uses the original handoff and main baseline 406bc76, not an assumption that PR #1 has merged.

## Main conclusions

1. Four existing event definitions already extend beyond the proposed small-city footprint; route remapping is unavoidable if that footprint replaces the island. Keep the new-city direction as the proposal, but approve the activity migration explicitly. Do not silently retain the island or delete activities.
2. A blood toggle changes presentation, not necessarily rating or platform eligibility. CrazyGames requires PEGI 12; Poki is aimed at all ages. A future portal edition could require different mechanics, not just fewer effects.
3. itch.io's ordinary embedded HTML5 format takes donations. Investigate a paid downloadable product plus browser demo; verify account/payout eligibility before promising a paid release.
4. Pedestrians should use shared geometry/collision helpers where appropriate, but not share the player FOOT singleton. Crossing logic must track taken/parked vehicles as well as traffic.
5. Real car names/models and audio assets need a commercial-rights inventory. This is an unresolved evidence gap, not a finding of infringement.

## Applying this delivery

The patch adds only these four new files, based on main 406bc76. It does not depend on the earlier cleanup commit. Apply to a separate documentation branch from current main after checking that none of these filenames already exists. If a file does exist, compare and merge deliberately; do not overwrite Claude's work.

    git switch -c docs/city-distribution-pedestrians main
    git am /path/to/port-meridien-planning.patch

The archive also contains plain Markdown copies for review without applying a patch. No merge, deployment, settings change, store submission, paid transaction or message to a third party was performed.

## Validation and access limits

Checked source references, relative document links, patch whitespace and the file-only diff. No gameplay tests are necessary for this documentation-only patch; no new claims that the baseline/browser suite passes are made. The previous browser-launch and GitHub-write blockers remain unresolved. The earlier baseline CI status is not refreshed or certified by this delivery.

Local branch: codex/city-distribution-pedestrian-design. GitHub write access was previously denied, so this delivery is provided as an apply-ready patch rather than claiming a published branch or PR.
