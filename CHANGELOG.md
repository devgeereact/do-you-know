# Changelog

## 31 October 2026 (later) — Generator, tidy-up
- Sourced question generator built and switched off (Studio → Generator): trusted-site search and page reading through Bright Data, drafts from Claude using only that text, quote/source/rule/duplicate checks, approve and send to a quiz. Migrations 0014, 0015. ADR-016.
- Removed HeroTeaser, SkyBackdrop, ProgressDots and TimerBadge (unused after the redesign).
- Inbox reply emails tell grown-ups to answer through the contact form (sender is no-reply).
- ESLint ignores `backend/vendor`.

## 31 October 2026 — Pop & Ink rebrand, Studio and one board for every subject
- Our own logo (grape speech bubble, lemon question mark) across the header, footer, favicon, app icons and share image (`scripts/brand-assets.mjs`).
- Pop & Ink colours, Baloo 2 + Outfit fonts, 13 illustrated object characters (avatar ids unchanged) and eight worlds. Every question now plays inside its own world on a framed game stage; the explanation is a sheet inside the frame. ADR-014.
- New Home (desktop hero with a real practice question; separate phone layout), subject and quiz pages with world banners, Daily and Leaderboards that fit one screen, Me inside the avatar menu.
- Overall leaderboard across every subject: Today (default), week, month, all time; points, then accuracy, then speed (`GET /leaderboards/overall`). ADR-015.
- Contact and feedback: preset messages for players, written messages and email for adults only; report a question from the game. Everything lands in the Studio inbox (`POST /feedback`).
- Studio (`/admin`): library, editor with live preview, import from pasted text or files, checks, publish/retire/restore, daily calendar, rounds, subjects, players, activity and the feedback inbox. The database is the content master. The sourced question generator is built but switched off until its cost is approved.
- Grown-up Clerk sign-ins now link to a server identity (`POST /account/session`).
- Migration `0013_cms_feedback.sql` (additive): quiz drafts, version dates, review actions, hidden rounds, feedback tables.
- `scripts/test-backend.sh` runs every backend suite against the local test database.
- "Delete my data" now also wipes any message or email written in feedback; privacy notice updated (31 October 2026).
- Studio: white sidebar grouped Work / Content / Site, breadcrumbs and a ⌘K search palette, matching design file v2.0.

## 2026-10-30
- Docs tidy (owner rule: one source of truth): Markdown moved into docs/, audits and checklists merged into docs/AUDIT.md, exact duplicates removed, links updated. No code changed.


## 27 October 2026
- Ranked games are 20 random questions from the quiz pool (practice 10, daily fixed at 10). Boards rank by correct/total so mixed round sizes compare fairly.
- Leaderboard likes: one per player per entry, not your own, removable, totals only (migration 0011, `POST /likes`, heart button). Released to live (frontend run 40457359055, commit 501026a).
- Live moved to a fresh database `devgeereact_doyouknow` (old `devgeereact_dykspace` dropped after a verified final dump; old players and scores not carried over).
- Dev server proxies `/api` to a local PHP API (`vite.config.ts`).
- Admin area Phase A (NOT released): guarded `/admin` API, `admin_audit` (migration 0012), lazy noindex staff shell, dev-only token script, `admin_subjects` config key. Plan: `docs/01-product/ADMIN-AREA-PLAN.md`.
- Disposable test setup moved to gitignored `.local-test/`; DB-backed tests refuse to run unless the config is inside it and is a local `_test` database (`backend/tests/guard.php`). Reports, caches and temp files also go there.

## Unreleased — new-domain baseline, 25 October 2026
- Rebrand imported Do You Know source for doyouknow.space.
- Fresh README, project memory and Claude Code handoff.
- Manual-only verification/public FTPS workflows and independent coming-soon payload.
- Remove inherited deployment assumptions and default old contact mailbox.

No release to doyouknow.space was performed by this task. Imported version numbers and modules do not imply a released version on the new domain.
