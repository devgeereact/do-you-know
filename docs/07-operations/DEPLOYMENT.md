# Deployment: doyouknow.space

Since 30 October 2026 (owner decision) every push to `main` deploys. `.github/workflows/deploy.yml` runs `scripts/release.mjs --go` over SSH with a restricted deploy key (secrets `CPANEL_SSH_KEY`, `CPANEL_KNOWN_HOSTS`, label `github-deploy-do-you-know` on the server). Docs-only pushes and `[skip ci]` commits do not deploy. By hand from the Mac: `pnpm release` (dry run), then `pnpm release --go`. No FTP.

What a release does (`release.json`):

1. Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
2. Build: `pnpm build` with the live public settings, `check:htaccess` (where Apache exists, i.e. on the Mac), `composer install --no-dev`, `scripts/package-cpanel.mjs` into `build/release/{private,public}`.
3. Plan: checksum list of every file that would change. Nothing is ever deleted; `config.php`, `api/.htaccess` (it carries the server's `SetEnv DYK_BACKEND_DIR`), `.env*`, dumps and Markdown are never sent.
4. Snapshot of every server file about to change into `~/backups/do-you-know/releases/<time>/` (newest 3 kept).
5. Upload: `build/release/private` into `~/do-you-know-private/current` (the live backend release folder), then `build/release/public` into `~/doyouknow.space` with entry files last.
6. Smoke: `/`, `/api/v1/health` (`"status":"ok"`), `/api/v1/daily`. A failure restores the snapshot automatically. Undo by hand: `pnpm release --rollback --go`.

Database migrations are not part of a release. Take a backup (`php ~/private_backups/dyk/backup-db.php`), then run `bin/migrate.php` in `~/do-you-know-private/current` with `DYK_CONFIG=$HOME/do-you-know-private/shared/migration.php`. A code change that needs a migration must not reach `main` before the migration has run, or must tolerate the old schema.

All backend code, vendor, config, uploads, logs and backups stay outside the web root. `GITHUB-FTPS-SETUP.md` is the superseded FTPS record.
