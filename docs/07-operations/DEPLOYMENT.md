# Deployment: static PWA and PHP API on cPanel (Do You Know)

The frontend builds to a **static `dist/`** folder served as plain files. The only server
code is the private PHP 8.2+ API in `backend/` with MySQL/MariaDB. The cPanel host runs
PHP/Apache only (typically `git`, `rsync`, `mysql`; **no `node`/`npm`**), so the frontend
is built in CI or on the Mac and only the built artefacts are shipped. Supabase was
removed from the code on 16 October 2026 (ADR-003).

> **This app's target:** `doyouknow.soulrefresh.net` → its own docroot
> `/home/devgeereact/doyouknow.soulrefresh.net`, behind a proxied Cloudflare record with
> Full (strict) TLS. Private API releases live under `~/dyk-backend`, outside every
> webroot. Replace the placeholders (`<domain>`, `<docroot>`) below with these values. If
> you deploy through a personal wrapper/CI, that tooling still has to obey the safety
> rules below — they exist because breaking them has caused real outages and leaks.

---

## 1. Build locally

```bash
npm run typecheck && npm run lint    # gates
npm run build                        # emits ./dist (hashed JS/CSS, sw.js, manifest, source maps)
npm run preview                      # smoke-test the production bundle before shipping
```

The only shippable output is `dist/` plus the repo-root **`.htaccess`** (HTTPS
redirect, SPA rewrite to `index.html`, MIME types, cache + security headers).

---

### Check the root `.htaccess` before every release

```bash
npm run build && npm run check:htaccess
```

`scripts/check-htaccess.sh` serves `dist/` through a throwaway local Apache 2.4 on
127.0.0.1:8089 and checks 20 rules: shell and service worker revalidated, hashed assets
and icons immutable, deep links served by the shell, missing static files return 404,
source maps, dotfiles, `config.php` and stray PHP denied, `/api/v1` routed to
`api/api.php`, HSTS and nosniff on HTTPS, the report-only CSP header sent, every inline
script in `dist/index.html` allowed by its sha256 in that CSP, plain HTTP redirected, ACME
challenges open. It does not test LiteSpeed or Cloudflare; check the live site after
deploy. CI does not run this check, so run it before any release that touches
`.htaccess` or the inline script in `index.html`.

### Content-Security-Policy (report-only)

The root `.htaccess` sends `Content-Security-Policy-Report-Only`, added 16 October 2026.
Browsers log violations to the console and block nothing. It allows `'self'`, the inline
theme script by hash, Clerk (`clerk.doyouknow.soulrefresh.net`, `*.protect.clerk.com`,
`challenges.cloudflare.com`, `img.clerk.com`, Clerk telemetry), Sentry ingest and ImageKit
images, as in Clerk's CSP guide. There is no report endpoint yet. Before switching the
header name to `Content-Security-Policy` (enforcing): browse every journey, including an
adult sign-in on `/account`, with the console open and see no CSP violations.

## 2. Ship the artifacts — into THIS app's own docroot

Deploy `dist/*` and `.htaccess` into **the target site's own document root or a
dedicated subdirectory** — for example `~/<domain>/` for an addon domain, or
`public_html/<app>/` for a subpath. **Never** deploy into a shared docroot that other
sites live in.

Typical options:

- **rsync over SSH** (fast, incremental) into `<docroot>/`.
- **cPanel Git Version Control** + a `.cpanel.yml` copy step.
- **FTP/SFTP** upload of `dist/` (CI or manual).

After deploy: load the site over **HTTPS** and confirm the app boots and the install
prompt appears.

---

## 3. Deploy safety rules (non-negotiable)

These are generic cPanel-static truths — obey them regardless of tooling:

1. **Dry-run any mirror/delete first.** If your deploy mirrors with `--delete`, run it
   in dry-run and read the diff before writing. A mirror-delete pointed at the wrong
   directory silently wipes files that exist in **no repo and no backup** (e.g. a
   site's `uploads/`).
2. **Never mirror-delete a shared docroot.** If one directory serves multiple sites or
   holds loose `api.php` / `config.php` / `.htaccess`, target a **specific
   subdirectory** instead. Mirroring the shared root deletes the neighbours.
3. **Exclude runtime & secret files from deletes:** at minimum `uploads/`, `.env`,
   `config.php`, `*.bak*`, `*.zip`, `*.sql`, `error_log`, `node_modules`, `.git`.
4. **Keep backups OUTSIDE every webroot.** Apache serves `.bak` / `.zip` / `.sql` as
   **plain text**, so a backup left in a docroot leaks its contents (including any
   credentials) to the public internet. Put backups in a directory that is not served
   (e.g. `~/private_backups/`).
5. **Never commit real secrets.** `.env` stays git-ignored; only `.env.example`
   (key names, no values) is tracked. Confirm with `git status --ignored` after setup.

---

## 4. Source maps → Sentry

Upload source maps as part of the release so stack traces de-minify, but **do not ship
`*.map` files to the public docroot** — exclude them from the deployed set (or delete
after upload). See `docs/02-architecture/ARCHITECTURE.md` §8 for the security posture.

---

## 5. Managed-service notes (deploy-relevant)

- **Sentry region is fixed at project creation and cannot be changed later.** Pick the
  correct data region up front (e.g. an EU/DE ingest host looks like
  `o<org>.ingest.de.sentry.io`); apps handling EU/UK personal data should be created in
  the EU region with PII scrubbing on. Only browser-safe DSN ships to the client.
- **CodeRabbit only reviews pull requests.** Use branch → PR → merge; work pushed
  straight to the default branch is never reviewed.
- **Only browser-safe values ship in the bundle** (`VITE_*`: API URL, Clerk publishable
  key, ImageKit URL endpoint and public key, Sentry DSN, PostHog key). Database
  credentials, the Clerk secret and the rate-limit key live only in the private
  `config.php` and never touch the static bundle.

- **Do You Know specifics.** Create the Sentry project in the **EU (DE) region** with
  default PII scrubbing on — this app has child users. Never attach user emails or
  nicknames to Sentry events; the user id is enough.

---

## 6. API release (PHP and MySQL)

`npm run package:cpanel` builds `dist/` and creates a new ignored `build/cpanel-*`
directory. Upload its `public/` contents to the app docroot (the API entry
`backend/public/api.php` becomes `api/api.php`) and its `private/` contents to
`~/dyk-backend`, outside ALL webroots. Never upload the whole release directory publicly.
`private/config.php` is a blank template; fill it on the host. Supply `DYK_BACKEND_DIR` in
the deployed `api/.htaccess`, then run `php bin/migrate.php` with the migration user.
Exact paths, config fields, endpoint contracts and checks: `backend/README.md`.

**Server settings overrides (since 16 October 2026).** On the host,
`~/dyk-backend/shared/config.php` is a thin loader: it returns `config.base.php` (the
original filled-in array) with any key set in `shared/.env` (600) laid over it. An empty
`.env` gives exactly the base config (checked on the host at install). Override names:
`DYK_ENVIRONMENT`, `DYK_ALLOWED_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` (comma lists),
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `CLERK_ISSUER`, `CLERK_JWT_KEY`
(write line breaks as `\n`), `CLERK_SECRET_KEY` (`sk_live_` only), `GUEST_TTL_SECONDS`,
`RATE_LIMIT_KEY`. Set them from the Mac with `~/.claude/bin/push-env dyk [file]` (dry run;
add `--go` to send) or on the host with `ssh -t cpanel 'bin/set-secret dyk NAME'`.
`shared/migration.php` is unchanged. Backup of the pre-loader file:
`~/private_backups/dyk/config.php.20261016T234705Z`. Rollback: copy `config.base.php`
back over `config.php`.

After each release: check `/api/v1/health`, check `/api/v1/daily` returns today's quiz,
play one quiz as a guest, and confirm API errors are JSON, not `index.html`.

cPanel cron runs two hourly jobs against `~/dyk-backend/current`, so each release picks
them up without a cron edit: `bin/cleanup.php` (minute 17) and `bin/daily.php` (minute 5). Both run through
`/usr/local/bin/php` (CLI). A bare `php` in cron is the CGI build and silently does nothing.

The crontab is shared with other sites on the account. Never replace it (for example
`echo "…" | crontab -`): that deletes every other site's jobs, which happened on 16 October 2026. Use `npm run cron:ensure` (`scripts/cron-ensure.sh`, with `--dry-run` to preview). It
backs up the crontab to `~/dyk-backend/shared/crontab.bak-*`, adds only missing Do You Know
lines, reports an older Do You Know line instead of duplicating it, and then proves no
earlier line was lost. `npm run test:cron` (also in CI) proves that on a fake crontab.

Each run appends a UTC timestamp and the script's one-line result to
`~/dyk-backend/shared/logs/cron.log` (outside every webroot), so a real cron run can be
checked with `tail ~/dyk-backend/shared/logs/cron.log`.

## 7. Automated deploy (`.github/workflows/deploy.yml`)

Status: written and committed, NOT TESTED. It cannot run until the owner approves and
adds the deploy key and secrets below. Nothing deploys from pull requests or feature
branches.

How it runs: after "Verify application" passes on `main` (or by hand from the Actions
tab), it builds `dist/`, installs locked PHP dependencies, runs
`scripts/package-cpanel.mjs`, then over SSH with a pinned host key:

1. uploads `private/` to `~/dyk-backend/releases/<commit>/` (never `config.php`),
2. links `~/dyk-backend/shared/config.php` into that release,
3. switches `~/dyk-backend/current` to the new release in one atomic rename,
4. uploads `public/` into `~/doyouknow.soulrefresh.net/` with no `--delete`, keeping the
   live `api/.htaccess`, `cgi-bin` and older hashed assets,
5. checks `https://doyouknow.soulrefresh.net/api/v1/health` and `/`,
6. keeps the last five backend releases.

It never runs database migrations. Apply those by hand after a backup (§6).

One-time setup (owner approval required for each item):

| Where                        | Name                                                                                                                       | Value                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| cPanel, SSH Access           | dedicated deploy key                                                                                                       | a new ed25519 key used only by this workflow                                                |
| GitHub secret                | `CPANEL_SSH_KEY`                                                                                                           | private half of that deploy key                                                             |
| GitHub secret                | `CPANEL_KNOWN_HOSTS`                                                                                                       | the server's verified host key line (`ssh-keyscan -p PORT HOST`, checked against the host)  |
| GitHub secrets               | `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_PORT`                                                                                | server name, cPanel user, SSH port                                                          |
| GitHub variables             | `VITE_APP_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, optional `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_IMAGEKIT_URL_ENDPOINT` | public browser values only                                                                  |
| GitHub environment           | `production`                                                                                                               | add the owner as required reviewer to approve each release                                  |
| Server                       | `~/dyk-backend/shared/config.php`                                                                                          | the live private config (mode 600), already outside the webroot                             |
| Server, live `api/.htaccess` | `SetEnv DYK_BACKEND_DIR /home/devgeereact/dyk-backend/current`                                                             | confirm or change once; UNKNOWN whether it currently points at `current` or a fixed release |

Rollback: on the server, `cd ~/dyk-backend && ln -sfn releases/<previous-commit>
current.next && mv -Tf current.next current`, then redeploy the matching public files by
re-running the workflow for that commit. Database changes are not rolled back by this.

Content pages are not prerendered and there is no content-triggered rebuild.
