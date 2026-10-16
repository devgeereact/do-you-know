# Current Task

## Active task, 16 October 2026: daily challenge activator (branch feat/daily-activator)

- Owner goal: build `backend/bin/daily.php`, run by hourly cPanel cron, that marks
  earlier live days done, sets today's row live and auto-picks a published quiz when
  nothing is scheduled, with backend tests; then branch, PR, merge after CI, add the cron
  and verify `/daily` live.
- Done locally: `Dyk\Daily` (`backend/src/Daily.php`), `backend/bin/daily.php`,
  `backend/tests/daily.php` (16 checks) added to `verify.yml`. Local MariaDB 11: 14 unit,
  76 HTTP/database, 63 competition, 16 daily, 9 concurrency PASS. Mutation check: removing
  the least-recently-used ordering fails the daily suite 5 of 5 runs.
- Before this work, live `GET /api/v1/daily` returned `null` (no live row for today).
- Shipped: PR #7 merged after CI (`79d69c3`), automatic deploy PASS. Cron added
  `5 * * * * /usr/local/bin/php /home/devgeereact/dyk-backend/current/bin/daily.php`
  (crontab backup in `~/dyk-backend/shared/`). First live run auto-picked
  `amazing-animals` for 2026-10-16; second run `already_live`. Live `/api/v1/daily`
  returns it with no answer fields; a guest daily start works; `/daily` page shows it at
  390, 820 and 1440 px with no overflow or console errors.
- Found and fixed: cron's bare `php` is the CGI build, so the cleanup cron added earlier
  had never run (scripts answered 404, exit 0). Both lines now use `/usr/local/bin/php`;
  a manual cleanup run then PASS.
- Left in production: one throwaway guest from the live check (no nickname, one
  unfinished daily attempt, not on any board). Its token was not kept, so it was not
  deleted through the API.
- No migration needed: the activator uses the 0004 `daily_challenges` table as it is.

## Active task, 16 October 2026: cPanel only, Supabase removed (branch feat/cpanel-only)

- Done: Supabase removed from the code. The app is a static Vite/React/TypeScript PWA
  built in CI and served from cPanel (`doyouknow.soulrefresh.net`, own docroot
  `/home/devgeereact/doyouknow.soulrefresh.net`, proxied Cloudflare record, Full (strict)
  TLS). The only server is the private PHP API in `backend/` with MySQL/MariaDB. The
  frontend calls it only through `src/lib/api.ts`. Players are guests; adults use Clerk
  on `/account` only. Avatars are 12 presets. Decision: ADR-003.
- Owner decisions today: preset avatars; move content only (categories, quizzes,
  questions, daily challenges) into MySQL, players start fresh; delete the Supabase
  project only after the content export and the live app are verified, with the owner's
  explicit yes at that time; releases through a GitHub Actions SSH deploy.
- Checks today: typecheck, lint, build PASS. Backend 14 unit, 76 HTTP/database, 63
  competition, 9 concurrency PASS on local MariaDB. `npm run check:htaccess` 18/18 PASS.
  Browser run against the local PHP API PASS for catalogue, practice and ranked play,
  grading, review, history, age group, nickname, preset avatar, settings, leaderboard
  with avatar and account deletion.
- Not yet tested: content import, live deploy, real adult Clerk sign-in, GitHub Actions
  deploy.

Remaining steps, in order:

1. Content import: export categories, quizzes, questions and daily challenges from the
   old Supabase project and load them into MySQL. Needs the owner's approval before any
   read of the old project or write to the cPanel database. Verify counts and play a
   sample of imported quizzes. How daily rows become `live` after import is UNKNOWN
   (owner: Gideon, next check: during import).
2. GitHub Actions SSH deploy: needs the owner's approval of the deploy key and secrets
   before setup. Rules in `docs/07-operations/DEPLOYMENT.md` §7.
3. Live verification on `doyouknow.soulrefresh.net`: health check, guest play, daily,
   friend challenge, leaderboards, deletion, offline and update prompt, and a real adult
   Clerk sign-in. Cleanup cron confirmed working on the server 16 October 2026 (hourly, minute 17, CLI PHP).
4. Supabase project deletion: only after steps 1 and 3 are verified, and only with the
   owner's explicit yes at that time.

Sections below are history.

- DONE 16 Oct 2026: `.env.example` trimmed to VITE_CPANEL_API_URL, VITE_CLERK_PUBLISHABLE_KEY, VITE_SENTRY_DSN, VITE_IMAGEKIT_URL_ENDPOINT (commit 2a21115). Each computer's `.env.local` follows the same four names (owner confirmed). No content import needed: the old Supabase was never run on this Mac and no questions were added; MySQL already holds the seed content.

## 16 October 2026: GEE OS 1.4 cpanel contract audit (branch chore/gee-os-cpanel-contract)

- Owner asked to verify every GEE OS cpanel profile file: create what is missing, update
  what exists. Local work only; nothing pushed, deployed or changed on any account.
- Created: `.claude/settings.json` agent hook, `.githooks/pre-commit`, `scripts/agent_guard.py`,
  `scripts/guard.py`, `scripts/verify.py`, `scripts/check-htaccess.sh`.
- Updated: root `.htaccess` (proxy-aware HTTPS, caching scoped to hashed assets and icons,
  stray PHP denied, HSTS, real 404 for missing static files), AGENTS.md, CLAUDE.md,
  CODEX.md, `.agent/PROJECT.yml` (stack_profile cpanel), DEPLOYMENT.md, scripts/README.md.
- Kept: frontend at the repo root (moving it under `app/` would touch CI and packaging for
  no user benefit), existing docs set, backend layout (already matches the profile).
- Open, needs the owner: automated GitHub Actions deploy (deploy key and secrets),
  confirming the cleanup cron on the server, pushing this branch and opening a PR.

## Previous task, 16 October 2026: full merge and production transition (superseded by ADR-003)

- Owner requested full merge/build and shared access from both computers.
- Continue the Clerk/PHP migration, preserving grading and child privacy. The live
  development preview remains authoritative for its current practice-only slice.
- DNS alone does not establish production readiness. The owner authorised the
  transition; verify the complete migration before cutting over remaining services.
- Owner chose option 1: current avatar/Clerk/cPanel build is canonical. Bring
  across verified fixes, preserving its interface and agreed business rules.
  Keep alternate branches, do not merge their overlapping Supabase migrations.
- Secret-free Linux CI now PASS: frontend build/lint/types and isolated MariaDB
  contracts on PHP 8.2/8.4, run 38860929591. PR #4 is ready for review. Its previous
  CodeRabbit SUCCESS was a skipped draft review, not approval.
- PR #4 merged into main after all checks at ec51f70. Alternate branches retained.
  Production implementation now uses feat/cpanel-production, with its own PR.
- First production batch: migration 0003, catalogue filters, owner-only profiles,
  settings, history and confirmed app deletion. Local MariaDB 11.4: 73 HTTP plus
  14 unit checks PASS. Frontend and Clerk production work remains pending.
  Hosted preview is not switched to this batch.
- Competition migration 0004 and PHP port pass 63 extra mode checks plus 9 real
  multi-worker race checks. React accepts server deadlines; 4 browser timer checks
  PASS. Owner has provisioned the existing app's production instance
  ins_3Kla98MIcql96UMCix0F4nkMef9 for doyouknow.soulrefresh.net. All five Clerk
  CNAMEs added in Cloudflare as DNS only; public DNS PASS. Clerk mail checks
  fluctuate between complete and pending during propagation.
  Automatic SSL issuance and Google OAuth remain pending. No production keys
  replaced and no frontend/backend cutover performed.
- Shared development: both computers call the cPanel HTTPS API. MySQL credentials
  remain server-side; each computer keeps its own configuration. Actual Ubuntu
  checkout/local configuration remains NOT TESTED until that machine is available.
- Scope and acceptance gates: docs/07-operations/PRODUCTION-CUTOVER.md.

## Previous implementation: approved Clerk/cPanel migration

- Owner approved `docs/07-operations/CPANEL-MIGRATION.md` in session.
- Current branch: `feat/clerk-cpanel-migration`, based on `feat/m2-avatars`.
- First slice: install React SDK, isolated adult `/account` flow, retain current
  Supabase guest/game sessions until the PHP API is verified. No auto-imports.
- Selected existing Clerk app: `app_3KkAGkEUg8ST1ts6ydvb9DWKhI9`.
- Clerk development application is now linked/reachable; CLI authentication and
  development key diagnostics PASS. Browser sign-in controls and modal PASS.
  Completed user sign-in and production instance remain NOT TESTED. No replacement app.
- PHP foundation added under backend/: private config, Clerk verification, guest
  sessions, catalogue and practice grading, MySQL migrations, API/Apache routing,
  cleanup and release packaging. Deployed to its own cPanel development origin,
  with a separate /preview practice UI. No full backend cutover.
  Competition, avatars, history, profile editing/deletion and account linking still
  use the existing backend. See qa/CPANEL-API.md and backend/README.md.
- Target: doyouknow.soulrefresh.net, own docroot /home/devgeereact/doyouknow.soulrefresh.net.
  SSH alias cpanel works, PHP 8.4/MariaDB 11.4 verified, dedicated database provisioned.
  Cloudflare Origin TLS installed, private configs and quiz examples provisioned.
  Public DNS/TLS PASS on 16 October: proxied A to 185.61.152.45, automatic TTL,
  Full (strict) TLS preserved. Public API, quiz results, Clerk modal and repeat visits
  with an active service worker PASS. Build with VITE_CPANEL_PREVIEW=true for this
  development site only. Full migration remains PARTIAL. See qa/CPANEL-API.md.
- No environment files inspected during this setup. Earlier key status below is
  historical and must not override the owner's local-development setup.

## Previous milestone context

- Outcome: Milestone 1 (Play). A visitor finds a quiz, plays it on a phone in portrait, sees an honest score and explanations.
- In scope: Home, category, quiz landing, game screen (multiple choice, true/false, slider), results and review, guest sessions, `/me` basics, `useQuizAttempt` and `gameService`.
- Out of scope: Leaderboards, daily and friend challenges, avatars, CMS, deploy. Those are Milestones 2 and 3.
- Primary mode: Build.
- Primary system: PWA engineering (`docs/04-pwa/`, `qa/checklists/PWA-RELEASE-CHECKLIST.md`).
- Evidence required: `npm run typecheck`, `npm run lint`, `npm run build` all pass; DB tests pass on a scratch Postgres; the game flow is checked in a browser at 375px portrait and in landscape.
- Completion: The Milestone 1 "done when" line in `README.md` is demonstrably true.

## Where things stand (2026-10-15, later)

- Milestone 1 (Play) done on `feat/m1-play`, plus a production fix: `base: '/'` so deep links load (was blank on /q, /play, /c).
- Every device: checked at 375px portrait, 812x375 landscape, 820x1180 tablet and 1440x900 desktop; installable on desktop Chromium. Install banner hidden during play.
- Milestone 2 (Compete) on `feat/m2-compete` (stacked on `feat/m1-play`):
  - A. Leaderboards, age band (once), nicknames (generated only for under-13s), `/leaderboards`, quiz top 10, `/me` profile + delete account. PASS.
  - B. Daily challenge + streaks: `/daily`, `/daily/play`, home card, 14-day seed calendar. PASS.
  - C. Friend challenges: link + share/copy, `/challenge/:code`, exact same questions, head to head. PASS.
  - D. Avatars on `feat/m2-avatars` (stacked on `feat/m2-compete`): migrations 0006 (avatar options) and 0007 (age band required), builder at `/me/avatar`, `inngest` Edge Function with `generate-avatar`. Verified locally up to the missing OpenRouter key. Real painting NOT TESTED.
- Evidence: `qa/FUNCTIONAL-AUDIT.md`, `qa/evidence/m1-play/`, `qa/evidence/m2-compete/`.
- SUPERSEDED 16 October 2026 (ADR-003), do not use. Former local stack: `supabase start` (ports 5542x). App against it:
  `VITE_SUPABASE_URL=http://127.0.0.1:55421 VITE_SUPABASE_ANON_KEY=<local anon key> npx vite --port 5212`.

## Next

1. Avatar configuration checked 2026-10-15: OpenRouter and ImageKit private keys authenticate. Private keys moved out of VITE_* settings into ignored server-only configuration. Migration 0008 selects google/gemini-3.1-flash-image; image requests prefer lowest-priced providers. Root Supabase URL/anon key and ImageKit endpoint/public key are still examples. Supply real public configuration, confirm the target Supabase project, then separately authorise deployment/secrets installation and test one real avatar. Inngest event/signing authentication remains NOT TESTED; signing-key format passes. Sentry token access check returned 403; DSN remains empty. Evidence: qa/AVATAR-CONFIGURATION-CHECK.md.
2. Raise PRs (`feat/m1-play`, then `feat/m2-compete`, then `feat/m2-avatars`) for CodeRabbit.
3. Not tested anywhere yet: a real Supabase project, physical phones/tablets, Safari/iOS install, offline, dark mode on game screens.
