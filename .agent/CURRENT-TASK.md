# Current task — doyouknow.space is live

26 October 2026. Steps A to E are complete. The full app is live at https://doyouknow.space (manual run 40334226841, commit 1b55017), backed by the private backend in `~/do-you-know-private/`, database `devgeereact_doyouknow` (moved 27 October 2026 from `devgeereact_dykspace`, now dropped with its three users; final dump `~/private_backups/dykspace/db-FINAL-before-drop-20261027.sql.gz` kept; users `devgeereact_dyk_run`, `_dyk_ddl`, `_dyk_bak`), Clerk production app "do you know space" (Google sign-in disabled), daily/cleanup/backup cron jobs, and off-server backup copies via `scripts/pull-backups.sh`. 46 quizzes are published (owner-confirmed review, reviewer "Site owner"). Evidence: docs/06-quality/EVIDENCE-STATUS.md.

Open: a human sign-in test on the live site; deciding whether to enforce the report-only CSP; owner request for automatically generated quizzes (project rules allow AI drafts only, published by a human); old-site jobs/files kept by owner choice.

## Update 27 October 2026
- Released to live: 20-question ranked rounds, leaderboard likes, new database `devgeereact_doyouknow` (frontend 501026a). Live API checks passed; no human click-through of the live site yet.
- Built, tested locally, committed, NOT deployed: admin area Phase A (migration 0012, `/admin/me`, `/admin/audit`, `/admin` shell). Deploying it needs: backup, backend release upload, migrate 0012, add the Super Admin's Clerk id to `admin_subjects` in the live private `config.php`, frontend workflow.
- Next: Phase B dashboard, then C moderation, D content manager, E daily scheduler, F growth tools, G generator (drafts only). See `docs/01-product/ADMIN-AREA-PLAN.md`.
- Open: ask the owner where the "stashed generator branch" (migration 0009) lives; `scripts/live-db.sh` needs a new read-only account for the new database; `devgeereact_dyk_dev` QA database still exists on the server.
- Local test layout: everything disposable is under gitignored `.local-test/` (DB, configs, test keys, reports); `.local-state/` is reserved for private recovery state.
