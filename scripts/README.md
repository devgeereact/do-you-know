# Project Scripts

Keep repeatable setup, validation, audit and release commands here. Scripts must fail clearly, avoid hidden remote changes and document prerequisites.

| Script | Purpose |
|---|---|
| `package-cpanel.mjs` | Build the cPanel release (public files and private backend kept apart). |
| `check-htaccess.sh` | Prove the root `.htaccess` on a local Apache before release (`npm run check:htaccess`). |
| `verify.py` | Check the GEE OS contract and guards are present. |
| `agent_guard.py` | Claude Code PreToolUse hook: blocks secret files, asks before risky commands. |
| `guard.py` | Git pre-commit guard for staged secrets (`.githooks/pre-commit`). |
