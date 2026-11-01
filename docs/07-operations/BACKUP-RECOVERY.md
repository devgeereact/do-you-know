# Backup and recovery

Updated 1 November 2026.

## Database

- `~/do-you-know-private/shared/backup-db.sh` runs nightly at 03:41 (cron) and writes a verified, checksummed dump to `~/backups/do-you-know/dykspace/rolling/`, keeping the newest **3**.
- Before every migration: run the script, then copy the newest file to `~/backups/do-you-know/dykspace/db-pre-migrate-<what>-<time>.sql.gz`. The newest **3** pinned copies are kept; older ones are removed when a new one is pinned.
- Restore: take a fresh pinned copy first, then load the dump with the migration (DDL) account from the private migration settings (`zcat <dump> | mariadb … devgeereact_doyouknow`), then re-run `bin/migrate.php` (it is idempotent). The backup account is read-only.

## Code

`scripts/release.mjs` snapshots every server file it is about to change into `~/backups/do-you-know/releases/<time>/` and keeps the last 3. Undo the last release with `pnpm release --rollback --go`.

## Settings

Changes to `~/do-you-know-private/shared/config.php` are made by scripts that save a copy to `~/backups/do-you-know/doyouknow/` first.

## Off the server

`bash scripts/pull-backups.sh` copies the server backups to the Mac (`~/Backups/projects/do-you-know/`).

## Other projects on the account

The same crontab also runs egolimited.com, the volume.gakinz.com health ping and the Flightdeck backup; a 03:50 job keeps the newest 3 of their rolling backups (owner rule, 1 November 2026). A copy of the crontab is saved in `~/backups/_account/crontab/` before every change.
