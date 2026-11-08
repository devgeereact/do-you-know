---
phase: 01-clean-up-and-foundations
plan: 01
subsystem: testing
tags: [audit, close-out, vitest, dead-code]

requires:
  - phase: 01-clean-up-and-foundations
    provides: Phase 1 build shipped 7 Nov 2026 as fc7b41e
provides:
  - A dated "Phase 1 close-out" section at the top of docs/AUDIT.md
  - Each Phase 1 done-when line checked with its command and an honest status
  - The ImageKit and PostHog dead-code list with importers, ready for the owner's approval
affects: [phase-2-planning, dead-code-clean-up]

tech-stack:
  added: []
  patterns:
    - "Audit lines cite the exact test file or command; server and browser results not seen are marked NOT TESTED"

key-files:
  created:
    - .planning/phases/01-clean-up-and-foundations/01-01-SUMMARY.md
  modified:
    - docs/AUDIT.md

key-decisions:
  - "Recorded the daily dead-end fix as PARTIAL: it is a redirect in PlayPage, not a changed link target, and the planned link-target unit test does not exist"
  - "Backend and browser suites were not run (they need a database); their results are NOT TESTED with the test names cited"

patterns-established:
  - "Close-out sections end with a decision for the owner when a deletion is proposed"

requirements-completed: [P1-DONE]

duration: 6min
completed: 2026-11-08
---

# Phase 1 Plan 01: Phase 1 close-out Summary

**Phase 1's five done-when lines checked against code and unit tests (one DONE, four PARTIAL, none failing), plus a grep-backed ImageKit and PostHog dead-code list awaiting the owner's approval; no source changed.**

## Performance

- **Duration:** about 6 min
- **Started:** 2026-11-08T02:17:00Z
- **Completed:** 2026-11-08T02:23:00Z
- **Tasks:** 2 (both recorded in one docs/AUDIT.md commit, as the owner asked)
- **Files modified:** 1 (docs/AUDIT.md)

## Accomplishments

- Ran, read-only: `pnpm vitest run` on the five named files (63 tests passed) and the full suite (43 files, 398 tests passed), plus grep over `src`, `tests`, `scripts`, `backend/src` and config files.
- Criterion 2 (no hex colour or `uppercase` in the play stage) is DONE: grep finds none in the stage components or the stage CSS block, and `tests/unit/lib/stageStyle.test.ts` passes.
- Criteria 1, 3, 4 and the "existing tests pass" line are PARTIAL: the unit evidence was seen passing, but the backend refusal and area/level tests and the browser tests were not run here and are NOT TESTED, with their file and line cited.
- Found a gap against the plan: criterion 3 relies on a redirect in `src/pages/PlayPage.tsx:311-313`. The Play tab, header button and two Leaderboards links still point at `/daily/play`, and no unit test pins a link target by `playedToday`.
- Listed the dead code with importers; nothing was deleted.

## Task Commits

1. **Task 1: Check every Phase 1 done criterion against the code** - `44654d0` (docs)
2. **Task 2: List the dead code Phase 1 left behind (no deletion)** - `44654d0` (docs, same commit by the owner's instruction)

**Plan metadata:** recorded in the commit that adds this file.

## Dead code list (for the owner's approval)

ImageKit:

- `src/lib/imagekit.ts` - REMOVABLE (no importer; only itself)
- `src/lib/env.ts:11-12, 47-48` - REMOVABLE (only reader is `imagekit.ts:17`)
- `src/vite-env.d.ts:9-10` - REMOVABLE
- `vite.config.ts:41-42` and the Workbox cache rule at `129-136` - REMOVABLE (changes the service worker)
- `.env.example:10-11` - REMOVABLE
- `.htaccess:96` (CSP allows `https://ik.imagekit.io`) - REMOVABLE, but it is deployed server config, so a separate approval
- `src/pages/PrivacyPage.tsx:165` - IN USE as visible copy; edit with the removal
- Docs mentions (ARCHITECTURE, PRODUCT-SPEC, DECISIONS, DIRECTION, REPLAN-CURRENT, VERIFIED-STATE, CHANGELOG, CURRENT-TASK) - IN USE as text

PostHog (settings only, no SDK):

- `src/lib/env.ts:15-16, 51-52` - REMOVABLE (`posthogKey` and `posthogHost` are read nowhere)
- `src/vite-env.d.ts:12-13` - REMOVABLE
- `vite.config.ts:44-45` - REMOVABLE
- `.env.example:12` - REMOVABLE
- `.github/workflows/verify.yml:29` - REMOVABLE
- Docs mentions (ARCHITECTURE:36, 194 calls it "consent-gated", which is no longer true) - update with the removal

`package.json` lists neither package. Stale agent copies under `.claude/worktrees/` were excluded.

## Files Created/Modified

- `docs/AUDIT.md` - new top section "Phase 1 close-out" (status table, result paragraph, dead-code tables, decision for the owner)
- `.planning/phases/01-clean-up-and-foundations/01-01-SUMMARY.md` - this file

## Decisions Made

- Criterion 3 recorded as PARTIAL rather than DONE, because the behaviour is proven only by the browser test (NOT TESTED here) and the planned unit test is absent.
- Did not run `php` or any backend/browser suite, following the owner's rule; their results stay NOT TESTED.

## Deviations from Plan

### Scope notes (not auto-fixes)

**1. Plan verification not run in full**
- The plan's `<verification>` names `pnpm check` and `npm run verify`. Only `pnpm vitest run` (full unit suite) was run, because only docs changed and the build/lint steps were outside the owner's run list for this task. Marked NOT TESTED.

**2. Fifth criterion added**
- The plan names four criteria; the roadmap has a fifth ("every route loads; existing tests pass unchanged"). It is recorded as line 5 (PARTIAL).

**3. STATE.md and ROADMAP.md not updated**
- The owner's instructions for this run asked for the audit commit and this summary only. `.planning/ROADMAP.md` already has uncommitted changes from the orchestrator and was left untouched; STATE.md updates are left to the orchestrator.

**Total deviations:** 0 auto-fixed. **Impact on plan:** none on the deliverable.

## Issues Encountered

- The markdown linter flagged the compact table separator rows in the new section; fixed before committing.
- A first grep attempt that also printed `.env.example` lines was refused by the permission system; the file was not opened and the variable names were already visible from the earlier recursive grep. No values were read.

## User Setup Required

None. The owner's decision needed: approve or decline the dead-code removal described in the "Dead code for your approval" part of the audit section.

## Next Phase Readiness

- Phase 1 is recorded as checked. To turn the PARTIAL lines into DONE, run `bash scripts/test-backend.sh unit integration competition` and `pnpm test:e2e` (`ranked`, `daily`, `privacy`) on the throwaway stack and append the results to the audit section.
- Optional small follow-up: a unit test pinning the Play-tab behaviour for a finished daily.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: docs/AUDIT.md (section "Phase 1 close-out" at the top)
- FOUND: commit 44654d0
- `git diff --stat` for the commit shows docs/AUDIT.md only; no deletions.
