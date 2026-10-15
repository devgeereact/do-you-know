# Current Task

- Outcome: Milestone 2 competition. Visitors can play ranked quizzes, see server-produced leaderboards and play daily/friend challenges. Profile identity remains safe for children.
- Completed locally: ranked mode; weekly/all-time/daily boards; generated nickname/age-band settings; daily challenge/streak preview; friend preview/play/comparison/link sharing.
- Next slices: share-card images; avatar builder and background function integration, with managed-service configuration and cost review before activation.
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
4. DONE locally: daily and friend challenge slices using frozen-version/server-grading RPCs. Migration 0006 adds read-only server-day preview; 69/69 database checks pass.

## Open work

- Avatars and server background functions require managed-service configuration and a cost/secret provisioning decision before activation.
- Mac-origin tunnel remains unverified; no credentials or env files move between machines.
- Dependency advisories remain open. Real phones, assistive technology, full network/auth matrix and production release gates remain pending.
- Milestones 3–4: CMS, prerender/CI, reviewed launch content, parental/analytics consent and release evidence.

## 15 October checkpoint

- Ranked boards, generated identity, daily and friend competition: PASS on local Supabase and the static production build. Evidence in `qa/FUNCTIONAL-AUDIT.md`, `qa/PWA-AUDIT.md` and the evidence register.
- Two independent browser contexts receive the same challenge question order; once-per-day and own-challenge rejection remain server enforced. Sharing fallbacks tested with browser adapters, no messages sent.
- Typecheck/lint/build and Milestone 1 play/recovery regressions pass. No rank, score or elapsed time is submitted by the client.
- Stacked PR #2 targets `feat/milestone-1-play`; PR #1 remains unmerged. Neither PR is production release approval.
- Milestone 2 is PARTIAL: avatars, background generation and share-card images remain. Real two-phone sharing and the Mac-origin tunnel are NOT TESTED; localhost links are development-only.

## Current request: daily freshness and cleaner presentation

- Visual refinement: compact navigation, lighter outlines, quiet secondary controls and immediate press feedback. Apple Design skill applied; brand palette and fonts retained.
- Owner chose one ranked daily run followed by fresh unranked rounds. This is the next implementation batch. Normal refresh must preserve the unfinished question and its server deadline.
- The local fixture contains three questions and selects all three. A larger reviewed pool is required for genuinely different sets. Separate anonymous devices cannot be recognised as the same person without linked identity; no fingerprinting is permitted.
- This visual batch does not claim daily repetition has been solved.
