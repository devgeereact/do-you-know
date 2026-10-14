# Evidence Status

Evidence owner: Codex build session, 14 October 2026, Ubuntu. Baseline `233cbc6`; work on `feat/milestone-1-play`. This is development evidence, not a release decision.

| Gate | Status | Method and observed result | Limitations |
|---|---|---|---|
| Repository baseline | PASS | `git pull --ff-only`, clean tree, GitHub account `devgeereact`, repository `devgeereact/do-you-know` | Before implementation |
| Dependency installation | PASS | `npm ci` installed locked dependencies | Audit findings remain open |
| TypeScript | PASS | `npm run typecheck`, zero errors | Baseline shell only |
| Lint | PASS | `npm run lint`, zero warnings | Baseline shell only |
| Static PWA build | PASS | `npm run build`, generated static assets and service worker | Not a browser/device test |
| Dependency security | FAIL | `npm audit`: 14 advisories (4 moderate, 10 high) | Compatible update assessment pending, see DEP-001 |
| Database behaviour | PASS | All four migrations applied; 61/61 checks passed on isolated Postgres 16 at loopback port 55434 | Supabase shim, not hosted Supabase or production |
| Runner failure handling | PASS | Deliberately invalid migration in a temporary test copy exits 3 before behaviour tests | Scratch Postgres 16; no applied migrations edited |
| Runner target guards | PASS | Remote hostname and `postgres` database name rejected before connecting; shell syntax checked | Only local disposable database names allowed |
| Player journey | NOT TESTED | Services and screens missing at baseline | Milestone 1 remaining |
| Release/device/PWA matrix | NOT TESTED | No production deployment, real device or upgrade checks | Not release-ready |

Full local command output is held under `/tmp/dyk-*-20261014.*` on Ubuntu, not committed. Do not capture CLI status credentials into project evidence.
