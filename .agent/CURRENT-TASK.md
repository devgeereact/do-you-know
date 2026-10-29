# Current task — doyouknow.space is live

## 28 October 2026 — aligned with build-kit v4 (Status: DONE locally; CI pending first run)

- Changed: npm → pnpm; `pnpm check` gate; `pnpm dev` runs Vite 5202 + PHP API 55439 (`pnpm dev:web` frontend only); pre-commit runs guard.py + gitleaks; `verify.yml` is now CI on every push/PR (frontend gate, secret scan, MariaDB backend; e2e opt-in); AGENTS.md single entry point (CLAUDE.md imports it, CODEX.md folded in); graphify output and hooks removed; Dependabot monthly; ADR-012.
- Checks: `pnpm check` PASS (lint, format, typecheck, unit tests, build); guard tests PASS; gitleaks history + dist PASS; local `pnpm dev` app 200 and `/api/v1/health` 200.
- Not done here: no deploy, no server change. Admin Phase A still committed but not deployed (see 27 Oct notes).
- Server, 28 Oct (owner approved): removed the two old `dyk-backend` cron lines (they ran daily/cleanup against the leftover QA database `devgeereact_dyk_dev`); crontab backup in `~/private_backups/crontab/`. The `do-you-know-private` jobs are unchanged. PHP: the account-wide CloudLinux selector is 8.4.27 and no domain overrides it.
- Server, 28 Oct (owner approved): the old site doyouknow.soulrefresh.net (files), its backend `~/dyk-backend`, the QA database `devgeereact_dyk_dev` and its users `devgeereact_dyk_app`/`_mig` were removed after a verified backup in `~/private_backups/dyk-old-site-20261028T130640Z/` (17/17 tables, both folders). Visits had fallen to ~4/day after the 26 Oct launch. Subdomain (cPanel) and DNS record (Cloudflare) deleted by the owner on 29 Oct; confirmed gone.

26 October 2026. Steps A to E are complete. The full app is live at https://doyouknow.space (manual run 40334226841, commit 1b55017), backed by the private backend in `~/do-you-know-private/`, database `devgeereact_doyouknow` (moved 27 October 2026 from `devgeereact_dykspace`, now dropped with its three users; final dump `~/private_backups/dykspace/db-FINAL-before-drop-20261027.sql.gz` kept; users `devgeereact_dyk_run`, `_dyk_ddl`, `_dyk_bak`), Clerk production app "do you know space" (Google sign-in disabled), daily/cleanup/backup cron jobs, and off-server backup copies via `scripts/pull-backups.sh`. 46 quizzes are published (owner-confirmed review, reviewer "Site owner"). Evidence: docs/06-quality/EVIDENCE-STATUS.md.

Open: a human sign-in test on the live site; deciding whether to enforce the report-only CSP; owner request for automatically generated quizzes (project rules allow AI drafts only, published by a human); old-site jobs/files kept by owner choice.

## Update 27 October 2026

- Released to live: 20-question ranked rounds, leaderboard likes, new database `devgeereact_doyouknow` (frontend 501026a). Live API checks passed; no human click-through of the live site yet.
- Built, tested locally, committed, NOT deployed: admin area Phase A (migration 0012, `/admin/me`, `/admin/audit`, `/admin` shell). Deploying it needs: backup, backend release upload, migrate 0012, add the Super Admin's Clerk id to `admin_subjects` in the live private `config.php`, frontend workflow.
- Next: Phase B dashboard, then C moderation, D content manager, E daily scheduler, F growth tools, G generator (drafts only). See `docs/01-product/ADMIN-AREA-PLAN.md`.
- Open: ask the owner where the "stashed generator branch" (migration 0009) lives; `scripts/live-db.sh` needs a new read-only account for the new database; `devgeereact_dyk_dev` QA database still exists on the server.
- Local test layout: everything disposable is under gitignored `.local-test/` (DB, configs, test keys, reports); `.local-state/` is reserved for private recovery state.
