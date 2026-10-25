> New-domain baseline, 25 October 2026: imported technical/design history below is reference, not evidence of a doyouknow.space deployment. Current setup and status: docs/00-foundation/CLAUDE-CODE-HANDOFF.md and docs/07-operations/GITHUB-FTPS-SETUP.md. Verify private paths, auth, legal copy and runtime before release. Applied migrations are unchanged.

# cPanel API package

Status, 16 October 2026: this PHP API with MySQL/MariaDB is the app's only backend
(ADR-003). The frontend calls it only through `src/lib/api.ts`. Catalogue, guest
sessions, practice, ranked, daily and friend play, leaderboards, profiles, preset avatars,
settings, history and deletion are implemented and tested locally. Content arrives from
reviewed JSON files through `bin/import-content.php` (see Content review and publishing).
Not built yet: a content CMS, linking adult accounts to game history, and a parental
consent flow. Live deploy is not done. Unimplemented routes return JSON 404.

## Files and deployment layout

```text
/home/CPANEL_USER/do-you-know-private/       outside ALL webroots
  config.php                       your private settings (never committed)
  vendor/                          Composer dependencies
  src/                             PHP application
  migrations/                      versioned MySQL DDL
  content/                         reviewed quiz files (JSON), imported as drafts
  bin/migrate.php                   CLI-only migration runner
  bin/import-content.php            CLI-only content validator, importer and publisher
/home/CPANEL_USER/APP_DOCROOT/       this app's own webroot
  index.html, assets/, sw.js, ...   built PWA, no public source maps
  .htaccess                        repo-root Apache rules
  api/
    .htaccess                      API rewrite/headers
    api.php                        public entry point only
```

1. Confirm PHP 8.2+ with PDO MySQL, cURL, OpenSSL and the actual MySQL/MariaDB version.
   The foundation has been exercised on MariaDB 12 locally. Check your host before
   deploying. No Node runtime is required on cPanel.
2. Create a dedicated development database and user in cPanel Database Wizard. PHP
   connects to localhost on cPanel. Your two computers call HTTPS, never MySQL directly.
3. Run `composer install --no-dev --prefer-dist --optimize-autoloader` in backend/ on
   the build computer (or use `php /path/to/composer.phar` if Composer is not global).
   Dependencies are locked. Upload vendor/ privately if Composer is unavailable on-host.
4. Copy config.example.php to private config.php. Fill the database connection,
   exact allowed frontend origins, Clerk issuer and authorised parties. Supply its
   PEM JWT public key or backend secret, never a VITE_-prefixed private key. Set a
   random rate-limit key of at least 32 characters. Use a private owner-readable
   file (chmod 600). No real configuration belongs in the public api/ directory.
5. Add this line to the DEPLOYED api/.htaccess, replacing the path:

   ```apache
   SetEnv DYK_BACKEND_DIR /home/CPANEL_USER/do-you-know-private
   ```

   Leave the repository template generic. If your host forbids SetEnv, have the host
   configure DYK_BACKEND_DIR or change only the public entry point's private path.

6. Run on the host (SSH/Terminal), with the runtime configuration in place:

   ```sh
   cd /home/CPANEL_USER/do-you-know-private
   php bin/migrate.php
   ```

   This creates tables in the configured dedicated database; it does not reset it.
   Use a migration account for DDL; use a runtime account limited to required table
   reads/writes (no global privileges). MySQL DDL is not transactionally reversible.
   If it fails, stop deployment and inspect the private migration state. Never edit
   a migration recorded in schema_migrations. Back up outside every webroot first.

7. Build the frontend on the Mac/CI and run `npm run package:cpanel`. It creates a
   new ignored build/cpanel-* release directory with public/ and private/ sections.
   The package includes a blank private/config.php generated from the example,
   never copied from live settings. Fill it AFTER upload. Never upload the
   release's private/ folder underneath a public document root.
8. Upload public/ into this app's dedicated docroot, private/ into the private path
   above. Do not mirror-delete other sites, API configuration or runtime files.
9. Verify `/api/v1/health`, then create a test guest and play a seeded/imported test
   practice quiz. API errors must be JSON, not index.html.

Clerk's development instance can be used for testing only. Production instance,
DNS and OAuth configuration still require their own setup. No user import happens
on deployment. A verified Clerk subject receives a separate internal adult profile;
existing guest game history is not automatically linked.

## Implemented API

All responses are JSON and `Cache-Control: no-store, private`. POST requires an
object-shaped application/json body, at most 32 KiB. Public reads are capped at 100.
Private endpoints require `Authorization: Bearer <token>`; no credentials in URLs.

| Method/path (prefix /api/v1) | Body / behaviour                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET /health                  | Liveness only, no database or secrets disclosed                                                                    |
| POST /guest-sessions         | `{}`; returns unguessable token, expiry and own profile ID                                                         |
| DELETE /session              | Revokes the current guest token; Clerk sign-out stays in Clerk                                                     |
| POST /account/session        | `{ "adult_confirmed": true }` plus a verified Clerk session token; creates/resolves adult identity, no staff grant |
| GET /me                      | Own profile, no real name/email/external identity                                                                  |
| POST /me/age-band            | `{ "band": "under_13" }`, one-time age band                                                                        |
| POST /me/nickname/random     | `{}`, server-generated nickname                                                                                    |
| POST /me/nickname            | `{ "nickname": "…" }`, moderated, 13+ only                                                                         |
| POST /me/avatar              | `{ "avatar_id": "fox" }`, one of the 12 presets in `Player::AVATARS`                                               |
| GET /me/settings             | Own preferences, safe defaults                                                                                     |
| POST /me/settings            | Strict theme/notifications whitelist, real booleans                                                                |
| GET /me/games?limit=20       | Own server-written finished results, capped at 100                                                                 |
| GET /me/continue             | Own unfinished attempts that would still resume (same rules as POST /attempts), max 5                              |
| GET /me/best                 | Own best finished result per published quiz (most correct, then lowest time), max 50                               |
| POST /me/delete              | `{ "confirmed": true }`, cascades own app data and sessions                                                        |
| GET /curriculum-tags         | Public filter options                                                                                              |
| GET /categories/:slug        | Active category detail                                                                                             |
| GET /categories              | Active category metadata                                                                                           |
| GET /quizzes                 | Published metadata; category_id/age/curriculum_tag/search filters, literal wildcards                               |
| GET /quizzes/trending        | Up to 6 published quizzes by finished plays in the last 7 days, then newest; catalogue fields only                 |
| GET /quizzes/:slug           | One published quiz                                                                                                 |
| GET /daily                   | Today's published challenge, London server date                                                                    |
| GET /leaderboards            | board/quiz_slug/limit, public nickname/avatar_id/score rows only                                                   |
| GET /challenges/:code        | Public nickname/avatar_id/score preview, labels expiry                                                             |
| GET /me/daily/:id/finished   | Owner-only daily completion                                                                                        |
| POST /attempts/:id/challenge | `{}`, creates/reuses a 30-day friend link                                                                          |
| POST /attempts               | practice/ranked with quiz_slug, daily, or challenge with challenge_code                                            |
| POST /attempts/:id/next      | `{}`; original server clock retained on repeated next                                                              |
| POST /attempts/:id/answer    | `{ "option_id": "…" }` or `{ "value": 5 }`; server grades/times                                                    |
| POST /attempts/:id/finish    | `{}`; owner-only result/review, idempotent                                                                         |

Do not expose generic SELECT * readers, question tables or quiz version snapshots.
A submitted score, role or profile ID is never an authority. Public question payloads
whitelist id, type, prompt, image, option id/label and slider display bounds only.

Guest sessions expire after seven days by default, store only token hashes and
contain no child email/name/photo. No cookie/CSRF protocol is implied by this bearer
API. The frontend keeps the opaque `guest_` token in localStorage key `dyk-guest`, sends
it as a bearer token and forgets it on a 401 or after `DELETE /session`.
Rate limits use a keyed hash of the network address, not a stored raw address;
shared networks may share an allowance. Schedule `/usr/local/bin/php /home/CPANEL_USER/do-you-know-private/current/bin/cleanup.php` at a frequency
allowed by your host. It removes up to 1000 expired sessions and throttle buckets
per run, never profiles or gameplay records.

Schedule `/usr/local/bin/php /home/CPANEL_USER/do-you-know-private/current/bin/daily.php` every hour. It works
on the London date and is safe to run again: it marks earlier `live` (and missed
`scheduled`) daily rows `done`, makes today's `scheduled` row `live`, and when nothing is
scheduled it picks the least recently used published quiz that has a current version and
pins that version. A scheduled row whose quiz is no longer published is swapped for a
published one. A row an owner set to `done` stays closed. It exits 2 when no published
quiz exists, so no daily runs that day. Until the first run after London midnight,
`GET /daily` returns `null`.

Use the absolute CLI path in cron. On this host a bare `php` in cron's PATH is
`/usr/bin/php`, the CGI build: both scripts then answer `404` and exit 0 without doing
anything. Check with `/usr/local/bin/php -r 'echo PHP_SAPI;'` (must print `cli`).
Install or repair both lines with `npm run cron:ensure` from the repo, never by replacing
the shared crontab; runs log to `~/do-you-know-private/shared/logs/cron.log`.

## Content review and publishing

There is no CMS. Quizzes live as one JSON file per quiz in `content/`, named
`<slug>.json`, plus `content/categories.json` (categories and curriculum tags).
Everything is original writing. The first 28 quizzes (16 general, 12 school, 260
questions) were machine-drafted on 17 October 2026. On 21 October 2026 every quiz grew to
30 questions and 18 new quizzes were drafted (5 for ages 5-7, 8 GCSE for ages 14-16, 5
hard ones for 16+): 46 quizzes, 1,380 questions. All are drafts until a person has
reviewed them. Nothing is ever published automatically.

Each quiz file has `slug`, `title`, `intro`, `category` (a slug from
categories.json), `difficulty` (`easy`/`medium`/`hard`), `age_min`, `age_max`,
`curriculum_tags`, `time_limit_seconds` (null or 5-120), optional `shuffle_options`,
`is_ranked` and `round_size` (3 up to the bank size; default 10, or the whole bank when it
is smaller), and 3-50 `questions`. A round serves `round_size` questions from the bank:
questions this player has never seen first, then the ones seen longest ago (ADR-007).
Aim for at least three rounds (30 questions) per quiz. A prompt may appear in only one
quiz; the check ignores case, spacing and punctuation but keeps maths symbols. Every question needs `prompt`, `explanation`, an
https `source_url` and a `review_by` date, plus one of:

- `choice`: `options` of 2-6 `{label, correct}` with exactly one correct
- `boolean`: `answer` true or false (shown as True and False)
- `slider`: `slider` with `min`, `max`, `step`, `unit`, `correct`, `accept_min`,
  `accept_max`; `correct` must sit on a step inside the accepted range

Unknown keys, reserved slugs (`trending`) and files not named after their slug are
rejected. The importer turns each file into a `quiz_versions.snapshot` with stable
question and option IDs derived from the content, so an unchanged file never makes a
new version.

1. Edit or add files on a branch and validate them, no database needed:
   `php bin/import-content.php --dry-run` (CI runs this too).
2. Review: a named adult reads every question in the file, checks the answer against
   its `source_url`, the explanation and the kind tone, and fixes anything doubtful.
   Merge the reviewed files through a pull request.
3. Import drafts. On a `_test` database: `php bin/import-content.php`. On the cPanel
   database, back it up outside every webroot first, apply migration 0006 with
   `bin/migrate.php`, then run
   `/usr/local/bin/php bin/import-content.php --confirm-production`. New quizzes are
   created as `draft`; changed drafts get a new version; published quizzes are never
   changed (reported as "published kept"). New categories are added hidden and existing
   categories and tags are left as they are.
4. Publish only what was reviewed, by slug:
   `/usr/local/bin/php bin/import-content.php --publish=slug-one,slug-two --reviewed-by="Name" --confirm-production`.
   It is all or nothing: every slug must be an imported draft whose stored version
   matches its file and has no passed `review_by` date. It sets the quiz `published`,
   shows its category, and records who reviewed which version in `content_reviews`.
5. Play each newly published quiz once on the live site.

To change a published quiz later, there is no unpublish command yet: an owner sets it
back to `draft` in phpMyAdmin, then repeats steps 2 to 4. Past attempts keep their old
version. The script refuses any environment other than `test` unless
`--confirm-production` is given, and exits 2 on invalid content or a refused publish.
When a `review_by` date passes, the dry run warns and publishing that quiz is refused
until the question is checked and the date moved on.

## Verification

```sh
composer test
# Against a fresh, isolated local database configured with environment=test,
# database name ending _test, and migrations applied:
DYK_CONFIG=/private/test-config.php php bin/migrate.php
DYK_CONFIG=/private/test-config.php php -S 127.0.0.1:55438 -t public public/api.php
DYK_CONFIG=/private/test-config.php php tests/integration.php
```

The HTTP/database test creates original fixtures and test guests. Run only on a
throwaway database. It must not use the cPanel development/production database.
The unit tests generate their own RSA key to check valid/invalid signed sessions;
this tests token verification but does not impersonate or create a real Clerk user.
Actual Clerk sign-in and cPanel runtime checks are separate.

Release steps and safety rules: [DEPLOYMENT.md](../docs/07-operations/DEPLOYMENT.md).
Remaining gates: [CURRENT-TASK.md](../.agent/CURRENT-TASK.md).

## Production port progress

Migration 0003_player_metadata.sql is additive, preserving the original applied
migration files. Profile changes derive identity from verified sessions. Submitted
user IDs/roles never choose a target. Under-13s cannot choose free-text nicknames
or change their age band. Confirmed app-profile deletion revokes all its guest
sessions and cascades attempts/settings. Clerk account deletion is separate and
must be integrated before promising complete account deletion in the frontend.
Owner-only DTOs omit legacy personal-data fields. Timestamps use explicit UTC ISO.
The blocked_words table needs the owner's approved moderation policy before launch.
No content/user import or hosted deployment happens merely by running these tests.

Migration 0004 adds daily/friend challenges and leaderboard entries. Every game
operation takes the profile lock before its attempt lock. Finish, daily starts and
share creation are idempotent under concurrent requests. Time limits are frozen
per attempt; friend challenges reuse the creator's frozen timer and question order.
Daily starts use the pinned version in snapshot order for all players. A published
quiz remains required for new starts. Public scoreboards omit user IDs and ages.
The API sends a display-only question_deadline and database server_now; PHP still
grades every answer and owns elapsed time. The React timer accepts this clock while
retaining a local fallback, with duplicate-expiry protection under StrictMode.

Tests: tests/http.php supplies a guarded localhost/test-database harness.
tests/integration.php covers ownership/metadata/practice, tests/competition.php
covers all game modes, tests/daily.php covers the daily activator and its cron script,
tests/content.php covers the content validator, draft import, publish gate and an
imported quiz played through the API, tests/concurrency.php requires four local PHP workers and
sends parallel requests. CI uses PHP_CLI_SERVER_WORKERS=4; this development server
is never used for cPanel production.
