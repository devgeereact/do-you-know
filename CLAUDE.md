@AGENTS.md

# Claude Code adapter

Shared rules live in `AGENTS.md`. This file only maps Claude-specific context.


**Project:** Do You Know — a bright, playful, installable quiz PWA for all ages (including
under-13s): daily challenges, friend challenges and school-subject quizzes, with
server-side grading in Supabase and a CMS at `/admin`.

You are working inside a **static, offline-first PWA** deployed to cPanel.
Treat the constraints below as ground truth for every response.

## Load these first
| Need                         | File                    |
| ---------------------------- | ----------------------- |
| Coding standards             | `docs/00-foundation/RULES.md`         |
| Folder layout & data flow    | `docs/02-architecture/ARCHITECTURE.md`  |
| DB tables, types, RLS        | `docs/02-architecture/DATA-MODEL.md`        |
| Approved hook contracts      | `docs/02-architecture/HOOKS.md`         |
| Visual/design tokens         | `docs/03-design/DESIGN-SYSTEM.md`        |
| Product scope & metrics      | `docs/01-product/PRODUCT-SPEC.md`           |
| Deploy process & safety      | `docs/07-operations/DEPLOYMENT.md`    |
| Game RPC payload types       | `src/types/game.ts`     |
| DB behaviour tests           | `supabase/tests/`       |

## Hard constraints
- **Static build only.** Output is `dist/`, deployed via Git/FTP to cPanel.
  No server runtime of any kind.
- **TypeScript strict.** No implicit `any`; explicit return types on functions
  and hooks.
- **Styling:** NativeWind / Tailwind classes, tokens from `tailwind.config.ts`.
- **Offloaded systems:** Supabase (Auth/DB + RLS), ImageKit (media), Sentry
  (monitoring), Inngest (background workflows).
- **Path alias:** import app code with `@/…` (maps to `src/`).
- **Game integrity:** answers and scoring live only in Supabase RPCs
  (`0003_game_functions.sql`); player code never sees an answer early or posts a score.
- **Children use this app:** collect no personal data from players; nickname + avatar
  only in public. See `docs/00-foundation/RULES.md` §9 and `AGENTS.md` §8.

## Working style
- Prefer editing an existing file over creating a new one.
- Keep components small and typed; put SDK setup in `src/lib`, data calls in
  `src/services`, reusable logic in `src/hooks`.
- When unsure about the DB shape, re-read `docs/02-architecture/DATA-MODEL.md` rather than guessing.

## Run locally
- `npm run dev` serves http://localhost:5202 (strict). `dev-all doyouknow` starts it with the other projects.
