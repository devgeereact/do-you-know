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
- Database migrations 0001 to 0004 and 61 behaviour checks came with the import. Re-run independently on Ubuntu: 61/61 pass on scratch Postgres 16.
- No hosted Supabase project is linked. Local Supabase is now running on Ubuntu; its own ignored `.env.local` contains only browser-safe local credentials.

## Active build (2026-10-14)

- Authority: Gideon requested implementation, documented progress and small verified GitHub pushes. Local backend authorised; no hosted backend, production deployment or merge authorised.
- Branch: `feat/milestone-1-play`, PR to `main` after verified batches.
- Primary mode: Build. Workflow: change safety. System: PWA engineering.
- Inspection: populated product, rules, architecture, data model, hooks, design, deployment and memory read; remaining scaffold specifications inspected and identified as incomplete.
- Baseline: clean and synchronised at `233cbc6`; `npm ci`, typecheck, lint and static build pass. npm audit reports 14 advisories (4 moderate, 10 high), assessment pending.
- Local backend: prepare isolated Supabase development services and a separate scratch Postgres 16 for destructive behaviour tests. Never run the shim or scratch runner against the development app database.
- Cross-computer access: user requested Mac access to Ubuntu's backend. Use existing private Tailscale + SSH forwarding, keep service ports on loopback. Mac connection remains unverified until tested there. Machine addresses belong in GEE OS local context, not project source.

## Ordered batches

1. Baseline and reliable database test runner, evidence and progress record.
2. Persistent local Supabase setup, private access instructions and original development-only quiz seed.
3. Public catalogue service/hook, home discovery, category and quiz landing routes, loading/empty/error/offline states.
4. Guest session, typed game RPC service and attempt lifecycle with refresh/retry handling.
5. Game UI for choice, true/false and slider, feedback, results/review and protected update behaviour.
6. `/me` basics and complete responsive/recovery regression checks.

Each batch: focused diff, appropriate checks, documentation update, atomic commit and push. No force push or default-branch push. Keep Milestones 2–4 pending.

## Remaining work and proof

- Milestone 1 player services, hooks and screens are missing at baseline.
- Fix service-worker cache scope before introducing private player/history reads.
- Verify the actual server RPC payloads and timer/resume behaviour before implementing the hook. Current payload lacks a question deadline; do not invent an accurate resumed countdown.
- Local backend and Mac tunnel not yet verified.
- Dependency advisories need a separate compatible-update assessment.
- Live iPhone/Android, assistive technology, PWA update/offline matrix and production checks remain untested.
- Milestones 2–4: challenges/boards/avatars, CMS/background functions/prerender/CI, reviewed launch content and release gates.
