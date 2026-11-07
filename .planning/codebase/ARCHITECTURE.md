# Architecture

**Analysis Date:** 2026-11-07 (read-only; source: four full-file read-throughs plus a graphify AST graph of 195 code files, 1,314 nodes, 2,674 edges, 111 communities)

## Layers

- **Front end** (`src/`): React 18 SPA. `main.tsx` mounts `ErrorBoundary > StrictMode > ThemeProvider > SessionProvider > BrowserRouter`. All HTTP goes through `src/lib/api.ts` (guest bearer token, 20 s timeout, `no-store`) or `adminRequest` in `src/pages/admin`/`src/services/adminService.ts` (Clerk bearer). Typed services in `src/services/`, data hooks in `src/hooks/`, pages in `src/pages/`, UI in `src/components/`.
- **Back end** (`backend/`): PHP. `public/api.php` loads the autoloader and `Config`, calls `Api::run` (hand-written router), maps exceptions to 503. `/admin/*` goes to `Admin::handle`. MariaDB via `Database` (PDO).
- **Content seed** (`backend/content/`, 47 JSON files): imported as drafts by `bin/import-content.php`. Not the live catalogue.
- **Release** (`scripts/release.mjs`, `.github/workflows/deploy.yml`): checks, build, prerender from the live catalogue, snapshot, upload (never deletes), smoke, auto-restore.

## Front-end routes

Public: `/`, `/c/:slug`, `/q/:slug`, `/daily`, `/leaderboards`, `/challenge/:code`, `/me`, `/me/settings`, `/how-to-play`, `/about`, `/contact`, `/privacy`, `/terms`, `/account` (lazy), `*`.
Full screen: `/play/:slug`, `/daily/play`, `/challenge/:code/play` (one `PlayPage`).
Staff (lazy): `/admin/*` with index (To do), `inbox`, `library`, `edit/:id`, `check`, `import`, `generator`, `calendar`, `players`, `subjects`, `activity`.
Redirects: `/me/avatar` to `/me#character`, `/preview` to `/`, `/login` to `/account`, `/dashboard` to `/me/settings`.
No route-level auth guard; access control is inside `/account` and `/admin` and on the server.

## API routes (`/api/v1`)

- **Public:** GET `/health`, `/sitemap.xml` (via `.htaccess`), `/daily`, `/leaderboards/overall`, `/leaderboards`, `/challenges/{code}`, `/quizzes`, `/quizzes/{slug}`, `/quizzes/trending`, `/categories`, `/categories/{slug}`, `/curriculum-tags`; POST `/guest-sessions`, `/account/session`.
- **Player (guest or Clerk):** GET `/me`, `/me/settings`, `/me/games`, `/me/continue`, `/me/best`, `/me/nickname/suggestions`, `/me/messages`, `/me/daily/{id}/finished`; POST `/me/age-band`, `/me/nickname`, `/me/nickname/random`, `/me/avatar`, `/me/settings`, `/me/delete`, `/me/messages/seen`, `/me/messages/{id}/reply`, `/likes`, `/feedback`, `/attempts`, `/attempts/{id}/next|answer|finish|challenge`; DELETE `/session`.
- **Staff (`/admin/*`):** GET `me`, `audit`, `todo`, `stats`, `quizzes`, `quizzes/{id}`, `daily`, `rounds`, `subjects`, `generator`, `generator/runs/{id}`, `feedback`, `feedback/{id}`; POST `quizzes`, `quizzes/{id}` plus actions `append|submit|unsubmit|check|publish|retire|restore|discard|delete`, `daily`, `rounds/{id}/hide`, `subjects`, `subjects/{slug}`, `generator/runs`, `generator/runs/{id}/step|send`, `generator/write`, `generator/drafts/{id}`, `import/review`, `feedback/{id}/reply|note|status`.
- Every route the front end calls has a backend route, and every backend route has a handler. Not called by the front end: GET/POST `/me/settings`, `/sitemap.xml`, `/health`.
- Limits: 600/min per IP (except `/health`), 120/min per profile, 300/min staff, 100 guests/hour per IP. Auth levels: public, session, staff (Clerk subject in config `admin_subjects`; `profiles.role` is never used).

## Database (24 tables, 15 migration files, 0009 absent by design)

Identity: `profiles`, `identities`, `guest_sessions`, `rate_limits`.
Content: `categories`, `quizzes`, `quiz_versions`, `curriculum_tags`, `blocked_words`, `app_settings`.
Play: `attempts`, `attempt_answers`, `daily_challenges`, `friend_challenges`, `leaderboard_entries`, `leaderboard_likes`.
Staff: `content_reviews` (write-only), `admin_audit`.
Messaging: `feedback`, `feedback_messages`.
Generator: `generator_runs`, `generator_pages`, `generator_drafts`.
Runtime: `schema_migrations` (created by `bin/migrate.php`).

## Back-end classes (graph degree)

`ApiError` (62), `AdminContent` (42), `Generator` (36), `Admin` (23), `AdminOps` (21), `Player` (20), `Feedback` (19), `Game` (18). Also `Api`, `Catalog`, `Competition`, `Overall`, `Daily`, `Content`, `ContentImporter`, `Identity`, `Config`, `Database`, `RateLimit`, `GeneratorLive`, `GeneratorFixtures`, `GeneratorTransport`.
Entry points with no graph links (expected): `public/api.php`, `bin/daily.php`, `bin/import-content.php`, `bin/migrate.php`.

## Cron

`daily.php` at :07 hourly, `cleanup.php` at :23 hourly, DB backup 03:41 nightly (`scripts/cron-ensure.sh`).

## Not covered by the graph

SQL migrations (parser not installed), docs, content JSON. Table-to-class links come from the agents' reading.
