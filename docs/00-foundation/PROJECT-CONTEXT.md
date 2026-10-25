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
- Budget, date, legal and platform constraints: cPanel only. Static PWA built in CI (no Node on the server) plus a private PHP 8.2+ API with MySQL/MariaDB. UK Children's Code and COPPA. Launch date `UNKNOWN`.
- Existing assets or systems to preserve: `backend/migrations` 0001 to 0004 (never edit an applied file) and the backend checks in `backend/tests/`. Quiz content in the old Supabase project until it is exported into MySQL.

## Fact register

| Statement                                                                      | Status   | Evidence or owner                                     | Next check                      |
| ------------------------------------------------------------------------------ | -------- | ----------------------------------------------------- | ------------------------------- |
| Project concept and V1 scope exist                                             | FACT     | `PROJECT-MEMORY.md`, `PRODUCT-SPEC.md`                | Owner review                    |
| Supabase removed; cPanel PHP/MySQL is the only backend                         | DECISION | ADR-003, 16 October 2026                              | Live verification               |
| Grading happens only in the PHP API                                            | DECISION | `backend/src/Game.php`, `backend/src/Competition.php` | Re-run backend checks on Ubuntu |
| Backend checks pass (14 unit, 76 HTTP/database, 63 competition, 9 concurrency) | FACT     | Local MariaDB, 16 October 2026                        | CI on the next push             |
| Site domain is doyouknow.space                                       | FACT     | `.agent/CURRENT-TASK.md`                              | Live verification               |
| Content imported into MySQL                                                    | UNKNOWN  | Gideon                                                | Content import, with approval   |
| Dev server port 5202                                                           | DECISION | `vite.config.ts`, dev-all registry block 20           | `dev-all check`                 |

Use `FACT`, `ASSUMPTION`, `UNKNOWN` or `DECISION`.
