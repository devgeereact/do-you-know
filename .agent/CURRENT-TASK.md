# Current task — new-domain hosting foundation

26 October 2026. Steps A to C are complete (verified root/TLS, backup, scoped FTPS, secrets, coming-soon deployed by run 40284190441). Clerk production for doyouknow.space is the new application "do you know space"; Google sign-in there is disabled until Google OAuth credentials exist.

Step D is complete apart from scheduling: private backend in `~/do-you-know-private/` (release 80708e7, `current` symlink, shared private config), database `devgeereact_dykspace` migrated with separate runtime, migration and read-only users, API answering at https://doyouknow.space/api/v1 with auth denial verified, rolling three-backup script with a proven restore. Local read-only access to the live database via `scripts/live-db.sh`. Details: docs/06-quality/EVIDENCE-STATUS.md.

Cron jobs for daily.php, cleanup.php and the backup are installed. Off-server backup copy: `bash scripts/pull-backups.sh` (manual). Next: content import/publish, then step E (set VITE_CLERK_PUBLISHABLE_KEY and PUBLIC_BACKEND_READY=true, re-run checks, manual `application` deploy). The old site's cron jobs under `~/dyk-backend/` are separate and untouched.
