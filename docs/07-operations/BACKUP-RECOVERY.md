# Backup and recovery — new domain

**Status 26 October 2026:** database backups are set up on the server. `~/do-you-know-private/shared/backup-db.sh` writes verified, checksummed dumps to `~/private_backups/dykspace/rolling/` and keeps the newest three; the pre-migration baseline is pinned in `~/private_backups/dykspace/`; the pre-deploy document root archive is in `~/backups/do-you-know/`. A restore into a temporary database was proved. Not yet scheduled by cron and no off-server copy. Details: ../06-quality/EVIDENCE-STATUS.md.

Not configured on the server by this task (original note). The private local pre-rebrand ZIP is a source recovery artifact only; real env/config/vendor/data/uploads were not copied. The source project remains untouched.

Before overwriting any existing domain files or migrating users/data, take a private verified baseline outside every webroot and prove restore in an isolated destination. Keep this baseline pinned separately. Retain the newest THREE completed, checksum-verified project/environment rolling backups, pruning only explicitly owned managed snapshots after a successful new backup. Failed dump/archive/verification or low disk space means no prune. Unknown files, other apps, provider backups and the pinned migration baseline must survive.

The public FTPS workflow does not create a database backup, run cron, retire releases or delete remote files. Choose and test the target-specific private backup procedure before full-app release. Record exact paths/commands, scope, database consistency method, schedule/timezone, independent recovery copy/key, restore evidence and failure notification without secrets. A prepared policy is not a working recurring backup system.
