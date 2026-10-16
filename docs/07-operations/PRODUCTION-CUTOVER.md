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

## Canonical merge decision

PR #1: feat/milestone-1-play to main.
PR #2: feat/milestone-2-compete to feat/milestone-1-play.
PR #3: feat/m2-avatars to feat/m2-compete.
PR #4: feat/clerk-cpanel-migration to feat/m2-avatars.

Owner chose option 1 on 16 October: the current avatar/Clerk/cPanel implementation
is canonical. Retarget PR #4 to main rather than blindly merging the alternative
milestone implementation. Keep every alternate branch as history. Its useful fixes
must be assessed against the canonical contracts and added individually with tests.

- PR #3 avatar commits are already ancestors of the current branch.
- PR #1/#2 milestone interfaces are alternatives, not missing app features to merge
  verbatim. Their server-based question deadline and recovery improvements are useful
  references for the PHP port. Optional fresh practice must not affect ranked fairness.
- Their overlapping Supabase migration numbers will not be imported or renumbered.
  Existing applied Supabase files stay immutable. PHP uses its own migration ledger.
- A main merge consolidates the verified development code. It does not cut over
  the incomplete app to production or trigger a deployment workflow.

## Required work

1. Apply the canonical merge decision, preserve verified fixes and run checks against
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
PASS: GitHub-hosted run 38860929591 at commit d83190d completed successfully:
frontend and backend jobs for both PHP versions passed. Each backend job ran 14
unit and 43 isolated HTTP/database checks. Link:
https://github.com/devgeereact/do-you-know/actions/runs/38860929591.
The first workflow attempt was rejected before jobs started because runner.temp
was used outside its allowed context; configuration is now created at step runtime.
This check does not test the owner's physical Ubuntu checkout or full production
features. No cPanel/database deployment occurred in this CI batch.

## Rollback and release gate

Retain the current preview, private cPanel configuration and the existing backup
paths recorded in CPANEL-MIGRATION.md. Do not drop databases or overwrite applied
migrations. Production deployment requires a candidate-specific rollback, a verified
backup/restore procedure and passing post-change checks. Roll back on broken sign-in,
incorrect ownership/grading, lost data or failed smoke checks. Release remains NO-GO
until evidence supports the complete feature set. The canonical merge decision is resolved.
