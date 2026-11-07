# Verified state (7 Nov 2026)

Stage 1 of the replan. Nothing was fixed. Every line below was checked by running something or reading the cited code; the older notes (`.planning/`, `docs/REPLAN-CURRENT.md`, `docs/DIRECTION.md`, the edit to `.agent/CURRENT-TASK.md`) were treated as unverified claims.

Branch `docs/replan` = `main` = `origin/main` = `32648cd`. Nothing pushed, deployed or changed on the live site or its database. Screenshots and logs are in `.local-test/s1/` (gitignored).

## A. Checks run

| Check | Result | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | `.local-test/s1/install.log` |
| `pnpm check` (lint, format, typecheck, unit tests, build) | PASS | exit 0; 22 files, 197 tests |
| `pnpm test` | PASS | 22 files, 197 tests |
| `pnpm verify` (checks, build, upload guard, Apache rules) | PASS | 283 pages prerendered from the live catalogue (7 info, 14 categories, 262 quizzes); Apache 37/37; nothing sent |
| `bash scripts/test-backend.sh` (throwaway MariaDB) | PASS | 12 suites, 617 checks (93 http, 77 competition, 19 daily, 9 concurrency, 35 feeds, 78 content, 9 cleanup, 27 seo, 12 admin, 31 feedback, 150 cms, 77 generator) |
| `pnpm test:e2e` (mobile and desktop) | PASS after set-up fix | 46/46 in 41 s. First run FAILED: no MariaDB on the default socket (`/tmp/mysql.sock`), so `global-setup.ts:47` died. Re-ran against the project's own MariaDB (port 33999) with `E2E_DB_PORT/E2E_DB_ADMIN_*`: all 46 pass. Not an app bug: the README does not say how to run e2e with the project database |
| Backend suite count | 12 suites, not 13 | the older notes said 13 |

## B. Click-through (Playwright at 390×844, touch, plus a 1440×900 pass for the Studio)

Local stack only: Vite :5202, PHP API :55439 with the local `dyk_dev` database (59 published test and seed quizzes, includes "Studio check NNNN" debris). The live site was never played.

| Area | Result | Evidence |
|---|---|---|
| 19 child and info routes (`/`, `/c/history`, `/q/…`, `/daily`, `/leaderboards`, `/me`, `/me/settings`, five info pages, `/contact`, `/account`, `/admin`, 404, unknown challenge) | All load, no horizontal overflow, no console errors (one expected 404 on an unknown challenge) | `shots/route-*.png` |
| Redirect stubs | `/me/avatar`→`/me`, `/preview`→`/`, `/login`→`/account`, `/dashboard`→`/me/settings` | walk output |
| Practice quiz end to end (`/play/ancient-egypt`, 20 questions: 15 choice, 3 slider, 2 true/false answered) | Works: feedback shows the right answer and an explanation; results screen 7/20 with Next quiz, Play again, Share, Challenge a friend; no console errors | `shots/egypt-*.png` |
| Daily (`/daily/play`) played, then opened again | Shows "Uh-oh / You've played today's challenge", two 400s in the console | `shots/daily-second.png` |
| Studio, all 10 screens, phone and desktop | All load; no overflow. 429s on two desktop screens came from my rapid navigation hitting the API throttle | `shots/studio-*.png` |
| Not exercised | Studio edit/publish/import flows (covered by the 150 backend cms checks, not by a browser run), Clerk sign-in (no key locally), live AI generator (keys unset) | NOT TESTED |

What looks wrong on screen: every answer, question and button is forced to UPPERCASE in the play stage; a countdown ("20s") sits on questions; the play stage is tagged "Ranked"; a 20-question round feels long for small children (a quiz round on the live site is 10).

## C. Claims in `docs/REPLAN-CURRENT.md`

| Claim | Verdict | Proof |
|---|---|---|
| Three question types only (choice, boolean, slider) | CONFIRMED | `Content.php:12`, `types/game.ts:8`; repo content 1,042 / 213 / 125 |
| Repo seed: 46 quizzes, 1,380 questions, 12 categories | CONFIRMED | counted from `backend/content/*.json` |
| 59% of choice questions have the correct answer first; 72% of true/false are "true" | CONFIRMED | 615 of 1,042 (59.0%); 154 of 213 (72.3%) |
| `review_by` dates cluster in two days | CONFIRMED | only 2027-10-21 (1,120) and 2027-10-17 (260) |
| No questions table | CONFIRMED | no `CREATE TABLE … questions` in any migration; questions live in `quiz_versions.snapshot`; migration 0009 is missing (files jump 0008→0010) |
| Typing exists in the child area | CONFIRMED, with nuance | free text fields outside the Studio: `NicknamePicker.tsx:97`, `MePage.tsx:322` (nickname), `MePage.tsx:511` (reply box), `ContactPage.tsx:220,234,256` (email, message, quiz). A default guest never sees a nickname box (server refuses under-13 and unset bands, `Player.php:93-97`; e2e "guests never get a free-text name box" passes). The "report this question" form is radios, so tap-only |
| Age gate can be bypassed by a child | CONFIRMED by code; click-through NOT RUN | `ContactPage.tsx:62-70`: ticking "I'm 18 or over" (unverified) calls `setAgeBand('18_plus')`; `Player.php:44-49` then locks it; `Player.php:96` allows typed names only for non-under-13 |
| Age band is the nearest thing to age data on a child | CONFIRMED | `profiles.age_band`, `Player.php:23` |
| `daily_already_played` "bug" | CONFIRMED as a friendly error, not a crash | the mobile **Play** tab always links to `/daily/play` (`navItems.tsx:54`), as do the desktop header (`SiteHeader.tsx:106`) and leaderboards (`LeaderboardsPage.tsx:189,257`); the home page guards it with `playedToday` (`HomePage.tsx:164,464`) |
| Separate desktop and phone home | CONFIRMED | `DesktopHome` in `HomePage.tsx:80`, 978 lines |
| Play stage uses hard-coded hex colours | CONFIRMED | e.g. `FeedbackPanel.tsx:79,86,95,100,102`; 56 hex literals across play components and `index.css` |
| Answers forced to uppercase | CONFIRMED | `getComputedStyle` text-transform on answer buttons; seen in screenshots |
| Tab bar has no profile tab | CONFIRMED | tabs are Explore, Daily, Play, Boards; the header avatar opens `/me` |
| No sound anywhere | CONFIRMED | no `Audio`, `AudioContext`, `speechSynthesis` in `src/` |
| Duplicated: `londonToday` | CONFIRMED | `gameService.ts:116` and `adminValidation.ts:183` (plus `londonYesterday` in `useDailyChallenge.ts:24`) |
| Duplicated: `QuizStatus`/`Difficulty` types | CONFIRMED, and they differ | `types/domain.ts:10-11` has `in_review/scheduled/archived`; `adminService.ts:101` has `review/retired` |
| Duplicated: `SuggestQuiz`/`SuggestRow` | CONFIRMED | `CategoryPage.tsx:159`, `HomePage.tsx:703` |
| `/me` fetched four times | CONFIRMED (at least) | `SessionContext.tsx:41`, `useProfile.ts:41`, `useMyGames.ts:34`, `useDailyChallenge.ts:54` |
| Unused: `lib/imagekit.ts` | CONFIRMED | no importers; only `env.ts` reads the keys |
| "Question images load from ImageKit" | WRONG as stated | nothing imports ImageKit and `image_url` is never set in content; the player renders any web URL it is given (`PlayPage.tsx:411`) |
| Unused: PostHog settings | CONFIRMED | declared in `env.ts:15,51`, `vite-env.d.ts:12-13`, never read |
| Unused: `workbox-window` | WRONG | needed indirectly: `UpdatePrompt.tsx:2` imports `virtual:pwa-register`, and the built bundle contains `workbox-window.prod.es5` |
| Unused columns, `scene`/`round_size`, 13 i18n keys, `AppSettings` | NOT TESTABLE here | not re-counted; `.planning/codebase/CONCERNS.md` repeats them unverified |
| No unit tests for `PlayPage`, `AnswerButton`, `SliderAnswer`, timer expiry, offline, Studio | PARTLY WRONG | no unit tests for them, but `tests/e2e/play.spec.ts` plays a quiz through all three types on phone and desktop, and `AdminConsole.test.tsx` plus 150 backend cms checks cover the Studio |
| Live content: 262 published (Technology 54, Bible 54, General Knowledge 60, School Science 60) | CONFIRMED | public API: 262 quizzes; by category id: school-science 60, general-knowledge 60, bible-and-faith 54, technology-and-computing 54, the rest in eight older categories |
| Generator keys unset, live run | NOT TESTABLE | by design |

## D. Repo content versus the live database (public read-only API, no writes)

| Item | Repo | Live |
|---|---|---|
| Quizzes | 46 | 262 |
| Overlap | 46 of 46 repo quizzes are live | 216 live-only quizzes |
| Categories | 12 | 14 (two duplicates of existing ones: `bible-faith` and `bible-and-faith`, `tech` and `technology-and-computing`) |
| Round length | 10 default, a quiz may set more | all 262 serve 10 questions per round |
| Age ranges | per file | 4–5, 6–8, 9–11, 12–14, 15–16 and 18+: 36 quizzes each; 7+: 16; 14–16: 8 |

Not checkable from outside: the pool size behind each round (CURRENT-TASK says 20 questions per rewritten quiz, 3,600 in all) and the 13 "daily gap" items. The repo seed is therefore a subset of live and is no longer the source of truth; nothing in the repo holds the 216 live-only quizzes (only a gitignored backup in `.local-test/rewrite/`, per CURRENT-TASK).

## E. Git, `.planning/`, `.agent/` and staleness

| Item | Finding |
|---|---|
| Git | on `docs/replan`, same commit as `main` and `origin/main`; working tree: `.agent/CURRENT-TASK.md` modified (one line, it records the 7 Nov deploy), untracked `.planning/`, `docs/DIRECTION.md`, `docs/REPLAN-CURRENT.md`, `.claude/worktrees/` (another agent's, untouched) |
| `.agent/CURRENT-TASK.md` | header still says "Updated 1 November 2026"; the body holds 1, 2, 6 and 7 Nov work; it is accurate about 7 Nov but not a clean current task |
| `.planning/` | GSD adoption stub: PROJECT, STATE, ROADMAP (no phases), config, and `codebase/` (ARCHITECTURE, CONCERNS, STACK, TESTING). Its own header says it was never re-run; the CONCERNS list (stale Undo, double send, 20 unused exports) was not re-verified here. `ROADMAP.md` will be replaced in Stage 5 |
| `docs/DIRECTION.md` | proposes **removing** leaderboards, friend challenges, the timer, the slider, adult bands, dead code and the age band. That breaks rule 3 (remove nothing that works) and is revised in Stage 2 |
| `docs/REPLAN-CURRENT.md` | mostly right (see C); wrong on ImageKit images and `workbox-window`; "13 suites" should be 12 |
| Other stale items | e2e README lacks the project-MariaDB recipe; `graphify-out/` is gitignored (earlier note said it was not); knowledge graph holds 1,946 nodes and answers symbol queries but its community labels are code-only |
| Housekeeping done by me | started the project's local MariaDB and PHP servers for the runs, then stopped them; wrote only under `.local-test/` and this file |

## Summary

- The app builds, lints, type-checks and passes 197 unit, 617 backend and 46 end-to-end checks; the three question types play correctly on a phone.
- The older replan is largely right. Real problems for the new purpose: typed fields reachable after a self-declared "18 or over", uppercase everywhere, a countdown on every question, a daily-play dead end from the Play tab, hard-coded colours in the play stage, and only three answer types.
- Live and repo content have diverged (46 in repo, 262 live); the live database is the source of truth.
