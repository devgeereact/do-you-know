# MySQL Data Model and Access Rules: Do You Know

Updated 16 October 2026. The only database is MySQL/MariaDB behind the private PHP API.
Supabase was removed from the code on this date (ADR-003 in
`docs/08-change-management/DECISIONS.md`).

The runnable source is `backend/migrations/`, applied in order by `backend/bin/migrate.php`
(CLI only). This document explains it.

| File                                 | Contents                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_api_foundation.sql`            | `profiles`, `identities`, `guest_sessions`, `rate_limits`, `categories`, `quizzes`, `quiz_versions`, `attempts`, `attempt_answers`                                   |
| `0002_identity_case_sensitivity.sql` | Makes `identities.provider` and `subject` case-sensitive (`ascii_bin`) so different Clerk IDs never merge                                                            |
| `0003_player_metadata.sql`           | Profile streak, daily date and `avatar_id`; quiz age range, curriculum tags, ranked flag, publish and SEO fields; `curriculum_tags`, `blocked_words`, `app_settings` |
| `0004_competition.sql`               | `daily_challenges`, `friend_challenges`, `leaderboard_entries`; attempt links to daily/friend challenges, frozen timer and shuffle settings; mode and status checks  |
| `0005_blocked_words_seed.sql`        | Starter `blocked_words` list (clear profanity and slurs, plus `admin`, `moderator`, `staff`, `official`) with `INSERT IGNORE`, so re-runs are safe                   |
| `0006_content_reviews.sql`           | `content_reviews`: who reviewed and published which quiz version (written only by `bin/import-content.php --publish`)                                                |

**Golden rule:** the browser can read a question's public text, **never its answer**.
Answers live only inside `quiz_versions.snapshot`, which no public endpoint returns. The
PHP API grades every answer on the server.

## 1. Entity relationships

```text
identities (provider, subject) ──> profiles <── guest_sessions (token hash)
profiles ──1:1── app_settings
   ├──< attempts ──< attempt_answers
   │       ├─> quiz_versions (frozen snapshot WITH answers)
   │       └─> daily_challenges / friend_challenges
   ├──< friend_challenges (creator)
   └──< leaderboard_entries (best per board · quiz · period)

categories ──< quizzes ──< quiz_versions
curriculum_tags (codes referenced by quizzes.curriculum_tags JSON)
blocked_words · rate_limits · schema_migrations (ledger)
```

## 2. Tables

### Identity and sessions

| Table            | Key columns                                                                                                                                                                                                            | Notes                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`       | `id` CHAR(36) PK, `role` (`guest`/`player`/`editor`/`admin`), `nickname` (≤20), `age_band` (`under_13`/`13_17`/`18_plus`), `avatar_id`, `streak_current`, `streak_best`, `last_daily_date`, `created_at`, `updated_at` | Internal UUIDs are the only player identifiers. No email, real name or photo columns. `avatar_id` holds a preset id from `Player::AVATARS` |
| `identities`     | (`provider`, `subject`) PK, `profile_id`                                                                                                                                                                               | Maps a verified Clerk subject to an internal adult profile. Clerk IDs never replace profile UUIDs                                          |
| `guest_sessions` | `token_hash` PK, `profile_id`, `expires_at`                                                                                                                                                                            | Only the hash of the opaque `guest_` token is stored. Seven-day default expiry                                                             |
| `rate_limits`    | `bucket_hash` PK, `hits`, `expires_at`                                                                                                                                                                                 | Keyed hash of the network address; raw addresses are not stored                                                                            |
| `app_settings`   | `id`, `user_id` unique, `theme` (`light`/`dark`), `notifications_enabled`                                                                                                                                              | One row per profile, created on first read                                                                                                 |

### Content

| Table             | Key columns                                                                                                                                                                                                                                                                                                | Notes                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`      | `slug` unique, `name`, `description`, `kind`, `icon`, `scene`, `sort_order`, `is_active`                                                                                                                                                                                                                   | Public read of active rows                                                                                                                                            |
| `curriculum_tags` | `code` PK (for example `uk-ks2`), `label`, `system`, `age_min`, `age_max`, `sort_order`                                                                                                                                                                                                                    | Public filter options                                                                                                                                                 |
| `quizzes`         | `slug` unique, `title`, `intro`, `category_id`, `difficulty`, `cover_image_url`, `status`, `current_version_id`, `time_limit_seconds` (5–120 or null), `shuffle_options`, `question_count` (3–50), `age_min`, `age_max`, `curriculum_tags` JSON, `is_ranked`, `publish_at`, `seo_title`, `seo_description` | Public read only when `status = 'published'`. Ranked starts fall back to practice when `is_ranked` is false                                                           |
| `quiz_versions`   | (`quiz_id`, `version`) unique, `snapshot` JSON **with answers**, `question_count`                                                                                                                                                                                                                          | Never returned by any endpoint. Questions, options, slider ranges, explanations and source URLs live in the snapshot; there are no separate question tables           |
| `content_reviews` | `quiz_id`, `quiz_version_id`, `reviewed_by` (staff name, up to 100 characters), `action` (`published`), `reviewed_at`                                                                                                                                                                                      | Never returned by any endpoint. One row per publish, so every live quiz version has a named human reviewer                                                            |
| `blocked_words`   | `word` PK (lower-case ASCII)                                                                                                                                                                                                                                                                               | Substring match on the lower-cased letters and digits and on a leetspeak reading (`Player::isBlocked`). 0005 seeds a starter list; the owner reviews it before launch |

### Play

| Table                 | Key columns                                                                                                                                                                                                                                                                                                                                      | Notes                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `attempts`            | `user_id`, `quiz_id`, `quiz_version_id`, `mode` (`practice`/`ranked`/`daily`/`challenge`), `status` (`in_progress`/`finished`/`abandoned`), `question_order` JSON, `current_index`, `answered_count`, `correct_count`, `answer_time_ms`, `current_sent_at`, `time_limit_seconds`, `shuffle_options`, `daily_challenge_id`, `friend_challenge_id` | Written only by the PHP game services. Unique (`user_id`, `daily_challenge_id`) gives one daily play per player. Timer and shuffle are frozen per attempt |
| `attempt_answers`     | (`attempt_id`, `position`) PK, `question_id`, `chosen_option_id` / `chosen_value`, `is_correct`, `timed_out`, `time_ms`                                                                                                                                                                                                                          | Server-graded and server-timed                                                                                                                            |
| `daily_challenges`    | `challenge_date` unique (London date), `quiz_id`, `quiz_version_id`, `status` (`scheduled`/`live`/`done`)                                                                                                                                                                                                                                        | `GET /daily` serves today's row only when `status = 'live'`; `bin/daily.php` (hourly cron) sets the statuses                                              |
| `friend_challenges`   | `code` unique (8 characters, case-sensitive), `quiz_id`, `quiz_version_id`, `creator_id`, `creator_attempt_id`, `expires_at` (30 days)                                                                                                                                                                                                           | Friends replay the creator's frozen question order and timer                                                                                              |
| `leaderboard_entries` | (`board`, `quiz_id`, `period_start`, `user_id`) PK, `attempt_id`, `correct_count`, `total`, `answer_time_ms`, `achieved_at`, `is_hidden`                                                                                                                                                                                                         | Boards `all_time`, `weekly`, `daily`. Best result kept per period. Public rows show nickname, avatar_id, score and time only                              |

Profile deletion (`POST /me/delete`) cascades to sessions, settings, attempts, answers,
friend challenges and leaderboard entries through foreign keys.

## 3. Access rules (enforced in PHP)

MySQL has no row-level policies here. The PHP API is the only client of the database and
enforces access:

- The runtime database user has only the table reads and writes the app needs. A separate
  migration user runs DDL.
- Identity comes from the verified bearer token (guest token hash or verified Clerk
  session). A submitted profile ID, role or score is never trusted.
- Every private query filters by the caller's profile ID.
- Public endpoints return whitelisted columns only, capped at 100 rows.
- Game operations take the profile lock before the attempt lock. Finish, daily start and
  challenge creation are idempotent under concurrent requests.

## 4. API surface

Routes, request bodies and behaviour are listed in `backend/README.md` (Implemented API).
Frontend calls go through `src/lib/api.ts` and `src/services/*`.

## 5. Versioning

Each quiz version freezes its questions and answers in `quiz_versions.snapshot`, a JSON
list of questions. Each question has `id`, `type` (`choice`, `boolean` or `slider`),
`prompt`, `image_url`, `options` (`id`, `label`, `is_correct`), `slider` (`min`, `max`,
`step`, `unit`, `correct`, `accept_min`, `accept_max`) or null, `explanation`,
`source_url` and `review_by` (ISO date, added 17 October 2026 for imported content).
Game sends only `id`, `type`, `prompt`, `image_url`, option labels and the slider scale
before an answer; `review_by` is never sent to players.
Attempts, daily challenges and friend challenges reference a version, so a later edit
creates a new version and never changes a past score. No authoring or publishing endpoint
exists; content arrives from reviewed JSON files in `backend/content/` through
`bin/import-content.php`, which creates drafts and publishes only a named, reviewed list
(see `backend/README.md`, Content review and publishing).

## 6. TypeScript types

`src/types/domain.ts` holds hand-written row shapes for what the API returns.
`src/types/game.ts` holds game payloads (attempt state, answer result, summary,
leaderboards, challenge previews). Keep both in step with the PHP responses.

## 7. Testing the schema

See `backend/README.md` (Verification). `composer test` runs the unit checks. The HTTP and
database suites (`tests/integration.php`, `tests/competition.php`,
`tests/concurrency.php`) need a fresh, throwaway database whose name ends in `_test`.
**Never point them at the cPanel database.** On 16 October 2026: 14 unit, 76
HTTP/database, 63 competition and 9 concurrency checks PASS on local MariaDB.

## 8. Migration policy

- One numbered file per change (`0005_….sql`). Additive only.
- `bin/migrate.php` records each file and its checksum in `schema_migrations` and refuses
  to run if an applied file changed. Never edit an applied migration; add a new one.
- MySQL DDL is not transactionally reversible. Back up outside every webroot first.
