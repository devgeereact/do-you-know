# Production cutover

Status: IN PROGRESS, 16 October 2026. Release decision: NO-GO for full production.
Owner requested full merge/build using Clerk and cPanel, with both computers able
to work against shared data. The existing public practice preview stays available.

## Shared access

Both computers use https://doyouknow.soulrefresh.net/api/v1 over HTTPS. Neither
needs direct MySQL access or a copy of the server's database password. The existing
development API permits localhost:5202 and 127.0.0.1:5202. Each checkout needs its
own public configuration, source travels through GitHub only. Opening the hosted
preview works without a local checkout. Guest identities remain browser-specific;
shared player history requires verified account/profile linking, which is pending.
Production data must not be used by disposable tests or development fixtures.

## Merge decision required

PR #1: feat/milestone-1-play to main.
PR #2: feat/milestone-2-compete to feat/milestone-1-play.
PR #3: feat/m2-avatars to feat/m2-compete.
PR #4: feat/clerk-cpanel-migration to feat/m2-avatars.

The differently named milestone and m1/m2 branches have diverged. They are not
aliases for the same commits. There are parallel UI/service implementations and
Supabase migration numbers 0005 to 0007 overlap with different meanings. Applied
migrations must not be edited or renumbered blindly. Resolve canonical UI/contracts
with the owner, reconcile schema changes in new migrations and verify before
retargeting/merging the PR chain. Keep every branch until its changes are accounted for.
No PR has been merged for this production transition yet.

## Required work

1. Resolve the merge-base decision, preserve verified fixes and run checks against
   the resulting integration branch. No force pushes. Keep the main branch deploy
   separate from an incomplete development preview.
2. Port remaining catalogue/filter metadata, profiles/settings/deletion, history,
   ranked/daily/friend competition and avatar jobs to PHP/MySQL with equivalent
   ownership, privacy, concurrency and grading tests. Preserve server authority.
3. Integrate verified Clerk adult sessions with PHP, guest linking and sign-out.
   Configure the existing Clerk application's production instance/domain and OAuth
   settings. Complete a real adult sign-in test; do not create users automatically.
   Keep children outside Clerk unless an approved consent design permits otherwise.
4. Prepare a separate production configuration and controlled data migration. Import
   only approved records. Keep backups private and existing data intact.
5. Configure the GitHub deployment workflow using a dedicated restricted identity,
   verified host key, protected secrets, persistent server configuration, controlled
   migrations, release rollback and post-deployment HTTPS checks. No credentials
   copied between development computers. Actual automatic deployment must be exercised.
6. Verify complete user journeys on the hosted candidate and both computers. Exercise
   denied access, child privacy, answer secrecy, concurrent grading, offline/PWA
   updates, account deletion and real avatar output before a production release.

## Current checks

The new Verify application workflow runs on PRs and feature/main pushes. Frontend:
Node 24, npm ci, typecheck, lint and static build. Backend: PHP 8.2 and host-matching
8.4, MariaDB 11.4, locked Composer dependencies, unit checks, migrations twice and
HTTP/database ownership/grading tests. It uses a disposable database ending _test,
no cPanel credentials and no deployment step. This is CI, not automatic deployment.
GitHub-hosted results must be recorded after the first run.

## Rollback and release gate

Retain the current preview, private cPanel configuration and the existing backup
paths recorded in CPANEL-MIGRATION.md. Do not drop databases or overwrite applied
migrations. Production deployment requires a candidate-specific rollback, a verified
backup/restore procedure and passing post-change checks. Roll back on broken sign-in,
incorrect ownership/grading, lost data or failed smoke checks. Release remains NO-GO
until evidence supports the complete feature set and the merge decision is resolved.
