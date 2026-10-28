# Do You Know

A quiz PWA being rebuilt for **https://doyouknow.space** in a fresh repository.

This folder contains imported React/TypeScript frontend and private PHP backend code. It is a new project baseline, not evidence that the old site's deployment, database, users, cron jobs or integrations are configured for this domain. The app name remains **Do You Know**; the repository/package slug is **do-you-know**.

## Start here

1. Read [the Claude Code handoff](docs/00-foundation/CLAUDE-CODE-HANDOFF.md).
2. Review [the current project memory](docs/00-foundation/PROJECT-MEMORY.md).
3. Follow [GitHub and FTPS setup](docs/07-operations/GITHUB-FTPS-SETUP.md).
4. Use [the rebrand checklist](docs/08-change-management/REBRAND-VERIFICATION.md) before publishing.

## Current state — 25 October 2026

| Item | State |
|---|---|
| Domain | doyouknow.space; owner reports connected to cPanel; document root/TLS not independently verified |
| Local repository | Fresh main branch committed and pushed to the new private origin |
| GitHub repository | https://github.com/gsakinz/do-you-know — private, created and verified |
| Deployment | Manual-only GitHub Actions; verification status in the rebrand report; no deployment performed |
| FTPS | Needs dedicated account, verified TLS hostname/root and repository secrets |
| Backend/database/Clerk | Imported code; new-domain configuration and runtime verification pending |
| Content/CMS improvements | Continue in Claude Code; imported modules are not automatically complete |

## Local development

Use Node 24 and the committed npm lockfile:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Vite uses **http://localhost:5202** with strict port checking. Browser settings are documented in `.env.example`; actual env files remain private and ignored. The same-origin API defaults to `/api/v1`. A running UI without the PHP backend/database does not prove quiz play or authentication works.

```sh
pnpm typecheck
pnpm lint
npm test
PRERENDER=0 pnpm build
```

Full PHP/database/e2e checks need a disposable local database and backend dependencies; see `backend/README.md` and `tests/e2e/README.md`. Do not point tests at production.

## Structure

- `src/`: React views, typed hooks/services and public environment adapter.
- `public/`: Do You Know icons, offline page and robots configuration.
- `backend/`: private PHP API, content, migrations and tests. Keep code/config/vendor outside every webroot; only the approved API entry point is public.
- `scripts/`: build/quality helpers and scoped FTPS publishing.
- `.github/workflows/`: manual verification and manual coming-soon/public-app publishing.
- `docs/`: product, architecture, security, operations and fresh handoff records.
- `deployment/coming-soon/`: independent launch page; publishing it does not configure the app backend.

## Safety boundaries

Server-side grading, answer secrecy, child privacy, preset avatars and backend role checks remain mandatory. Do not enable AI auto-publication, ads or tracking as part of this rebrand. Do not copy production credentials, users or databases from the source project by assumption.

No real .env, passwords, keys, private server config, uploads or database backups belong in GitHub or frontend bundles. VITE_* variables are public. Never use plain FTP or disable TLS verification. The initial deployment needs an explicitly prepared target marker and verified recoverable backup; unknown remote files are never deleted.

The old source repository is read-only and unaffected. Historical release claims from that source are preserved in the private pre-rebrand recovery ZIP, not presented here as this project's status.

Manual GitHub verification: **PASS**, [run 40238993723](https://github.com/gsakinz/do-you-know/actions/runs/40238993723). FTPS secrets are not configured; no site deployment was attempted.
