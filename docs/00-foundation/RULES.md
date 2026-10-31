# Hard Coding Rules & Standards — Do You Know

These are enforced by TypeScript, ESLint, and CodeRabbit. PRs that violate them
do not merge.

## 1. Architecture

- **cPanel only.** The frontend is a static PWA. The only backend is the private PHP 8.2+
  API in `backend/` with MySQL/MariaDB (ADR-003). Clerk handles adult sign-in on
  `/account` only. No Node server, no SSR, no serverless functions, no other hosted backend.
- **Respect the folder map** in `docs/02-architecture/ARCHITECTURE.md`. No new top-level folders
  without updating that doc first.
- **No import cycles.** Direction is `pages → hooks → services → lib`; components use
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
- Player-facing copy lives in the typed catalogue `src/i18n/en-GB.ts` and is read through
  `t` from `@/i18n` (headings, buttons, `aria-label`s, placeholders, document titles,
  hook error messages). Text that takes values is a small typed function in the catalogue
  (`t.play.questionOf(3, 10)`), never string-building in a component. A second language is a
  new file typed as `Messages`. ESLint warns on inline JSX text in `src/pages` and
  `src/components`; the recorded exceptions are staff screens (`src/pages/admin*`) and the
  body prose of `/privacy` and `/terms` (see the header of `src/i18n/en-GB.ts`).

## 4. Styling

- Tailwind / NativeWind utilities **only**. Tokens from `tailwind.config.ts`.
- **No** inline `style={{}}`, no `.css`/`.module.css`, no CSS-in-JS.
- Mobile-first: base styles, then `sm:` / `md:` / `lg:` overrides.
- Compose conditional classes with `cn()` (never string-concatenate classes).

## 5. Data & security

- All API access goes through `src/services/*`, built on `src/lib/api.ts`; components
  never call `fetch` for app data.
- PHP: prepared statements only, owner filter in every private query, server-side input
  validation, one JSON error shape. Never trust a submitted score, role or profile ID.
- Never ship a secret. Only browser-safe values use the `VITE_` prefix. Database
  credentials, the Clerk secret and the rate-limit key live only in the private
  `config.php`, outside every webroot.

## 6. Errors & logging

- No `console.log` in committed code (`warn`/`error` allowed). Use Sentry for
  real telemetry.
- Wrap risky async in `try/catch`; report to Sentry with context, fail gracefully.

## 7. Git & reviews

- Small, atomic commits; imperative messages (`feat: add install prompt`).
- Every PR must pass `typecheck` + `lint` (zero warnings) before review.
- **CodeRabbit only reviews pull requests** — use branch → PR → merge. Work pushed
  straight to the default branch is never reviewed.
- **CodeRabbit** checks: no unused vars/imports, correct owner scoping, no leaked
  credentials or unsanitized keys, adherence to this file.

## 8. Deploy hygiene (see `docs/07-operations/DEPLOYMENT.md`)

- Build in CI or on the Mac; ship only `dist/` plus the API release. The server has no Node.
- Deploy into this app's own docroot; **never** mirror-with-delete a shared docroot,
  and dry-run any delete first.
- **Never place backups (`*.bak`/`*.zip`/`*.sql`) inside a webroot** — Apache serves
  them as plaintext and leaks their contents. Backups live outside every docroot.

## 9. Do You Know — project rules

### Game integrity (non-negotiable)

- **Never** send an answer, `is_correct`, slider range or explanation to the browser before
  the player has answered. Player code reads questions only from `POST /attempts` and
  `POST /attempts/{id}/next` results.
- **Never** compute or post a score, rank or time from the browser. Scores come only from
  `POST /attempts/{id}/answer` and `POST /attempts/{id}/finish`.
- New game rules go into the PHP API, a new migration in `backend/migrations/` when the
  schema changes, **and** new checks in `backend/tests/`. Run the backend checks in
  `backend/README.md` before every PR that touches `backend/`.

### Children's safety & privacy

- Do not collect real names, birthdates, photos, location or free text from players.
  Age is an **age band** only.
- Under-13s: generated nicknames only; no free-text fields anywhere in their flows.
- Public surfaces (boards, challenge links, share cards) show **nickname + avatar +
  score** only — never email, ids or age band.
- Optional analytics load only after consent, and never for under-13s beyond cookieless,
  aggregate events. No third-party ad or tracking SDKs in V1.
- Avatars are presets only (12 illustrated object characters on coloured circles,
  `src/lib/avatars.ts` and `Player::AVATARS`; ids unchanged since 16 October). No uploads,
  no photos, no AI-generated images.
- Contact and feedback (`/contact`, `POST /feedback`): children and players whose age is
  unknown choose preset messages only; the server rejects free text unless the player is
  13–17, 18+ or signed in as an adult. Only adults may leave an email for a reply.

### Content

- Every question needs an explanation, an https `source_url` and a `review_by` date.
  `backend/bin/import-content.php` enforces this: files that miss any of them do not
  import, imported quizzes are drafts, and only `--publish` with a named `--reviewed-by`
  makes them public. Time-sensitive facts get a short review date.
- AI drafts, if ever added, never publish themselves: a human reviews and an admin publishes.
- Never reuse questions, art or text from other quiz sites. Original content only.

### Naming conventions

| Thing                  | Convention                                   | Example                                     |
| ---------------------- | -------------------------------------------- | ------------------------------------------- |
| Slugs (quiz, category) | kebab-case, ASCII                            | `world-capitals-easy`                       |
| Curriculum tags        | `<system>-<stage>` kebab                     | `uk-ks2`, `us-6-8`, `wa-jss`                |
| API routes             | `/api/v1/<noun>[/{id}/<action>]`, kebab-case | `/attempts/{id}/answer`, `/curriculum-tags` |
| API error codes        | snake_case, no spaces                        | `daily_already_played`                      |
| Migrations             | `NNNN_snake_case.sql`                        | `0004_competition.sql`                      |
| Services               | `<domain>Service.ts`                         | `gameService.ts`                            |
| Game components        | `src/components/game/<Name>.tsx`             | `ResultsView.tsx`                           |
| Copy keys (i18n)       | `area.screen.item`                           | `game.feedback.correct`                     |

### UX rules

- Never lock or ask for an orientation; every screen works portrait and landscape from
  320 px wide.
- Right/wrong always shows an icon and words, not only colour.
- Kind language: never mock a wrong answer.
- Times are shown as `1:42`; scores as `8/10`.
