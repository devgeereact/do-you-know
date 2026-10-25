# Backup and recovery — new domain

Not configured on the server by this task. The private local pre-rebrand ZIP is a source recovery artifact only; real env/config/vendor/data/uploads were not copied. The source project remains untouched.

Before overwriting any existing domain files or migrating users/data, take a private verified baseline outside every webroot and prove restore in an isolated destination. Keep this baseline pinned separately. Retain the newest THREE completed, checksum-verified project/environment rolling backups, pruning only explicitly owned managed snapshots after a successful new backup. Failed dump/archive/verification or low disk space means no prune. Unknown files, other apps, provider backups and the pinned migration baseline must survive.

The public FTPS workflow does not create a database backup, run cron, retire releases or delete remote files. Choose and test the target-specific private backup procedure before full-app release. Record exact paths/commands, scope, database consistency method, schedule/timezone, independent recovery copy/key, restore evidence and failure notification without secrets. A prepared policy is not a working recurring backup system.
