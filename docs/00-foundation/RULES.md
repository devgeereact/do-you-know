# Hard Coding Rules & Standards — Do You Know

These are enforced by TypeScript, ESLint, and CodeRabbit. PRs that violate them
do not merge.

## 1. Architecture
- **Static-first.** All code runs client-side or hits a managed API. No Node
  server, no SSR, no serverless functions inside this repo.
- **Respect the folder map** in `docs/02-architecture/ARCHITECTURE.md`. No new top-level folders
  without updating that doc first.
- **No import cycles.** Direction is `pages → services → lib`; components use
  `hooks`/`context`. `lib` imports nothing from `pages`/`components`.

## 2. TypeScript
- `"strict": true`. **No implicit `any`** — `@typescript-eslint/no-explicit-any`
  is an error.
- Explicit return types on exported functions and all hooks.
- Prefer `type`/`interface` over inline anonymous shapes for anything reused.
- Use the `@/` path alias; no deep `../../../` relative imports.

## 3. React
- Function components + hooks only. No class components except `ErrorBoundary`.
- Follow the Rules of Hooks (lint-enforced). Keep `useEffect` deps honest.
- One component per file; name the file after the component (`PascalCase.tsx`).
- Derive state; don't duplicate it. Lift state only as far as needed.

## 4. Styling
- Tailwind / NativeWind utilities **only**. Tokens from `tailwind.config.ts`.
- **No** inline `style={{}}`, no `.css`/`.module.css`, no CSS-in-JS.
- Mobile-first: base styles, then `sm:` / `md:` / `lg:` overrides.
- Compose conditional classes with `cn()` (never string-concatenate classes).

## 5. Data & security
- All Supabase access via `src/services/*` (or `src/lib/supabase.ts`); components
  don't build raw queries inline.
- Assume RLS is the last line of defense — still scope every query to the user.
- Never ship a secret. Browser-exposed keys must be write-only or RLS-guarded.
  The `service_role` key and Inngest signing key are server-only.

## 6. Errors & logging
- No `console.log` in committed code (`warn`/`error` allowed). Use Sentry for
  real telemetry.
- Wrap risky async in `try/catch`; report to Sentry with context, fail gracefully.

## 7. Git & reviews
- Small, atomic commits; imperative messages (`feat: add install prompt`).
- Every PR must pass `typecheck` + `lint` (zero warnings) before review.
- **CodeRabbit only reviews pull requests** — use branch → PR → merge. Work pushed
  straight to the default branch is never reviewed.
- **CodeRabbit** checks: no unused vars/imports, correct RLS scoping, no leaked
  credentials or unsanitized keys, adherence to this file.

## 8. Deploy hygiene (see `docs/07-operations/DEPLOYMENT.md`)
- Build locally; ship only `dist/` — the server has no Node.
- Deploy into this app's own docroot; **never** mirror-with-delete a shared docroot,
  and dry-run any delete first.
- **Never place backups (`*.bak`/`*.zip`/`*.sql`) inside a webroot** — Apache serves
  them as plaintext and leaks their contents. Backups live outside every docroot.

## 9. Do You Know — project rules
### Game integrity (non-negotiable)
- **Never** send an answer, `is_correct`, slider range or explanation to the browser before
  the player has answered. Player code reads questions only from `start_attempt` /
  `next_question` results.
- **Never** compute or post a score, rank or time from the browser. Scores come only from
  `answer_question` / `finish_attempt`.
- Player-facing code must not import `src/types/admin.ts` or `src/services/admin/*`.
- New game rules go into a new SQL migration **and** a new check in
  `supabase/tests/test_game.py`. Run `supabase/tests/run_tests.sh` before every PR that
  touches `supabase/`.

### Children's safety & privacy
- Do not collect real names, birthdates, photos, location or free text from players.
  Age is an **age band** only.
- Under-13s: generated nicknames only; no free-text fields anywhere in their flows.
- Public surfaces (boards, challenge links, share cards) show **nickname + avatar +
  score** only — never email, ids or age band.
- Optional analytics load only after consent, and never for under-13s beyond cookieless,
  aggregate events. No third-party ad or tracking SDKs in V1.
- Avatars are generated from picked traits only — never from an uploaded photo.

### Content
- Every question needs an explanation, a `source_url` and a `review_by` date before
  publishing (enforced by `publish_quiz`). Time-sensitive facts get a short review date.
- AI drafts never publish themselves: draft → `in_review` → human edit → admin publishes.
- Never reuse questions, art or text from other quiz sites. Original content only.

### Naming conventions
| Thing | Convention | Example |
| --- | --- | --- |
| Slugs (quiz, category) | kebab-case, ASCII | `world-capitals-easy` |
| Curriculum tags | `<system>-<stage>` kebab | `uk-ks2`, `us-6-8`, `wa-jss` |
| RPC functions | `verb_noun`, snake_case | `start_attempt`, `get_leaderboard` |
| Internal SQL helpers | leading underscore | `_public_question` |
| RPC error codes | snake_case, no spaces | `daily_already_played` |
| Inngest events | `domain/action` | `avatar/requested`, `questions/draft.requested` |
| Services | `<domain>Service.ts` | `gameService.ts` |
| Game components | `src/components/game/<Name>.tsx` | `FeedbackSheet.tsx` |
| Copy keys (i18n) | `area.screen.item` | `game.feedback.correct` |

### UX rules
- Never lock or ask for an orientation; every screen works portrait and landscape from
  320 px wide.
- Right/wrong always shows an icon and words, not only colour.
- Kind language: never mock a wrong answer.
- Times are shown as `1:42`; scores as `8/10`.
