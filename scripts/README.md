# Project Scripts

Keep repeatable setup, validation, audit and release commands here. Scripts must fail clearly, avoid hidden remote changes and document prerequisites.

| Script               | Purpose                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package-cpanel.mjs` | Build the cPanel release (public files and private backend kept apart).                                                                                                                   |
| `cron-ensure.sh`     | Add missing Do You Know cron lines on cPanel without touching other sites' jobs (`pnpm cron:ensure`, `--dry-run`). Tested by `cron-ensure.test.sh` (`pnpm test:cron`).              |
| `prerender.mjs`      | After `vite build`: write SEO pages for published categories and quizzes from the catalogue API (`prerender-html.mjs` builds the HTML). Skips with a warning when the API is unreachable. |
| `check-htaccess.sh`  | Prove the root `.htaccess` on a local Apache before release (`pnpm check:htaccess`).                                                                                                   |
| `verify.py`          | Check the GEE OS contract and guards are present.                                                                                                                                         |
| `agent_guard.py`     | Claude Code PreToolUse hook: blocks secret files, asks before risky commands.                                                                                                             |
| `guard.py`           | Git pre-commit guard for staged secrets (`.githooks/pre-commit`).                                                                                                                         |
