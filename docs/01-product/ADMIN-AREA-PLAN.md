# Admin area plan (approved 27 October 2026)

Copy of the approved plan, kept in the repository. Status 27 October 2026: Phase A built and tested locally, committed, not deployed. Phases B to G not started.


## Context
The site is live on a fresh database (`devgeereact_doyouknow`). The owner (Super Admin Clerk id `user_3LGQJC0LTauhtkAISGoDqMDq27N`) has no way to run the site except the CLI importer and SQL. PRODUCT-SPEC §4.8 already describes a planned CMS (dashboard, quiz editor, daily calendar, moderation, audit log, AI drafts that never self-publish). This plan builds it in shippable phases. Owner choices: first version covers dashboard, leaderboard moderation, quiz/content manager and daily scheduler plus growth tools; access is Super Admin only; the generator makes drafts a human reviews.

## Findings that shape the design
- No role check exists anywhere. `profiles.role` (guest/player/editor/admin) is unused. `Identity::profile` (`backend/src/Identity.php:41`) returns the profile row for guest or Clerk tokens. Clerk subject lives in `identities` (provider `clerk`).
- `Api::run` (`backend/src/Api.php`) is one if-chain. Authed paths are whitelisted (~line 74). Only GET/POST/DELETE are allowed. Body limit is 32 KB.
- Nothing writes `leaderboard_entries.is_hidden`, but every public query already filters on it. It is the ready moderation hook.
- Content is file-based: `Content::validateQuiz/validateQuestion/snapshot` (no DB access, reusable) and `ContentImporter::import/publish/addVersion`. Published quizzes are never edited in place; a change makes a new `quiz_versions` row.
- `content_reviews.action` CHECK only allows `'published'`.
- Frontend: Clerk is mounted only inside the lazy `AccountPage`. `src/lib/api.ts` only sends the guest token; nothing sends a Clerk token yet. Staff screens under `src/pages/admin*` are exempt from the i18n rule (`RULES.md:35`).
- `attempt_answers` holds per-question results, so question-quality analytics are possible with no new tracking.
- Docs `PERMISSIONS.md` and `USER-ROLES.md` are empty templates; they must be filled in.

## Security model (applies to every phase)
- **Super Admin = server config allowlist**, not a database role. New key `admin_subjects` (list of Clerk ids) in the private `config.php`. Never in Git or the browser. `Admin::guard()` loads the caller's `identities` row and checks the subject on every request. Guests and normal players get 403. The `profiles.role` column is left alone.
- All routes under `/admin/...`, handled by a new `backend/src/Admin*.php` set of classes, hooked into `Api.php` after `Identity::profile` with a prefix branch. Writes are POST only (keep the method set unchanged). Admin routes get their own rate limit and a larger body limit (256 KB) for quiz editing.
- `admin_audit` table (migration `0012`): actor profile, action, target type/id, small JSON detail, timestamp. No personal data. Every write route logs to it.
- Admin never sees personal data because none is stored: players are nickname + preset avatar only.
- Frontend: lazy `/admin/*` route with its own `ClerkProvider` (same pattern as `AccountPage`), `noindex`, excluded from sitemap and prerender, no link from public pages.
- Destructive actions (unpublish, hide, delete) need an in-page confirmation. Published content is never deleted, only retired.

## Phases (each is deployable on its own)

### Phase A: Foundation
- Migration `0012_admin_audit.sql`. New `backend/src/Admin.php` (guard, audit helper). `Api.php` admin branch. Config key added to `config.example.php` and, at deploy, to the live `config.php`.
- Frontend: `src/pages/admin/AdminLayout.tsx` (sidebar shell), `AdminGate` (signed out, not allowed, allowed), `src/lib/adminApi.ts` (a variant of `api()` that sends `getToken()` from Clerk), `src/services/adminService.ts`. Reuse `Page`, `Card`, `Button`, `SectionHeading` from `src/components/ui`.
- Dev-only way to test locally without Clerk keys: `backend/bin/dev-admin-token.php` mints a JWT with the test RSA key (refuses unless environment is development/test) plus a DEV-only token field in the admin gate.
- Fill in `PERMISSIONS.md`, `USER-ROLES.md`, add ADR-010, mark PRODUCT-SPEC §4.8 as in progress.

### Phase B: Dashboard (read-only)
`GET /admin/stats`: plays today / 7 days / 30 days, completion rate (finished vs started), ranked vs practice vs daily split, new players (guest profiles created), daily-challenge participation and streak distribution, top quizzes (reuse the `Catalog::trending` query shape), leaderboard likes total, newest board entries. Aggregates only, short server-side cache. Simple bar/number tiles (follow the `dataviz` skill; no chart library needed).

### Phase C: Leaderboard moderation
- Browse entries by quiz and board, newest first. Hide and restore (`is_hidden`), audit logged. Likes totals visible for spotting abuse.
- Nickname tools: search by nickname, reset a nickname to a generated one (`Player::randomNickname`) and clear the avatar. No free-text writing.
- Blocked-words manager (list, add, remove) using the existing `blocked_words` table and `Player::isBlocked` rules.

### Phase D: Quiz and content manager
- List all quizzes with status, version, ranked flag, question count and review-due dates. Quiz settings form (title, intro, category, difficulty, age range, curriculum tags, time limit, shuffle, ranked, SEO fields).
- Question editor (choice, boolean, slider) producing the same array shape as the JSON files, run through `Content::validateQuiz` and `Content::snapshot`. Saving a published quiz creates a new `quiz_versions` row as a draft change; publishing needs the reviewer name (default "Site owner"), writes `content_reviews`, and logs the audit entry. Extract a shared service from `ContentImporter` so the CLI importer and the web admin use the same code.
- Migration `0013` extends the `content_reviews.action` CHECK (`retired`, `edited`). Unpublish/retire a quiz without deleting it.
- Review-due queue (questions whose `review_by` is near or past), "preview as player" with answers visible to admin only.

### Phase E: Daily challenge scheduler
Calendar of the next 30 days over `daily_challenges` (`scheduled`/`live`/`done`). Set, swap or clear the quiz for a future date; today's live row is locked. Check `backend/src/Daily.php` and `bin/daily.php` first to confirm the hourly cron keeps manually scheduled rows and only auto-picks empty dates (verify before building; adjust the cron script only if needed). Warn when a date has no quiz.

### Phase F: Growth tools (what makes the app thrive)
- **Question quality**: per-question correct rate and average time from `attempt_answers`, flagging questions that almost nobody gets right (likely wrong or too hard) or everyone gets right (too easy). One click opens that question in the editor.
- **Coverage map**: quizzes and questions by age band, category and curriculum tag, highlighting gaps.
- **Retention view**: streak distribution and returning-player counts (aggregates only).
- **Site announcement banner** using `app_settings`-style site settings (text and on/off, plain text only).
- **Health panel** (read-only): API health, last backup time, migrations applied, cron last-run from the logs.

### Phase G: Quiz generator (drafts only)
- Admin form: topic, age band, curriculum tag, difficulty, question count. Server calls the Claude API (key stored in the private config outside Git; a daily cost/request cap), asks for questions in the exact JSON shape with an explanation and an https source URL per question, then runs every question through `Content::validateQuestion` and the duplicate-prompt check. Only valid questions are saved, as a **draft** with an `ai_draft` marker in the audit log.
- Hard rules kept: AI never publishes. Publishing requires the admin to open each question, tick "checked against source", and then publish through the Phase D flow. No player or child data is ever sent to the model.
- Risk: generated source URLs can be wrong. Mitigation: the editor shows each source link for manual checking, and a server-side link check (HTTP HEAD) flags dead links before the draft is saved.
- Note: migration number `0009` is reserved by a "stashed generator branch" mentioned in `0010`. No such branch is in this repo. Ask the owner where it lives before building so nothing is duplicated; otherwise use the next free migration number.

## Deferred (not in this version)
Invited editors with limited rights, a player-facing "report" button, email or contact inbox, external analytics SDKs (blocked by project rules), A/B tests.

## Deployment per phase
Backup (existing `backup-db.sh`), upload backend release, run migrations with the migration config, update the live `config.php` (`admin_subjects`, later the generator key) over SSH without printing it, publish the frontend through the manual FTPS workflow, then run the live checks.

## Verification
- Backend: new `backend/tests/admin.php` against the throwaway `_test` database, minting a Clerk-style JWT with the test RSA key. Matrix: no token 401, guest token 403, normal Clerk user 403, Super Admin 200 for each route; audit row written; hide/restore changes public boards; quiz save validates and versions; scheduler rules; stats shapes. Existing suites (unit, integration, competition, concurrency, daily) must still pass.
- Frontend: Vitest for the gate and admin services; typecheck, lint, build. Playwright smoke test for the admin gate (denied state).
- Local manual run: local MariaDB + PHP dev API + `npm run dev`; sign in with the dev token, walk each screen.
- Live: after each deploy, check `/admin` stays blocked for guests, works for the Super Admin, and public pages and API are unchanged.

## Critical files
`backend/src/Api.php`, `backend/src/Identity.php` (read only), new `backend/src/Admin*.php`, `backend/src/ContentImporter.php` and `Content.php` (extract shared service), `backend/src/Competition.php`, `Player.php`, `Daily.php`, `backend/migrations/0012+`, `backend/config.example.php`, `src/App.tsx`, new `src/pages/admin/*`, `src/lib/adminApi.ts`, `src/services/adminService.ts`, `docs/05-security/PERMISSIONS.md`, `docs/01-product/USER-ROLES.md`, `docs/08-change-management/DECISIONS.md`.
