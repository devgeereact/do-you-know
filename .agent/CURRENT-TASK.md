# Current Task

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
  - D. Avatars: NOT STARTED. Needs owner decisions (below).
- Evidence: `qa/FUNCTIONAL-AUDIT.md`, `qa/evidence/m1-play/`, `qa/evidence/m2-compete/`.
- Local stack: `supabase start` (ports 5542x). App against it:
  `VITE_SUPABASE_URL=http://127.0.0.1:55421 VITE_SUPABASE_ANON_KEY=<local anon key> npx vite --port 5212`.

## Next

1. Owner decisions for avatars: OpenRouter image model id, ImageKit account and folder, Inngest app. Keys go in Supabase function secrets, never the repo.
2. Avatars: new migration exposing `avatar_traits` read-only (site_config is admin-only today), `useAvatarBuilder`, builder on `/me`, `inngest` Edge Function per `supabase/functions/README.md`.
3. Raise PRs (`feat/m1-play`, then `feat/m2-compete`) for CodeRabbit.
4. Not tested anywhere yet: a real Supabase project, physical phones/tablets, Safari/iOS install, offline, dark mode on game screens.
