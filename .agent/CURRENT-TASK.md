# Current Task

- Outcome: Milestone 2 competition. Visitors can play ranked quizzes, see server-produced leaderboards and play daily/friend challenges. Profile identity remains safe for children.
- Current slice: ranked mode, weekly/all-time boards and generated nickname/age-band settings.
- Subsequent slices: daily challenge/streaks, friend challenge preview/play/share; avatar/backend integration after a concrete service/cost review.
- Out of scope: CMS, production deployment, paid service activation, public release and merge.
- Mode/system: Build, change safety, PWA engineering.
- Authority: ongoing project implementation and verified branch pushes, local backend only. No production changes or new spending.
- Branch: `feat/milestone-2-compete`, stacked on `feat/milestone-1-play` (PR #1 remains open).
- Date: 15 October 2026.

## Baseline

Milestone 1 is implemented and locally verified at `975d300`. Its history is in `CHANGELOG.md`, project memory and `qa/`. Typecheck/lint/build, 64 scratch database checks, guest play/recovery and PWA cache/update tests passed. Local backend is running on Ubuntu, loopback only.

CodeRabbit reviewed only the initial baseline batch. Later summaries hit the free-plan review limit; no line-by-line approval is recorded. Do not treat its summary as acceptance.

## Batch plan and verification

1. Public board RPC service/hook plus owner-scoped identity reads and protected nickname/age RPC wrappers. No schema changes expected.
2. Ranked launch, leaderboard views and generated-only identity settings. No free-text player fields, no client score/rank calculation.
3. Test two independent guest sessions: ranked scores appear only after a generated nickname is chosen, server ranks display, age band locks, board filters/retry/offline states work and portrait/landscape/320px layouts fit. Re-run Milestone 1 regression and typecheck/lint/build. Push cohesive batches and raise a stacked PR.
4. Continue daily and friend challenge slices using existing frozen-version/server-grading RPC contracts.

## Open work

- Avatars and server background functions require managed-service configuration and a cost/secret provisioning decision before activation.
- Mac-origin tunnel remains unverified; no credentials or env files move between machines.
- Dependency advisories remain open. Real phones, assistive technology, full network/auth matrix and production release gates remain pending.
- Milestones 3–4: CMS, prerender/CI, reviewed launch content, parental/analytics consent and release evidence.
