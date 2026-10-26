# New repository and hosting setup — doyouknow.space

**Status 26 October 2026:** the full app is live (run 40334226841, commit 1b55017) after the coming-soon page (run 40284190441). Verified values: document root `/home/devgeereact/doyouknow.space`; FTPS host `premium17.web-hosting.com`, port 21, account `github-do-you-know@doyouknow.space`, remote dir `/`; pre-deploy backup in `~/backups/do-you-know/`. Clerk production for the new domain is the new application "do you know space". Step 6 is done except content (cron installed 26 October): private backend in `~/do-you-know-private/` (release layout, `DYK_BACKEND_DIR` = `.../current`), database `devgeereact_dykspace` migrated, API answering on /api/v1. Step 7 backups and restore are proved; backups run daily by cron. Read-only local access to the live database: `bash scripts/live-db.sh shell`. Full evidence: ../06-quality/EVIDENCE-STATUS.md.

25 October 2026. These are prepared steps, not completed remote operations. The owner reports this domain is connected to cPanel. Verify the exact root/TLS before any upload. GitHub authentication is verified and the private repository https://github.com/gsakinz/do-you-know has been created and attached as origin. Commit/push/Action evidence is recorded in docs/08-change-management/REBRAND-VERIFICATION.md. No deployment has been performed.

## 1. Sign in and create the new private repository

In your Mac Terminal:

```sh
cd /Users/realmrgee/Developer/Projects/do-you-know
gh auth login -h github.com
bash scripts/bootstrap-github.sh --check
```

Complete GitHub's browser login yourself; never paste a token into chat. Check that the authenticated account can create `gsakinz/do-you-know`. Inspect any existing repository before attaching it. If that exact private repository is the intended new target:

```sh
bash scripts/bootstrap-github.sh --create
```

This creates/attaches origin, but does not commit or push. Review `git status --short`, ignored files, actual staged contents and license/provenance before an initial commit. Keep .env, keys, private config, generated builds, backups and uploads out of Git. Enable the hook deliberately with `git config core.hooksPath .githooks`. After staging reviewed source paths, run `python3 scripts/guard.py`; stop if it flags a problem. Then make the reviewed initial commit and use a normal `git push -u origin main`. Never force-push or copy the old repository's .git folder into this one.

## 2. Verify cPanel's domain root and recovery

Open cPanel → Domains → find **doyouknow.space** → record its actual document root. Do not assume the domain equals a directory name or that it uses public_html. Check whether any files are already there. Back up existing contents privately and verify recovery before overwriting a page. The source/old website, database and cron stay untouched.

Verify that both the origin and public hostname have valid matching HTTPS certificates. Inspect existing Cloudflare/DNS settings before changing anything; no DNS changes were made here. The coming-soon payload does not require the inherited app's Cloudflare header lock. The full app's root .htaccess still contains inherited origin/CSP rules that need Apache/Cloudflare testing before application deployment.

## 3. Create a dedicated FTPS deployment account

In cPanel → FTP Accounts, create an account such as **github-do-you-know** restricted to this domain's verified public root. Choose its password directly in the secure cPanel interface. Do not use your main cPanel password or a broadly scoped home-directory account.

Obtain the provider's verified explicit-FTPS TLS hostname, port (commonly 21, verify it), and passive-mode support. Do not assume the shared IP is the correct certificate hostname. Cloudflare's website proxy does not proxy FTPS. Never disable TLS verification.

Determine the remote path as seen by this restricted account. A scoped account often sees its root as `/`; verify rather than copying the cPanel filesystem path. In that exact intended root, use File Manager to create a plain text file named:

```text
.do-you-know-deploy-target
```

Its entire content must be:

```text
doyouknow.space
```

The uploader refuses to deploy unless it reads that marker. Create it only after checking ownership/root and the recovery backup. The file is denied by the supplied .htaccess; it contains no credential. The marker does not replace account scoping or human path verification.

## 4. Add GitHub secrets and public variables

New repository → Settings → Secrets and variables → Actions. Enter values directly there, not in source, workflow inputs, chat or shell history.

| Repository secret | Value |
|---|---|
| FTPS_HOST | Verified TLS hosting endpoint, hostname only |
| FTPS_PORT | Verified explicit-FTPS port |
| FTPS_USERNAME | Dedicated scoped account username |
| FTPS_PASSWORD | Its private password |
| FTPS_REMOTE_DIR | Verified absolute path inside that account, often `/` |

Public repository variables for the future app: `VITE_CLERK_PUBLISHABLE_KEY`, optional `VITE_CONTACT_EMAIL`, and `PUBLIC_BACKEND_READY`. Leave `PUBLIC_BACKEND_READY` unset/false until the private backend, database, Clerk origins and restore procedure are verified. A publishable key is browser-public; never put a Clerk secret in VITE_*.

These workflows use repository secrets and explicit manual triggers. They do not assume paid private-repository environment secrets/reviewer features. Check actual account limits/Actions allowance before enabling more automation. Do not make the repo public or buy a plan as a workaround.

## 5. First manual coming-soon deployment

Review the local artifact in `deployment/coming-soon/`. It has no user-data collection, external fonts, AI calls or tracking. Dry-run locally without credentials:

```sh
python3 scripts/deploy-ftps.py --payload deployment/coming-soon
```

Once the first reviewed commit is on GitHub, open Actions → **Manual public FTPS deployment** → Run workflow. Choose `coming-soon`, type `doyouknow.space` in the confirmation field, then run. That manual action is an actual upload: do it only after the exact root and backup are confirmed. It uploads the public allowlist, removes no remote files, and checks the HTTPS page for the commit build identifier. No action has been run by this local task.

If it fails, do not relax TLS checks or widen the account root. Check the five secret names, target marker, certificate endpoint, passive connection and caching. Errors deliberately omit server/credential values. A partial upload is possible; FTPS is not an atomic release protocol. Restore the prior public artifact if necessary, leaving runtime config/uploads alone.

## 6. Private backend and Clerk — separate required work

The public account cannot upload outside its root, execute PHP migrations or configure cron. A coming-soon page is independent of the real app. Before choosing `application`, Claude Code must:

1. Confirm a **new dedicated private backend root** outside every webroot; `do-you-know-private` is only a proposed name.
2. Install reviewed backend code/vendor there using a separately approved method/account; never weaken the public account to reach the whole home directory.
3. Create dedicated runtime/migration DB identities and owner-entered private config. Do not copy the source site's database/keys/users by default.
4. Configure the public API's `DYK_BACKEND_DIR` to the actual private runtime path, preserving its private .htaccess. Without backend/vendor/config it must fail safely, not expose diagnostics.
5. Configure a deliberately chosen Clerk instance for the new domain, redirects/origins/JWKS and backend role checks. Old-domain keys/users are not automatically valid here.
6. Run disposable-database PHP/integration/e2e tests; test anonymous/invalid-token denial, server grading/answer secrecy, owner permissions and private-path denial.
7. Verify private recovery and scoped three-success backup retention; cron configuration is a separate approved change.
8. Review root .htaccess and run the local Apache check before a full app release; this rebrand does not certify those inherited rules.

After those checks, deliberately set `PUBLIC_BACKEND_READY=true`, add only public build variables, review the artifact and manually choose `application`. The workflow builds once, runs frontend checks and uploads only static output plus `api/api.php`; it does not deploy backend code/config/database or overwrite `api/.htaccess`. The separate **Manual application verification** workflow retains fuller PHP/database/browser checks behind an explicit input to conserve Actions minutes.

## 7. Backups and rollback

Retain the latest three completed/validated project/environment backups in a dedicated private location. Keep the pre-migration recovery point pinned separately. Failed backups must not prune successful copies. No generic deletion or old release-prune command is enabled in this new workflow. See BACKUP-RECOVERY.md. Preserve the last public artifact outside the webroot before replacing it; restore deliberately and verify HTTPS/build ID and APIs afterward.

Official references checked for this preparation: [Python FTP_TLS](https://docs.python.org/3/library/ftplib.html), [checkout pinned commit](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1), [setup-node pinned commit](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1). Checksums pin code; review future updates rather than changing to a floating latest tag.
