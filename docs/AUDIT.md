# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-11-01 · Studio import changes (privacy, child safety, AI cost)

Reviewer: Claude Code. Branch `studio/import-2026-11`. Scope: optional sources and imported questions arriving checked (ADR-019), the AI writing helpers (ADR-020), import parsing and checks, body-world scenes.

- Privacy: no new personal data. Imports and the helpers carry quiz text only; helper requests send the title, or a question and its answer, and an age band to the model provider. No player data. PASS.
- Child safety: imported questions skip the per-question tick, so the person importing is the reviewer; the audit log records `imported: true` and who did it. The preview flags answers that repeat the question, yes/no answers to other questions, "which cells" questions answered with a process, repeated answer sets and hard words for ages 8 and under, without blocking. Players still never see answers before answering, and children still write no free text. ACCEPTED (owner decision, 1 November 2026).
- Sources optional: a given source must still be https, and player screens show it only when present (`isWebUrl`). Site copy no longer promises a source on every answer. PASS.
- AI output is untrusted: plain text only (links, HTML and markdown refused), length-capped, put into an editor field and never saved by the server; an AI-edited explanation leaves the question unchecked. Staff-only route behind `Admin::guard`; players get 403 (tested). PASS.
- AI cost: off until the generator is enabled and a key is set; one short call per click; own daily cap (default 200), counted from the audit log and tested at the limit. Live calls NOT TESTED (no keys; fixtures only).

## 2026-11-01 · Go-live security audit (full codebase, security-audit skill)

Reviewer: Claude Code. Branch `golive/2026-11`, source `80e1f23`. Profile standard: 12 coverage units, 7 hunters in two waves, 3 candidate verifiers, 3 record verifiers, 3 coverage critics (final pass clean). Audit agents read source only; every confirmed finding was reproduced with a failing check on the disposable local MariaDB (`scripts/test-backend.sh`). Run files (ledger, findings.json, reports) are in the gitignored `.local-test/security-audit/run-1/`.

**Findings**

| Severity | Finding | Status |
|---|---|---|
| Medium | Option ids were an unkeyed hash of each option's authored position, so a script could undo the shuffle. The right answer is written first in 615 of 1042 shipped questions (59% against 25% chance). This broke "answers never exposed before answering". | FIXED d18fc57: per-attempt HMAC handles, raw ids refused, shuffle by handle. Regression checks in integration.php |
| Medium | "Delete my data" kept the player's written thread answers, and the hourly guest purge kept message, email and answers. Staff could still read them, against the privacy notice. | FIXED 82c4d43: both paths scrub; checks in feedback.php and cleanup.php |
| Needs validation | Studio generator draft card used the model's `source_url` as an href with no scheme check (a `javascript:` link was possible, staff click needed, generator off by default) | Guard applied 4cd271e (`webHref`); browser behaviour NOT TESTED |
| — | No Critical or High findings | — |

**Checked and passing (source review):** every `/admin/*` route goes through `Admin::guard` before any handler, and every staff write is audited (except generator step, see below). All SQL is prepared, with emulation and multi-statements off; LIMIT, ORDER BY, IN and LIKE are built safely. Every player route takes identity from the token only; attempts and threads are owner-bound. Scoring, timing and once-only daily are enforced on the server. Clerk JWT is pinned to RS256 and checks iss, azp, exp, nbf, iat, `user_` and `sess_`; guest and Clerk tokens cannot be swapped. CORS is an exact allowlist with no credentials. Rate limits are atomic and keyed per IP (CF-Connecting-IP trusted only from Cloudflare ranges), per player and per route. Nicknames are ASCII-only and blocked-word filtered, and children cannot type them. React renders every user string as text. Prerender, JSON-LD and the sitemap escape their output. The service worker caches public catalogue routes only. The release puts no config, maps or dumps in the webroot (`verifyPublic`); bin scripts are CLI-only. The deploy job runs only on `main`, with pinned known_hosts. Migrations are checksummed.

**Hardening, not findings (left for later):** the CSP is Report-Only with `'unsafe-inline'` styles. The CF-RAY origin lock can be spoofed (nothing relies on it). `api/.htaccess` is server-managed and never deployed. deploy.yml uses mutable action tags, writes the deploy key before the build and has no GitHub environment. The generator follows redirects without per-hop checks, can approve drafts before the check stage (API only), does not audit `step` and has no retry cap. Nicknames have no unique index. Leaderboards return microsecond timestamps and attempt ids. The generator places answers at slot i % n. Clerk `sts` is not checked. Guest creation is per /64. Next and answer do not re-check that a quiz is still live.

**Go-live checklist (owner request, 1 Nov):**
- Keys hidden: no secret in 84 commits (gitleaks, full history) or in the build. The one `sk_live` pattern hit is the Clerk SDK's literal prefix check. The only env var the frontend reads is `VITE_*`, and the Clerk publishable key is public by design. PASS.
- Env files: the project rule forbids opening `.env*` and `config.php`, so their contents were NOT TESTED. Only `.env.example` is tracked. PASS for tracking.
- Admin routes, authentication, user access, forms and XSS, rate limits, API endpoints, CORS: see above. PASS.
- Security headers on live: HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and a report-only CSP are present. `Server: cloudflare` (origin version hidden), and no `X-Powered-By` on `/` or the API. `api.php` now strips `X-Powered-By` itself (bc5b559). Server version (`ServerTokens`) cannot be set from `.htaccess`; Cloudflare already replaces the header. PASS.
- Debug off: `display_errors` 0, generic error bodies, production environment required by Config, maps filtered out of the release, no `console.log`. PASS.
- Dependencies (821f4fa): in-range updates only. `pnpm audit` 41 → 5, 0 high. The 2 production advisories left need React Router 7 and do not apply (BrowserRouter only, no navigation to user-supplied URLs). The 3 dev ones are inside workbox-build. `composer audit` clean. Majors (React 19, Router 7, ESLint 10, Vite 7, Clerk PHP 2) are a planned task. PASS within scope.
- Unused packages: every npm and Composer dependency is referenced. PASS.
- Exposed files on live: `/.git/HEAD`, composer files, `/vendor/`, `phpinfo.php`, `.DS_Store`, `backup.sql`, `/server-status`, `api/.htaccess` and source maps all return 403 or 404. `.env` and `config.php` URLs were not probed (blocked by the agent guard; owner command in `.agent/CURRENT-TASK.md`).
- Database: prepared statements only, credentials outside the webroot, backups outside the webroot. The DB user's grants and remote access are server facts, NOT TESTED.
- Passwords: none stored. Clerk handles adult sign-in. Guest tokens are 256-bit random and stored as sha256, which is right for high-entropy tokens. PASS.

**Checks run:** `pnpm verify` and `pnpm format:check` before every commit, PASS. Backend suites unit, integration, competition, daily, concurrency, feeds, content, cleanup, seo, admin, feedback, cms and generator: PASS. `pnpm test:e2e`: 46/46 in 3 of 4 runs. One run had a single 503 on round start in `privacy.spec` (mobile) that 2 reruns and a 180-request concurrent-start stress test could not reproduce; the e2e API log is now kept at `.local-test/e2e-last-php.log` (97c8f55). Cause NOT FOUND.

## 2026-11-01 · Go-live SEO audit (claude-seo)

Reviewer: Claude Code. Full report: `.local-test/seo/doyouknow.space-audit/FULL-AUDIT-REPORT.md` and `ACTION-PLAN.md`. Live health score 29/100.

- Critical, FIXED in code (e1673b8): every live URL served the same empty shell with the canonical pointing at home, because the release build skipped prerender silently. Release builds now prerender from the live public catalogue and fail if they cannot.
- FIXED in code (3fa6ed2): the 7 info pages are prerendered; title and description fallbacks for quizzes; richer category pages; related-quiz links; Organization, WebSite and BreadcrumbList JSON-LD; a home title that says what the site is; `llms.txt`.
- FIXED in code (d9f7d0e): CLS (lab, throttled phone): home 0.30 → 0.002, category 0.26 → 0.001. The quiz page is 0.08–0.11, still open.
- Owner work: who makes it and how questions are checked (E-E-A-T), 46 quiz intros at 60–120 words, SEO titles and descriptions in Studio, category copy, a parents and teachers section, the contact line, Search Console, the Cloudflare GPTBot 429 rule. FAQ or Q&A rich results are deliberately not used (FAQ is restricted to gov and health sites; Q&A markup would expose answers).
- NOT TESTED: Lighthouse and PSI (API quota exhausted), CrUX field data, a live check of the new pages (not deployed).

## 2026-10-31 · Profile, nickname-once and on-site replies (privacy and child safety)

Reviewer: Claude Code. Scope: `Player::nickname`, `Feedback::mine/playerReply/markSeen`, migration 0016, `/me`, `/contact`, Studio inbox.

- Children still never write free text: replies are read-only for them; the server refuses their answers (`free_text_not_allowed`, tested). PASS.
- Staff replies to children are new. Only a Super Admin can send one; each is audited; the Studio warns to keep it short and kind; no contact details are ever asked for or stored. ACCEPTED (owner request, 31 October 2026).
- A player can only read and answer their own threads (404 for others, tested); internal notes never reach the player (tested). PASS.
- Nickname change: once only, atomic (no double change), children limited to generated names, blocked-words check for typed names, no copying another player's name (tested). PASS.
- Email is now optional; "Delete my data" still wipes message and email. PASS.

## 2026-10-31 · Generator security and cost review

Reviewer: Claude Code. Scope: `Generator.php`, `GeneratorLive.php`, migrations 0014–0015, Studio Generator screen.

- Off by default: no outside call is possible unless `generator.enabled` is true and the Claude and Bright Data settings are present; recorded answers are refused outside the test environment (tests check both). PASS.
- Keys are read only from the private config, never sent to the browser; the status endpoint reports only true/false for each. PASS.
- Only Super Admins reach the routes (`Admin::guard`); players get 401/403 (tested). PASS.
- No player data leaves the server: requests carry the topic, age band and fetched public page text only. PASS.
- Output is untrusted: every draft is validated like hand-written content, its quote must appear in the fetched page, its source must be an https page on the trusted list, and it never publishes; approval and sending are audited. PASS.
- Cost control: daily run cap (default 20), at most one search, four page fetches and one model call per run, and a per-run step lock so a double click or two tabs never repeat a paid step (tested). PASS.
- Model output is parsed as JSON from a schema-constrained response; refusal and token-limit stops end the run with a readable reason. PASS.
- Not done: a live run (BLOCKED until the owner approves the cost and adds keys).

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
