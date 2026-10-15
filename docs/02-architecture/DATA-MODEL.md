# Supabase PostgreSQL Schema & Security — Do You Know

Migration note, 15 October 2026: PHP/MySQL replacement is approved in
`docs/07-operations/CPANEL-MIGRATION.md`. This schema is still authoritative for
gameplay. Clerk adult IDs are a separate identity and must not replace existing
profile UUIDs. No MySQL schema or identity mapping has been deployed yet.

The runnable source is `supabase/migrations/` (apply in order with `supabase db push` or
the SQL editor). This doc explains it.

| File | Contents |
| --- | --- |
| `0001_init.sql` | Base: `profiles`, `app_settings`, RLS, `set_updated_at()`, sign-up trigger |
| `0002_quiz_core.sql` | All app tables, RLS, audit, column protection, guest/upgrade triggers |
| `0003_game_functions.sql` | Game RPCs (start/answer/next/finish), boards, challenges, nicknames, avatars, publishing |
| `0004_scheduled_jobs.sql` | Daily switch, scheduled publish, rebuild hook, cleanup (`pg_cron` + `pg_net`) |

**Golden rule:** the browser can read a question's public text, **never its answer**.
Answers live only in `questions`, `question_options` and `quiz_versions`, which are
staff-only. Players reach them only through SECURITY DEFINER functions that grade on the
server.

## 1. Entity relationships
```text
auth.users ──1:1── profiles ──1:1── app_settings
                     │  └──< avatars (one live per trait combination)
                     │  └──1 parental_consents (under-13 only)
                     ├──< attempts ──< attempt_answers
                     │       │  └─> quiz_versions (frozen snapshot WITH answers)
                     │       └─> daily_challenges / friend_challenges
                     └──< leaderboard_entries (best per board · quiz · period)

categories ──< quizzes ──< quiz_questions >── questions ──< question_options
                  └──< quiz_versions                 └─< ai_question_drafts (origin=ai)
curriculum_tags (codes referenced by quizzes.curriculum_tags[])
site_config · blocked_words · rebuild_requests · audit_log
```

## 2. Changes to the base schema (made in 0002, 0001 untouched)
- `profiles.email` is now **nullable** — guests (anonymous sign-in) have no email.
- `app_settings.theme` defaults to **`light`**.
- `handle_new_user()` no longer copies Google `full_name`/`avatar_url` (data minimisation
  for a children's service). Guests start as `role = 'guest'`, others as `player`.
- New trigger `handle_user_upgraded()` on `auth.users`: a guest who links Google/email
  becomes `player` with all history kept; an under-13 upgraded with a parent's email gets
  a **pending** `parental_consents` row.
- New trigger `protect_profile_columns()` resets `role`, `email`, `age_band`, `nickname`,
  `avatar_id` and streak columns on any direct update unless the caller is an admin, the
  service role, or a game function (which sets `dyk.trusted` for its own transaction).

## 3. Tables

### `profiles` (extended)
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `email` | text null | null for guests; parent's email for an upgraded under-13 |
| `role` | text | `guest` · `player` · `editor` · `admin` (protected) |
| `nickname` | text null | 3–20 chars `^[A-Za-z0-9][A-Za-z0-9 ._-]{1,18}[A-Za-z0-9]$`; set only via RPC |
| `age_band` | text null | `under_13` · `13_17` · `18_plus`; locked once set |
| `avatar_id` | uuid null | → `avatars` (must be `ready`) |
| `streak_current`, `streak_best` | int | daily-challenge streaks (server-maintained) |
| `last_daily_date` | date null | London date of last finished daily |
| `full_name`, `avatar_url` | text null | legacy from 0001; not collected or shown |

### Content (staff write; answers staff-read only)
| Table | Key columns | Notes |
| --- | --- | --- |
| `categories` | `slug` unique, `name`, `kind` (`general`/`school`), `scene`, `sort_order`, `is_active` | Public read of active rows |
| `curriculum_tags` | `code` PK (`uk-ks2`, `us-3-5`, `wa-jss`…), `label`, `system`, `age_min/max` | Seeded for UK, US, West Africa; admin can add |
| `questions` | `type` (`choice`/`boolean`/`slider`), `prompt`, `explanation`, `source_url`, `review_by`, `difficulty`, `age_min/max`, slider fields (`slider_min/max/step/unit`, `correct_value`, `accept_min/max`), `status` (`draft`/`in_review`/`approved`/`retired`), `origin` (`human`/`ai`) | **Staff only.** Check constraint enforces complete, consistent slider fields |
| `question_options` | `question_id`, `label`, `is_correct`, `sort_order` | **Staff only** |
| `quizzes` | `slug` unique, `title`, `intro`, `category_id`, `difficulty`, `age_min/max`, `curriculum_tags[]` (GIN), `question_count` (3–50), `time_limit_seconds` (5–120 or null), `shuffle_options`, `is_ranked`, `status`, `publish_at`, `current_version_id`, SEO fields | Public read when `published`. Editors can't set `scheduled`/`published` |
| `quiz_questions` | (`quiz_id`, `question_id`) PK, `position` | The quiz's question **pool**; `question_count` are drawn per play |
| `quiz_versions` | `quiz_id`, `version` (unique together), `snapshot` jsonb **with answers**, `question_count` | Written only by `publish_quiz()`; staff read only |
| `ai_question_drafts` | `topic`, `category_id`, `difficulty`, `age_min/max`, `count`, `model`, `status` (`queued`→`running`→`ready`→`imported`/`failed`), `result` jsonb | Staff only |

### Play
| Table | Key columns | Notes |
| --- | --- | --- |
| `attempts` | `user_id`, `quiz_id`, `quiz_version_id`, `mode` (`practice`/`ranked`/`daily`/`challenge`), `question_order uuid[]`, `current_index`, `current_sent_at`, `correct_count`, `answered_count`, `answer_time_ms`, `status` | Owner read only; written only by game RPCs. Unique (user, daily challenge) for daily mode |
| `attempt_answers` | `attempt_id`, `position` (unique together), `question_id`, `chosen_option_id` / `chosen_value`, `is_correct`, `timed_out`, `sent_at`, `answered_at`, `time_ms` | Owner read only, after answering |
| `daily_challenges` | `challenge_date` unique (London), `quiz_id`, `quiz_version_id` (frozen at go-live), `status` (`scheduled`/`live`/`done`) | Public read of live/done; staff manage |
| `friend_challenges` | `code` unique (8 chars, no look-alikes), `quiz_version_id`, `creator_id`, `creator_attempt_id`, `expires_at` (+30 days) | Creator read; public preview via `get_friend_challenge()` |
| `leaderboard_entries` | (`board`, `quiz_id`, `period_start`, `user_id`) unique, `attempt_id`, `correct_count`, `total`, `answer_time_ms`, `achieved_at`, `is_hidden` | Best result kept per period. `all_time` uses `period_start = 1970-01-01`; `weekly` = Monday (London) |

### People, safety & ops
| Table | Key columns | Notes |
| --- | --- | --- |
| `avatars` | `user_id`, `traits` jsonb, `trait_key` (canonical `k=v\|k=v`), `status` (`pending`/`generating`/`ready`/`failed`/`rejected`), `image_url`, `model`, `error` | **Partial unique index on `trait_key` where status not failed/rejected** → no two live avatars alike |
| `parental_consents` | `child_id` unique, `parent_email`, `status` (`pending`/`confirmed`/`revoked`), `confirmed_at` | Child sees own; admins see all; email never public |
| `site_config` | `key` PK, `value` jsonb | Admin only. Seeds: `ai_models`, `avatar_traits`, `avatar_daily_limit`, `rebuild_hook_url` |
| `blocked_words` | `word` PK (lower-case) | Staff manage; checked by `set_nickname()` |
| `rebuild_requests` | `reason`, `requested_at`, `sent_at` | Debounce queue for the site rebuild hook |
| `audit_log` | `actor_id`, `action`, `table_name`, `row_id`, `old_data`, `new_data` | Admin read. Every content change + every role change |

`set_updated_at()` triggers keep `updated_at` on categories, questions, quizzes, avatars,
daily_challenges and ai_question_drafts.

## 4. Row Level Security
RLS is enabled on **every** table. Helpers: `is_staff()` (editor/admin), `is_admin()`.

| Table | Player (guest/player) | Staff | Anonymous (`anon`) |
| --- | --- | --- | --- |
| `profiles` | own row (read/update unprotected cols) | read all; admin update | — |
| `app_settings` | own row | — | — |
| `categories`, `curriculum_tags` | read active | write (tags: admin) | read |
| `quizzes` | read `published` | read all; write (publish states: admin) | read `published` |
| `questions`, `question_options`, `quiz_questions` | **none** | all | none |
| `quiz_versions` | **none** | read | none |
| `daily_challenges` | read live/done | all | read live/done |
| `attempts`, `attempt_answers` | read own | read all | — |
| `friend_challenges` | read own | read all | — |
| `leaderboard_entries` | read own | read all; hide | — (use `get_leaderboard`) |
| `avatars` | read own | read; update (moderation) | — |
| `parental_consents` | read own | admin read | — |
| `ai_question_drafts` | none | all | none |
| `site_config`, `audit_log`, `rebuild_requests` | none | admin | none |

There are **no** direct insert/update policies for players on play tables: all writes go
through the functions below.

## 5. Functions (RPC)
All SECURITY DEFINER with `search_path = public`. Errors are short codes (see
`src/lib/gameErrors.ts`).

| Function | Who | Purpose |
| --- | --- | --- |
| `start_attempt(p_quiz_slug, p_mode, p_challenge_code)` | signed-in (incl. guests) | Opens or **resumes** an attempt; random draw (practice/ranked), fixed order (daily), creator's order (challenge). 5 starts/min |
| `next_question(p_attempt_id)` | owner | Shows the next question and starts its clock (idempotent) |
| `answer_question(p_attempt_id, p_option_id, p_value)` | owner | Grades against the frozen snapshot; server time; timer; stops clock |
| `finish_attempt(p_attempt_id)` | owner | Totals, writes best results, streak, returns review + ranks + versus (idempotent) |
| `get_leaderboard(p_quiz_slug, p_board, p_limit)` | anyone | Top ≤100 (nickname, avatar, score, time) + my rank |
| `create_friend_challenge(p_attempt_id)` | owner of a finished attempt | Returns an 8-char code (reuses an active one) |
| `get_friend_challenge(p_code)` | anyone | Public preview: quiz, creator nickname/avatar, score |
| `set_age_band(p_band)` | signed-in | Once only (admin can change) |
| `assign_random_nickname()` | signed-in | Generated nickname; the only option for under-13s |
| `set_nickname(p_nickname)` | 13+ | Free text with blocked-words filter |
| `confirm_parental_consent()` | parent on child account | Pending → confirmed |
| `request_avatar(p_traits)` | signed-in | Validates traits vs `site_config`, uniqueness, 3/day; creates `pending` row |
| `set_active_avatar(p_avatar_id)` | owner | Uses a `ready` avatar |
| `delete_my_account()` | signed-in | Deletes the auth user; data cascades |
| `publish_quiz(p_quiz_id, p_publish_at)` | **admin** | Validates every question (source, explanation, review date, exactly one correct…), freezes a new version, publishes/schedules, queues a rebuild |
| `import_ai_draft(p_draft_id)` | staff | Imports sourced draft questions as `in_review`, skips unsourced |
| `activate_daily_challenge()`, `publish_due_quizzes()`, `send_rebuild_hook()`, `cleanup_stale_data()` | `pg_cron` only | See `docs/02-architecture/ARCHITECTURE.md` §7 |

Internal helpers (`_snapshot_question`, `_public_question`, `_attempt_state`,
`_record_best`, `_rank_of`, `_london_today`, `_london_week_start`) are not executable by
clients.

## 6. Versioning
Publishing freezes the question pool (with answers) into a new `quiz_versions` row.
Attempts, daily challenges and friend challenges reference a version, so fixing a
question later creates version N+1 and **never changes a past score**.

## 7. Generating TypeScript types
`src/types/database.types.ts` is hand-written to match these migrations (player-readable
tables + every RPC). Once your project exists, replace it with generated types:
```bash
supabase gen types typescript --project-id <ref> --schema public \
  > src/types/database.types.ts
```
RPC JSON payloads are typed in `src/types/game.ts`; staff-only rows in `src/types/admin.ts`.

## 8. Testing the schema
```bash
pip install "psycopg[binary]"
PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run_tests.sh
```
Rebuilds a scratch database from every migration (with a small Supabase shim) and runs 61
behaviour checks. **Never point it at your real project** — it drops its test database.

## 9. Migration policy
- One numbered file per change (`0005_add_achievements.sql`). Additive and idempotent
  (`if not exists`, `create or replace`, guarded constraints).
- Never edit an applied migration; add a new one. Run the test kit before pushing.
