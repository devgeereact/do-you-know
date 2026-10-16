# Do You Know

A bright, playful quiz PWA for all ages. Play in seconds with no sign-up, learn from an
explanation after every answer, take the **daily challenge**, and send a **friend
challenge** link. Works in any browser on any screen, portrait or landscape, and
installs to the home screen.

What makes it different:
- **Can't be cheated.** Answers never reach the browser; the PHP API grades every answer
  and measures time on the server.
- **Safe for kids.** Players are guests with no email; under-13s get generated
  nicknames; boards show nickname, preset avatar and score only. Children never use
  accounts.
- **Built to grow.** A library of quizzes (general knowledge, faith and school subjects
  tagged for UK, US and West African curricula) with age and curriculum filters.
- **Friendly avatars.** Twelve preset characters on coloured circles. No uploads, no photos.

Runs entirely on **cPanel**: static files for the app and a private PHP API with
MySQL/MariaDB for everything that must be trusted. Supabase was removed from the code on
16 October 2026 (ADR-003 in `docs/08-change-management/DECISIONS.md`).

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React 18 + Vite 6 | Fast HMR, small hashed bundles |
| Language | TypeScript (strict) | Safety enforced in CI |
| Styling | Tailwind CSS (NativeWind-ready), CSS-variable themes | Light/dark from one set of tokens |
| Fonts | Fredoka + Nunito, self-hosted (`@fontsource-variable`) | Friendly, offline, no third-party font requests |
| PWA | `vite-plugin-pwa` (Workbox) | Precached app shell, public catalogue cached, any orientation |
| API | PHP 8.2+ in `backend/` (private, only `api/api.php` public) | Grading, timing, scores, profiles on the server |
| Database | MySQL / MariaDB | Additive migrations in `backend/migrations` |
| Adult sign-in | Clerk, on `/account` only, verified server-side | Parents and staff; children never sign in |
| Media | ImageKit (optional) | Quiz cover images resized on the CDN |
| Monitoring | Sentry, EU region (optional) | Errors with PII scrubbing |
| Analytics | PostHog EU (optional, consent-gated) | Funnels; cookieless for under-13s |
| Motion | Framer Motion | Feedback moments, transitions |
| AI code review | CodeRabbit | PR checks against `docs/00-foundation/RULES.md` |
| Hosting | cPanel: `doyouknow.soulrefresh.net` behind Cloudflare | Static app and PHP API on one origin |

---

## What's in this repo today (branch `feat/cpanel-only`)

| Area | Status |
| --- | --- |
| Player screens: home, category, quiz, play (choice, true/false, slider), results and review, daily, friend challenges, leaderboards, `/me`, preset avatar | Done; browser run against a local PHP API PASS |
| PHP API: guest sessions, catalogue, practice/ranked/daily/challenge play, leaderboards, profile, settings, history, deletion | Done; 14 unit, 76 HTTP/database, 63 competition, 9 concurrency checks PASS on local MariaDB |
| Adult sign-in with Clerk on `/account` | Built; a real adult sign-in is NOT TESTED |
| Content import from the old Supabase project into MySQL | Not done; needs owner approval |
| GitHub Actions SSH deploy | Not set up; needs owner approval of deploy key and secrets |
| Live deploy and verification of this branch | Not done |
| CMS (`/admin`), prerendered SEO pages, parental consent flow | Not built |

---

## Quick start

### 1. Prerequisites
- Node.js **>= 20.9**, npm
- PHP **8.2+** with PDO MySQL, cURL and OpenSSL, plus Composer
- A local MySQL or MariaDB for backend work

### 2. Install and configure
```bash
git clone <your-repo> do-you-know && cd do-you-know
npm install
cp .env.example .env      # browser-safe values only (VITE_*)
cd backend && composer install && cd ..
```
`VITE_CPANEL_API_URL` sets the API base (default `/api/v1`). Backend settings go in a
private `config.php` copied from `backend/config.example.php`; see `backend/README.md`.

### 3. Develop
```bash
npm run dev        # http://localhost:5202 (strict port, fails if taken)
```

### 4. Verify before shipping
```bash
npm run typecheck
npm run lint
npm run build            # emits ./dist
npm run check:htaccess   # 18 Apache rule checks against dist/
cd backend && composer test   # unit checks; database checks per backend/README.md
```

### 5. Deploy to cPanel
The server has **no Node**. Build in CI or on the Mac and ship only the artefacts. Run
`npm run package:cpanel`, then follow `docs/07-operations/DEPLOYMENT.md`: `public/` goes
into this app's own docroot and `private/` goes outside every webroot.

> **Never deploy into a shared docroot**, and **never mirror-with-delete** without a
> dry-run first. See `docs/07-operations/DEPLOYMENT.md` for the full, safe playbook.

---

## Available scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check, then build the static PWA to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` strict check |
| `npm run lint` | ESLint (zero-warning policy) |
| `npm run format` | Prettier write (source and docs) |
| `npm run package:cpanel` | Build and create a `build/cpanel-*` release (public and private parts) |
| `npm run check:htaccess` | Check the root `.htaccess` against a throwaway local Apache |

---

## Project layout

```
do-you-know/
├── .env.example          # browser-safe env vars (copy to .env)
├── .htaccess             # cPanel: HTTPS, SPA routing, /api/v1 → api/api.php, headers
├── AGENTS.md / CLAUDE.md # AI agent context and guardrails
├── backend/              # private PHP API: public/api.php, src/, migrations/, bin/, tests/
├── docs/                 # product, architecture, data model, rules, hooks, deployment
├── public/               # icons, favicon, offline.html, robots.txt
├── scripts/              # package-cpanel.mjs, check-htaccess.sh, guards
└── src/
    ├── components/       # UI, game/ components, AvatarBadge, AdultAccountControls
    ├── context/          # SessionContext (guest session), ThemeContext
    ├── hooks/            # see docs/02-architecture/HOOKS.md
    ├── lib/              # api.ts (only door to the API), avatars, env, gameErrors, imagekit
    ├── pages/            # route views
    ├── services/         # catalog, game, profile, settings services
    └── types/            # domain.ts, game.ts
```

Full details live in [`docs/02-architecture/ARCHITECTURE.md`](docs/02-architecture/ARCHITECTURE.md).

---

## Documentation index

- [`docs/01-product/PRODUCT-SPEC.md`](docs/01-product/PRODUCT-SPEC.md): scope, roles, features, metrics, roadmap
- [`docs/03-design/DESIGN-SYSTEM.md`](docs/03-design/DESIGN-SYSTEM.md): look, tokens, motion, accessibility
- [`docs/02-architecture/ARCHITECTURE.md`](docs/02-architecture/ARCHITECTURE.md): system, routes, data flow
- [`docs/02-architecture/DATA-MODEL.md`](docs/02-architecture/DATA-MODEL.md): MySQL tables, access rules, tests
- [`docs/00-foundation/RULES.md`](docs/00-foundation/RULES.md): coding standards, integrity, kids' privacy, content
- [`docs/02-architecture/HOOKS.md`](docs/02-architecture/HOOKS.md): hook contracts
- [`docs/07-operations/DEPLOYMENT.md`](docs/07-operations/DEPLOYMENT.md): safe cPanel deploy playbook
- [`backend/README.md`](backend/README.md): API routes, configuration, verification

## License
MIT for the code. Quiz content and illustrations you create are your own.
