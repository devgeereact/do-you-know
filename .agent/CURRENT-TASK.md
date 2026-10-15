# Current Task

- Outcome: Milestone 1 (Play). A visitor finds a quiz, plays it on a phone in portrait, sees an honest score and explanations.
- In scope: Home, category, quiz landing, game screen (multiple choice, true/false, slider), results and review, guest sessions, `/me` basics, `useQuizAttempt` and `gameService`.
- Out of scope: Leaderboards, daily and friend challenges, avatars, CMS, deploy. Those are Milestones 2 and 3.
- Primary mode: Build.
- Primary system: PWA engineering (`docs/04-pwa/`, `qa/checklists/PWA-RELEASE-CHECKLIST.md`).
- Evidence required: `npm run typecheck`, `npm run lint`, `npm run build` all pass; DB tests pass on a scratch Postgres; the game flow is checked in a browser at 375px portrait and in landscape.
- Completion: The Milestone 1 "done when" line in `README.md` is demonstrably true.

## Where things stand (2026-10-15)

- Branch `feat/m1-play`. Milestone 1 screens built: home catalogue, `/c/:slug`, `/q/:slug`, `/play/:slug`, results + review, `/me` basics.
- Hooks: `useGuestSession`, `useQuizAttempt` (+ `timeUp`), `useQuestionTimer`, `useQuizCatalog`, `useQuiz`, `useMyGames`. Services: `gameService`, `catalogService`.
- Bug found in the browser and fixed in migration `0005_start_attempt_lock.sql` (concurrent starts made two attempts). DB tests 63/63 on scratch Postgres 16.
- typecheck, lint, build: PASS. Browser journey at 375px portrait and 812px landscape against a LOCAL Supabase stack: PASS (see `qa/FUNCTIONAL-AUDIT.md`, `qa/evidence/m1-play/`).
- Local stack: `supabase start` (ports 5542x, seed in `supabase/seed.sql`). Run the app against it with
  `VITE_SUPABASE_URL=http://127.0.0.1:55421 VITE_SUPABASE_ANON_KEY=<local anon key from supabase status> npm run dev`.
- Not tested: a real Supabase project (none linked), a physical phone, offline play, dark mode on game screens.

## Next

1. Raise a PR from `feat/m1-play` for CodeRabbit review.
2. Pre-existing prettier drift in 13 older files (not touched here).
3. Then Milestone 2 (Compete): leaderboards, daily challenge and streaks, friend challenges, nicknames, age band, avatars.
