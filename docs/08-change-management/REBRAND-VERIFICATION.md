# Rebrand verification — 25 October 2026

Identity: Do You Know / do-you-know / https://doyouknow.space. Fresh Route B destination; source archive untouched. Private repository https://github.com/devgeereact/do-you-know is created and origin attached. This is local rebranding and delivery preparation, not new feature development or a production migration.

| Check | Result | Evidence |
|---|---|---|
| Pre-change recovery | PASS | Private outside-project source ZIP, 327 files, archive CRC verified; env/keys/vendor excluded |
| New-domain identity audit | PASS | check-rebrand.py; README, agents/tasks/memory, canonical/social/robots, examples and workspace aligned |
| Install | PASS | npm ci using existing lockfile, ignore-scripts; no dependency upgrade |
| TypeScript | PASS | npm run typecheck |
| Lint | PASS | npm run lint, zero warnings |
| Frontend tests | PASS | 128 tests across 14 files |
| Production/PWA build | PASS | PRERENDER=0 npm run build; initial temp-permission failure resolved by project-local TMPDIR |
| FTPS boundaries | PASS | 4 tests; wrong payload/root paths rejected; coming-soon files allowlisted |
| Staged guard boundaries | PASS | 4 tests; runtime config still blocked, exact Config.php source class still content-scanned |
| Staged secret patterns | PASS | scripts/guard.py; exact source-class false positive corrected, guard not bypassed |
| FTPS dry runs | PASS | Coming-soon and public app payload checks; no network/upload/delete |
| Built retired-domain scan | PASS | No retired hostname in shippable non-map dist output |
| PHP example syntax | PASS | php -l backend/config.example.php |
| Project contract | PASS | scripts/verify.py; Git guard enabled |
| GitHub authentication/repo | PASS | Authenticated devgeereact; private repository created, origin attached |
| GitHub push/manual CI | PASS | Initial baseline be16ba0 pushed; manual run 40238993723 succeeded. Frontend/unit jobs passed; PHP/database/e2e jobs deliberately skipped |
| New-domain hosting/FTPS/Clerk/DB | NOT TESTED | Owner reports cPanel connection; secure setup, root marker and private runtime remain required |
| PHP DB/e2e/Apache | NOT TESTED | Matching disposable database/server not configured for this local rebrand |

No real env/config/credentials were opened or copied. No schema migration, data/user move, cron change, deployment, force push or remote-file deletion performed. Old SSH/owner operational helpers are blocked. Current optional contact email is empty until verified; imported icons/tokens and core business logic are preserved. The source app version is retained as imported package metadata, not a new-domain release claim.

Next: complete the GitHub/FTPS setup guide and Claude Code handoff. Private GitHub source publication does not mean a live site exists; prepared Actions do not prove FTPS or production backend health.

Manual CI evidence: https://github.com/devgeereact/do-you-know/actions/runs/40238993723 . Five required FTPS repository secrets are still absent (names only checked); no deployment workflow was run. Current private recovery ZIP: /Users/realmrgee/Documents/Codex/2026-10-23/ca/work/do-you-know-rebrand/before-rebrand.zip . Reusable Rebrand-and-Restructure pack and its Foundation-First ZIP were updated with the mandatory post-import identity audit.
