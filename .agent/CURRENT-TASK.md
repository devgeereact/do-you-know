# Current Task

- Outcome: Milestone 1 (Play). A visitor finds a quiz, plays it on a phone in portrait, sees an honest score and explanations.
- In scope: Home, category, quiz landing, game screen (multiple choice, true/false, slider), results and review, guest sessions, `/me` basics, `useQuizAttempt` and `gameService`.
- Out of scope: Leaderboards, daily and friend challenges, avatars, CMS, deploy. Those are Milestones 2 and 3.
- Primary mode: Build.
- Primary system: PWA engineering (`docs/04-pwa/`, `qa/checklists/PWA-RELEASE-CHECKLIST.md`).
- Evidence required: `npm run typecheck`, `npm run lint`, `npm run build` all pass; DB tests pass on a scratch Postgres; the game flow is checked in a browser at 375px portrait and in landscape.
- Completion: The Milestone 1 "done when" line in `README.md` is demonstrably true.

## Where things stand (2026-10-14)

- Imported from `do-you-know.zip` and repackaged into the GEE OS layout. App docs moved into the numbered `docs/` folders; links updated.
- Dev server pinned to 5202 (`strictPort`). Added to `dev-all` as `doyouknow`.
- Branded shell (home, login, dashboard, 404) given a design polish pass. Player game screens do not exist yet.
- Database migrations 0001 to 0004 and 61 behaviour checks came with the import. They have NOT been re-run on this machine.
- No Supabase project is linked yet. `.env` on the Mac holds whatever the zip shipped; check it before first real run.

## Next session (Ubuntu build machine)

1. `git clone` the repo, then `npm ci`.
2. Create a local `.env` from `.env.example` with Ubuntu's own restricted keys. Never copy the Mac `.env`.
3. `npm run typecheck && npm run lint && npm run build`.
4. Run `supabase/tests/run_tests.sh` against a scratch Postgres 16.
5. Start Milestone 1 on a feature branch and raise a PR (CodeRabbit reviews PRs only).
