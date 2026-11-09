# Handoff log

Finished sessions, newest first. The current task is in `CURRENT-TASK.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`.

## 8 to 9 November 2026: Phase 1 close-out, owner calls, router 7, Studio import, content pipeline (Status: DONE, all live at `49c3791`)
- **Phase 1 closed in GSD** (`phase.complete`); the four phone checks stay pending in `.planning/phases/01-clean-up-and-foundations/01-HUMAN-UAT.md`. One `londonToday` helper, one shared `/me` request, DST-safe day arithmetic, a late 401 never wipes a newer session.
- **Owner calls recorded** as ADR-023 and ADR-024. Built: a 30 second cap on ranked and daily for declared teens and adults; dead ImageKit and PostHog code removed; Dependabot #11 and #8 closed, #10 closed (major bumps inside `deploy.yml`).
- **react-router 6 to 7.18**: both runtime advisories closed. The friend no longer covers an answer on tablets; `tests/e2e/sizes.spec.ts` checks guest, friend and child at nine sizes (Chromium emulation, not Safari).
- **Studio, on the live site:** the 61 P3 and P6 drafts were imported (my first loop made 40 duplicates, deleted; the Import screen only parses on "Check questions", which also runs the AI review), and 12 odd age bands were fixed (8 GCSE sets to 15 to 16, 4 Key Stage 3 sets to 12 to 14).
- **Content pipeline, slices 1 to 4** (`docs/CONTENT-PIPELINE-DESIGN.md`): house-rule warnings (`HouseRules.php`, `src/lib/houseRules.ts`, one word list in `backend/rules/`), a safe-to-repeat Add door (content fingerprint, batch id, migration 0021 applied after backup `db-pre-migrate-0021-20261109-012239.sql.gz`), the Batches screen (ready or needs a look, bulk edit, paced publish, undo, read five first), and a daily report-only page check (`.github/workflows/page-check.yml`).
- **Lesson:** my first slice-4 version put a `schedule` trigger in `deploy.yml`; `scripts/check-rebrand.py` forbids that (deploys only on push to main, owner decision 30 Oct 2026) and CI went red on `10fef9c`. Run `python3 scripts/check-rebrand.py` before changing any workflow.
- The 60 imported quizzes still not live were put into one batch by a one-off checked transaction over SSH (batch `7d3f7a4e-f777-453d-b8e2-7fc1dd9ef725`): 45 ready, 15 need a look.
- Not done: the Library's Draft/Ready/Live view, the weekly Studio digest (slice 5), the proactive app (slice 6), Safari and real-phone checks, the Clerk sign-in check at `/grown-ups`, `mail_from`.

## Moved from CURRENT-TASK.md on 9 November 2026 (finished work; the "NOT pushed" and "NOT deployed" notes below were true on their own dates and are all live now)

## Content pipeline, later on 9 Nov: committed on `feat/content-pipeline`, NOT pushed
- Built test-first: the "read five first" dialog before a batch publishes (`AdminBatches::sample`, `BatchScreen`), and slice 4 as a daily report-only gap check (`scripts/prerender-gap.mjs`, `.github/workflows/page-check.yml`; my first version put a schedule into `deploy.yml`, which the project guard rightly refused, so CI went red on 10fef9c until it was moved out). Next: slices 5 and 6.

## Content pipeline (9 Nov 2026, LIVE: main 26d71e9; migration 0021 applied after backup `db-pre-migrate-0021-20261109-012239.sql.gz`)
- Owner: "just implement the content pipeline". Built test-first: **slice 3** (Batches screen: ready or needs a look, bulk difficulty, level and ranked, publish at a pace, undo; `AdminBatches.php`, `BatchScreen.tsx`), **slice 1** (house-rule warnings: `HouseRules.php`, `src/lib/houseRules.ts`, shared word list `backend/rules/house-rules.json`, shown in the editor and import preview) and **slice 2** (an import is safe to repeat: content fingerprint, batch id, `GET /admin/quizzes?batch=`; Import screen reads as you type, takes up to 40 files, AI review is its own button). Design and defaults: `docs/CONTENT-PIPELINE-DESIGN.md`, ADR-024.
- Checks: `pnpm check` PASS (444 unit, including a render test of the Batches screen) · backend, all suites PASS (house rules 37, cms 186) · browser suite 113 PASS · `npm run verify` PASS (37/37, `rules/` is packaged). NOT TESTED: the Import and Batches screens in a real browser (they need the Studio sign-in), the live site.
- Released 9 Nov with the owner's "go ahead": migration alone first, backup, `bin/migrate.php`, then the code. Checked read-only on the live Studio: `/admin/batches` answers, quiz details carry `warnings`, the Batches screen and menu entry appear. The 61 quizzes imported on 8 Nov predate batches, so on 9 Nov (owner: "go ahead") the 60 of them still draft or in review were put into one batch by a one-off, checked transaction over SSH (dry run first: exactly 60 matched; batch `7d3f7a4e-f777-453d-b8e2-7fc1dd9ef725`; the published one, "Acts and the letters", was left out; their `content_hash` stays empty, so re-importing those files would not be recognised as repeats). The Batches screen shows **45 ready, 15 need a look**: 5 "Listen and spell" quizzes (set Ranked to Practice only in bulk), 9 with a question already in another quiz, and 6 with baptism or Last Supper wording to keep or cut. Nothing was published or edited.
- Next: the rest of slice 3 (read five first, Draft/Ready/Live in the Library), then slice 4 (publish without a release), 5 (proactive digest), 6 (proactive app). Owner decision still open for slice 4: dynamic SEO in PHP (default) or a nightly redeploy.

## Studio work done on the live site (8 Nov 2026)
- 61 drafts imported (38 P3 + 23 P6, 579 questions), **none published**. Owner next, in the Studio: read each, set difficulty (easy, medium, hard; all are "medium" now), untick "Allow ranked rounds" on the five "Listen and spell" quizzes (the server already keeps dictation out of ranked rounds), then publish, then one release so the pages prerender. Read the Christian quiz in `p6-humanities-challengers` on your own terms: five questions mention John baptising Jesus or the Last Supper (as events in the gospels and as Maundy Thursday); they are narrative and calendar facts, not teaching about the sacraments, but ADR-023 says to leave sacraments out, so keep or cut each one.
- Age bands fixed on 12 live quizzes. `mail_from` still unset: add `'mail_from' => 'no-reply@doyouknow.space'` to the private server config (SPF, DKIM, DMARC already exist).

## Router 7, phone sizes, ImageKit (8 Nov 2026, branch `phase/p9-router-v7`, committed, NOT pushed)
- Owner: "Fix all". Done: react-router 7.18.5; friend overlap on tablets fixed; ImageKit privacy line and CSP host removed; Dependabot #10 closed; size checks added (`tests/e2e/sizes.spec.ts`, 9 sizes, Chromium emulation).
- Checks: `pnpm check` PASS (408) · browser suite PASS (113, 27 skipped by design) · `npm run verify` PASS earlier on router 7 (re-run before release).
- Open: Next button below the fold on small phones for tall questions (needs a sticky answer sheet; its own task); `.env.example` ImageKit and PostHog lines (guard forbids me opening it); Safari and real-phone checks; the real Clerk sign-in; Studio imports and age bands; `mail_from`.
- Release: needs "approved: push and release" for this branch.

## Owner calls built (8 Nov 2026, branch `phase/p8-owner-calls`, committed, NOT pushed, NOT released)
- Owner said "go ahead". Built: 30 s cap on ranked and daily for declared teens and adults (af0f3cc, test first, `backend/tests/competition.php`); dead ImageKit and PostHog code removed; vulnerability triage in `docs/AUDIT.md`.
- Not built: age-gate publish warning (the Studio's problems list blocks publishing; all 262 live quizzes have `age_min`). Not touched: privacy sentence about ImageKit, `.htaccess` CSP host, `.env.example`.
- Checks: `pnpm check` PASS (408 unit); backend competition, daily, daily_deal, integration PASS. Full backend and browser suites NOT re-run.
- Next: owner's "approved: push and release" for this branch (code only, no migration).

- **8 Nov 2026, later: RELEASED.** Pushed to `main` at 8082450 (owner: "GO AHEAD APPROVED"); CI, Semgrep and Deploy passed; live `/`, health and daily return 200. Dependabot #11 and #8 closed; #10 left open (major bumps in deploy.yml, planned task). Phone checks still pending.

## Owner calls and Phase 1 wrap-up (8 Nov 2026, branch `phase/p1-housekeeping`, committed, NOT pushed)
- Owner said "go with your best recommendation": defaults recorded as ADR-023 (`docs/08-change-management/DECISIONS.md`). GSD Phase 1 marked complete (`phase.complete`); STATE.md corrected (P2-P6 were built before GSD tracked them).
- **Not done, on purpose:** push and release (needs "approved: push and release"), closing/merging Dependabot PRs, dead-code delete, Studio imports and age-band edits, `mail_from`.
- **Owner:** the four phone checks in `.planning/phases/01-clean-up-and-foundations/01-HUMAN-UAT.md`; then say "approved: push and release".
- Checks: docs only; `pnpm check` NOT re-run for this commit (no code change).

## Goal run: phase 1 (branch `phase/p1-housekeeping`, 8 Nov 2026, committed, NOT pushed)
- Phase 1 (P1 clean-up) was already LIVE (fc7b41e). The GSD tooling cannot see this project's `P1-cleanup` folder naming, so I checked P1's done criteria directly and closed the one deferred housekeeping item that was still real: the duplicated `londonToday` helper (test first, `src/lib/london.ts`, commit f269425). The branch also carries 228823a (smoke-test leftovers) from `phase/p7-home`.
- Also done (test first): one shared `/me` request (`getProfile` shares an in-flight call, forgets it on any profile change; session context uses it). Tests in `tests/unit/services/profileService.test.ts`.
- Checks: `pnpm check` PASS (398 unit) · `npm run verify` PASS (37/37 Apache) · browser suite 86/86 PASS. Backend suites not re-run (no backend change).
- Still open from P1: dead-code clean-up (ImageKit helper, PostHog settings); needs your OK to delete.

## Home page polish (branch `phase/p7-home`, 8 Nov 2026, committed locally, NOT pushed, NOT deployed)
- Triggered by the owner's smoke-test request (findings in `docs/AUDIT.md`, 8 Nov) and "landing page needs a polish that will make it super attractive". Built so far: honest counts, areas for everyone, adult sets out of the front door, guest "Ask a grown-up" screen (details in `CHANGELOG.md`). No migration.
- Checks: `pnpm check` and `bash scripts/test-backend.sh`, browser suite on the throwaway database: see the last commit. NOT TESTED: the live site with the new build (needs the release), a real child session on a phone.
- Also done: update-on-calm-page, scene by quiz title, Studio level and difficulty columns, no 18+ daily anchor. Still open: feedback screen tidy (+1 text, friend hidden), `/grown-ups` first-run, the visual polish (needs a direction from the owner).
- 8 Nov, later: a22dd8c is LIVE. Since then, locally only (not pushed): feedback friend above the sheet and a bolder cheer line, `/grown-ups` first run, primary-age "Try one" card on the desktop hero. `pnpm check` (391), backend and browser suite (86) PASS; phone view NOT TESTED.
- Next: owner's "approved" to release these (code only, no migration); landing visual direction if wanted; Dependabot PR #11 close and ignore (needs the owner's word).

## P6: science and humanities content (branch `phase/p6-spread`, 7 Nov 2026, committed, NOT pushed, nothing imported)
- P5 is LIVE (04a686d, migration 0020 applied after backup `db-pre-migrate-0020-20261107-163054.sql.gz`). Plan: `.planning/phases/P6-spread/P6-PLAN.md`.
- Finding: the roadmap's "6 per cell" was already true, so P6 fills topics and formats. Built: 23 drafts (10 Science, 13 Humanities; 215 questions) in `backend/content/drafts/p6-*.txt`, guard tests, coverage report (`docs/LEARNING-DESIGN.md` section 8), review in `docs/AUDIT.md`. Christian only for religious knowledge.
- **Owner:** import the P6 files in the Studio (and the 38 P3 files still waiting), read them, publish, then set quiz difficulty (easy, medium, hard) so steps differ; then one release so the pages are prerendered. No code release is needed for P6 itself.
- Open: the new home (waiting for your landing notes); odd age bands on existing quizzes (list in section 8, a Studio edit needing approval).


## P5: learning sessions, stickers, skill map, sound (branch `phase/p5-adapt`, 7 Nov 2026, committed, NOT pushed, NOT deployed)
- Plan: `.planning/phases/P5-adapt/P5-PLAN.md`. P4 is LIVE (be2a57b, migration 0019 applied after backup `db-pre-migrate-0019-20261107-152805.sql.gz`); P3 code live, its 38 drafts still wait for you in the Studio.
- Built: migration 0020, `Learn` (hand, step rule, retry queue, stickers), `/learn/:area`, end-of-session panel, sticker book, skill map in `/grown-ups`, home tiles for children, sound (off until the parent turns it on), gentle tilt on a wrong answer. Audit: `docs/AUDIT.md` (P5).
- **Needs migration 0020 applied on the server BEFORE the code** (release the `.sql` alone, back up, `bin/migrate.php`, then the code). Needs your "approved".
- **Not built:** the new home redesign (waiting for your landing notes) and the Studio difficulty on the P3 quizzes (steps follow quiz difficulty, which the import left at "medium").
- Next: your landing notes and the new home; then P6 (humanities and science content).


## P4: the parent area (branch `phase/p4-parent`, 7 Nov 2026, committed, NOT pushed, NOT deployed)
- Plan: `.planning/phases/P4-parent/P4-PLAN.md`. P3 code is LIVE (6eed8e1); the 38 P3 quiz drafts are waiting for the owner to import them in the Studio (nothing imported).
- Built: migration 0019 (`children`, `parent_settings`), `Family` class and `/parent/*` routes, `/grown-ups` page, seven switches acting on the child path, privacy notice, a clean-up fix so children are never purged. Audit: `docs/AUDIT.md` (P4).
- **Needs migration 0019 applied on the server BEFORE the code** (release the `.sql` alone, back up, `bin/migrate.php`, then the code). Needs the owner's "approved".
- **Owner after release:** test the real sign-in at `/grown-ups` (Clerk email code), add a child, flip a switch, hand over, and check you cannot get back without a new code.
- Next: P5 (adapt, retry later, stickers, sound, mascot, new home; migration 0020) after approval.


## P3: literacy and numeracy content (branch `phase/p3-content`, 7 Nov 2026, committed, NOT pushed, nothing imported or published)
- Slice 2.2 is LIVE (95a4c26). Built on top: prompts up to 600 characters, Studio "Allow ranked rounds" tickbox, 38 quiz drafts (364 questions) in `backend/content/drafts/p3-*.txt`, a guard test, an e2e passage check. Review and fixes: `docs/AUDIT.md` (P3 content review).
- To publish (owner, in the Studio): release this branch first (it carries the 600-character limit and the ranked tickbox the drafts need). Then Studio → Import → paste one file at a time → read the notes → Create drafts → for each of the 5 "Listen and spell" quizzes untick "Allow ranked rounds" → read each quiz → Publish. Then one more release so the new pages are prerendered. Nothing here has been imported.
- Counts after publishing: every literacy and numeracy level cell reaches 6 (check the live catalogue).
- Next: P4 (parent area, migration 0019) after your "approved".


## P2 slice 2.2: match and sort, Studio forms, import (branch `phase/p2-assign`, 7 Nov 2026, committed, NOT pushed, NOT deployed)
- Slice 2.1 is LIVE (migration 0018 applied after backup `db-pre-migrate-0018-20261107-130845.sql.gz`, code on `main` 301ed25; CI, Semgrep, Deploy passed).
- Built: `assign` type (server grading with `invalid_pairs` refusals, tap-to-place screen), Studio forms and preview for build and assign, validator mirror, import lines, fix for the Studio dropping `build` on save. No migration needed.
- Checks: `pnpm check` PASS (31 files, 329 unit) · backend all suites PASS (new `assign` 38; content 134; cms 160) · e2e 56/56 (4 repeat runs; one mobile assign failure once, not reproduced) · phone audit axe clean. NOT TESTED: Studio forms in a browser (admin sign-in), live site.
- Next: your "approved" to release slice 2.2 (code only, no migration), then P3 (literacy and numeracy content).


## P2 slice 2.1: build questions and number tiles (branch `phase/p2-tap-types`, 7 Nov 2026, committed in parts, NOT pushed, NOT deployed)
- Plan: `.planning/phases/P2-tap-types/P2-PLAN.md`. Built: the `build` question end to end (content format, server grading, forged-input refusals, dictation practice-only, Studio keeps them), tile screen, number keypad, read aloud. Audit: `docs/AUDIT.md` (7 Nov, P2).
- **Needs migration 0018** (additive) applied on the server BEFORE the code is released: release the `.sql` alone, back up, run `bin/migrate.php`, then the code (see `docs/07-operations/DEPLOYMENT.md`). Needs your "approved".

- P1 is live (deployed 7 Nov, `fc7b41e`). Untimed default kept as built.

## P1 clean-up and foundations (branch `phase/p1-cleanup`, 7 Nov 2026, committed, NOT pushed, NOT deployed)
- Plan: `.planning/phases/P1-cleanup/P1-PLAN.md`. Built: server refuses adult age bands for guests, no age question or typed fields for guests, untimed by default, finished daily goes to /daily, play stage on tokens and sentence case, area and level labels. Details in `CHANGELOG.md`; audit in `docs/AUDIT.md` (7 Nov, P1).
- Owner decision needed: keep the untimed default for daily and ranked rounds (easier to look answers up, so the crown is easier to cheat), or cap them at a generous limit? See the audit.
- No migration in P1. Deploy needs your "approved" (push to `main` deploys).

## Daily: private hands, live board, crown (branch `feat/daily-live-crown`, 7 Nov 2026, committed; migration applied on the server, code pushed to `main`)
- Built: each player's daily is their own 10 questions from all live quizzes except 18+, no question shared until the bank has gone round once; live board (10 s) with a crown on rank 1; "Top score today" card; Studio stats credit the right quiz. Details in `CHANGELOG.md`, audit in `docs/AUDIT.md` (7 Nov).
- Checks: `pnpm check` PASS (219 unit) · `pnpm verify` PASS · backend 13 suites PASS (incl. new `daily_deal`, 43 checks) · e2e 46/46 PASS · phone walk on the local stack (hands disjoint, board refreshes in about 9 s). NOT TESTED: live database, Clerk.
- Owner approved 7 Nov: migration 0017 released alone, backed up (`db-pre-migrate-0017-20261107T131208Z.sql.gz`) and applied; then the code pushed. The Studio Daily calendar still schedules a quiz, but that quiz is now only the day's anchor.
- Open: the Gate 1 replan docs (`docs/DIRECTION.md`) still list public boards as a default-off parent switch; this feature makes the daily board visible by default, so Direction should say "the daily board stays on". Per-level pools and crowns are the natural next step once parents set levels.

Updated 1 November 2026 (evening). Finished work is in `HANDOFF.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`.

## Goal
Get doyouknow.space ready for go-live: security audit and fixes, SEO audit and fixes. Branches `golive/2026-11` and `studio/import-2026-11`: **deployed 2 Nov 2026** (main `82b7324`, release `20261102T085255Z`).

## Status
- Commits on `golive/2026-11` are all gated (`pnpm verify` + format check). The audits are in `docs/AUDIT.md` (1 Nov, two sections).
- Security: no Critical or High findings. Fixed 2 Medium (answer-position leak through option ids; erasure keeping written feedback) and the Studio `javascript:` source link. `api.php` strips `X-Powered-By`. Dependencies updated in range (0 high advisories).
- SEO: live now serves 65 prerendered pages with their own titles, canonicals and JSON-LD (checked 2 Nov).

## Studio import (branch `studio/import-2026-11`, on top of `golive/2026-11`)
- Import reads the owner's `# Science · Ages 4–5 · Topic` format: one quiz per heading with its age band, a plain intro and Science as the subject; markdown source links work; sources are optional (ADR-019); imported questions arrive checked so a quiz can be published at once. Non-blocking content notes in the preview.
- AI helpers in the editor (intro from title, explanation from question and answer), off until generator keys are set (ADR-020). AI review of whole imports not built.
- Body quizzes (title about digestion, bones, senses and so on) keep every question in the body world.
- Owner after deploy: re-import the science file in Studio → Import (the drafts made locally were in the test database only), look at the 35 "worth a second look" notes, then publish.

## AI review of imports (branch `studio/ai-import-review`, 6 Nov, not deployed)
- Import and Editor get "Review with AI": ok / fix (before and after, Accept or Reject) / flag per question; nothing saves until a person accepts (ADR-021). Off until `bash scripts/set-generator-keys.sh` has added a model key. Cap 100 calls a day (about 2,500 questions).
- Also fixed: Studio main area did not scroll on phones.
- Owner: approve the deploy, add keys, then Import → paste → Review with AI → Accept → Create drafts → publish.

## Science import (2 Nov)
- All 54 science quizzes published (School Science, age bands and key stages set, 91 prompts reworded, 249 sources fixed); To do empty, no duplicates. 4–5 age chip live.
- Needs one more release so the 37 quizzes published after release `6e6c15c` get prerendered pages (they serve the shell until then).

## Next steps (owner)
1. DONE 2 Nov: deployed. Undo if ever needed: `pnpm release --rollback --go`. Next in Studio → Import: re-paste the science file, read the 35 notes, create drafts, publish.
2. Run the exposed-file check for the private config and environment file URLs (command in Claude's go-live report; the agent guard blocks it). Expect 403 or 404 on every line.
3. Search Console: DNS verify, submit the sitemap. Content work: see `.local-test/seo/doyouknow.space-audit/ACTION-PLAN.md` (About "who" and "how we check", quiz intros, SEO titles).
4. Decide the CSP: enforcing needs a clean click-through of every journey including Clerk sign-in.
5. Cloudflare: GPTBot gets 429; check the rule does not catch search bots. GitHub: consider a `production` environment for `CPANEL_SSH_KEY`.

## Next steps (code, later)
Quiz page CLS (0.08–0.11); footer subject links; generator hardening (per-hop redirect checks, approve only when the stage is done, audit `step`, retry cap); deploy.yml SHA pins and building before the key is written; planned majors (React 19, Router 7, Vite 7, ESLint 10, Clerk PHP 2); find the intermittent e2e 503 (log now in `.local-test/e2e-last-php.log`).

## Checks (1 November 2026, branch)
`pnpm verify` PASS (each commit) · `pnpm check` PASS · backend 13 suites PASS · Apache 37/37 PASS · e2e 46/46 in 3 of 4 runs (1 unexplained 503) · gitleaks full history clean · `pnpm audit` 0 high · `composer audit` clean · lab CLS home 0.002 / category 0.001. NOT TESTED: Lighthouse/PSI (quota), live behaviour of the new code, private config contents (project rule), DB grants (server).

## Live content rewrite (7 Nov 2026, done in Studio on live data, no code change)
- Found: in every topic the ages 4–5, 12–14 and adults quizzes (and all six Technology bands) asked the same 20 facts; 54 quizzes hid exact copies behind labels such as "General knowledge: ..." so the duplicate rule let them through. School Science paired bands (4–5/6–8, 9–11/12–14, 15–16/adults) shared facts in different words.
- Done: 180 quizzes now hold 20 new, clear, label-free questions each (3,600 in all), checked for exact and near repeats against every other new question and everything staying on the site (0 repeats). Bible questions follow the neutrality rule (what a named book says, or plain facts; no doctrine, sacraments, saints or denominational practice). All published; To do "drafts with problems" 0.
- Live now: Technology 54, Bible and faith 54, General Knowledge 60, School Science 60 published quizzes.
- Left: 54 old duplicate Technology drafts remain unpublished (Studio has no delete for never-published drafts; a small delete endpoint needs a deploy). The 41 newly published Technology/Bible quizzes serve the app shell until the next release prerenders them. Writers' fact-check notes (about 150 items) are in the session only; source files and the 316-quiz backup are in `.local-test/rewrite/` (gitignored).
- Delete for never-published drafts: built on branch `feat/delete-unpublished-draft` (`POST /admin/quizzes/{id}/delete`, "Delete draft…" in the editor), backend tests and `pnpm verify` PASS, deployed 7 Nov 2026 (main `32648cd`, prerender 283 pages incl. all 262 quizzes, smoke 3/3). The 54 old duplicate Technology drafts were then deleted in Studio: library is 262 published, 0 drafts.

## 1 November 2026 — auto-pick fix, generator providers, clean-up
- The server crontab had been emptied (31 Oct 04:19 UTC), so the daily activator stopped and 1 Nov had no daily. Restored the Do You Know jobs; the site now activates today's daily on the first visit if the job missed it; the Studio calendar preview matches the real pick (tests). Restored egolimited, volume ping and Flightdeck jobs from the 28 Oct copy at the owner's request (SiteRelay and the missing vitalcare cron.php left out); backups trimmed to the newest 3 with a 03:50 job. A slip on my side emptied the crontab for about two minutes (an edit piped through sed); it was restored from the copy saved seconds before.
- Generator: Anthropic first, OpenRouter backup (same Opus 5.5), Bright Data optional; `scripts/set-generator-keys.sh` for the owner.
- Clean-up: blank template and pre-launch docs removed, outdated docs rewritten (README, PROJECT-MEMORY, SECURITY, BACKUP-RECOVERY, DEPLOYMENT), dead code and FTPS-era scripts removed, `cron-ensure.sh` hardened against a failed crontab read.

## Earlier sessions (moved from CURRENT-TASK.md on 1 Nov 2026)

## 31 October 2026 (evening) — profile, info pages, on-site replies (Status: DONE; release in this session)
- Owner asked: info pages full screen and clean; footer without "Parents and staff" or the tagline; one profile page instead of the avatar menu; nickname changeable once; replies handled in the Studio without email.
- Built: info shell, footer, profile link with unread dot, new `/me`, nickname-once (migration 0016), player Messages and answers, Studio inbox shows answers and can reply to any message.
- Checks: backend suites PASS; `pnpm check` PASS; Playwright 46/46 PASS.
- Owner set `admin_subjects` (1 entry) and `mail_from` in the live private config on 31 Oct 2026, 15:14 UTC (backup `~/private_backups/doyouknow/config.php.20261031T151428Z`); confirmed by a read-only check. Next: owner signs in at /admin. Still the owner's: Generator keys when ready.

## 31 October 2026 (later) — finish every open item (Status: PARTIAL; two steps are the owner's)

- Done: Generator built and shipped switched off (ADR-016; migrations 0014–0015 to run on live after a backup); old components removed; reply emails say how to write back; Clerk Super Admin id verified in the production Clerk app (it is the owner's account).
- Blocked by the project guard (it refuses any command touching the live private config): adding `admin_subjects` and `mail_from` to `~/do-you-know-private/shared/config.php`. The owner runs the prepared command (see the chat of 31 Oct) or edits it in cPanel.
- Owner decisions: approve the generator cost and add the keys; whether to create a hello@doyouknow.space forwarder for replies.
- Checks: backend all suites PASS (generator 37); `pnpm check` PASS; Playwright 46/46 PASS.

## 31 October 2026 — Pop & Ink rebrand, Studio CMS, overall board, feedback (Status: DONE, released)

- Goal (owner): build the approved Pop & Ink design to live, with our own logo; fix gaps; test locally first.
- Built: own logo and icons; Pop & Ink tokens and fonts; 13 characters and 8 per-question worlds; framed game stage; new Home (desktop and phone), subject, quiz, Daily (fits screen), Leaderboards (overall, Today default), Contact and feedback with Report; Me in the avatar menu; Studio CMS (To do, Inbox, Library, Editor, Check & publish, Import, Generator screen, Daily calendar, Players, Subjects, Activity, ⌘K search); Clerk sign-ins linked to a server identity; migration 0013.
- Design file v2.0 (owner asked for it before the main app): https://claude.ai/artifact/AzQsphxsJhPuDoSefzJKLh
- Fixed while reviewing: review flag compare on MariaDB 11.4 (`JSON_VALUE` gives 1); feedback message and email now wiped on "Delete my data" (privacy notice updated); Studio moved outside the site layout; local PHP warning in `Identity.php`.
- Checks: `pnpm check` PASS (162 tests); backend suites PASS (incl. cms 121, feedback 29); Playwright 46/46 PASS; Studio walkthrough PASS at 1440 and 390. Live sign-in NOT TESTED; inbox email NOT TESTED (`mail_from` unset); generator BLOCKED (cost approval).
- Released (owner goal "build it to live"): deploys 6ea5580, ac8fd17, 114a226, 13823d7 (smoke 3/3 each; CI and Semgrep green on 13823d7). Live DB backup pinned `~/private_backups/dykspace/db-pre-migrate-0012-0013-20261031T111147Z.sql.gz` (gzip verified), then `bin/migrate.php` applied 0012 and 0013 (0012 had never reached the server: release.json now allows *.sql for the backend part). Live checks: health, daily (stops, stats), overall board (day, all), categories, /, /admin, /leaderboards, /contact all 200; desktop and phone pages with no console errors or overflow. Cloudflare cache purged for favicon, icons, og-image and manifest.
- Owner to do: add your Clerk user id to `admin_subjects` in `~/do-you-know-private/shared/config.php` (it is empty, so the Studio refuses every account on live); optionally set `mail_from` so inbox replies are emailed; sign in once on live to confirm.
- Unused now (not deleted; owner to confirm): `HeroTeaser`, `SkyBackdrop`, `ProgressDots`, `TimerBadge`.

## 29 October 2026 — repository moved
- Now `devgeereact/do-you-know` (transferred from gsakinz; history, issues and secrets kept). Main is protected from force-push and deletion.

## 28 October 2026 — aligned with build-kit v4 (Status: DONE locally; CI pending first run)

- Changed: npm → pnpm; `pnpm check` gate; `pnpm dev` runs Vite 5202 + PHP API 55439 (`pnpm dev:web` frontend only); pre-commit runs guard.py + gitleaks; `verify.yml` is now CI on every push/PR (frontend gate, secret scan, MariaDB backend; e2e opt-in); AGENTS.md single entry point (CLAUDE.md imports it, CODEX.md folded in); graphify output and hooks removed; Dependabot monthly; ADR-012.
- Checks: `pnpm check` PASS (lint, format, typecheck, unit tests, build); guard tests PASS; gitleaks history + dist PASS; local `pnpm dev` app 200 and `/api/v1/health` 200.
- Not done here: no deploy, no server change. Admin Phase A still committed but not deployed (see 27 Oct notes).
- Server, 28 Oct (owner approved): removed the two old `dyk-backend` cron lines (they ran daily/cleanup against the leftover QA database `devgeereact_dyk_dev`); crontab backup in `~/private_backups/crontab/`. The `do-you-know-private` jobs are unchanged. PHP: the account-wide CloudLinux selector is 8.4.27 and no domain overrides it.
- Server, 28 Oct (owner approved): the old site on the soulrefresh.net subdomain (files), its backend `~/dyk-backend`, the QA database `devgeereact_dyk_dev` and its users `devgeereact_dyk_app`/`_mig` were removed after a verified backup in `~/private_backups/dyk-old-site-20261028T130640Z/` (17/17 tables, both folders). Visits had fallen to ~4/day after the 26 Oct launch. Subdomain (cPanel) and DNS record (Cloudflare) deleted by the owner on 29 Oct; confirmed gone.

26 October 2026. Steps A to E are complete. The full app is live at https://doyouknow.space (manual run 40334226841, commit 1b55017), backed by the private backend in `~/do-you-know-private/`, database `devgeereact_doyouknow` (moved 27 October 2026 from `devgeereact_dykspace`, now dropped with its three users; final dump `~/private_backups/dykspace/db-FINAL-before-drop-20261027.sql.gz` kept; users `devgeereact_dyk_run`, `_dyk_ddl`, `_dyk_bak`), Clerk production app "do you know space" (Google sign-in disabled), daily/cleanup/backup cron jobs, and off-server backup copies via `scripts/pull-backups.sh`. 46 quizzes are published (owner-confirmed review, reviewer "Site owner"). Evidence: docs/06-quality/EVIDENCE-STATUS.md.

Open: a human sign-in test on the live site; deciding whether to enforce the report-only CSP; owner request for automatically generated quizzes (project rules allow AI drafts only, published by a human); old-site jobs/files kept by owner choice.

## Update 27 October 2026

- Released to live: 20-question ranked rounds, leaderboard likes, new database `devgeereact_doyouknow` (frontend 501026a). Live API checks passed; no human click-through of the live site yet.
- Built, tested locally, committed, NOT deployed: admin area Phase A (migration 0012, `/admin/me`, `/admin/audit`, `/admin` shell). Deploying it needs: backup, backend release upload, migrate 0012, add the Super Admin's Clerk id to `admin_subjects` in the live private `config.php`, frontend workflow.
- Next: Phase B dashboard, then C moderation, D content manager, E daily scheduler, F growth tools, G generator (drafts only). See `docs/01-product/ADMIN-AREA-PLAN.md`.
- Open: ask the owner where the "stashed generator branch" (migration 0009) lives; `scripts/live-db.sh` needs a new read-only account for the new database; `devgeereact_dyk_dev` QA database still exists on the server.
- Local test layout: everything disposable is under gitignored `.local-test/` (DB, configs, test keys, reports); `.local-state/` is reserved for private recovery state.

## 2026-10-30: docs tidy
Docs tidy (owner rule: one source of truth): Markdown moved into docs/, audits and checklists merged into docs/AUDIT.md, exact duplicates removed, links updated. No code changed. Tasks stay in this file; every audit is added to `docs/AUDIT.md`.
- 30 Oct 2026: push to `main` deploys over SSH (`deploy.yml`, `scripts/release.mjs`); FTPS workflow and scripts removed. Dry run: main is ahead of live (admin area, new front-end build, no pending migrations), so the first deploy ships that.
- 30 Oct 2026: first Actions SSH deploy released `c882ba5` (20261030T192236Z): admin area, backend (4 changed, 2 new) and front end (3 changed, 5 new); 7 files snapshotted; smoke 3/3. Undo: `pnpm release --rollback --go`.

## 2026-11-01 (evening): go-live audit, branch `golive/2026-11`
- Security audit (security-audit skill, 16 agents, final critic clean): no Critical or High findings. Fixed: option ids leaked the authored position of the right answer (d18fc57); delete and purge kept written feedback (82c4d43); Studio source links limited to http(s) (4cd271e); `X-Powered-By` stripped in api.php (bc5b559). Dependencies updated in range (821f4fa).
- SEO audit (claude-seo): live URLs all served the bare shell because the release skipped prerender. Fixed: release prerenders and fails if it cannot (e1673b8); info pages, schema and meta fallbacks (3fa6ed2); CLS (d9f7d0e). e2e keeps its API log (97c8f55).
- Not pushed, not deployed. Owner steps are in CURRENT-TASK.md.

## 2026-11-02: Studio import fixes, branch `studio/import-2026-11`
- Import takes the owner's age-banded format (1,080 science questions as a fixture), sources optional and imports checked on arrival (ADR-019), AI intro and explanation helpers (ADR-020), body quizzes stay in the body world.
- Not pushed, not deployed. Owner steps are in CURRENT-TASK.md.


## 2026-11-02: deployed go-live and Studio import
- Owner said "deploy now". main fast-forwarded to `82b7324` (both branches), no migrations needed. Gate on that tree: `pnpm verify` PASS (prerender 65, Apache 37/37), backend suites PASS (cms failed once from 138 leftover test-DB subjects past the 100-row public list; switched them off in the disposable DB, PASS), e2e 46/46.
- deploy.yml: prerender 65 pages on the runner, snapshot `20261102T085255Z`, smoke 3/3, released. CI PASS.
- Live checks: 4 sampled pages distinct with own title/canonical; JSON-LD Organization, WebSite, Quiz, BreadcrumbList; /about and /q/<slug>/ served without redirect; llms.txt 200; health ok; no X-Powered-By; one live practice question as a new guest: served ids accepted, correct ids in the served set, nothing leaked, second answer refused.

## 2026-11-02 (later): 4–5 band deployed; science import fixed and published
- 4–5 age chip on home and subject pages (6e6c15c), deployed with owner approval: verify PASS, e2e 46/46, release 20261102T094703Z smoke 3/3; live bundle and `?age=5` checked.
- The 54 stuck science drafts fixed in place and published through Studio's API (details and the 91 reworded prompts in docs/AUDIT.md). To do empty; 0 duplicate prompts or titles across 100 live quizzes.
- Open: 37 quizzes published after the release need one more release for prerendered pages.

## 2026-11-06: AI import review deployed
- Owner approved deploy. main fast-forwarded to `80ecb9a` (AI review endpoint, Import/Editor review UI, Studio phone scroll fix); no migrations. Gate: `pnpm verify` PASS, backend suites PASS, e2e 46/46 (run against the project test DB on 33999 because the system MariaDB socket was down: `E2E_DB_ADMIN_HOST=127.0.0.1 E2E_DB_ADMIN_PORT=33999 E2E_DB_ADMIN_USER=root E2E_DB_PORT=33999 pnpm test:e2e`).
- Release 20261106T231940Z: prerender 201 pages, smoke 3/3; live health ok; `/admin/import/review` returns 401 without a session.
- Open: owner adds generator keys; Bright Data needs an API key plus zone names `mcp_serp` / `mcp_unlocker` (the app uses Bright Data's REST API, not the proxy host/username/password).
