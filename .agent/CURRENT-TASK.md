# Current task — new-domain hosting foundation

26 October 2026. Steps A to C of the hosting plan are complete: verified cPanel root and TLS, pre-deploy backup, scoped FTPS account and marker, five repository secrets, and the coming-soon page deployed by manual run 40284190441. Clerk production for doyouknow.space is the new application "do you know space" (DNS, mail and SSL verified). Details: docs/06-quality/EVIDENCE-STATUS.md.

Next: step D, the private backend (folder outside every webroot, backend code and vendor by a separately approved method, runtime and migration database users, owner-entered config.php, DYK_BACKEND_DIR, migrations after backup, three-backup retention). Then step E, the full app release. Google sign-in is disabled in the new Clerk production instance; re-enable only with Google OAuth credentials for doyouknow.space.

Earlier history: repository baseline be16ba0, verification run 40238993723 and the local backend/Apache checks of 25 October are recorded in the evidence and rebrand verification docs. Do not resume inherited old release tasks.
