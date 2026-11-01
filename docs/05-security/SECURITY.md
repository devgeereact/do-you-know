# Security model

Updated 1 November 2026. Who may do what is in `PERMISSIONS.md`; audits are in `docs/AUDIT.md`.

## What we protect

- **Game integrity:** answers never reach the browser before answering; the server marks every answer, times every question and computes every score (`Game.php`, `Competition.php`, `Overall.php`). The e2e suite fails if a question payload carries anything but id, type, prompt, options, slider and scene.
- **Children's privacy:** players are guests with an opaque device code; children never type free text (feedback, nicknames and replies are preset or generated), and the server refuses it. Public surfaces show nickname, preset character and score only.
- **The Studio:** every `/admin/*` request needs a verified Clerk session whose subject is in the private `admin_subjects` list (`Admin::guard`); every write is in `admin_audit`.
- **Secrets:** server settings live outside every web root in `~/do-you-know-private/shared/`; nothing secret is in Git or the browser bundle. Keys are added with scripts that read hidden input and send it over SSH standard input (`scripts/set-generator-keys.sh`).

## Trust boundaries

Browser → PHP API (everything is validated and scoped to the caller's profile on the server) → MariaDB (prepared statements only). Outside calls happen only from the server: Clerk (session verification), and, when switched on, the Claude API with OpenRouter as backup and optionally Bright Data for the Studio generator.

## Controls in the pipeline

- Pre-commit: `scripts/guard.py` and gitleaks on staged files. Claude Code also runs `scripts/agent_guard.py` before every tool call.
- CI (`verify.yml`): `pnpm check`, guard tests, `check-rebrand.py`, gitleaks over history and build output, Semgrep, and every backend suite on a disposable MariaDB.
- Deploys only from `main` with the restricted SSH deploy key; smoke checks with automatic restore.

## Rate limits

Hashed network-address buckets: feedback 10 an hour per player (also player replies), likes 120 an hour, admin 300 a minute, generator runs capped per day.
