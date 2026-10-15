# Current Task

## Active task, 15 October 2026: approved Clerk/cPanel migration

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
  Public DNS BLOCKED: Cloudflare MCP exists in the Mac client, but cached OAuth
  expired and macOS held credential-store access. No DNS mutation. See qa/CPANEL-API.md.
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
- Local stack: `supabase start` (ports 5542x). App against it:
  `VITE_SUPABASE_URL=http://127.0.0.1:55421 VITE_SUPABASE_ANON_KEY=<local anon key> npx vite --port 5212`.

## Next

1. Avatar configuration checked 2026-10-15: OpenRouter and ImageKit private keys authenticate. Private keys moved out of VITE_* settings into ignored server-only configuration. Migration 0008 selects google/gemini-3.1-flash-image; image requests prefer lowest-priced providers. Root Supabase URL/anon key and ImageKit endpoint/public key are still examples. Supply real public configuration, confirm the target Supabase project, then separately authorise deployment/secrets installation and test one real avatar. Inngest event/signing authentication remains NOT TESTED; signing-key format passes. Sentry token access check returned 403; DSN remains empty. Evidence: qa/AVATAR-CONFIGURATION-CHECK.md.
2. Raise PRs (`feat/m1-play`, then `feat/m2-compete`, then `feat/m2-avatars`) for CodeRabbit.
3. Not tested anywhere yet: a real Supabase project, physical phones/tablets, Safari/iOS install, offline, dark mode on game screens.
