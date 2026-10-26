# Evidence Status — doyouknow.space

Fresh project baseline. No live configuration, migration, monitor, scheduled job or release was verified by the local rebrand. Inherited historical operation claims were retired from this current record.

Read docs/07-operations/GITHUB-FTPS-SETUP.md and docs/00-foundation/CLAUDE-CODE-HANDOFF.md for the new setup. Actual local checks are in docs/08-change-management/REBRAND-VERIFICATION.md. Release requires valid GitHub access, scoped FTPS, verified document root/TLS, private backend/auth/database readiness, recovery and explicit artifact/target approval.

## Local backend and Apache checks — 25 October 2026

Run on the development Mac against a disposable local MariaDB 13.0.2 (own data directory, 127.0.0.1 only, fake credentials, database `dyk_test`) with the PHP built-in server standing in for Apache routing. These prove the code behaves locally. They do **not** prove the new-domain cPanel host, private backend, production database or Clerk.

| Check | Result | Notes |
|---|---|---|
| Migrations on empty database | PASS | 9 files applied; the numbering has no 0009 (0008 then 0010), unexplained, left unchanged |
| PHP unit | PASS | 28 checks |
| PHP HTTP/database suites | PASS | integration 79, competition 63, concurrency 9, content 78, daily 16, feeds 35, cleanup 7, seo 27 |
| Apache root .htaccess (local httpd) | PASS | 27 passed, 0 failed, 2 skipped (no prerendered /q/ or /c/ pages in dist). Used the existing dist build, not a rebuild |
| Clerk token verification | NOT TESTED | Test config has no Clerk key; no new-domain Clerk instance |
| Real cPanel Apache/TLS/Cloudflare, production DB, FTPS | NOT TESTED | Unchanged from the rebrand record |

## Hosting, first deployment and Clerk — 26 October 2026

Done by Claude Code with the owner's approval, over the owner's existing cPanel SSH access, GitHub CLI, Cloudflare and Clerk connections. No secret value was printed, committed or written to chat.

| Item | Result | Evidence |
|---|---|---|
| cPanel document root | VERIFIED | `uapi DomainInfo single_domain_data`: addon domain, root `/home/devgeereact/doyouknow.space` (not public_html) |
| Pre-deploy backup | VERIFIED | Root held a 368-byte placeholder index.html, empty cgi-bin and a .well-known validation file. Archived to `~/backups/do-you-know/docroot-pre-coming-soon-20261026T070908Z.tar.gz` (mode 600, outside webroot) and downloaded to the owner's Mac; SHA-256 matched both sides and a test extract succeeded |
| Public TLS | VERIFIED | Cloudflare edge certificate valid to 23 Jan 2027; origin serves a Cloudflare Origin CA certificate for doyouknow.space and *.doyouknow.space; zone SSL mode Full (strict) |
| Scoped FTPS account | VERIFIED | `github-do-you-know@doyouknow.space`, homedir = document root. Explicit FTPS on `premium17.web-hosting.com:21` with a publicly trusted certificate (default TLS verification), passive mode works, account sees its root as `/` and cannot leave it |
| Target marker | VERIFIED | `.do-you-know-deploy-target` contains `doyouknow.space`; returns 403 over HTTPS |
| Repository secrets | SET | FTPS_HOST, FTPS_PORT, FTPS_USERNAME, FTPS_PASSWORD, FTPS_REMOTE_DIR. Password generated locally, piped to cPanel and `gh secret set`, local copy deleted. No repository variables set; PUBLIC_BACKEND_READY unset |
| Local dry run | PASS | Payload: .htaccess, coming-soon.css, index.html, robots.txt |
| Coming-soon deployment | PASS | Manual run 40284190441 on 8e84524: uploader reported allowlisted upload and HTTPS build-ID match, no remote deletions. Independent curl confirmed build ID, CSP and X-Frame-Options headers, 403 for marker and .htaccess |
| Clerk | VERIFIED | New application "do you know space" (app_3LDrNdBg7IQQfwiMCE73hsVBCJ8), production instance ins_3LDrRF6buN7fMcmFGPQzTELthLG on doyouknow.space. Publishable key pk_live_Y2xlcmsuZG95b3Vrbm93LnNwYWNlJA. Domain status complete: DNS, mail and SSL for clerk./accounts. The old "Do you know" app (doyouknow.soulrefresh.net) was not changed; its users do not carry over |
| Clerk auth settings | SET | Email code sign-in, password min 15 with breach checks, 7-day sessions, lockout after 10 attempts. First/last name collection off |
| Google sign-in (production) | DISABLED | Turned off on 26 October 2026 because no Google OAuth credentials exist for the new domain. Re-enable only with a Google client ID/secret for doyouknow.space |
| Cloudflare DNS | CHANGED | Added five DNS-only CNAMEs for Clerk (clerk, accounts, clkmail, clk._domainkey, clk2._domainkey). No other zone change |
| Private backend, databases, config.php, migrations, backups, cron | NOT STARTED | Step D |
| Full application release | NOT STARTED | Step E; requires PUBLIC_BACKEND_READY=true and VITE_CLERK_PUBLISHABLE_KEY |

## Private backend, database and backups (step D) — 26 October 2026

Done over the owner's SSH access. Credentials were generated and written straight into private files; none were printed, committed or written to chat.

| Item | Result | Evidence |
|---|---|---|
| Host runtime | VERIFIED | PHP 8.4.27 CLI with pdo_mysql, curl, openssl, mbstring, json; MariaDB 11.4.13. No Composer on host |
| Private layout | VERIFIED | `~/do-you-know-private/` (mode 700): `releases/<sha>/`, `shared/{config.php,migration.php,backup.cnf,backup-db.sh}` (600/700), `current -> releases/80708e7…`. Release `config.php` is a symlink to `shared/config.php`. Old site's `~/dyk-backend/` and database were not touched |
| Backend release | VERIFIED | Built from pushed commit 80708e7 (git archive) plus local vendor/ (25 packages, exact match with composer.lock, no dev packages). `php -l` and autoload OK |
| Database and users | VERIFIED | Database `devgeereact_dykspace`. Runtime `devgeereact_dyks_app`: SELECT, INSERT, UPDATE, DELETE on that database only. Migration `devgeereact_dyks_mig`: ALL on that database only. Read-only `devgeereact_dyks_ro`: SELECT only, for local inspection. Grants checked with SHOW GRANTS |
| Config | VERIFIED | Passes `Dyk\Config::load`. Origins and authorised parties `https://doyouknow.space`; Clerk issuer `https://clerk.doyouknow.space`; Clerk PEM public key from the instance JWKS (kid ins_3LDrRF6buN7fMcmFGPQzTELthLG), no Clerk secret stored; random 64-hex rate-limit key |
| Pre-migration backup | VERIFIED | `~/private_backups/dykspace/db-pre-migrate-20261026T094001Z.sql.gz` (pinned). First attempt produced an empty file because `~/.my.cnf` overrode `--defaults-extra-file`; it was removed and the backup redone with `--defaults-file` and pipefail |
| Migrations | PASS | `DYK_CONFIG=shared/migration.php php bin/migrate.php`: 0001 to 0008 and 0010 applied, exit 0, 17 tables |
| API wiring | VERIFIED | `doyouknow.space/api/.htaccess` = repo rules plus `SetEnv DYK_BACKEND_DIR /home/devgeereact/do-you-know-private/current`; `api/api.php` from 80708e7. The application release uploads only `api/api.php`, so this .htaccess is preserved |
| HTTPS API checks | PASS | /api/v1/health 200; categories and quizzes 200 (empty); /me 401 unauthenticated, 401 with bogus guest token, 401 with forged Clerk JWT; POST /account/session with forged JWT 401; POST /attempts unauthenticated 401; unknown route JSON 404; api/config.php and api/.htaccess 403; no CORS header for a foreign origin, `https://doyouknow.space` allowed; `Cache-Control: no-store, private` |
| Rolling backups | VERIFIED | `shared/backup-db.sh` dumps with `--single-transaction`, verifies gzip and dump footer, writes a .sha256, keeps the newest 3 in `~/private_backups/dykspace/rolling/`, prunes only after success, refuses under 1 GB free. Four runs left exactly three; pinned backup untouched |
| Restore | VERIFIED | Latest rolling backup checksum OK, restored into temporary `devgeereact_dykspace_rt`: 17 tables, same 9 migrations, 43 blocked_words rows, identical to live. Temporary database dropped |
| Local access to live DB | VERIFIED | `scripts/live-db.sh` opens an SSH tunnel on 127.0.0.1:33061 (not 3306/3307, which are local test databases) using `~/.config/do-you-know/live-db-readonly.cnf` (600). Reads work; CREATE, DELETE and INSERT denied |
| Cron (backup, cleanup, daily) | INSTALLED | Owner-approved 26 October 2026 via `shared/install-cron.sh` (previous crontab saved to `~/private_backups/dykspace/crontab-before-20261026T095603Z.txt`; 0 existing lines changed, 3 jobs added): daily.php at :07 hourly, cleanup.php at :23 hourly, backup-db.sh at 03:41 daily, logs in `shared/logs/`. Both PHP jobs run cleanly by hand (daily exits 2 until a quiz is published). The old site's `~/dyk-backend/` cleanup/daily jobs are still in the crontab |
| Content | NOT DONE | Database has no categories or quizzes yet; import/publish is a separate step |
| Off-server backup copy | VERIFIED | `scripts/pull-backups.sh` pulls the newest three rolling backups and the pinned baseline over SSH to `~/Developer/Projects/do-you-know-backups/db/` (mode 700/600, outside the repo), checks SHA-256 and gzip, prunes local rolling copies to three only after success. First run fetched 3 + 1 pinned; second run fetched 0. Manual, not scheduled |
| Old backup tidy-up | DONE | Owner asked to keep three: deleted the two oldest dumps in `~/private_backups/dyk/` and the near-empty `before-preview-20261015.tar.gz` in `~/private_backups/doyouknow/` (old site). Old-site config/htaccess/script copies in `dyk/` kept pending a decision |
| Old-site jobs and files | KEPT | Owner chose on 26 October 2026 to keep the old `~/dyk-backend/` cron jobs and the config/htaccess/script copies in `~/private_backups/dyk/` for now |
