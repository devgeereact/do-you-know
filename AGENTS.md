# Do You Know — agent contract

One entry point for every coding agent (Claude Code reads it through `CLAUDE.md`, Codex reads it directly). Read `.agent/PROJECT.yml`, `.agent/CURRENT-TASK.md`, `docs/00-foundation/PROJECT-MEMORY.md` and `docs/00-foundation/CLAUDE-CODE-HANDOFF.md` first, then the product/architecture/security docs for the area you change. The app is live at **https://doyouknow.space**; repository `devgeereact/do-you-know` (private, `main`).

## Authority and Git

Work only within the current request. No force push, `reset --hard`, `clean`, `checkout -- .`, history rewrites or remote branch deletion. Focused commits, one concern each. Anything on the server (deploys, migrations, cron, files) needs the owner's explicit OK in the session.

## Sources of truth

- Current state/handoff: `.agent/CURRENT-TASK.md`, `docs/00-foundation/PROJECT-MEMORY.md`, `CLAUDE-CODE-HANDOFF.md`.
- Product and rules: `docs/01-product/PRODUCT-SPEC.md`, `docs/00-foundation/RULES.md`.
- Architecture/data/hooks: `docs/02-architecture/`. Decisions: `docs/08-change-management/DECISIONS.md`.
- Quality: `docs/06-quality/EVIDENCE-STATUS.md`. Hosting: `docs/07-operations/DEPLOYMENT.md`.

Record IMPLEMENTED, VERIFIED, PLANNED and BLOCKED accurately; never relabel old evidence as a new passing check.

## Stack and commands

React 18, strict TypeScript, Vite, Tailwind tokens; private PHP backend (8.2 floor, server runs 8.4) with MariaDB; Clerk for adults. Node 24 (`.node-version`), **pnpm** (`pnpm-lock.yaml`). ESLint + Prettier stay (the custom i18n lint rule has no Biome equivalent).

| Task                                                            | Command                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Install (also enables the Git hook)                             | `pnpm install`                                                                           |
| Dev: Vite on http://localhost:5202 + PHP API on 127.0.0.1:55439 | `pnpm dev` (`pnpm dev:web` = frontend only)                                              |
| Gate before every commit/PR                                     | `pnpm check` (lint, format check, typecheck, unit tests, build)                          |
| Backend / e2e                                                   | see `backend/README.md`, `tests/e2e/README.md` (disposable DB under `.local-test/` only) |

Preserve the layout and hook/service/API boundaries. Components use typed services; PHP uses validated input, prepared statements and server-side scope checks. Applied migrations are immutable.

## Security and game integrity

Never expose answers before answering or compute trusted scores/times/permissions in the browser. Children stay guest-first; collect no new real names, birthdates, photos, location, contacts or free text. Public surfaces show nickname, preset avatar and score only. No new tracking/ad SDK, generated player photos or AI auto-publication.

Never open `.env*`, keys, `config.php` or anything in `.local-state/`. `VITE_*` values are public; backend secrets/config/backups stay outside every webroot. The pre-commit hook runs `scripts/guard.py` and gitleaks on staged files. Claude Code also runs `scripts/agent_guard.py` before every tool call (`.claude/settings.json`); a block is not permission to work around it. Codex has no hook: apply the same rules by hand and run `python3 scripts/guard.py` after `git add`.

## CI and deployment

CI (`.github/workflows/verify.yml`) runs on every push and PR: `pnpm check`, guard tests, secret scan, MariaDB backend tests. Browser e2e is opt-in (Run workflow → `full_backend`). A push to `main` deploys through `deploy.yml` (SSH, `scripts/release.mjs`: checks, build, snapshot, upload, smoke, automatic restore; never deletes, no migrations or cron changes). Migrations run by hand with a backup first (`docs/07-operations/DEPLOYMENT.md`).

## Handoff

After meaningful work, update `.agent/CURRENT-TASK.md` with what changed, the checks you ran (PASS / NOT TESTED / BLOCKED) and the next step.
