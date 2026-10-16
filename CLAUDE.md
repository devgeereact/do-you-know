@AGENTS.md

# Claude Code adapter

Shared rules live in `AGENTS.md`. This file only maps Claude-specific context.


**Project:** Do You Know, a bright, playful, installable quiz PWA for all ages (including
under-13s): daily challenges, friend challenges and school-subject quizzes, with
server-side grading in the private PHP API on cPanel (MySQL/MariaDB). A content CMS is
planned but not built.

This branch is cPanel-only: Supabase was removed from the code on 16 October 2026 (ADR-003
in `docs/08-change-management/DECISIONS.md`).

You are working inside a **static, offline-first PWA** deployed to cPanel.
Treat the constraints below as ground truth for every response.

## Load these first
| Need                         | File                    |
| ---------------------------- | ----------------------- |
| Coding standards             | `docs/00-foundation/RULES.md`         |
| Folder layout & data flow    | `docs/02-architecture/ARCHITECTURE.md`  |
| MySQL tables and migrations  | `docs/02-architecture/DATA-MODEL.md`        |
| Approved hook contracts      | `docs/02-architecture/HOOKS.md`         |
| Visual/design tokens         | `docs/03-design/DESIGN-SYSTEM.md`        |
| Product scope & metrics      | `docs/01-product/PRODUCT-SPEC.md`           |
| Deploy process & safety      | `docs/07-operations/DEPLOYMENT.md`    |
| Game API payload types       | `src/types/game.ts`     |
| Domain row types             | `src/types/domain.ts`   |
| API client (only door)       | `src/lib/api.ts`        |
| Backend tests                | `backend/tests/`        |

## Hard constraints
- **Static frontend only.** Output is `dist/`, built in CI or on the Mac and served from
  cPanel. No Node runtime on the server. The only server code is the PHP API in `backend/`.
- **TypeScript strict.** No implicit `any`; explicit return types on functions
  and hooks.
- **Styling:** NativeWind / Tailwind classes, tokens from `tailwind.config.ts`.
- **Systems:** PHP 8.2+ API and MySQL/MariaDB on cPanel (all trusted logic), Clerk (adult
  sign-in on `/account` only), ImageKit (optional quiz cover images), Sentry and PostHog
  (optional).
- **Path alias:** import app code with `@/…` (maps to `src/`).
- **Game integrity:** answers and scoring live only in the PHP API (`backend/src/Game.php`,
  `backend/src/Competition.php`); player code never sees an answer early or posts a score.
- **Children use this app:** collect no personal data from players; players are guests
  with an opaque token and no email; nickname + preset avatar only in public. See `docs/00-foundation/RULES.md` §9 and `AGENTS.md` §8.

## Guards
- The PreToolUse hook in `.claude/settings.json` (`scripts/agent_guard.py`) blocks secret
  files and asks before risky commands. Treat a block as stop and ask, never a detour.
- Enable the Git guard once per clone: `git config core.hooksPath .githooks`.
- GEE OS commands when the plugin is installed: `/gee-os-cowork:verify`,
  `/gee-os-cowork:restructure`, `/gee-os-cowork:launch`.

## Working style
- Prefer editing an existing file over creating a new one.
- Keep components small and typed; put SDK setup in `src/lib`, data calls in
  `src/services`, reusable logic in `src/hooks`.
- When unsure about the DB shape, re-read `docs/02-architecture/DATA-MODEL.md` rather than guessing.

## Run locally
- `npm run dev` serves http://localhost:5202 (strict). `dev-all doyouknow` starts it with the other projects.
