# Current task

Updated 9 November 2026. Everything built so far is on `main` and live (`49c3791`, deployed). Finished work is in `HANDOFF.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`.

## Goal
Make the Studio's route from questions to live clean and proactive (`docs/CONTENT-PIPELINE-DESIGN.md`, ADR-024), and keep the child and parent app calm, tap-only and server-graded.

## Status
- **Content pipeline:** slices 1 to 4 are LIVE. Slice 5 (weekly Studio digest) and slice 6 (proactive app for children and grown-ups) are PLANNED. Still to build inside slice 3: the Draft, Ready and Live view in the Library.
- **Checks on `49c3791`:** `pnpm check` 452 unit PASS; backend, all suites PASS (cms 190, house rules 37); browser suite 113 PASS; `npm run verify` 37/37 PASS; CI, Semgrep and Deploy green. NOT TESTED: the Batches and Import screens in a real browser (they need the Studio sign-in), Safari and real phones.

## Next steps (owner)
1. **Batches screen:** the 60 imported quizzes are one batch, 45 ready and 15 need a look. Set Ranked to Practice only on the 5 "Listen and spell" quizzes (bulk edit), choose which copy to keep for the 9 repeated questions, keep or cut the 6 with baptism or Last Supper wording, then read five and publish the ready ones at a pace.
2. **Phone checks** in `.planning/phases/01-clean-up-and-foundations/01-HUMAN-UAT.md` (a real phone, Safari, and the real Clerk sign-in at `/grown-ups`). Installing Playwright's WebKit for a Safari-engine run is a download that needs your OK.
3. **`mail_from`:** one line in the private server config, `'mail_from' => 'no-reply@doyouknow.space'` (SPF, DKIM and DMARC already exist).
4. **Your uncommitted change** to the config example file is still in the working tree; it is not mine and is in no commit.
5. Say yes to delete the old local branches (all fully merged into `main`) and the stale `.claude/worktrees/` agent checkouts.

## Next steps (code)
- Slice 5 and slice 6; the Library state view; a sticky answer sheet so the Next button is on screen on small phones (it sits below the fold for tall questions on 375x667).
- Dev-dependency alerts `minimatch` (update with the next dev round) and `deepmerge` (no patched version); `clerkinc/backend-php` 1 to 2 and the `actions/checkout` and `pnpm/action-setup` majors are planned tasks, not drive-by merges.
- `page-check.yml` fails when a published page has no prerendered head: run Deploy once when it does.
