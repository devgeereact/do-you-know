# Changelog

## 1 November 2026 (go-live branch `golive/2026-11`) — Security fixes from the go-live audit
- Answers: players now see per-attempt option ids keyed with a server secret instead of the stored ids. The stored ids were an unkeyed hash of each option's authored position, so a script could undo the shuffle; in the shipped content the right answer is written first in 59% of questions. Shuffling now follows the keyed ids too. No migration. Old ids are refused on purpose (accepting them would let a script submit "authored first option" directly), so a question on screen at the moment of release needs a reload; resuming a round works as before.
- Privacy: "Delete my data" now also removes the written answers a player left in their message threads, and the hourly clean-up of unused guests wipes their feedback message, email and written answers the same way (before, both kept that text for staff, against the privacy notice).
- Studio: source links on the Generator draft cards and the Check screen are only links when they are http(s), so a model-written `javascript:` source can never run in a staff session.
- SEO: release builds now prerender the 12 category and 46 quiz pages from the live public catalogue and fail if they cannot. Until now the release skipped this step without failing, so every URL on the live site served the same empty shell with the home page as its canonical link.
- SEO: the 7 info pages (About, How to play, Today's challenge, Leaderboards, Contact, Privacy, Terms) are prerendered from the app's own copy; category pages describe each quiz and link the other subjects; quiz pages link up to four sibling quizzes. Quiz titles add "quiz" when the title does not say so, and descriptions add the size and ages (shared helper `src/lib/seoText.ts`, used by the app and the prerender). Organization and WebSite JSON-LD in the shell; BreadcrumbList on every prerendered page. Home title now says what the site is. `public/llms.txt` added.
- Layout shift: the phone home holds the "Carry on" row and the category page holds the banner, description and list space while data loads. Measured locally on a throttled phone profile against live data: home CLS 0.30 → 0.002, category 0.26 → 0.001 (target under 0.1).

## 1 November 2026 — Daily auto-pick fix, generator providers, clean-up
- Daily auto-pick: the server's crontab had been emptied, so 1 Nov had no daily. Jobs restored; `GET /daily` and starting a daily round now activate today's daily themselves when the job missed it; the Studio calendar preview uses the quizzes live at pick time, so it matches the real pick.
- Generator: Anthropic is the default writer and searcher, OpenRouter (same Claude Opus 5.5) the backup; Bright Data is optional. `scripts/set-generator-keys.sh` saves keys on the server with hidden prompts.
- Clean-up: removed blank template docs and pre-launch records (FTPS setup, rebrand verification, old cPanel evidence, launch/release stubs, PWA/API/email templates); rewrote README, project memory, security, backup and deployment docs; removed dead code (`useOptimizedImage`, `settingsService`, unused helpers) and FTPS-era scripts; `check-rebrand.py` checks only tracked files; `cron-ensure.sh` refuses to install when the crontab cannot be read.

## 31 October 2026 (evening) — Profile, info pages and on-site replies
- One profile page (`/me`): character picker, nickname, stats, messages, rounds and best scores. The avatar menu is gone; the avatar in the top bar links straight to the profile and shows a dot for a new reply. `/me/avatar` now opens the picker on the profile.
- Nicknames can be changed once (migration 0016). Children and players with no age pick from four generated names; 13+ may also type one. No two players can take the same name in a change. A confirm step says it is final.
- Replies live on the site: players read Studio replies under Messages; teenagers and adults can write back, which puts the thread back to "new" in the Studio inbox. Staff can now reply to any message (children can read, not write). Email is optional.
- How to play, About, Privacy, Terms, Contact and Settings share a full-width shell with a side menu and "On this page" list.
- Footer: removed "Parents and staff" and the "nicknames only, no adverts" line.

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
