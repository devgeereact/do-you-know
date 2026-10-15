# Evidence Status

Evidence owner: Codex build session, 14 October 2026, Ubuntu. Baseline `233cbc6`; work on `feat/milestone-1-play`. This is development evidence, not a release decision.

| Gate | Status | Method and observed result | Limitations |
|---|---|---|---|
| Repository baseline | PASS | `git pull --ff-only`, clean tree, GitHub account `devgeereact`, repository `devgeereact/do-you-know` | Before implementation |
| Dependency installation | PASS | `npm ci` installed locked dependencies | Audit findings remain open |
| TypeScript | PASS | `npm run typecheck`, zero errors | Through Milestone 1 local implementation |
| Lint | PASS | `npm run lint`, zero warnings | Through Milestone 1 local implementation |
| Static PWA build | PASS | `npm run build`, generated static assets and service worker | Not a browser/device test |
| Dependency security | FAIL | `npm audit`: 14 advisories (4 moderate, 10 high) | Compatible update assessment pending, see DEP-001 |
| Database behaviour | PASS | Migrations 0001–0006 applied; 69/69 checks passed on isolated Postgres 16 at loopback port 55434 | Supabase shim, not hosted Supabase or production |
| Runner failure handling | PASS | Deliberately invalid migration in a temporary test copy exits 3 before behaviour tests | Scratch Postgres 16; no applied migrations edited |
| Runner target guards | PASS | Remote hostname and `postgres` database name rejected before connecting; shell syntax checked | Only local disposable database names allowed |
| Local backend | PASS | Migrations 0001–0006 on real local Supabase/Postgres 17; repeatable `npm run backend:start`; seed rerun is safe | Loopback only; development fixtures |
| Local API integrity | PASS | `npm run backend:check`: public catalogue, anonymous auth, no guest answer-table reads, three question types, resumed attempt, idempotent finish and server review | API checks, not player UI |
| Private Mac route | PARTIAL | Ubuntu loopback bindings verified; Tailscale ping to Mac passes; existing Ubuntu SSH listener confirmed | Mac-origin tunnel/browser/SQL role NOT TESTED |
| Catalogue browser | PASS | Real local API; navigation, filters, missing routes, retry, offline copy, no browse auth, 375px/landscape/320px layouts; no page exceptions | `qa/FUNCTIONAL-AUDIT.md`; headless desktop browser |
| Player journey | PASS | Fresh guest, one session/start, three question types, server score/review, replay and `/me` history | Headless Chrome, local development fixtures; real phones pending |
| Game recovery | PASS | Refresh preserves question, double-click submits once, lost answer/finish response recovery, offline controls and server timeout | `qa/FUNCTIONAL-AUDIT.md` |
| PWA cache/update | PASS | Public catalogue cached; private/history/auth/RPCs absent; legacy cache removed; offline catalogue; real waiting SW suppressed during play and activated after explicit consent | Local static preview, not production upgrade or installed-phone matrix |
| Release/device/PWA matrix | NOT TESTED | No production deployment, real device or upgrade checks | Not release-ready |

Full local command output is held under `/tmp/dyk-*-20261014.*` on Ubuntu, not committed. Do not capture CLI status credentials into project evidence.

Gameplay foundation: source inspection confirms public-only cache predicates and play-route update suppression. Runtime cache/update checks pass against the static build. Deadline and preserved resume deadline passed on scratch Postgres 16.

## Competition checkpoint, 15 October 2026

- PASS: TypeScript, zero-warning lint, static build, 69/69 scratch DB checks, local seed rerun and Milestone 1 browser regressions.
- PASS: ranked/identity/board flow, two-session daily and friend challenge order/versus flow, sharing adapters and static PWA competition privacy checks. See `qa/FUNCTIONAL-AUDIT.md` and `qa/PWA-AUDIT.md`.
- PARTIAL: Milestone 2, avatars/background generation and share-card images remain pending. Physical phones, Mac-origin tunnel, native share dialogs and release acceptance remain unverified.
- Review: PR #2 is stacked on unmerged PR #1. CodeRabbit free-plan summary/rate-limit output is not a comprehensive review approval. Dependency advisory gate remains FAIL.

## Visual refinement, 15 October 2026

- PASS: typecheck, zero-warning lint, static build and responsive/theme browser checks. Focused scope and limits are in `qa/UX-AUDIT.md`.
- BLOCKED: daily freshness implementation follows the owner’s choice of one ranked daily run and fresh unranked rounds. Three-of-three local questions cannot produce fresh sets; anonymous devices lack linked identity. No changed daily behaviour is claimed.
