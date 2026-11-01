# Do You Know — project memory

Updated 1 November 2026. The current picture of the project; history lives in `CHANGELOG.md`, `.agent/HANDOFF.md` and `docs/08-change-management/DECISIONS.md`.

## What it is

A quiz PWA for children, families and trivia fans at **https://doyouknow.space**. Players are guests (generated nickname, preset character, no personal data); grown-ups may sign in with Clerk. The owner runs the site from the **Studio** at `/admin`.

## Live setup

| Part           | Where                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | `~/doyouknow.space` (document root), built by `pnpm build`                                                                                                                                                                  |
| Backend        | `~/do-you-know-private/current` (outside the web root); private settings in `~/do-you-know-private/shared/config.php`                                                                                                       |
| Database       | MariaDB `devgeereact_doyouknow`; migrations 0001–0016 applied (0016 on 31 Oct 2026)                                                                                                                                         |
| Sign-in        | Clerk production app "do you know space" (email code). Studio access: Clerk subject in `admin_subjects` (the owner's account)                                                                                               |
| Deploys        | Push to `main` → `.github/workflows/deploy.yml` → `scripts/release.mjs` over SSH (checks, build, snapshot, upload, smoke, automatic restore). Migrations by hand after a pinned backup (`docs/07-operations/DEPLOYMENT.md`) |
| Scheduled jobs | Hourly daily activator (`bin/daily.php`, :07), hourly clean-up (:23), nightly DB backup (03:41). `GET /daily` and starting a daily round also activate today's daily if the job missed it                                   |
| Backups        | `~/backups/do-you-know/` on the server (rolling 3 + newest 3 pinned pre-migration copies; release snapshots, last 3); Mac copies via `scripts/pull-backups.sh`                                                              |

## What's built

Pop & Ink design with our own logo, per-question worlds and the framed game stage; Home, subjects, quizzes, play, results, Daily (fits the screen), one Leaderboard across every subject (Today default), Contact with preset messages for children, the profile (`/me`: character, nickname changeable once, messages and replies, rounds) and full-width info pages. Studio: To do, Inbox (replies are read on the player's profile), Library, Editor, Check & publish, Import, Generator, Daily calendar, Players, Subjects, Activity, ⌘K search.

## Open items

- **Generator keys**: the owner adds Anthropic (default) and OpenRouter (backup) keys with `scripts/set-generator-keys.sh`; it stays off until then.
- A human sign-in test of the live Studio after `admin_subjects` was set (31 Oct).
- Report-only CSP: decide whether to enforce.
- Release builds prerender info, category and quiz pages from the live public catalogue (`PRERENDER_REQUIRED=1`); a release fails rather than ship the bare shell.

## Rules that never change

Answers and scores are decided on the server only. Children never type free text and give no personal data. Nothing AI-written publishes itself. Applied migrations are immutable. Full rules: `RULES.md`.
