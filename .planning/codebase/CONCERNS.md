# Codebase Concerns

**Analysis Date:** 2026-11-07 (read-only findings from the map; nothing here has been re-verified by running code, and none of it is scheduled work)

## Known bugs and risks (code)

- **Editor AI "Undo"** (`src/pages/admin/EditorScreen.tsx:638`): after accepting an AI fix, Undo only resets the badge; the question text stays changed (`acceptAi`, lines 508-515). Import behaves correctly (`ImportScreen.tsx:96-99`).
- **Generator `send` can append twice** (`backend/src/Generator.php:223-224`): append runs in `AdminContent::append`'s transaction, the draft status update is separate. A failure between them leaves drafts `approved`; a retry appends again.
- **`AdminContent::create`**: `isset(self::KS[$ks])` with an array `ks` raises a TypeError, returned as 503 instead of 422.
- **`AdminContent::check`** does not call `notRetired`, unlike `submit` and `publish`.
- **`Feedback::reply`** calls `mail()` while holding the feedback row lock inside a transaction.
- **Nickname uniqueness** (`profiles.nickname`, no unique index): enforced in code only (`Player::taken`), can race.
- **Generator daily caps** count `admin_audit` rows written only on success; a billed call that fails earlier is not counted (ASSUMPTION: minor cost leak).
- **Subject reorder** (`SubjectsScreen.move`): two non-atomic POSTs; a failure leaves duplicate order values.
- **Contact "I am an adult"** is a self-declaration that locks the age band to 18+; a child can tick it.
- **`AdminContent::delete`** returns `quiz_published` (409) for any quiz that has a version, including never-published imports.
- **PWA**: `navigateFallback` has no denylist; a direct visit to `/sitemap.xml` may get the app shell once the service worker is active (ASSUMPTION).

## Dead or unused

- `src/lib/imagekit.ts` has no importers; `VITE_IMAGEKIT_*`, an ImageKit PWA cache rule and a Privacy page mention remain.
- `VITE_POSTHOG_*` declared, never read; About copy says no analytics tools.
- GET/POST `/me/settings` implemented and tested, never called by the front end; `AppSettings` types unused; Settings page keeps theme in local storage only.
- `content_reviews` write-only (`unpublished` action never written). Unused: `profiles.role` editor/admin, `attempts.status='abandoned'`, quiz `cover_image_url`/`seo_title`/`seo_description` (read, never written), `GeneratorTransport::engine()`, the run `category` field in prompts.
- `scripts/verify.py` unreferenced (`pnpm verify` runs `release.mjs --verify`). `scripts/live-db.sh` needs a read-only DB account reportedly never recreated.
- ~20 unused type exports plus `ScoreRing`, `AUTO_ADVANCE_MS`, `getAuditLog`, `adminClient.me`.

## Inconsistencies

- **API shapes**: validation errors are 400 in some routes and 422 in others; `quiz_not_found` is 404 in Game/Catalog but 422 in Feedback; unknown challenge and no daily return 200 `null`; wrong method is 405 on private routes, 404 on public and admin routes.
- **Types**: `QuizStatus` has two value sets (`types/domain.ts` vs `adminService.ts`); `Difficulty`, `QuestionType`, `FeedbackType`, `GetToken`, `londonToday`, `shortDate` each defined twice; `ReviewItem` means two things.
- **Front end**: `GET /me` fires up to four times per page (no shared cache); `HomePage` ignores catalogue loading/error; streak strip, "How points work" and "you" summary are `hidden lg:` so phones miss them; `?board=daily` is a dead param; `RANKED_ROUND = 20` hard-coded.
- **Strings/colours**: `TermsPage` and most of `PrivacyPage` body text, Suspense fallbacks and many brand hex values bypass i18n/tokens; `offline.html` uses the old blue palette; `AdminApp.tsx` reads `import.meta.env.DEV` directly.
- **Accessibility**: no route-change focus/announcement, report dialog without focus trap, nickname radios without arrow keys, auto-rotating daily animation with no pause. VoiceOver pass OPEN.
- **Migrations**: 0009 absent (comments say held by a stashed generator branch; generator later shipped as 0014/0015; owner answer never recorded); 0003 and 0004 not re-runnable; 0013+ uses MariaDB-only syntax while README says MySQL/MariaDB; `migrate.php` splits on `;`+newline.
- **Config**: `config.example.php` omits `writer_daily`, `review_daily`, `generator.fixtures`.

## Documents out of step with code

- `.agent/CURRENT-TASK.md` header "Updated 1 November" yet holds 7 Nov content; says AI review "not deployed" while HANDOFF says deployed 6 Nov; HANDOFF has no entry for the 7 Nov rewrite or delete-draft deploy and its order is scrambled.
- `docs/AUDIT.md` has no section for the 7 Nov rewrite (3,600 questions, 180 quizzes); `EVIDENCE-STATUS.md` ends 6 Nov; the 2 Nov "0 duplicates" claim was contradicted on 7 Nov.
- Stale: `docs/02-architecture/ARCHITECTURE.md` (16 Oct), `DATA-MODEL.md`, `HOOKS.md`, `backend/README.md`, `PRODUCT-SPEC.md` launch checklist, `PROJECT-CONTEXT.md`, `PROJECT-MEMORY.md`, `tests/e2e/README.md`, ADR-016/017 (not marked superseded), ADR table column shifts, no `docs/04-*`.
- Counts disagree: quizzes 46 (seed) / 100 (2 Nov audit) / 262 (live); rate limits documented as 120/min and 10 guests/hour, code uses 600/min and 100/hour; cleanup cron documented :17, runs :23.
- Deploy: global rule says no Actions deploys but ADR-013 (30 Oct) chose them for this project; `scripts/release.mjs:4` comment still states the old rule; `deploy.yml` runs in parallel with CI, gates on lint/typecheck/unit only, and uses mutable action tags.
- Backup paths differ between `BACKUP-RECOVERY.md` and `pull-backups.sh`; remote path still carries the dropped DB's old name.
- Sentry: spec requires all errors captured, but no DSN appears in release config (could not check the Mac `.env`; ASSUMPTION inactive).

## Housekeeping

Two untracked `.claude/worktrees/agent-*` folders, eight old local branches, three open Dependabot PRs (one major, Clerk PHP 2).
