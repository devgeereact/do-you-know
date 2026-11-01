# Project scripts

Repeatable release, test, setup and guard commands. Each one fails clearly and changes nothing remote without saying so.

| Script | Purpose |
| --- | --- |
| `release.mjs` | SSH release used by `deploy.yml` and `pnpm release` (checks, build, snapshot, upload, smoke, automatic restore). |
| `package-cpanel.mjs` | Builds the cPanel release, keeping public files and the private backend apart. |
| `test-backend.sh` | Runs every PHP suite against the throwaway MariaDB in `.local-test/` (starts what it needs). |
| `set-generator-keys.sh` | Saves the Studio generator keys on the server from the owner's Mac (hidden input; `--status`, `--off`). |
| `cron-ensure.sh` | Adds missing Do You Know cron jobs without touching other sites' lines (`--dry-run` to check). Tested by `cron-ensure.test.sh` (`pnpm test:cron`). |
| `pull-backups.sh` | Copies the server backups to the Mac. |
| `live-db.sh` | Read-only SSH tunnel to the live database (needs the read-only account file on the Mac). |
| `dev.mjs` | `pnpm dev`: Vite and the local PHP API together. |
| `prerender.mjs`, `prerender-html.mjs` | After `vite build`: SEO pages for published subjects and quizzes. |
| `brand-assets.mjs` | Renders the PNG icons and share image from the logo. |
| `check-htaccess.sh` | Proves the root `.htaccess` on a local Apache before a release. |
| `check-rebrand.py` | CI guard: current domain only, deploy runs only on push to `main`, no credential patterns in tracked files. |
| `guard.py`, `agent_guard.py` | Pre-commit secret guard and the Claude Code tool-call guard. |
| `verify.py` | Checks the project contract files and guards are present. |
| `with-local-tmp.sh` | Keeps test temp files inside `.local-test/`. |
