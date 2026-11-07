# Current task

## Daily: private hands, live board, crown (branch `feat/daily-live-crown`, 7 Nov 2026, NOT committed, NOT deployed)
- Built: each player's daily is their own 10 questions from all live quizzes except 18+, no question shared until the bank has gone round once; live board (10 s) with a crown on rank 1; "Top score today" card; Studio stats credit the right quiz. Details in `CHANGELOG.md`, audit in `docs/AUDIT.md` (7 Nov).
- Checks: `pnpm check` PASS (219 unit) · `pnpm verify` PASS · backend 13 suites PASS (incl. new `daily_deal`, 43 checks) · e2e 46/46 PASS · phone walk on the local stack (hands disjoint, board refreshes in about 9 s). NOT TESTED: live database, Clerk.
- Owner decisions needed before any deploy: (1) approve running `0017_daily_deals.sql` on the server (backup first, `docs/07-operations/DEPLOYMENT.md`), and it must run BEFORE this code reaches `main`; (2) approve commit and push. The Studio Daily calendar still schedules a quiz, but that quiz is now only the day's anchor.
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
