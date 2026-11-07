# Deployment: doyouknow.space

Since 30 October 2026 (owner decision) every push to `main` deploys. `.github/workflows/deploy.yml` runs `scripts/release.mjs --go` over SSH with a restricted deploy key (secrets `CPANEL_SSH_KEY`, `CPANEL_KNOWN_HOSTS`, label `github-deploy-do-you-know` on the server). Docs-only pushes and `[skip ci]` commits do not deploy. By hand from the Mac: `pnpm release` (dry run), then `pnpm release --go`. No FTP.

What a release does (`release.json`):

1. Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
2. Build: `pnpm build` with the live public settings (it prerenders `/c/<slug>` and `/q/<slug>` from the live public catalogue API, `PRERENDER_REQUIRED=1`, and fails rather than ship the bare shell; before 1 November 2026 this step silently skipped, so every URL served the empty shell), `check:htaccess` (where Apache exists, i.e. on the Mac), `composer install --no-dev`, `scripts/package-cpanel.mjs` into `build/release/{private,public}`.
3. Plan: checksum list of every file that would change. Nothing is ever deleted; `config.php`, `api/.htaccess` (it carries the server's `SetEnv DYK_BACKEND_DIR`), `.env*`, dumps and Markdown are never sent.
4. Snapshot of every server file about to change into `~/backups/do-you-know/releases/<time>/` (newest 3 kept).
5. Upload: `build/release/private` into `~/do-you-know-private/current` (the live backend release folder), then `build/release/public` into `~/doyouknow.space` with entry files last.
6. Smoke: `/`, `/api/v1/health` (`"status":"ok"`), `/api/v1/daily`. A failure restores the snapshot automatically. Undo by hand: `pnpm release --rollback --go`.

Migrations `0017_daily_deals.sql` (private daily hands) and `0018_build_answers.sql` (`attempt_answers.chosen_json`) were applied on 7 Nov 2026. `0019_parent_area.sql` (parent area) was applied on 7 Nov 2026. **Pending: `0020_learning.sql`** (relaxes the attempt mode check to allow `learn`, adds `learn_area` and `learn_result` to `attempts`, and the `learn_cards`, `skills`, `retry_questions` and `stickers` tables) for learning sessions; the code on `phase/p5-adapt` writes those columns, so release the migration alone first, back up, run it, then release the code. Method for a migration the new code needs: release the `.sql` file alone first (a commit with only the migration), back up, run `bin/migrate.php`, then release the code.

New quiz content is not part of a release either: it goes in through the Studio. The P3 drafts (`backend/content/drafts/p3-*.txt`) are Studio import text: release the code first (it raises the prompt limit to 600 characters and adds the "Allow ranked rounds" tickbox), then Import, create drafts, switch ranked rounds off for each "Listen and spell" quiz, read, publish, and release again so the new pages are prerendered.

Database migrations are not part of a release. Take a backup (`bash ~/do-you-know-private/shared/backup-db.sh`, then copy the newest file from `~/backups/do-you-know/dykspace/rolling/` to `~/backups/do-you-know/dykspace/db-pre-migrate-<what>-<time>.sql.gz`; the newest 3 pinned copies are kept), then run `bin/migrate.php` in `~/do-you-know-private/current` with `DYK_CONFIG=$HOME/do-you-know-private/shared/migration.php`. A code change that needs a migration must not reach `main` before the migration has run, or must tolerate the old schema. Migration `.sql` files reach the server only because the private part in `release.json` allows `*.sql` (added 31 October 2026; before that 0012 was never uploaded).

All backend code, vendor, config, uploads, logs and backups stay outside the web root.

Scheduled jobs: `bash scripts/cron-ensure.sh --dry-run` shows whether the three Do You Know jobs (daily activator :07, clean-up :23, backup 03:41) are installed; without `--dry-run` it adds missing ones and never touches other sites' lines. If the crontab is ever lost, the site still activates each day's daily on the first visit. Backups: `docs/07-operations/BACKUP-RECOVERY.md`.

Generator keys: `bash scripts/set-generator-keys.sh` on the Mac (hidden prompts; `--status`, `--off`).
