# Current task — doyouknow.space is live

## 31 October 2026 — Pop & Ink rebrand, Studio CMS, overall board, feedback (Status: DONE, released)

- Goal (owner): build the approved Pop & Ink design to live, with our own logo; fix gaps; test locally first.
- Built: own logo and icons; Pop & Ink tokens and fonts; 13 characters and 8 per-question worlds; framed game stage; new Home (desktop and phone), subject, quiz, Daily (fits screen), Leaderboards (overall, Today default), Contact and feedback with Report; Me in the avatar menu; Studio CMS (To do, Inbox, Library, Editor, Check & publish, Import, Generator screen, Daily calendar, Players, Subjects, Activity, ⌘K search); Clerk sign-ins linked to a server identity; migration 0013.
- Design file v2.0 (owner asked for it before the main app): https://claude.ai/artifact/AzQsphxsJhPuDoSefzJKLh
- Fixed while reviewing: review flag compare on MariaDB 11.4 (`JSON_VALUE` gives 1); feedback message and email now wiped on "Delete my data" (privacy notice updated); Studio moved outside the site layout; local PHP warning in `Identity.php`.
- Checks: `pnpm check` PASS (162 tests); backend suites PASS (incl. cms 121, feedback 29); Playwright 46/46 PASS; Studio walkthrough PASS at 1440 and 390. Live sign-in NOT TESTED; inbox email NOT TESTED (`mail_from` unset); generator BLOCKED (cost approval).
- Released (owner goal "build it to live"): deploys 6ea5580, ac8fd17, 114a226, 13823d7 (smoke 3/3 each; CI and Semgrep green on 13823d7). Live DB backup pinned `~/private_backups/dykspace/db-pre-migrate-0012-0013-20261031T111147Z.sql.gz` (gzip verified), then `bin/migrate.php` applied 0012 and 0013 (0012 had never reached the server: release.json now allows *.sql for the backend part). Live checks: health, daily (stops, stats), overall board (day, all), categories, /, /admin, /leaderboards, /contact all 200; desktop and phone pages with no console errors or overflow. Cloudflare cache purged for favicon, icons, og-image and manifest.
- Owner to do: add your Clerk user id to `admin_subjects` in `~/do-you-know-private/shared/config.php` (it is empty, so the Studio refuses every account on live); optionally set `mail_from` so inbox replies are emailed; sign in once on live to confirm.
- Unused now (not deleted; owner to confirm): `HeroTeaser`, `SkyBackdrop`, `ProgressDots`, `TimerBadge`.

## 29 October 2026 — repository moved
- Now `devgeereact/do-you-know` (transferred from gsakinz; history, issues and secrets kept). Main is protected from force-push and deletion.

## 28 October 2026 — aligned with build-kit v4 (Status: DONE locally; CI pending first run)

- Changed: npm → pnpm; `pnpm check` gate; `pnpm dev` runs Vite 5202 + PHP API 55439 (`pnpm dev:web` frontend only); pre-commit runs guard.py + gitleaks; `verify.yml` is now CI on every push/PR (frontend gate, secret scan, MariaDB backend; e2e opt-in); AGENTS.md single entry point (CLAUDE.md imports it, CODEX.md folded in); graphify output and hooks removed; Dependabot monthly; ADR-012.
- Checks: `pnpm check` PASS (lint, format, typecheck, unit tests, build); guard tests PASS; gitleaks history + dist PASS; local `pnpm dev` app 200 and `/api/v1/health` 200.
- Not done here: no deploy, no server change. Admin Phase A still committed but not deployed (see 27 Oct notes).
- Server, 28 Oct (owner approved): removed the two old `dyk-backend` cron lines (they ran daily/cleanup against the leftover QA database `devgeereact_dyk_dev`); crontab backup in `~/private_backups/crontab/`. The `do-you-know-private` jobs are unchanged. PHP: the account-wide CloudLinux selector is 8.4.27 and no domain overrides it.
- Server, 28 Oct (owner approved): the old site on the soulrefresh.net subdomain (files), its backend `~/dyk-backend`, the QA database `devgeereact_dyk_dev` and its users `devgeereact_dyk_app`/`_mig` were removed after a verified backup in `~/private_backups/dyk-old-site-20261028T130640Z/` (17/17 tables, both folders). Visits had fallen to ~4/day after the 26 Oct launch. Subdomain (cPanel) and DNS record (Cloudflare) deleted by the owner on 29 Oct; confirmed gone.

26 October 2026. Steps A to E are complete. The full app is live at https://doyouknow.space (manual run 40334226841, commit 1b55017), backed by the private backend in `~/do-you-know-private/`, database `devgeereact_doyouknow` (moved 27 October 2026 from `devgeereact_dykspace`, now dropped with its three users; final dump `~/private_backups/dykspace/db-FINAL-before-drop-20261027.sql.gz` kept; users `devgeereact_dyk_run`, `_dyk_ddl`, `_dyk_bak`), Clerk production app "do you know space" (Google sign-in disabled), daily/cleanup/backup cron jobs, and off-server backup copies via `scripts/pull-backups.sh`. 46 quizzes are published (owner-confirmed review, reviewer "Site owner"). Evidence: docs/06-quality/EVIDENCE-STATUS.md.

Open: a human sign-in test on the live site; deciding whether to enforce the report-only CSP; owner request for automatically generated quizzes (project rules allow AI drafts only, published by a human); old-site jobs/files kept by owner choice.

## Update 27 October 2026

- Released to live: 20-question ranked rounds, leaderboard likes, new database `devgeereact_doyouknow` (frontend 501026a). Live API checks passed; no human click-through of the live site yet.
- Built, tested locally, committed, NOT deployed: admin area Phase A (migration 0012, `/admin/me`, `/admin/audit`, `/admin` shell). Deploying it needs: backup, backend release upload, migrate 0012, add the Super Admin's Clerk id to `admin_subjects` in the live private `config.php`, frontend workflow.
- Next: Phase B dashboard, then C moderation, D content manager, E daily scheduler, F growth tools, G generator (drafts only). See `docs/01-product/ADMIN-AREA-PLAN.md`.
- Open: ask the owner where the "stashed generator branch" (migration 0009) lives; `scripts/live-db.sh` needs a new read-only account for the new database; `devgeereact_dyk_dev` QA database still exists on the server.
- Local test layout: everything disposable is under gitignored `.local-test/` (DB, configs, test keys, reports); `.local-state/` is reserved for private recovery state.

## 2026-10-30: docs tidy
Docs tidy (owner rule: one source of truth): Markdown moved into docs/, audits and checklists merged into docs/AUDIT.md, exact duplicates removed, links updated. No code changed. Tasks stay in this file; every audit is added to `docs/AUDIT.md`.
- 30 Oct 2026: push to `main` deploys over SSH (`deploy.yml`, `scripts/release.mjs`); FTPS workflow and scripts removed. Dry run: main is ahead of live (admin area, new front-end build, no pending migrations), so the first deploy ships that.
- 30 Oct 2026: first Actions SSH deploy released `c882ba5` (20261030T192236Z): admin area, backend (4 changed, 2 new) and front end (3 changed, 5 new); 7 files snapshotted; smoke 3/3. Undo: `pnpm release --rollback --go`.
