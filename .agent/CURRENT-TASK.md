# Current task — doyouknow.space is live

26 October 2026. Steps A to E are complete. The full app is live at https://doyouknow.space (manual run 40334226841, commit 1b55017), backed by the private backend in `~/do-you-know-private/`, database `devgeereact_doyouknow` (moved 27 October 2026 from `devgeereact_dykspace`, which is kept untouched for rollback; users `devgeereact_dyk_run`, `_dyk_ddl`, `_dyk_bak`; old config files kept as `*.olddb.*` in shared/), Clerk production app "do you know space" (Google sign-in disabled), daily/cleanup/backup cron jobs, and off-server backup copies via `scripts/pull-backups.sh`. 46 quizzes are published (owner-confirmed review, reviewer "Site owner"). Evidence: docs/06-quality/EVIDENCE-STATUS.md.

Open: a human sign-in test on the live site; deciding whether to enforce the report-only CSP; owner request for automatically generated quizzes (project rules allow AI drafts only, published by a human); old-site jobs/files kept by owner choice.
