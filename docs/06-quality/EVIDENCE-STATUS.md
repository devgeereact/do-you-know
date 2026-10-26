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
