# Testing

**Analysis Date:** 2026-11-07 (inventory by reading titles; nothing was run in this import)

## Inventory

- **Unit (Vitest):** 22 files, about 187 tests by static count (`EVIDENCE-STATUS.md` says 190 on 2 Nov). Covers `api`, `importParser`, `prerender`, `useQuizAttempt`, `ResultsView`, `useProfile`, `adminValidation`, `aiReview`, `avatars` (parses `Player.php`), i18n catalogue, `layoutReserve`.
- **E2E (Playwright):** 6 specs, 23 tests on mobile and desktop (46 results): browse, play, ranked (nickname once), daily, challenge, privacy. Opt-in in CI (`workflow_dispatch` with `full_backend`).
- **Backend (PHP, MariaDB 11.4):** 13 suites: unit, integration, competition, daily, concurrency, feeds, content, cleanup, seo, admin, feedback, cms, generator. `guard.php` and `http.php` are harness files.
- **Other:** `tests/unit/guard.test.py` (4 tests), `scripts/cron-ensure.test.sh`.

## Gates

`pnpm check` (lint, format check, typecheck, unit tests, build). CI `verify.yml`: frontend job, backend job, rebrand/guard check, gitleaks. `deploy.yml` release checks: lint, typecheck, unit tests only.

## Gaps

- No e2e for Studio (only a gitignored local script), contact/feedback, `/me` messages, overall leaderboard, info pages, offline banner, install/update prompts, prerender output, or live Clerk sign-in.
- Most services, `SessionContext`, most admin screens and game components other than `ResultsView` have no unit tests.
- `POST /account/session` success path untested over HTTP; `GeneratorLive` untested by design (fixtures only); `Feedback::reply` with `mail_from` untested.
- No assertions for 405, 415, `invalid_json` or `https_required`.
- No automated accessibility test; Lighthouse, PSI and CrUX NOT TESTED; an intermittent e2e 503 is unexplained (`docs/AUDIT.md`, 1 Nov).
- No regression test for the 7 Nov content rewrite rules.
