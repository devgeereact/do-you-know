# Proposed Clerk and cPanel migration

Status: APPROVED by the owner on 15 October 2026. Implementation is staged.
The PHP foundation package is now under backend/; current evidence is
qa/CPANEL-API.md. It is not a full frontend/backend cutover.
Prepared 15 October 2026. This guide describes work to implement, not a deployed backend.

## Target and scope

Keep the React/Vite PWA as static dist/ output. Add a separate PHP API on cPanel,
using MySQL/MariaDB for application data, Clerk for parent and staff accounts,
OpenRouter for avatar generation, and ImageKit for image delivery. Both computers
will call the same HTTPS development API. Neither computer needs direct remote
MySQL access. Each computer still needs its own initial public app configuration.
Secrets stay on cPanel and in the owner's Clerk account, not in GitHub.

Selected Clerk application: app_3KkAGkEUg8ST1ts6ydvb9DWKhI9.
No accountless application may be created and no alternative application selected.

The current project contract mandates Supabase access, RLS and SQL grading.
Approval of this plan must explicitly approve their replacement with PHP server
checks and equivalent tests. Update AGENTS.md, RULES.md, architecture, data model,
hook contracts and deployment documentation before implementing that replacement.
Do not weaken the existing answer secrecy, server timing or child privacy rules.
No new top-level backend folder until the architecture explicitly assigns it.

## Current authentication evidence

Inspected package.json, AuthContext, ProtectedRoute, LoginPage, useGuestSession,
App routes, service calls and aggregate local auth records. No environment files read.

- At initial inspection, @supabase/supabase-js was installed and no Clerk SDK was present.
  The first implementation slice now adds @clerk/react 6.17.8 (registry latest).
- Supabase persists and refreshes sessions. Anonymous users get a session on play.
- Login uses Google or email links; guests upgrade without losing progress.
- /dashboard is session-gated; this is not a staff-authorisation check.
- /me, /me/avatar and game routes depend on guest/profile ownership in backend calls.
- Local auth has three anonymous users and one non-anonymous user.
- Local identity-provider rows: zero. Non-empty password hashes: zero.
- These counts do not establish whether the non-anonymous record is a real person,
  or whether it should be imported. Owner must identify approved adult accounts.
- Existing database has migrations 0001 to 0007 applied, per earlier local check.

## Authentication migration plan for approval

1. Keep internal profile UUIDs stable. Add a separate identity mapping from provider
   and provider subject (Clerk user ID) to internal profile UUID. Enforce uniqueness.
   All attempts, streaks, avatars and permissions keep referring to internal IDs.
2. Keep guests outside Clerk. PHP creates expiring, unguessable guest sessions;
   store token hashes server-side, rotate tokens and enforce ownership on every call.
   For localhost-to-remote development, use an explicit guest bearer-token protocol
   with a documented client storage/expiry policy, rather than assuming third-party
   cookies work. Do not put guest tokens in URLs or logs. Production cookie use
   requires HttpOnly, Secure, SameSite and CSRF controls appropriate to its topology.
3. Clerk initially handles adult parent and staff identities. Child profiles keep
   generated nicknames and traits, without email, real name, photo or birthdate.
   Do not import children into Clerk. Its under-16 personal-data conditions need
   a verified parental-consent design before any expansion to child accounts.
4. Import only owner-approved adult records through Clerk's Backend API after a
   dry-run inventory. Set external_id to the original profile UUID and save the
   returned Clerk ID in the mapping. Keep import idempotent. Import no password
   digests from the inspected local database because none are present. If a later
   inventory finds passwords, verify Clerk support for the exact hash format before
   import; never hash an existing hash again. Unsupported hashes require a separately
   approved password-reset or migration flow. No bulk user creation is authorised yet.
5. Reconfigure Google in the chosen Clerk application with the correct development
   and production redirect URIs and, where available, the existing OAuth credentials.
   Existing Supabase sessions and provider tokens do not automatically transfer.
   Require fresh Clerk sign-in; map accounts only through verified identity and
   proof of ownership. Never merge on browser-supplied email or UUID alone.
   The local provider inventory currently contains no OAuth identities to transfer.
6. PHP verifies Clerk token signature, expected issuer, expiry/not-before and allowed
   frontend origins/authorised parties using the official SDK or a maintained JWT
   library. Extract the verified subject; fetch application permissions from MySQL.
   Never trust a submitted user ID, client role, or a visible sign-in button as proof.
7. Preserve progress by linking a valid guest session to a verified adult identity
   in a transaction. For parent-owned child profiles, model the relationship explicitly;
   do not merge the child's profile into the adult's profile. Conflicting existing
   ownership must be resolved safely, never silently overwritten.
8. Cut over /login and adult controls only when the API can accept Clerk tokens.
   Replace route guards by purpose: public catalogue, guest-owned game/profile,
   signed-in adult account, staff-only CMS. Guest sessions must never satisfy staff
   access. Keep age rules in the API even if UI controls are hidden.
9. Keep Supabase and PHP backends separate during rollout. Use an explicit frontend
   backend switch and one authoritative writer per cohort. Do not send Clerk tokens
   directly to the existing Supabase RPCs or pretend Clerk users are Supabase users.
10. Before cutover, verify sign-in/out, reload, expiry, user separation, guest progress
    linking, deletion, staff denial and OAuth/email continuity. On failure, return the
    test cohort to the previous frontend/backend pair. Do not remove Supabase packages,
    migrations or data until the replacement has passed all acceptance checks.

Approved scope: install Clerk against the selected application, preserve guest
play, use adult-only Clerk accounts initially, and implement the staged PHP/MySQL
replacement above. External imports, deployment, production DNS and data deletion
remain separate approval points.

## Clerk setup steps after plan approval

1. In the owner's host terminal, authenticate the CLI to the existing application:

   ```sh
   npx -y clerk@latest auth login
   ```

   Dashboard sign-in does not establish CLI sign-in. Do not paste API secrets into chat.
2. The React SDK and isolated provider are now installed. Follow Clerk's existing-
   integration branch: do not run init again or create another application. After
   the owner signs in, link only to the selected existing application and pull its
   development keys through the CLI (do not print file contents):

   ```sh
   npx -y clerk@latest link --app app_3KkAGkEUg8ST1ts6ydvb9DWKhI9
   npx -y clerk@latest env pull
   ```

   The initial CLI preflight reported auth_required before any application was
   targeted. Local SDK installation and provider scaffolding proceeded while the
   owner login was pending. No keys were written by the agent and no app created.
3. Use the current React SDK (@clerk/react), provider and visible adult sign-in,
   sign-up and user controls in the existing layout. Node must be at least 20.9.
   Restrict Vite exposure to the Clerk publishable key; the secret key is server-only.
   Review CLI changes against the approved coexistence plan before accepting them.
4. Run Clerk doctor, typecheck, lint and build. Start or reuse the app on port 5202.
   Check the adult controls, guest flow and protected routes in a browser. The owner
   creates the first test account in the existing application; do not create one
   automatically. Confirm a profile icon after sign-in and sign-out behaviour.

## cPanel migration procedure

### 1. Confirm hosting and destinations

Owner supplies non-sensitive facts: development subdomain, dedicated app docroot,
PHP version, MySQL/MariaDB version, SSH/Terminal and Composer availability, and cron
limits. Confirm outbound HTTPS to Clerk, OpenRouter and ImageKit. Verify PHP cURL,
OpenSSL, JSON, mbstring and PDO MySQL support and the PHP SDK's actual requirements.
Do not assume server versions from the hosting plan description.

Create a dedicated development subdomain/docroot and enable HTTPS. Use Clerk's
existing development instance there. Confirm approved origins, redirect URLs and
CSP requirements. Keep localhost:5202 allowed only for development.

### 2. Create application database and private configuration

In cPanel's Database Wizard, create a dedicated development database and database
user, then grant rights only on that database. Names may have cPanel prefixes.
Use separate migration and runtime permissions where supported. Do not reuse the
sample DB files' database or another website's credentials without explicit approval.

Keep database credentials, Clerk backend credentials, OpenRouter and ImageKit
private keys outside every webroot in an owner-readable configuration file. Restrict
file permissions. Upload Composer vendor dependencies if Composer cannot run on-host.
Only the public API front controller belongs under the dedicated API web path;
application internals, workers, logs and configuration stay outside public paths.
The provided api.php/config.php files are examples, not deployable game endpoints.

### 3. Translate schema through versioned MySQL migrations

Preserve profile/content UUIDs and relational links. Translate PostgreSQL JSONB,
arrays, partial unique indexes, triggers, enums, timestamps and constraints explicitly.
Use InnoDB transactions, UTC storage and Europe/London day/week calculations with
DST tests. Frozen quiz snapshots must retain their answer keys on the server.

Port content, profiles, attempts/answers, leaderboard entries, daily/friend
challenges, avatars, settings, moderation/audit and rebuild data. Add identity
mappings, hashed guest sessions, job/outbox rows and a migration ledger.
Enforce live avatar trait uniqueness under concurrency, not just in PHP prechecks.
Do not feed a PostgreSQL dump directly into phpMyAdmin and expect compatibility.

### 4. Build a versioned PHP API

Implement /api/v1 equivalents of the existing service and RPC contracts:

| Area | Required operations |
| --- | --- |
| Catalogue | Published categories, tags, quizzes and quiz landing data |
| Guest/identity | Create/refresh guest session, verified adult identity, safe linking |
| Gameplay | Start/resume, next question, answer, finish and authorised review |
| Competition | Boards, daily/streak, create/read/play friend challenge |
| Profiles | Own profile/history, age band once, nickname rules, deletion |
| Avatars | Options, request, own status, activate ready avatar |
| Staff/CMS | Roles, draft editing/import, publish validation and frozen versions |

Use prepared statements, validated payloads, bounded reads, rate limits and stable
error codes. Apply explicit record ownership and staff checks to every endpoint,
replacing RLS without weakening it. Return no answer fields until the answer has
been submitted. Calculate all scores, times and ranks on the server.

Use transactions/row locks for attempt creation, answer submission, finishing,
limits and job claims. Replay and parallel requests must be safe. Configure CORS
for exact development origins, required headers (including Authorization) and
preflight. CORS does not provide authentication. Return JSON API errors for unknown
API routes; do not let the SPA fallback turn API errors into HTML responses.

### 5. Prove a complete gameplay slice first

Create a guest session, read published quiz information, start an attempt, answer
server-side and save a result. Verify resume, timer expiry, duplicate submissions,
parallel starts, user separation and answer secrecy before porting other features.
Adapt the existing 68 behaviour checks to HTTP/PHP/MySQL; passing the old PostgreSQL
checks alone does not establish that the new backend works.

### 6. Move avatar and scheduled work

Use durable queued jobs with atomic claims, retry limits, leases and idempotency.
A PHP CLI worker processes avatar jobs and the existing moderation/upload sequence.
Select google/gemini-3.1-flash-image; keep keys on the server. Polling must tolerate
queue delay and stop when hidden. Measure host execution limits before selecting
job batch sizes. Cron frequency must comply with the hosting account's policy.
A PHP worker is a proposed replacement for the current Supabase/Inngest function,
not something the supplied files already implement.

Port the daily activation, scheduled publishing, rebuild debounce and cleanup jobs.
Use CLI commands outside the webroot rather than public unauthenticated worker URLs.
If hosting limits cannot support measured avatar latency, retain a managed worker
or move the job runner to a suitable host; do not run generation in the browser.

### 7. Migrate data and verify ownership

Take a consistent local snapshot into a private location outside webroots. Do not
commit database dumps or copy env files to the other computer. Export only approved
application data using a versioned converter and import in dependency order.
Check row counts, foreign keys, snapshots, result totals and mappings. Classify
local fixtures before import; do not assume all four local accounts are real users.
During a live cutover, freeze writes or implement an approved delta strategy to
avoid losing attempts. This project currently uses a local development backend.

### 8. Deploy a development release

Build the frontend locally/CI, run typecheck and lint, and upload dist/ without
public source maps into this app's dedicated docroot. Deploy PHP separately with
private configuration and dependencies. Merge API handling into the existing
.htaccess; do not overwrite the security/cache rules with the sample SPA file.
Never mirror-delete a shared docroot or the API/private runtime directories.

Configure a public API base URL and Clerk publishable key on each development
computer. Both use the same backend; code moves through GitHub, secrets do not.
Each machine obtains its own authorised setup rather than copying env/session files.

### 9. Acceptance, cutover and rollback

Check guest and adult flows, token rejection, cross-user denial, staff restrictions,
server grading/timing, all competition flows, moderation, avatar activation and
account deletion. Verify child-safe public payloads, mobile/desktop portrait and
landscape, PWA install/update/offline behaviour and API cache policy. Do not cache
private API/session responses. Test denied CORS origins and failed/expired jobs.

Before any production change, approve the exact domain/docroot, database, Clerk
production instance and rollback window. Keep verified frontend/PHP artefacts and
private database backups. Switch one test cohort first and monitor errors.

Rollback the matching frontend/API pair together. If the new database accepted
writes, preserve/reconcile those writes before reverting; restoring an old backup
alone would lose new results. Never delete the Supabase database as a rollback step.
After sign-off, retire old services in a separate reviewed change and record evidence.

## Verification and outstanding inputs

PASS: local auth aggregate inventory and source inspection. Node 26.8.1 meets the
minimum version. Git working tree was clean and current at inspection.
NOT TESTED: cPanel account capabilities, Clerk application access, PHP authentication,
MySQL compatibility, user import, new guest sessions and deployed game/avatar jobs.
No environment files were inspected and no auth users or application data changed.

Owner inputs: authenticate Clerk CLI in the host terminal;
provide intended development domain/docroot and hosting capability information.
No passwords or private keys are needed in chat.

## Official references

- [Clerk migration strategies](https://clerk.com/docs/guides/development/migrating/overview)
- [Clerk CLI](https://clerk.com/docs/cli)
- [Clerk PHP SDK](https://github.com/clerk/clerk-sdk-php)
- [Clerk session verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification)
- [Clerk child-data terms](https://clerk.com/legal/standard-terms)
- [cPanel database setup](https://www.namecheap.com/support/knowledgebase/article.aspx/9363/2180/how-to-create-and-maintain-databases-in-cpanel/)
- [cPanel tools and cron](https://www.namecheap.com/support/knowledgebase/article.aspx/9797/2219/cpanel-control-panel-overview/)
