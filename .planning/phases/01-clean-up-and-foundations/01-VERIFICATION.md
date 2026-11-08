---
phase: 01-clean-up-and-foundations
verified: 2026-11-08
branch: phase/p1-housekeeping
head: 3d60906
status: human_needed
requirements: [P1-DONE]
score: "5 of 5 Done-when lines VERIFIED in code and unit tests; 1 line (guest on a phone, by hand) and the WR-04 phone check need a human; 1 residual gap in the WR-01 fix"
---

# Phase 1 verification: clean-up and foundations

**Goal.** The child path is tap-only, calm and token-based, and the safe defaults are in, so every later phase lands on a clean base.

**Verdict.** The goal is delivered in the code. Every Done-when line is backed by code I read and a check I ran or a test I located. The status is `human_needed`, not `passed`, for two reasons only: the by-hand phone check that Done-when line 1 itself asks for has never been done, and the one open behaviour on a phone (WR-04) is recorded as NOT TESTED. There is also one small residual gap in the WR-01 fix (below). Nothing failed.

**What I ran (read-only).** `pnpm vitest run` (43 files, 405 tests, all passed), `grep` over `src` and `src/index.css`, `git diff --diff-filter=D --name-only origin/main..HEAD`, and file reads. I did not run the PHP backend suites, the browser suite, any database, the live site or a phone, and I did not open `.env*`, `config.php`, keys or `.local-state/`. Where a line below relies on a backend or browser result, it is the result recorded in `docs/AUDIT.md` (the "Closing evidence" paragraph of the Phase 1 close-out), which I read but did not re-run. I mark that as such.

## 1. Done-when lines (ROADMAP Phase 1, accounted for as P1-DONE)

| # | Done-when line | Status | Evidence |
| --- | --- | --- | --- |
| 1a | As a guest, no free-text field is reachable anywhere | **PARTIAL** (code and unit VERIFIED; phone by hand NOT TESTED) | I listed every `<input>` and `<textarea>` outside the Studio (`grep -rnE '<textarea\|<input\b' src --include='*.tsx'`) and read the gating of each. Radios and slider (`ReportQuestion.tsx:110`, `SettingsPage.tsx:36`, `SliderAnswer.tsx:47`, `SwitchesPanel.tsx:59`) are not free text. Typed nickname is gated by `mayType = age_band 13_17 or 18_plus` (`src/pages/MePage.tsx:178, 319`) and the picker is generated-only for children and unset bands (`src/components/game/NicknamePicker.tsx:22`). Reply box needs `can_write` from the server (`MePage.tsx:513` region). Contact: the player route is preset chips only; the typed form needs `adultKnown` (`src/pages/ContactPage.tsx:48, 158`) and a child is refused (`:60`); guests are pointed at the contact email (`:172-179`). Parent contact: `src/components/parent/ContactPanel.tsx` is under the Clerk-gated `/grown-ups`. Unit: `tests/unit/components/ChildPathTyping.test.tsx` passes in my full run. Browser: `tests/e2e/ranked.spec.ts:100` ("guests never get a free-text name box") exists; AUDIT.md records the e2e suite as 86 of 86 PASS; not re-run by me. **Not done:** the by-hand check on a phone. |
| 1b | Setting an adult band without sign-in is refused by the server (test) | **VERIFIED in code; backend run NOT TESTED by me** | `backend/src/Player.php:52-57` throws `adult_sign_in_required` (403) for any band other than `under_13` unless the profile has a Clerk identity. Test exists: `backend/tests/integration.php:125-136` (guest cannot claim `13_17` or `18_plus`, age stays unset, typed nickname still refused, `under_13` still allowed) and `:137-138` (a Clerk-linked profile may set `13_17`). AUDIT.md records `bash scripts/test-backend.sh` PASS (integration 110 checks). I did not start a database, so I did not re-run it. |
| 2 | No hex colour and no `uppercase` in the play-stage CSS or components | **VERIFIED** | `grep -nE '#[0-9a-fA-F]{3,8}\b' src/components/game/*.tsx src/pages/PlayPage.tsx` returned nothing (exit 1). `grep -nEi '\buppercase\b\|small-caps'` on the same files returned nothing (exit 1). The stage block of `src/index.css` (line 141 "The game stage" to line 435 "Scene motion") has no hex, `uppercase`, `small-caps` or `text-transform` (awk plus grep, exit 1). Guard test `tests/unit/lib/stageStyle.test.ts` passes in my full run. "Ranked" tag: `src/pages/PlayPage.tsx:239-240` sets `modeLabel` to `null` for ranked. |
| 3 | The Play tab never shows "Uh-oh" after a finished daily; the daily board and crown still work | **VERIFIED in code; browser proof NOT TESTED by me** | The mechanism is a redirect: `src/pages/PlayPage.tsx:311-313` renders `<Navigate to="/daily" replace />` for `daily_already_played`, and the error card is suppressed for that case (`:314`). Links still point at `/daily/play` and rely on it (as AUDIT.md says honestly). Unit: `tests/unit/hooks/useQuizAttempt.test.tsx` and `tests/unit/components/DailyLeader.test.tsx` pass in my run. Browser: `tests/e2e/daily.spec.ts` covers the redirect (AUDIT.md: PASS, not re-run by me). The plan's expected link-target unit test does not exist; this is disclosed, not hidden. |
| 4 | Every existing route still loads; existing tests pass unchanged except those that pinned old behaviour | **PARTIAL** (unit VERIFIED; routes and browser suite NOT TESTED by me) | Full unit suite passes now: 43 files, 405 tests. Route loading and the browser suite need a database; AUDIT.md records 86 of 86 PASS and `pnpm check` PASS on the throwaway stack, not re-run by me. The "updated in the same commit with the reason" half is not independently checkable from this branch (the Phase 1 commits are already in `origin/main`; `fc7b41e` is an ancestor of it). |
| 5 | Area and level appear on `GET /quizzes`, covered by a test using the live catalogue's shapes | **VERIFIED in code; backend run NOT TESTED by me** | `backend/src/Catalog.php:175-176` sets `area` (`Areas::area(category_slug, title)`) and `level` (`Areas::level(age_min)`) on each row and unsets `category_slug`. Tests: `backend/tests/unit.php:144-172` (category slugs, General Knowledge topic titles such as "Language and literature · Ages 6-8", odd age bands, 18+ and no age); `backend/tests/integration.php:49-52` (single quiz and list carry both labels, slug stays private). Whether those fixture titles match the live catalogue exactly cannot be checked without the live database; NOT TESTED. |

## 2. Plan must_haves (01-01-PLAN.md)

| Must-have truth | Status | Evidence |
| --- | --- | --- |
| Every Done-when line is checked against the code and the tests, with the command and result recorded | **VERIFIED** | `docs/AUDIT.md` has a dated section "2026-11-08 · Phase 1 close-out" (second section from the top; the code review is first). It has a five-row table, each with a status and the test file or command, and a "Closing evidence" paragraph. It marks unrun items NOT TESTED rather than passed. My independent checks agree with its statuses. Minor staleness: the "Result" paragraph (one DONE, four PARTIAL) is superseded by the closing evidence, and the table rows say "DONE (closed by the evidence below)" for lines 3 to 5 while line 1 stays PARTIAL; the text explains this, but a reader of the table alone could overread lines 3 to 5, which rest on suite results recorded rather than re-run here. |
| Dead code (ImageKit helper, PostHog settings) is listed with its importers; nothing is deleted | **VERIFIED** | The audit section "Dead code for your approval" lists both with paths and a REMOVABLE or IN USE verdict. I confirmed `src/lib/imagekit.ts` exists and that `git diff --diff-filter=D --name-only origin/main..HEAD` prints nothing: no file is deleted anywhere on the branch. `git status` shows only the untracked `.claude/worktrees/`. |

Branch note: `git rev-list --count origin/main..HEAD` gives 9 commits, not 10 as the brief said. I did not `git fetch`, so `origin/main` is the local ref. It is not material to the verdict.

## 3. Review resolution claims (01-REVIEW.md)

| Finding | Claimed | Status | Evidence |
| --- | --- | --- | --- |
| WR-01 `/me` shared across sessions | Fixed | **PARTIAL: the join half is fixed; the 401 half is not** | Fixed part, VERIFIED: `src/lib/api.ts:86-92` exports `sessionEpoch()`; `epoch += 1` is in `ensureGuest` (`:104`), `adoptGuestToken` (`:124`) and `clearSession` (`:135`). `src/services/profileService.ts:5, 29-36` stores `{epoch, promise}` and only joins when the epoch matches; the identity guard in `.finally` is correct. Tests at `tests/unit/services/profileService.test.ts:60-90` (token swap, same-session sharing, failed change) pass. Limits: those tests mock `@/lib/api` and bump a local `epoch`, so nothing tests that `api.ts` really bumps it on the three events. **Residual gap:** the review's second consequence (a stale 401 wiping the new guest's token) is not addressed. `src/lib/api.ts` (the `response.status === 401 && options.authToken === undefined` line in `api()`) calls `clearSession()` regardless of which token the request was sent with. A request sent under guest A that returns 401 after a sign-out (the server revokes A in `signOutGuest`) or hand-over can still clear guest B's token. Advisory, narrow window, not a Done-when line. |
| WR-03 yesterday and 7-day strip around DST | Fixed | **VERIFIED** | `src/lib/london.ts:11-21` has `addDays` (UTC-noon arithmetic) and `londonDaysAgo(days, now)` built on `londonToday`. Consumers: `src/hooks/useDailyChallenge.ts:5, 26` (`return londonDaysAgo(1)`) and `src/pages/DailyPage.tsx:15, 119` (`londonDaysAgo(6 - i)`). `grep -n 86400000 src` finds no remaining copy. `adminValidation.ts:313-317` re-exports `londonToday` and `addDays` from `@/lib/london`. Tests `tests/unit/lib/london.test.ts` cover 29 Mar 2027 (00:30 BST, yesterday is the 28th), 31 Oct 2027, a seven-day run and month and year ends; they pass. The test checks the helper only; no test pins that the two consumers call it (the grep does). |
| WR-04 character blocks taps | Fixed in part | **VERIFIED as stated (in part); phone NOT TESTED** | `src/pages/PlayPage.tsx:392-398`: the character host wrapper has `pointer-events-none` (and `aria-hidden`), so it can no longer intercept taps. The md-and-up overlap with long answer lists was not fixed or reproduced; the review resolution says so and records it as NOT TESTED on a phone. I agree with that wording. |
| WR-02, WR-05, IN-01 to IN-05 | Open (advisory) | **Consistent** | The resolution table marks them open and `docs/AUDIT.md` (code review section) repeats it. Not claimed fixed, so not a gap in the claim. WR-02 and WR-05 remain real advisories for a later phase. |

Claimed checks after the fixes (`pnpm check` PASS with 405 unit tests; browser suite 86 of 86): the 405 unit figure matches my own run; the browser figure is recorded, not re-run by me.

## 4. Gaps

1. **Guest on a phone, by hand (Done-when line 1).** Never done. Needs a person with a phone. This is what keeps the status at `human_needed`.
2. **Phone check of the stage character (WR-04).** The `pointer-events-none` fix is in; the md-and-up overlap with six long options is unverified. Check at 360, 768 and 1024 px.
3. **WR-01 residual.** A stale 401 from an old token can still call `clearSession()` and wipe a new guest's token, and `api.ts` epoch bumps are not themselves unit-tested. Suggested fix, for a later task and not applied here: in `api()`, only clear the session if the token sent equals the current `token`, and add a test on `ensureGuest`, `adoptGuestToken` and `clearSession` bumping `sessionEpoch`.
4. **Backend, browser and route results are recorded, not re-run by this verifier** (no database allowed). They come from `docs/AUDIT.md`. Re-run `bash scripts/test-backend.sh` and `pnpm test:e2e` on the throwaway stack if independent confirmation is wanted before release.
5. **Missing link-target unit test for the finished daily** (the plan expected one). Behaviour is covered by the redirect and the browser test; optional.
6. **Live-catalogue shapes (line 5).** The area and level fixtures cannot be compared with the live database from here; NOT TESTED.
7. **Documentation tidy.** The close-out table in `docs/AUDIT.md` still reads "DONE (closed by the evidence below)" for lines 3 to 5 beside a "Result" paragraph that predates the closing evidence. Cosmetic.

## 5. Not verified, by the owner's rules

Any database or PHP suite, the browser suite, the live site, a phone, and a real sign-in. None are reported as passed here.
