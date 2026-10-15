# Clerk and cPanel API evidence, 15 October 2026

Overall: PARTIAL migration. The local PHP foundation passes its checks. It has not
been deployed to cPanel or substituted for the frontend's Supabase game services.

## Clerk development setup

PASS: Clerk CLI 3.4.1 reports authenticated owner, valid session, selected application
app_3KkAGkEUg8ST1ts6ydvb9DWKhI9 reachable, git-remote link correct and development
keys present in ignored .env.local. No env file contents inspected. No application
created, users imported, credentials replaced or production instance configured.

PASS: browser at 320/375/1440 widths displays adult gate without overflow. Adult
confirmation loads sign-in and sign-up controls. Sign-in opens a real Clerk dialog;
Escape closes it and home navigation works. No page errors. The first test harness
tried navigation through an open modal; the corrected harness closes it first.

NOT TESTED: completing a real user sign-in, signed-in profile/sign-out, email/OAuth
continuity, parent consent or linking guest history. No test user was created.

## PHP and database

PASS: 14 unit checks, including valid signed RSA fixture sessions and rejection of
wrong issuer/origin, expired/future/tampered tokens, missing expiry/session/origin,
plus public-question/slider/option whitelisting and UUID generation.

PASS: 43 HTTP/database checks against an isolated MariaDB 12 database on port 55440,
PHP 8.5 on port 55438. Includes hashed/expiring/revoked guest sessions, own profile,
case-sensitive Clerk subjects, no user-ID override, payload limits, CORS rejection,
private snapshot exclusion, start/resume, hidden answer fields, invalid and replayed
answers, all three question types, server-only score/time, finish idempotency,
owner-only review, timeout caps and rate limits. Unmigrated game modes return 501.

PASS: migrations apply and rerun without changes; ledger checksums prevent applied
migration edits. A separate migration enforces case-sensitive external subjects.
Cleanup removes expired sessions/throttle rows only. Real app databases untouched.

PASS: 3 concurrency checks through multi-worker PHP-FPM: simultaneous starts share
one attempt, simultaneous answers accept one submission and increment once.

PASS: 7 Apache 2.4/PHP-FPM checks using temporary local TLS: API health, unknown API
JSON 404, config.php denial, SQL denial, SPA deep link, API config denial, bearer
header forwarding/own profile. Apache syntax check passes. Initial scratch Apache
startup needed its mutex directory moved to the scratch runtime; no project rule
change was required for that host-specific setting.

PASS: all PHP source syntax checks, Composer validation/platform checks and Composer
audit (zero advisories at check time). Dependencies locked; vendor remains ignored.

PASS: npm typecheck, lint and static build. cPanel packaging separates public/ from
private/, excludes public source maps and never copies live private configuration.
Generated private/config.php comes from the blank example. Source backend/config.php
is ignored and contains a blank template awaiting host values.

## Limits and next action

Host PHP 8.2+/extensions, MySQL/MariaDB version, account/domain/docroot, HTTPS and
execution limits remain UNKNOWN. Composer's dependency resolution targets PHP 8.2,
but runtime tests used PHP 8.5/MariaDB 12, not the owner's hosting environment.
No public deploy, DNS change, database import or paid image request was performed.

The React game still uses Supabase. PHP endpoints currently cover identity, catalogue
and practice only. Daily/ranked/friend competition, history, profile edits/deletion,
parent-child linking, staff authoring and avatar workers must be ported before cutover.
The config's image-provider fields document future worker secrets; no avatar worker
is implemented by this package. Frontend account sign-in does not call the new API
or link game history yet. Rate-limit identifiers are HMACs, not stored raw addresses;
shared networks share a quota. These facts prevent a production-readiness claim.

Next: owner fills private config using backend/README.md, confirms dedicated dev
hosting targets, then approves that deployment. Follow the staged migration guide
and retain the existing backend until the replacement passes equivalent tests.
