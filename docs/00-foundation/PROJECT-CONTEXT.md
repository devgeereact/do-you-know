# Project Context

The detailed record lives in `PROJECT-MEMORY.md` beside this file. This page is the short version.

## Problem and outcome

- Problem: Popular quiz sites leak answers to the browser, trust client-side scores, lock phones to landscape and ask children for names and emails.
- People affected: Families, students (including under-13s) and trivia fans.
- Situation in which it occurs: Short play sessions on a phone or laptop, at home or in class.
- Measurable desired outcome: A visitor plays a quiz in under 2 seconds with no sign-up and gets an honest, server-graded score with explanations. Launch metrics: `docs/01-product/PRODUCT-SPEC.md`.
- Why now: `UNKNOWN` (owner: Gideon).

## Boundaries

- First release: Milestones 1 to 4 in `README.md`, ending with 30 reviewed quizzes.
- Explicit exclusions: Live multiplayer, real-money prizes, reward currencies, public user-created quizzes, native apps.
- Budget, date, legal and platform constraints: Static PWA on cPanel (no Node on the server). Supabase EU. UK Children's Code and COPPA. Launch date `UNKNOWN`.
- Existing assets or systems to preserve: Supabase migrations 0001 to 0004 and their 61 behaviour checks.

## Fact register

| Statement | Status | Evidence or owner | Next check |
|---|---|---|---|
| Project concept and V1 scope exist | FACT | `PROJECT-MEMORY.md`, `PRODUCT-SPEC.md` | Owner review |
| Grading happens only in Supabase RPCs | DECISION | `supabase/migrations/0003_game_functions.sql` | Re-run DB tests on Ubuntu |
| 61 DB behaviour checks pass | ASSUMPTION | Claimed by the imported scaffold; not re-run here | `supabase/tests/run_tests.sh` |
| Production domain | UNKNOWN | Gideon | Before Milestone 3 |
| Dev server port 5202 | DECISION | `vite.config.ts`, dev-all registry block 20 | `dev-all check` |

Use `FACT`, `ASSUMPTION`, `UNKNOWN` or `DECISION`.
