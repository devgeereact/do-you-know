# End-to-End Tests

Test critical user journeys through observable behaviour, including error and recovery paths. Record environment assumptions.

Run with `pnpm test:e2e` (Playwright, Chromium). Two projects run every journey: `mobile` (390 x 844, touch) and `desktop` (1440 x 900).

## What the run builds

`global-setup.ts` makes a real, disposable stack and removes it afterwards:

1. A fresh MariaDB database `dyk_e2e_test` and a user limited to it.
2. A private test config (`environment=test`, allowed origin `http://localhost:5304` only) under the gitignored `.local-test/e2e-<port>/` folder. Reports and traces go to `.local-test/test-results` and `.local-test/playwright-report`.
3. `backend/bin/migrate.php`, run twice to prove it is repeatable.
4. `support/fixture.php seed`: one category, one published quiz (`e2e-quick-quiz`) with a choice, a true/false and a slider question, and a daily challenge row that is live today on the London calendar.
5. The PHP API on `127.0.0.1:55503` (the cPanel entry point under `php -S`).

`playwright.config.ts` then starts plain `vite` on port 5304 (never 5202) with `VITE_CPANEL_API_URL` pointing at that API. Between tests `fixture.php reset-limits` clears the throttling table, because the API deliberately allows only 10 new guests an hour per address.

## Needs

- Node 20.9 or newer, PHP 8.2 or newer with `pdo_mysql`, and `composer install --no-dev` run once in `backend/`.
- A local MariaDB or MySQL. By default the `mysql` client logs in as it does on the developer machine. For a password login over TCP (as in CI) set `E2E_DB_ADMIN_HOST`, `E2E_DB_ADMIN_USER` and `E2E_DB_ADMIN_PASSWORD`, and `E2E_DB_USER_HOST='%'` when the database is in a container.
- Chromium: `npx playwright install chromium` (add `--with-deps` on a fresh Linux machine).
- Overrides: `E2E_WEB_PORT`, `E2E_API_PORT`, `E2E_DB_NAME`, `E2E_DB_USER`.

## Journeys

| File                | Covers                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `browse.spec.ts`    | home lists the quiz, category and quiz pages, leaderboards tabs, theme, 404 pages, offline banner |
| `play.spec.ts`      | practice play to results with review, play again, refresh resume, layout, tap targets, integrity  |
| `ranked.spec.ts`    | ranked play, age group, 13+ typed nickname, under-13 shuffle only, avatar, public leaderboard row |
| `daily.spec.ts`     | daily play, "done for today", streak, refusal of a second play                                    |
| `challenge.spec.ts` | create a link, open it as a second player in a separate browser context, head to head, own link   |
| `privacy.spec.ts`   | my games history, delete my account with confirmation, only a guest token stored, no cookies      |

## Rules every test gets for free

- `support/test.ts` fails a test on any console error or uncaught page error. A test that expects the browser to log a failed 4xx request opts in with `test.use({ allowConsoleErrors: [/status of 4\d\d/] })`.
- `expectNoHorizontalOverflow(page)` is asserted on every page a journey visits.
- `ApiWatcher.assertNoAnswersLeaked()` checks every API response except answer and finish: no `is_correct`, `correct_option_ids`, `explanation` or snapshot data, and a question carries only `id`, `type`, `prompt`, `image_url`, `options` and `slider`. `assertClientPostsNoScores()` checks the browser only ever posts an option, a slider value or nothing.
- Select by role, label and visible text. Question order is random per attempt, so helpers answer by prompt.
