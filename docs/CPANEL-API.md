> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

# Clerk and cPanel API evidence, 15 October 2026

> Historical record. Supabase was removed from the code on 16 October 2026 (see
> docs/08-change-management/DECISIONS.md). Current architecture:
> docs/02-architecture/ARCHITECTURE.md.

Overall: PARTIAL migration. The PHP foundation and a separate practice preview are
publicly available at https://doyouknow.space/ through Cloudflare.
Public DNS, HTTPS and the practice flow PASS on 16 October 2026. Existing Supabase
game routes have not been cut over.

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

## Hosted development origin checks

PASS: 45 HTTP/TLS checks against the dedicated cPanel origin, including health,
private-path/source-map denial, own-profile bearer forwarding, origin/CORS checks,
two published quizzes played through server results, hidden answer fields, invalid
Clerk-token denial, guest revocation and subsequent rejection. TLS uses the official
Cloudflare Origin CA with hostname verification, not an insecure certificate bypass.
The test harness initially expected 201/204 where the API contract returns 200;
expectations were corrected. No application behaviour was changed to suit tests.

PASS: Chromium origin preview at 375x812, 812x375 and 1440x900, without horizontal
overflow. A real quiz reaches its server result and the adult gate opens the hosted
Clerk sign-in modal without page errors. No account created or sign-in completed.
Browser origin verification pins the already-verified certificate's public key and
maps only this hostname to its origin IP. CF-RAY is injected only on origin requests;
an initial harness sent it to Clerk too, triggering CORS. That harness was corrected.
Service workers were blocked during this origin-only browser check because their
requests lack the simulated Cloudflare header. Public service-worker behaviour is
NOT TESTED. Raw PASS output and modal screenshot are under qa/evidence/cpanel/.

The staged preview build disables Sentry/PostHog configuration and sets noindex
headers/robots. This does not change normal builds or claim offline readiness.

## Limits and next action

PASS: cPanel SSH account devgeereact, dedicated docroot
/home/devgeereact/doyouknow.space, PHP 8.4.26, MariaDB
11.4.13-MariaDB-cll-lve, PDO MySQL, cURL and OpenSSL verified. No Node runtime.
Private backend release: /home/devgeereact/do-you-know-private/releases/0d3ef1a.
Private runtime/migration configs: /home/devgeereact/do-you-know-private/shared/.
Database devgeereact_dyk_dev uses separate runtime DML and migration DDL users.
Both numbered migrations applied. Two published quizzes, two categories and two
immutable version snapshots imported, without users, sessions or passwords.
Clerk public PEM configured from the selected development instance's public JWKS.
Rotate that pinned public key when Clerk rotates signing keys.

PASS: wildcard Cloudflare Origin certificate installed on this subdomain. Direct
origin TLS verified against Cloudflare's official Origin CA root and hostname.
Origin checks supply a test CF-RAY header to satisfy the existing hosting guard.
This does not verify public Cloudflare routing or offer cryptographic origin access
control. AutoSSL is unavailable on the account; no zone SSL settings were changed.

The new docroot received a static bundle, API entrypoint and Apache settings only.
No mirror deletion. Existing cgi-bin preserved; shared public_html untouched.
Private pre-deployment backup:
/home/devgeereact/private_backups/doyouknow/before-preview-20261015.tar.gz.
LiteSpeed required explicit forbidden-path rewrites before SPA/API fallbacks;
FilesMatch alone did not deny absent private-looking URLs on this host.

PASS, 16 October 2026: the DNS blocker is resolved. The authenticated Cloudflare
MCP confirmed the active soulrefresh.net zone and no existing exact-name record.
Created one proxied A record, automatic TTL, pointing to 185.61.152.45. Existing
Full (strict) TLS was read and preserved. No unrelated records/settings changed.
Record ID: bff968754a7dd7a867aba46adce06864.

PASS: 44 HTTP/database checks through public Cloudflare HTTPS with normal system
certificate and hostname validation. Includes both practice quizzes through server
results, answer secrecy, CORS, ownership, invalid Clerk-token rejection and guest
revocation. API cache control remains no-store and Cloudflare reports DYNAMIC.

PASS: public Chromium checks at 375x812, 812x375 and 1440x900, a quiz through its
result, hosted Clerk modal, no page errors, service-worker registration and repeat
root navigation under an active service worker. No IP mapping, certificate bypass
or simulated Cloudflare header used in these public checks. Completed account
sign-in and offline play remain NOT TESTED.

The first public browser check caught service-worker navigation bypassing the
server's root redirect. VITE_CPANEL_PREVIEW=true now redirects / to /preview in
React too; its default is false for normal builds. Public headers also exposed an
immutable service-worker response. Critical-file headers now override generic JS
caching, set no-store and expired Expires. Targeted Cloudflare purges affected only
this site's root, index.html, sw.js and manifest. Public sw.js now reports BYPASS
and no-store. Typecheck, lint and preview packaging PASS after the route change.

Public output and screenshot: qa/evidence/cpanel/public-*. DNS rollback removes
only the created record from the confirmed zone. The private pre-fix own-docroot
backup is /home/devgeereact/private_backups/doyouknow/before-dns-root-fix-20261016.tar.gz.
Shared public_html remains untouched.

The React game still uses Supabase. PHP endpoints currently cover identity, catalogue
and practice only. Daily/ranked/friend competition, history, profile edits/deletion,
parent-child linking, staff authoring and avatar workers must be ported before cutover.
The config's image-provider fields document future worker secrets; no avatar worker
is implemented by this package. Frontend account sign-in does not call the new API
or link game history yet. Rate-limit identifiers are HMACs, not stored raw addresses;
shared networks share a quota. These facts prevent a production-readiness claim.

Next: complete an owner-driven adult sign-in test, then continue the remaining
backend migration stages. Retain the existing backend until replacement features
pass equivalent tests. No paid image request was made.
