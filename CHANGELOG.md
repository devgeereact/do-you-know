# Changelog

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
