# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-10-31 · Rebrand, Studio and feedback release review (accessibility, security, privacy)

Reviewer: Claude Code for the owner. Scope: the Pop & Ink redesign, the Studio CMS, the overall leaderboard and contact/feedback, before the 31 October release.

**Accessibility**
- Colour contrast computed from the token values (WCAG formula): white on grape 5.3:1, ink on tangerine 7.4:1, ink on lemon 12.1:1, ink on mist 16.0:1, muted on white 6.8:1, white on correct 5.4:1, white on wrong 5.4:1; dark theme ink-dark on primary 6.2:1, muted on surface 7.8:1. White on tangerine (2.3:1) is never used: the play button uses ink text. PASS.
- Right and wrong answers always show an icon and words as well as colour; the explanation sheet keeps its auto-advance pause ("Stay here"). PASS (e2e play specs).
- Studio: nav is a labelled `nav`, the ⌘K palette is a modal dialog with a combobox and listbox (arrow keys, Enter, Escape), the confirm dialog traps focus. Unit-tested open/close. PASS.
- Not done: a screen-reader pass with VoiceOver on the new pages. OPEN.

**Security**
- Every `/admin/*` route goes through `Admin::guard` (Clerk subject in the private allowlist); guests and players get 403 (`backend/tests/admin.php`, 12 checks). PASS.
- Answers still never reach the browser before answering; the only new field on a public question is the cosmetic `scene` key (e2e leak check updated to allow it and nothing else). PASS.
- Feedback: rate limited (10 an hour per player); free text and email refused for children and unknown ages on the server, not just in the form (`backend/tests/feedback.php`). PASS.
- Studio content writes validate on the server (`Content::validateQuestion`, https sources, no duplicate prompts) and are logged in `admin_audit`. PASS (`backend/tests/cms.php`, 121 checks).
- Fixed in this review: `JSON_VALUE(... '$.review')` returns `1` on MariaDB 11.4, so live quizzes with edits waiting were hidden from "To check"; regression check added.
- Sourced generator makes no outbound calls; no Bright Data or Anthropic key exists in any config. PASS.

**Privacy**
- No new personal data for children. Adults may leave an email only with a message; it is stored in `feedback.email` and never shown publicly. PASS.
- Fixed in this review: "Delete my data" left a grown-up's feedback message and email behind (the row only lost its `profile_id`). `Player::delete` now wipes message, email and question prompt first; regression check in `backend/tests/feedback.php`; privacy notice updated (31 October 2026).
- Public surfaces still show nickname, preset character and score only. PASS.

## 2026-10-25 · Accessibility Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## Accessibility Audit

### Automated evidence

Run `./scripts/project accessibility` after `build`. The authoritative automated result is `.agent/evidence/accessibility.json`; detailed records are linked from it. This gate performs production-browser axe scans for the configured WCAG 2.2 AA tags and serious/critical threshold. This covers only automatically testable rules and configured routes/states, not complete WCAG compliance.

Automation never changes the manual audit table or `.agent/FOUNDRY.yml` `accessibility_manual` status. Audit timestamps and source fingerprints must match the version being released.

### Manual assurance

| Area | Method | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|
| Keyboard and focus | Manual | Complete operability and visible focus | `NOT TESTED` | NOT TESTED | `UNKNOWN` |

Include semantics, labels, headings, landmarks, contrast, zoom, touch targets, error identification, announcements, alternative text, reduced motion and representative assistive-technology checks.

## 2026-10-25 · Avatar Configuration Check

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## Avatar configuration check, 15 October 2026

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

## 2026-10-25 · Functional Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## Functional Audit

> Historical record. Supabase was removed from the code on 16 October 2026 (see
> docs/08-change-management/DECISIONS.md). Current architecture:
> docs/02-architecture/ARCHITECTURE.md.

| Requirement or journey | Environment | Test | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|---|
| M1 browse: home lists categories and published quizzes | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Open `/` | Categories + 2 seeded quizzes | Shown | PASS | snapshot in session log |
| M1 guest play: no sign-up | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Open `/play/amazing-animals` with empty storage | Anonymous session, question 1 shown | Guest user created, Q1 shown with focus on prompt | PASS | `qa/evidence/m1-play/feedback-portrait.png` |
| M1 choice/boolean feedback | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Pick right and wrong answers at 375px | Right/wrong by colour + icon + words, explanation, source link | As expected | PASS | `feedback-portrait.png`, `wrong-portrait.png` |
| M1 slider | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Keyboard ArrowRight then Lock it in | Value moves one step; server grades; answer + range shown | 13 → graded wrong, 20 (18–22) shown | PASS | `slider-portrait.png` |
| M1 refresh-safe resume | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Reload mid-quiz | Resume same attempt at next question | FAIL first run (two attempts from concurrent starts); PASS after migration 0005 | PASS | DB check: 1 in-progress attempt; resumed at Q2 |
| M1 timer | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Let a 15 s question run out | Server marks timed out; client shows Time's up | Answer sent 16.8 s after send; `timed_out=t`, `time_ms=15000` | PASS | `timeout-portrait.png` |
| M1 results + review | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Finish 5 questions | Server score and full review | 1/5 with every answer, explanation and source | PASS | `results-portrait.png` |
| M1 landscape | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | 812x375 mid-quiz | Two columns, no rotate prompt | Two columns; prompt card now sticky | PASS | `landscape.png` |
| M1 `/me` basics | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Open `/me` as guest | Streak, games played, recent games, save-progress prompt | As expected | PASS | `me-portrait.png` |
| M1 category age filter | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | `/c/maths`, tap 14+ | 7–11 quiz hidden | Hidden; empty state shown | PASS | snapshot in session log |
| M1 integrity: no answers before answering | Mac, local Supabase (CLI 2.116, Postgres 17) + `vite` dev, Chromium via Playwright | Call `start_attempt` as a guest | No is_correct / correct_value / accept_* / explanation in question | None present | PASS | SQL check in session log |
| Deep links in production build | Mac, production build (`vite build` + `vite preview`) against local Supabase, Chromium via Playwright | Load `/q/amazing-animals` directly | Page boots | FAIL first (base './' made assets resolve to /q/assets/...); PASS after `base: '/'` | PASS | console log in session |
| PWA installable on desktop | Mac, production build (`vite build` + `vite preview`) against local Supabase, Chromium via Playwright | 1440x900 Chromium, production build | SW registered at `/`, standalone manifest, install prompt fires | All three observed | PASS | `qa/evidence/m1-play/desktop-home.png` |
| Game layout on tablet portrait | Mac, production build (`vite build` + `vite preview`) against local Supabase, Chromium via Playwright | 820x1180 | Question above answers, larger type | As expected | PASS | `tablet-portrait.png` |
| Game layout on desktop | Mac, production build (`vite build` + `vite preview`) against local Supabase, Chromium via Playwright | 1440x900 | Two columns, wider container | As expected | PASS | `desktop.png` |
| Game layout on phone landscape | Mac, production build (`vite build` + `vite preview`) against local Supabase, Chromium via Playwright | 812x375 | Two columns; install banner never covers answers | Banner hidden on /play | PASS | `phone-landscape.png` |
| M2 age band asked once after a ranked game | Mac, local Supabase + `vite` dev, Chromium via Playwright | Fresh guest finishes ranked quiz (375px) | Age band choice; no own rank shown before naming | As expected (rank hidden after fix) | PASS | `qa/evidence/m2-compete/age-band-phone.png` |
| M2 under-13 nickname | Mac, local Supabase + `vite` dev, Chromium via Playwright | Choose Under 13, Shuffle, Use this name | Generated name only, no text box; appears on board as You | JollyKoala19 at #1 | PASS | `child-nickname-phone.png` |
| M2 13+ nickname | Mac, local Supabase + `vite` dev, Chromium via Playwright | Choose 18 or over, type `a!!b` then `QuizWhizz` | Server rejects invalid name with friendly copy; valid name saved | "Nicknames need 3–20 letters or numbers."; QuizWhizz at #2 | PASS | session log |
| M2 /leaderboards | Mac, local Supabase + `vite` dev, Chromium via Playwright | 1440x900, all-time board | Ranked rows: nickname, score, time; You highlighted | As expected | PASS | `leaderboards-desktop.png` |
| M2 delete account | Mac, local Supabase + `vite` dev, Chromium via Playwright | /me → Delete → Yes | Profile and board rows removed; session cleared; back to home | Rows gone, no auth token left | PASS | `me-delete-phone.png`; DB check |
| M2 home daily card | Mac, local Supabase + `vite` dev, Chromium via Playwright | 375px home | Today's challenge card above quizzes | Shown with Play | PASS | `qa/evidence/m2-compete/home-daily-card-phone.png` |
| M2 daily play + board | Mac, local Supabase + `vite` dev, Chromium via Playwright | /daily → Play, finish, pick name | Daily mode, no Play again, today's board with You | CosmicPanda59 #1 on today's board | PASS | `daily-results-board-phone.png` |
| M2 daily done + streak | Mac, local Supabase + `vite` dev, Chromium via Playwright | /daily after playing | Done for today; streak 1 | As expected | PASS | `daily-done-phone.png`, `daily-desktop.png` |
| M2 one daily play per day | Mac, local Supabase + `vite` dev, Chromium via Playwright | Open /daily/play again | Server refuses; friendly copy + board link | "You've played today's challenge…" | PASS | session snapshot |
| M2 leaderboard You badge | Mac, local Supabase + `vite` dev, Chromium via Playwright | 375px daily board | Nickname truncates, You badge stays visible | FAIL first (badge cut to "Y…"); fixed | PASS | code fix in LeaderboardTable |
| M2 create challenge link | Mac, local Supabase + `vite` dev, Chromium via Playwright | Finish ranked quiz, tap Challenge a friend | 8-char link; share sheet or copy fallback | Link /challenge/8ceMLoMa shown; link base fixed to page origin (was placeholder VITE_APP_URL) | PASS | session log |
| M2 challenge preview | Mac, local Supabase + `vite` dev, Chromium via Playwright | Fresh guest opens link (375px, 1440px) | Nickname + score only, Accept button | CosmicPanda59 scored 1/3 | PASS | `qa/evidence/m2-compete/challenge-preview-phone.png`, `challenge-preview-desktop.png` |
| M2 exact same questions | Mac, local Supabase + `vite` dev, Chromium via Playwright | Friend plays challenge | Same question order as creator | DB: question_order equal | PASS | SQL check in session log |
| M2 head to head | Mac, local Supabase + `vite` dev, Chromium via Playwright | Friend finishes | Server-decided winner, both scores; no Play again / re-challenge | CosmicPanda59 wins this time | PASS | `versus-phone.png` |
| M2 bad challenge code | Mac, local Supabase + `vite` dev, Chromium via Playwright | Open /challenge/NOPE1234 | Friendly not-found | As expected | PASS | session snapshot |
| M2 avatar options readable | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | get_avatar_options (0006) | Traits, limit, today's count; nothing else from site_config | DB tests 65/65 at the time | PASS | supabase/tests/test_game.py |
| M2 avatar needs age band | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | request_avatar with no age band (0007) | Refused with age_band_required | FAIL before 0007 (adult look allowed); PASS after, 66/66 | PASS | supabase/tests/test_game.py |
| M2 avatar builder layout | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | 375px and 1440px | Fits the screen; chip rows scroll on phones | FAIL first (page 2078px wide: sr-only radios escaped the scroll row); fixed | PASS | `qa/evidence/m2-compete/avatar-builder-phone.png`, `avatar-builder-desktop.png` |
| M2 kid avatar options | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | Under 13 → builder, 20× Surprise me | Only child/teen looks, no facial hair | As expected | PASS | session log |
| M2 avatar job pipeline (no paid keys) | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | Paint → event → Inngest dev → Edge Function | Claim pending→generating; stops at missing OPENROUTER_API_KEY; onFailure marks failed; UI shows kind failure | As expected | PARTIAL | `avatar-failed-phone.png`; real painting NOT TESTED (needs OpenRouter + ImageKit keys) |
| M2 use avatar | Mac, local Supabase + Edge runtime + Inngest dev server (Docker) + `vite` dev, Chromium | Ready avatar (stand-in image set by SQL) → Use this avatar | Avatar shows on /me | As expected | PASS | `me-with-avatar-phone.png` |

Cover loading, empty, success, validation, service failure, permission denial, session expiry and recovery. Test critical journeys end to end, not only isolated functions.

Recorded 2026-10-15 by Claude Code (owner: Gideon). Not yet tested: native share sheet on a real phone, real Supabase project, physical phone or tablet, Safari/iOS install, offline behaviour, dark mode in the game screens.

## 2026-10-25 · Security Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## Security Audit

### Automated evidence

Run `./scripts/project security` after `build`. The authoritative automated result is `.agent/evidence/security.json`; detailed records are linked from it. This gate performs a full locked dependency advisory audit and selected source/build checks. This is not a threat model, penetration test or proof of complete application security.

Automation never changes the manual audit table or `.agent/FOUNDRY.yml` `security_manual` status. Audit timestamps and source fingerprints must match the version being released.

### Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | `NOT TESTED` | Unknown | Critical until checked | `UNKNOWN` | `UNKNOWN` |

Cover authentication, authorisation, database policies, cross-user access, input handling, output encoding, injection, uploads, CSRF, CORS, rate limits, headers, cookies, dependencies, logging and production configuration as applicable.

## 2026-10-25 · Ux Navigation Audit

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## UX and navigation audit, 16 October 2026

Scope: live `doyouknow.space` (release `838335e`) and the codebase, after the
owner reported that the UI looked unstructured, with back and next navigation missing.
Method: three read-only code audits (routes and navigation; SEO, PWA and security config;
UI consistency and accessibility) and a live browser walk-through at 390, 820 and 1440 px.
Play was then tested on a local MariaDB copy with fixture quizzes, not on production,
because every live play creates a real guest.

### Fixed on branch `fix/navigation-structure`

| Pri | Problem                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                             | Verified                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1  | Home had no header, so Leaderboards was unreachable from it; Settings, 404 and quiz-not-found had no header either                                                                                                                                                      | `AppLayout` wraps every browse page with `SiteHeader`, `SiteFooter` and a phone `TabBar` (Quizzes, Today, Boards, Me)                                                                           | Local, 320 to 1440 px: every page has the shell and one h1 |
| P1  | No way up from a quiz to its category, from a category to all quizzes, or out of Settings                                                                                                                                                                               | Shared `BackLink`: quiz to its category, category to all quizzes, avatar, settings and account to My games                                                                                      | Local click-through                                        |
| P1  | Results ended in a dead end: no next quiz, review had no links, daily "Back to quiz" went to the quiz page                                                                                                                                                              | Results show "Next quiz" (same category first), "Play again" and a "What next?" block; the play header link reads "Back to quiz", "Today's challenge" or "Back to the challenge" after the game | Local practice game through to results                     |
| P1  | Settings page offered "Sign out" to guests, which forgets the guest token and with it every game on the device; its notifications toggle drives nothing                                                                                                                 | `/me/settings` now holds only the light or dark colour choice (the theme toggle existed but nothing used it). `/dashboard` redirects there                                                      | Local                                                      |
| P1  | Install banner covered answers on `/daily/play` and `/challenge/:code/play`, and came back on every page load                                                                                                                                                           | Hidden on every play path; "Not now" holds for 14 days; it sits above the tab bar                                                                                                               | Code and local                                             |
| P2  | Page titles went stale (Home, My games, Account, 404 kept the previous title); no canonical, robots or Open Graph tags                                                                                                                                                  | `useDocumentMeta` on every page: title, description, canonical, robots (`noindex` on personal and play pages), `og:*`. Static Open Graph and Twitter tags in `index.html`                       | Local: titles, canonical and robots read back per page     |
| P2  | `favicon.svg` was linked relatively, so deep links requested `/q/favicon.svg` and got a 404                                                                                                                                                                             | Absolute `/favicon.svg`                                                                                                                                                                         | Live console showed the 404; local console clean after     |
| P2  | `robots.txt` pointed at `doyouknow.space`; no sitemap; `/account` and `/daily/play` not disallowed                                                                                                                                                                    | robots fixed; `/sitemap.xml` is now generated by the API (fixed pages, active categories, published quizzes); category and quiz pages prerendered at build                                      | Backend `tests/seo.php`; `check:htaccess`                  |
| P2  | Quizzes without cover art showed a large empty "?" panel, so a phone showed one quiz per screen                                                                                                                                                                         | Compact row card when there is no cover                                                                                                                                                         | Local screenshot at 390 px                                 |
| P2  | Home hero filled 85% of the screen with a decorative teaser; two competing calls to action duplicated the daily banner; only 9 quizzes listed with no "see all"                                                                                                         | Shorter hero, teaser hidden under 640 px, one primary action, all quizzes listed                                                                                                                | Local                                                      |
| P2  | Silent states: quiz top players stuck on "Loading…" after an error; daily top 10 showed nothing while loading or on error; leaderboards ignored a catalogue error and had no message when no quiz is ranked; unknown category showed filters under "Category not found" | Loading and error text added; unknown category shows the not-found page                                                                                                                         | Code; local happy paths                                    |

### Open, needs a decision or more work

| Pri | Item                                                                              | Why it is not fixed here                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | ~~No privacy notice for a children's app (UK GDPR, Age Appropriate Design Code)~~ | Drafted 17 October 2026 (branch `feat/info-pages`): `/privacy` with a children's summary, written only from what the code does, plus `/terms`, `/about`, `/how-to-play` and `/contact`. Still needs owner and legal review before it is relied on, a real `VITE_CONTACT_EMAIL`, and a decision on deleting guest profiles whose token has expired |
| P1  | Content-Security-Policy not enforced                                              | Report-only header added 16 October 2026 (`docs/07-operations/DEPLOYMENT.md`). Enforce after a clean run of every journey, including Clerk sign-in                                                                                                                                                                                                |
| P2  | ~~Sentry session replay records every error session on a kids' app~~              | Fixed 17 October 2026: replay integration removed, both replay rates 0 (ADR-005)                                                                                                                                                                                                                                                                  |
| P2  | ~~No social preview image (`og:image`)~~                                          | Fixed 17 October 2026: `public/og-image.png` (1200 × 630, brand colours), `og:image*` and `twitter:card=summary_large_image` in `index.html`. Not yet checked in a live link unfurler                                                                                                                                                             |
| P2  | Sitemap lists fixed pages only                                                    | Category and quiz URLs come from the database; needs a server route                                                                                                                                                                                                                                                                               |
| P3  | ~~Small buttons and short standalone links~~                                      | Fixed 17 October 2026 (branch `chore/p3-polish`)                                                                                                                                                                                                                                                                                                  |
| P3  | ~~Penguin avatar colour missing; raw palette classes~~                            | Fixed 17 October 2026: `bg-avatar-*` tokens                                                                                                                                                                                                                                                                                                       |
| P3  | ~~Hand-rolled card markup; varied container widths~~                              | Fixed 17 October 2026: `Page` and `Card as` (two fixed prompts keep their own overlay markup)                                                                                                                                                                                                                                                     |
| P3  | ~~`format:check` failing on 9 files~~                                             | Fixed 17 October 2026                                                                                                                                                                                                                                                                                                                             |

Not tested: real phone hardware, screen reader runs, live deploy of this branch, Clerk
sign-in on `/account`.

## 2026-10-25 · Pwa Release Checklist

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## PWA Release Gates

For every line record status, evidence, owner and date. Allowed statuses are `PASS`, `FAIL`, `PARTIAL`, `NOT TESTED`, `N/A` and `BLOCKED`. `N/A` requires a reason.

### Runtime and network

- [ ] Application works online.
- [ ] Network failure produces intentional behaviour.
- [ ] Offline behaviour matches the approved specification.
- [ ] Service worker registration, scope and lifecycle behave correctly.
- [ ] Old caches are removed safely.
- [ ] New versions update without trapping users on stale code.
- [ ] Failed requests recover appropriately.
- [ ] Duplicate submissions are prevented or made idempotent.
- [ ] API failures have visible, recoverable states.

### Installation and navigation

- [ ] Installation works on supported platforms.
- [ ] App icons and launch presentation work.
- [ ] The web app manifest is valid.
- [ ] Start URL, scope, deep links and refreshed routes work.

### Identity, data and synchronisation

- [ ] Authentication survives the intended application lifecycle.
- [ ] Private data is not cached accidentally.
- [ ] User work is not silently lost.
- [ ] Queueing, retry, conflict and synchronisation states are explicit where applicable.
- [ ] Database policies and permissions are verified.
- [ ] Role permissions are verified server-side.

### Experience and release

- [ ] Mobile layout works on supported sizes.
- [ ] Desktop layout works on supported sizes.
- [ ] Accessibility has been checked with recorded evidence.
- [ ] Production build succeeds.
- [ ] No critical console or runtime errors remain.
- [ ] No exposed secrets are present.
- [ ] No critical security findings remain open.
- [ ] Monitoring and error reporting are operational.
- [ ] Backup and recovery exist where applicable.
- [ ] Rollback is documented and feasible.
- [ ] The production environment has been verified directly.

Test online, slow, intermittent, offline and restored-network transitions. A simulated checkbox without observed behaviour is not a pass.

### Automated and manual assurance

- [ ] Applicable Foundry automated gates pass on the production build, including `accessibility` and `security`.
- [ ] Review `.agent/evidence/accessibility.json`, its axe scan details and any lower-severity violations or incomplete rules.
- [ ] Review `.agent/evidence/security.json`, dependency counts, static findings and any below-threshold advisories.
- [ ] Complete and record the separate manual accessibility audit in `docs/AUDIT.md`.
- [ ] Complete the product-specific threat model and manual security review in `docs/AUDIT.md`.

An automated PASS applies only to the recorded policy, routes, states and source fingerprint. It is not proof of complete WCAG compliance or complete application security. Do not mark the manual assurance rows, production review or full release checklist PASS solely because automated gates pass. Missing or unavailable checks remain NOT TESTED, BLOCKED or FAIL as appropriate; they are never an automatic PASS.

## 2026-10-25 · Website Launch Checklist

_Merged from `docs/AUDIT.md` on 2026-10-30._

> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

## Website Launch and Quality Gates

Record status, evidence, owner and date. The lists supplied by Gideon are consolidated here without duplicate or corrupted numbering.

### Launch essentials

- [ ] Privacy policy reflects real data practices and has appropriate review.
- [ ] Terms page uses verified organisation and jurisdiction details.
- [ ] Primary call to action is clear and works.
- [ ] FAQ answers real user questions.
- [ ] `robots.txt` is intentional and valid.
- [ ] `sitemap.xml` is current and reachable.
- [ ] A useful custom 404 page exists.
- [ ] Meaningful images have appropriate alternative text.
- [ ] Analytics is configured with consent where required.
- [ ] Every indexable page has a specific title and description.
- [ ] Social sharing metadata and preview imagery work.
- [ ] Favicon and required brand icons work.
- [ ] Canonical URLs are correct.
- [ ] Cookie consent matches actual storage and applicable law.
- [ ] Mobile layouts and interactions are tested.
- [ ] Keyboard, focus, labels, contrast, landmarks and touch targets are checked.
- [ ] Forms are tested for validation, success, failure and recovery.
- [ ] Internal and external links are checked.
- [ ] Images, fonts, scripts and critical rendering are tuned to agreed budgets.

### Interface repair

- [ ] No unintended horizontal scrolling exists.
- [ ] Buttons and links perform their labelled action.
- [ ] Mobile navigation works and is accessible.
- [ ] Footer links work.
- [ ] Success and error messages are clear and actionable.
- [ ] Placeholder copy, dead navigation and temporary assets are removed.
- [ ] Logo returns to the expected home route.
- [ ] Telephone numbers and email addresses are actionable where appropriate.
- [ ] Copyright details are current.

### Conversion risks

- [ ] Pop-ups are limited, timed responsibly and easy to dismiss.
- [ ] Headline and value proposition are specific.
- [ ] Calls to action do not compete without a clear hierarchy.
- [ ] Copy and imagery are credible, specific and consistent with the product.
- [ ] Page speed meets the agreed budget.
- [ ] Long text is structured for scanning without hiding necessary detail.
- [ ] Animation and video do not distract, block access or harm performance.
- [ ] Forms ask only for necessary information.
- [ ] Pricing visibility follows the approved commercial strategy.
- [ ] Social proof is authentic and permissioned.
- [ ] Navigation supports the next step.
- [ ] Cookies and trackers are necessary, documented and controlled.

### Security checks

- [ ] API keys and secrets are absent from client bundles and version history.
- [ ] Environment variables and production settings are verified.
- [ ] Administrative routes require server-side authorisation.
- [ ] Authentication and role permissions are tested.
- [ ] User input is validated and safely rendered.
- [ ] SQL injection controls and database policies are verified.
- [ ] Rate limiting and abuse controls match risk.
- [ ] Third-party spending limits and alerts exist where supported.
- [ ] File uploads validate type, size, ownership, storage and delivery.
- [ ] CSRF protection is present where the authentication design requires it.
- [ ] CORS permits only intended origins, methods and headers.
- [ ] HTTPS is enforced.
- [ ] Security headers match the application.
- [ ] Cookies use appropriate `Secure`, `HttpOnly` and `SameSite` settings.
- [ ] Debug mode and verbose error disclosure are disabled in production.

Do not mark the site ready while a critical gate is failed, blocked or not tested.

### Automated and manual assurance

- [ ] Applicable Foundry automated gates pass on the production build, including `accessibility` and `security`.
- [ ] Review `.agent/evidence/accessibility.json`, its axe scan details and any lower-severity violations or incomplete rules.
- [ ] Review `.agent/evidence/security.json`, dependency counts, static findings and any below-threshold advisories.
- [ ] Complete and record the separate manual accessibility audit in `docs/AUDIT.md`.
- [ ] Complete the product-specific threat model and manual security review in `docs/AUDIT.md`.

An automated PASS applies only to the recorded policy, routes, states and source fingerprint. It is not proof of complete WCAG compliance or complete application security. Do not mark the manual assurance rows, production review or full release checklist PASS solely because automated gates pass. Missing or unavailable checks remain NOT TESTED, BLOCKED or FAIL as appropriate; they are never an automatic PASS.
