# Do You Know

A bright, playful quiz PWA for all ages. Play in seconds with no sign-up, learn from an
explanation after every answer, take the **daily challenge**, and send a **friend
challenge** link. Works in any browser on any screen — portrait or landscape — and
installs to the home screen.

What makes it different:
- **Can't be cheated.** Answers never reach the browser; Supabase grades every answer and
  measures time on the server (tested: 61 behaviour checks).
- **Safe for kids.** Under-13s play with no personal data and generated nicknames;
  boards show nickname + avatar only.
- **Built to grow.** A CMS-driven library of quizzes (general knowledge, faith and school
  subjects for UK, US and West African curricula), one indexable page per quiz, and AI
  question drafts that a human always reviews.
- **Unique avatars.** Each player builds a 3D cartoon portrait from traits; every trait
  combination can be used only once.

Runs as static files on cheap **cPanel** hosting; everything that must be trusted lives
in **Supabase**.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React 18 + Vite 6 | Fast HMR, tiny hashed bundles |
| Language | TypeScript (strict) | Safety enforced in CI |
| Styling | Tailwind CSS (NativeWind-ready), CSS-variable themes | Light/dark from one set of tokens |
| Fonts | Fredoka + Nunito, self-hosted (`@fontsource-variable`) | Friendly, offline, no third-party font requests |
| PWA | `vite-plugin-pwa` (Workbox) | Precached app shell + runtime caching, any orientation |
| Auth + DB | Supabase (Postgres + RLS, anonymous guests, Google, magic link) | Managed backend; grading in SQL functions |
| Scheduled work | Supabase `pg_cron` + `pg_net` | Daily switch, scheduled publish, rebuild hook |
| Background jobs | Inngest → Supabase Edge Functions | Avatar generation, AI question drafts, retries |
| AI | OpenRouter (model chosen in the CMS) | Text drafts + avatar images, server-side only |
| Media | ImageKit | Avatars, scenes, covers — resized on the CDN |
| Monitoring | Sentry (EU region) | Errors + performance with source maps |
| Analytics | PostHog EU (optional, consent-gated) | Funnels; cookieless for under-13s |
| Motion | Framer Motion | Feedback moments, transitions |
| AI code review | CodeRabbit | PR checks against `docs/00-foundation/RULES.md` |
| Hosting | cPanel (static `dist/`) | Low cost, no server runtime |

---

## What's in this repo today

| Area | Status |
| --- | --- |
| Branded PWA shell (manifest, icons, offline page, theme, fonts, install/update prompts) | ✅ Done |
| Database: all tables, RLS, game RPCs, leaderboards, challenges, avatars, publishing, jobs (`supabase/migrations/0001–0004`) | ✅ Done and tested |
| DB behaviour tests (`supabase/tests`, 61 checks) | ✅ Done |
| Types for every RPC payload (`src/types/game.ts`), friendly error copy (`src/lib/gameErrors.ts`) | ✅ Done |
| Product, design, architecture, schema, rules, hooks, deployment docs | ✅ Done |
| Public home/category/quiz discovery, filters and catalogue hook | Implemented; local browser checks pass |
| Gameplay/results/profile, CMS and remaining game hooks | Pending Milestone 1–3 |
| Edge Functions (`inngest`, `trigger-rebuild`) | ⏳ Milestone 2 (contracts in `supabase/functions/README.md`) |
| Prerender script + GitHub Actions deploy | ⏳ Milestone 3 |

### Build plan
| Milestone | Delivers | Done when |
| --- | --- | --- |
| 1. Play | Home, category, quiz landing, game (all 3 question types), results + review, guest sessions, `/me` basics | A visitor finds a quiz, plays it on a phone in portrait, sees an honest score and explanations |
| 2. Compete | Leaderboards, daily challenge + streaks, friend challenges + share card, nicknames, age band, avatar builder + `inngest` function | Two phones can challenge each other; avatars generate and stay unique |
| 3. Run | CMS (quizzes, question bank, CSV, daily calendar, moderation, settings, AI drafts), prerender + sitemap, CI deploy, parental consent flow, analytics consent | An admin publishes a quiz and it appears on Google-indexable pages within minutes |
| 4. Launch | 30 reviewed quizzes, privacy policy + terms, accessibility and device pass, Sentry alerts | Launch checklist in `docs/01-product/PRODUCT-SPEC.md` §8 is complete |

---

## Quick start

### 1. Prerequisites
- Node.js **>= 18**, npm
- A Supabase project (EU region recommended for UK users)

### 2. Install & configure
```bash
git clone <your-repo> do-you-know && cd do-you-know
npm install
cp .env.example .env      # then fill in your browser-safe keys
```

For the current local-only build, follow [Local development](docs/07-operations/LOCAL-DEVELOPMENT.md). Run `npm run backend:start` before the app; use `npm run backend:check` for an API integrity smoke check. The Mac reaches Ubuntu through a private SSH tunnel, without copying env files.

### 3. Set up Supabase
1. **Auth → Providers:** enable **Anonymous sign-ins** (guests), **Google**, and **Email**
   (magic link). Turn on **manual identity linking** (so guests can link Google and keep
   their history) and CAPTCHA protection for sign-ins to limit abuse.
2. **Auth → SMTP:** set a custom SMTP sender (e.g. Resend) for magic links.
3. **Database → Extensions:** enable `pg_cron` and `pg_net`.
4. Run the migrations in order (SQL editor or `supabase db push`):
   `0001_init.sql` → `0002_quiz_core.sql` → `0003_game_functions.sql` → `0004_scheduled_jobs.sql`
5. Make yourself admin (after signing in once with Google/email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
6. Edge Function secrets: see `supabase/functions/.env.example`.
7. Rebuild hook (when CI deploy exists): set `site_config.rebuild_hook_url` and the
   `rebuild_hook_secret` vault secret — instructions at the top of `0004_scheduled_jobs.sql`.

### 4. Develop
```bash
npm run dev        # http://localhost:5202 (strict port, fails if taken)
```

### 5. Verify before shipping
```bash
npm run typecheck
npm run lint
npm run build      # emits ./dist
npm run preview    # smoke-test the production bundle
PGHOST=localhost PGUSER=postgres ./supabase/tests/run_tests.sh   # DB rules (scratch DB only)
```

### 6. Deploy to cPanel
The server has **no Node** — build locally or in CI, ship only the artifacts.
1. Run `npm run build` (emits `./dist`).
2. Upload **everything inside `dist/`** plus the repo-root **`.htaccess`** into **this
   app's own document root** — e.g. `~/doyouknow.example/` for an addon domain. The
   `.htaccess` handles HTTPS, SPA routing, prerendered pages, MIME types, and
   cache/security headers.
3. Load the site over HTTPS and confirm the install prompt appears.

> ⚠️ **Never deploy into a shared docroot** (one that also serves other sites or holds
> loose `api.php` / `config.php`), and **never mirror-with-delete** without a dry-run
> first — see **`docs/07-operations/DEPLOYMENT.md`** for the full, safe playbook.

---

## Available scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check, then build the static PWA to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` strict check |
| `npm run lint` | ESLint (zero-warning policy) |
| `npm run format` | Prettier write |

---

## Project layout

```
do-you-know/
├── .env.example          # browser-safe env vars (copy to .env)
├── .htaccess             # cPanel: HTTPS, SPA routing, caching, security headers
├── AGENTS.md / CLAUDE.md # AI agent context and guardrails
├── forge.config.json     # app identity used to brand the project
├── index.html            # app entry, theme-before-paint script
├── vite.config.ts        # build + PWA/Workbox config (any orientation)
├── tailwind.config.ts    # design tokens (see docs/03-design/DESIGN-SYSTEM.md)
├── docs/                 # PRD, DESIGN, ARCHITECTURE, SCHEMA, RULES, HOOKS, DEPLOYMENT
├── public/               # icons, favicon, offline.html, robots.txt
├── supabase/
│   ├── migrations/       # 0001 base · 0002 tables + RLS · 0003 game RPCs · 0004 jobs
│   ├── functions/        # Edge Function contracts + server-only secrets template
│   └── tests/            # scratch-DB behaviour tests (61 checks)
└── src/
    ├── assets/           # static assets imported by code
    ├── components/       # UI (ErrorBoundary, InstallPrompt, …; game/ and admin/ to come)
    ├── context/          # Auth / Theme providers
    ├── hooks/            # usePWAInstall, useOnlineStatus, … (game hooks in docs/02-architecture/HOOKS.md)
    ├── lib/              # SDK clients, env, gameErrors
    ├── pages/            # route views
    ├── services/         # typed Supabase data access
    └── types/            # database.types.ts, game.ts, admin.ts
```

Full details live in [`docs/02-architecture/ARCHITECTURE.md`](docs/02-architecture/ARCHITECTURE.md).

---

## Documentation index

- [`docs/01-product/PRODUCT-SPEC.md`](docs/01-product/PRODUCT-SPEC.md) — scope, roles, V1 features, metrics, roadmap
- [`docs/03-design/DESIGN-SYSTEM.md`](docs/03-design/DESIGN-SYSTEM.md) — bright & playful look, tokens, motion, accessibility
- [`docs/02-architecture/ARCHITECTURE.md`](docs/02-architecture/ARCHITECTURE.md) — system, routes, game data flow, jobs
- [`docs/02-architecture/DATA-MODEL.md`](docs/02-architecture/DATA-MODEL.md) — tables, RLS, RPCs, versioning, tests
- [`docs/00-foundation/RULES.md`](docs/00-foundation/RULES.md) — coding standards + integrity, kids' privacy, content rules
- [`docs/02-architecture/HOOKS.md`](docs/02-architecture/HOOKS.md) — base + game hook contracts
- [`docs/07-operations/DEPLOYMENT.md`](docs/07-operations/DEPLOYMENT.md) — safe cPanel deploy playbook

## License
MIT for the code. Quiz content, illustrations and avatars you create are your own.
