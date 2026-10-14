# Deployment — Static PWA on cPanel (Do You Know)

This app builds to a **static `dist/`** folder and is served as plain files. There is
**no server runtime** — the cPanel host runs PHP/Apache only (typically `git`,
`rsync`, `mysql`; **no `node`/`npm`**). So the frontend is **built locally** (or in CI)
and only the built artifacts are shipped.

> **This app's target:** domain `doyouknow.example` (placeholder until the real domain is
> chosen) → docroot `~/doyouknow.example/` (an addon domain with its **own** docroot).
> Replace the placeholders (`<domain>`, `<docroot>`) below with these values. If
> you deploy through a personal wrapper/CI, that tooling still has to obey the safety
> rules below — they exist because breaking them has caused real outages and leaks.

---

## Routing base

The current build targets the root of this app's dedicated docroot (`base: '/'`). Relative asset URLs broke direct `/play/...` loads in static preview by requesting `/play/assets/...`. Root asset URLs and the existing SPA rewrite are required for direct links and refresh. A subdirectory deployment would require an explicitly configured Vite base and matching router basename; it is not supported by the current build.

## 1. Build locally

```bash
npm run typecheck && npm run lint    # gates
npm run build                        # emits ./dist (hashed JS/CSS, sw.js, manifest, source maps)
npm run preview                      # smoke-test the production bundle before shipping
```

The only shippable output is `dist/` plus the repo-root **`.htaccess`** (HTTPS
redirect, SPA rewrite to `index.html`, MIME types, cache + security headers).

---

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
- **Supabase / ImageKit / Inngest keys shipped to the browser must be write-only or
  RLS-guarded** (Supabase anon, ImageKit public, Inngest write-only event key). The
  `service_role` key and Inngest signing key are server-only and never touch this
  static bundle.

- **Do You Know specifics.** Create the Sentry project in the **EU (DE) region** with
  default PII scrubbing on — this app has child users. Never attach user emails or
  nicknames to Sentry events; the user id is enough. Supabase project in an EU region.

---

## 6. Do You Know: content-triggered rebuilds
Public quiz and category pages are prerendered at build time, so publishing content
triggers a rebuild:
1. `publish_quiz()` / the daily switch add a row to `rebuild_requests`.
2. Every 5 minutes `send_rebuild_hook()` (pg_cron + pg_net) calls the `trigger-rebuild`
   Edge Function once for all pending rows.
3. `trigger-rebuild` sends GitHub `repository_dispatch: content-published`.
4. The GitHub Actions workflow runs `npm ci && npm run build && node scripts/prerender.mjs`,
   then deploys `dist/` + `.htaccess` to `~/doyouknow.example/` over SSH/rsync (dry-run
   step first, exclude list from §3) and uploads source maps to Sentry, deleting `*.map`
   from the shipped set.

The same workflow runs on merge to `main`. Store `SSH_KEY`, `SSH_HOST`, `SSH_USER`,
`SENTRY_AUTH_TOKEN` and the `VITE_*` values as GitHub Actions secrets — never in the repo.
