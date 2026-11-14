# Do You Know — agent contract

One entry point for every coding agent (Claude Code reads it through `CLAUDE.md`, Codex reads it directly). Read `.agent/PROJECT.yml`, `.agent/CURRENT-TASK.md` and `docs/00-foundation/PROJECT-MEMORY.md` first, then the product/architecture/security docs for the area you change. The app is live at **https://doyouknow.space**; repository `devgeereact/do-you-know` (private, `main`).

## Authority and Git

Work only within the current request. No force push, `reset --hard`, `clean`, `checkout -- .`, history rewrites or remote branch deletion. Focused commits, one concern each. Anything on the server (deploys, migrations, cron, files) needs the owner's explicit OK in the session.

## Sources of truth

- Current state: `.agent/CURRENT-TASK.md` (now) and `docs/00-foundation/PROJECT-MEMORY.md` (how it runs); finished sessions in `.agent/HANDOFF.md`.
- Product and rules: `docs/01-product/PRODUCT-SPEC.md`, `docs/00-foundation/RULES.md`.
- Architecture/data/hooks: `docs/02-architecture/`. Decisions: `docs/08-change-management/DECISIONS.md`.
- Roadmap and open items: `docs/ROADMAP.md`. Superseded history: `docs/ARCHIVE.md`. Audits: `docs/AUDIT.md` (newest first).
- Quality: `docs/06-quality/EVIDENCE-STATUS.md`. Hosting: `docs/07-operations/DEPLOYMENT.md`.

Record IMPLEMENTED, VERIFIED, PLANNED and BLOCKED accurately; never relabel old evidence as a new passing check.

## Stack and commands

React 18, strict TypeScript, Vite, Tailwind CSS v4 (Vite plugin); private PHP backend (8.2 floor, server runs 8.4) with MariaDB; Clerk for adults. Node 24 (`.node-version`), **pnpm** (`pnpm-lock.yaml`). ESLint + Prettier stay (the custom i18n lint rule has no Biome equivalent).

| Task                                                            | Command                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Install (also enables the Git hook)                             | `pnpm install`                                                                            |
| Dev: Vite on http://localhost:5202 + PHP API on 127.0.0.1:55439 | `pnpm dev` (`pnpm dev:web` = frontend only)                                               |
| Gate before every commit/PR                                     | `pnpm check` (lint, format check, typecheck, unit tests, build)                           |
| Backend / browser (e2e)                                         | `bash scripts/test-backend.sh`, `pnpm test:e2e` (disposable DB under `.local-test/` only) |

Preserve the layout and hook/service/API boundaries. Components use typed services; PHP uses validated input, prepared statements and server-side scope checks. Applied migrations are immutable.

## Security and game integrity

Never expose answers before answering or compute trusted scores/times/permissions in the browser. Children stay guest-first; collect no new real names, birthdates, photos, location, contacts or free text. Public surfaces show nickname, preset avatar and score only. No new tracking/ad SDK, generated player photos or AI auto-publication.

Never open `.env*`, keys, `config.php` or anything in `.local-state/`. `VITE_*` values are public; backend secrets/config/backups stay outside every webroot. The pre-commit hook runs `scripts/guard.py` and gitleaks on staged files. Claude Code also runs `scripts/agent_guard.py` before every tool call (`.claude/settings.json`); a block is not permission to work around it. Codex has no hook: apply the same rules by hand and run `python3 scripts/guard.py` after `git add`.

## CI and deployment

CI (`.github/workflows/verify.yml`) runs on every push and PR: `pnpm check`, guard tests, secret scan, MariaDB backend tests. Browser e2e is opt-in (Run workflow → `full_backend`). A push to `main` deploys through `deploy.yml` (SSH, `scripts/release.mjs`: checks, build, snapshot, upload, smoke, automatic restore; never deletes, no migrations or cron changes). Migrations run by hand with a backup first (`docs/07-operations/DEPLOYMENT.md`).

## How we work

Superpowers is the method: brainstorm and agree the finish line with the owner, write the plan, build each task test first, one concern per branch, verify, review, finish the branch. GSD is not part of the method (an optional skill, only when the owner asks; no `.planning/` folder). One task file: `.agent/CURRENT-TASK.md` (state) and `.agent/HANDOFF.md` (dated history). Everything written lives under `docs/`; Superpowers specs go in `docs/superpowers/specs/` and plans in `docs/superpowers/plans/` (dated file names); the numbered folders keep their existing documents. The gate before "done" is `pnpm check`, plus `pnpm test:e2e` (this project's browser suite) when UI or server behaviour changed and `pnpm verify` before asking to push. Read `graphify-out/GRAPH_REPORT.md` and run `graphify query "<question>"` before searching files; rebuild with `pnpm graph` after a merge. Models: Sonnet by default; Opus for migrations, security review and the review before a release; Haiku for searching and mechanical edits; say why in the handoff when moving up. A separate agent reviews the diff before the owner is asked to approve. Approvals do not change (see Authority and Git).

## Styling

Tailwind CSS v4 is the styling system: utility classes in the markup, `tailwindcss()` first in the `vite.config.ts` plugins, `@import 'tailwindcss';` and the `@theme inline` token map in `src/index.css`. Add a token to `:root` (and `.dark`) and to `@theme inline` together, and record it in `docs/03-design/DESIGN-SYSTEM.md`. No `tailwind.config.*`, PostCSS, Sass or CSS-in-JS. Installed per project (`pnpm add -D tailwindcss @tailwindcss/vite`), never from a global copy.

## Handoff

After meaningful work, update `.agent/CURRENT-TASK.md` with what changed, the checks you ran (PASS / NOT TESTED / BLOCKED) and the next step.
