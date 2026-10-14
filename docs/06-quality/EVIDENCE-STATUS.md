# Evidence Status

Evidence owner: Codex build session, 14 October 2026, Ubuntu. Baseline `233cbc6`; work on `feat/milestone-1-play`. This is development evidence, not a release decision.

| Gate | Status | Method and observed result | Limitations |
|---|---|---|---|
| Repository baseline | PASS | `git pull --ff-only`, clean tree, GitHub account `devgeereact`, repository `devgeereact/do-you-know` | Before implementation |
| Dependency installation | PASS | `npm ci` installed locked dependencies | Audit findings remain open |
| TypeScript | PASS | `npm run typecheck`, zero errors | Through catalogue batch |
| Lint | PASS | `npm run lint`, zero warnings | Through catalogue batch |
| Static PWA build | PASS | `npm run build`, generated static assets and service worker | Not a browser/device test |
| Dependency security | FAIL | `npm audit`: 14 advisories (4 moderate, 10 high) | Compatible update assessment pending, see DEP-001 |
| Database behaviour | PASS | Migrations 0001–0005 applied; 64/64 checks passed on isolated Postgres 16 at loopback port 55434 | Supabase shim, not hosted Supabase or production |
| Runner failure handling | PASS | Deliberately invalid migration in a temporary test copy exits 3 before behaviour tests | Scratch Postgres 16; no applied migrations edited |
| Runner target guards | PASS | Remote hostname and `postgres` database name rejected before connecting; shell syntax checked | Only local disposable database names allowed |
| Local backend | PASS | All four migrations on real local Supabase/Postgres 17; repeatable `npm run backend:start`; seed rerun is safe | Loopback only; development fixtures |
| Local API integrity | PASS | `npm run backend:check`: public catalogue, anonymous auth, no guest answer-table reads, three question types, resumed attempt, idempotent finish and server review | API checks, not player UI |
| Private Mac route | PARTIAL | Ubuntu loopback bindings verified; Tailscale ping to Mac passes; existing Ubuntu SSH listener confirmed | Mac-origin tunnel/browser/SQL role NOT TESTED |
| Catalogue browser | PASS | Real local API; navigation, filters, missing routes, retry, offline copy, no browse auth, 375px/landscape/320px layouts; no page exceptions | `qa/FUNCTIONAL-AUDIT.md`; headless desktop browser |
| Player journey | PARTIAL | Discovery implemented and verified; Play disabled pending game screens | Milestone 1 remaining |
| Release/device/PWA matrix | NOT TESTED | No production deployment, real device or upgrade checks | Not release-ready |

Full local command output is held under `/tmp/dyk-*-20261014.*` on Ubuntu, not committed. Do not capture CLI status credentials into project evidence.

Gameplay foundation: source inspection confirms public-only cache predicates and play-route update suppression. Runtime cache/update checks remain pending with the game UI. Deadline and preserved resume deadline passed on scratch Postgres 16.
