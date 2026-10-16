# Clerk setup evidence, 15 October 2026

> Historical record. Supabase was removed from the code on 16 October 2026 (see
> docs/08-change-management/DECISIONS.md). Current architecture:
> docs/02-architecture/ARCHITECTURE.md.

Historical first-slice record. Follow-up verification now passes CLI login, link,
keys and live sign-in-dialog checks; see `qa/CPANEL-API.md` for the current evidence.

Overall status: PARTIAL. SDK and adult flow are implemented. Existing application
linking and live sign-in are BLOCKED by the owner's Clerk CLI login.

- PASS: installed @clerk/react 6.17.8, npm registry latest at verification time.
  Node engine raised to >=20.9.0 to match the installed SDK.
- PASS: Clerk skills installed globally (clerk, clerk-cli, clerk-react-patterns,
  clerk-setup). The installer reported unsupported PromptScript global integration;
  the four canonical skill directories were installed successfully.
- PASS: /account lazy-loads the adult account page. Missing configuration shows a
  friendly unavailable state. With a key configured, adult confirmation mounts
  ClerkProvider, sign-in, sign-up and account controls. Loaded/session guards exist.
- PASS: browser checks at 320px, 375px and 1440px show the page title and missing-key
  state, no horizontal overflow and no page errors. Home navigation works.
- PASS: no Clerk network requests during the missing-key browser check.
- PASS: npm run typecheck, npm run lint, npm run build.
- PASS: production build with a synthetic VITE_CLERK_SECRET_KEY sentinel exposes
  no sentinel value in emitted JS, source maps or HTML. Only the public Clerk key
  prefix was added to Vite. No real credential values inspected.
- BLOCKED: clerk whoami returns auth_required. clerk doctor confirms host state is
  writable but login, project link and keys are absent. Application is fixed to
  app_3KkAGkEUg8ST1ts6ydvb9DWKhI9. No accountless application created.
- NOT TESTED: live Clerk sign-in/sign-up/profile/sign-out, adult gate with real key,
  application reachability, token verification against a PHP API and cross-device
  persistence. No test users created in the existing Clerk application.
- NOT TESTED: cPanel runtime, MySQL schema, migrated user records and jobs.
- PARTIAL: npm audit reports 14 unresolved findings (4 moderate, 10 high), involving
  routing/build-tool dependencies. No automatic broad dependency upgrade performed.

Existing Supabase guest/game provider and /login, /dashboard access remain on their
previous backend. Clerk account identity does not grant staff rights or link game
history. The browser still attempts the existing placeholder Supabase origin in this
configuration; local database configuration has not been changed by this slice.
A passing account page check is not evidence of a working game against that origin.

Next: owner runs npx -y clerk@latest auth login in the host terminal. Since the SDK
and provider now exist, skip init; link the selected application, pull its development
keys without printing them, then verify doctor and real auth controls. Proceed with
the approved PHP/MySQL migration guide in docs/07-operations/CPANEL-MIGRATION.md.
