> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

# Avatar configuration check, 15 October 2026

> Historical record. Supabase was removed from the code on 16 October 2026 (see
> docs/08-change-management/DECISIONS.md). Current architecture:
> docs/02-architecture/ARCHITECTURE.md.

Scope: select the requested avatar model, check supplied credentials without recording
values, and prevent private Vite settings from entering browser builds.

| Check | Status | Evidence |
| --- | --- | --- |
| OpenRouter key | PASS | Authenticated GET /api/v1/key returned 200. |
| Requested model | PASS | Live /api/v1/models lists google/gemini-3.1-flash-image with image output. |
| ImageKit private key | PASS | Authenticated file-list GET returned 200; no upload performed. |
| Supabase browser configuration | BLOCKED | URL and anon key remain example placeholders. No matching project is linked. |
| ImageKit browser configuration | BLOCKED | Endpoint and public key remain example placeholders. |
| Inngest event key | NOT TESTED | Present; no event sent because it can trigger external work. |
| Inngest signing key | PARTIAL | Expected signing-key format; no signed callback exercised. |
| Sentry upload token | PARTIAL | Organisation-list check returned 403; scope or validity unresolved. DSN is empty. |
| Browser secret isolation | PASS | Private VITE_* entries moved to ignored server env; Sentry token kept unprefixed as build-only. Production JS and source maps scanned against supplied private values, zero matches. Vite public prefixes restricted. |
| Typecheck, lint, build | PASS | npm run typecheck, npm run lint, npm run build. |
| Edge Function typecheck | PASS | deno check --node-modules-dir=auto --no-lock supabase/functions/inngest/index.ts. |
| Prompt tests | PASS | Four tests passed. |
| Migration/game checks | PASS | 68/68 via supabase/tests/run_tests.sh on isolated PostgreSQL 17, local port 55439. Includes model selection and preservation of the safety model. |
| Full avatar generation | BLOCKED | Real Supabase configuration and deployed function/secrets are not established. No paid image request or upload performed. |

Migration 0008 changes only the configured image model. Existing applied migrations
remain intact; the configured text/safety model is preserved. Requests prefer the
lowest-priced provider for the selected model. This does not claim it is the cheapest
image model overall.

The first database test attempt against a scratch database in the running Supabase
container failed because pg_cron is restricted to its configured database and the
default Python lacked psycopg. The successful run used an isolated vanilla PostgreSQL
17 container and the available test virtual environment. No application database was
changed.

Next: fill the public configuration, confirm the intended Supabase account/project,
install server secrets and migration 0008 with deployment approval, deploy/sync Inngest,
then verify a real request through generation, moderation, upload and activation.

Provider references: [OpenRouter model](https://openrouter.ai/google/gemini-3.1-flash-image)
and [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).
