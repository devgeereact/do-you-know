# Current task

Updated 1 November 2026. Finished work is in `HANDOFF.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`.

## Goal
Keep doyouknow.space healthy after the Pop & Ink rebrand; switch on the Studio generator once the owner adds keys.

## Status
- Live and healthy; daily auto-pick self-heals; crontab restored (11 jobs).
- Generator built, off until keys are saved (`bash scripts/set-generator-keys.sh`).

## Next steps
1. Owner: run `scripts/set-generator-keys.sh` (Anthropic default, OpenRouter backup) and try one run in Studio → Generator.
2. Owner: sign in once at /admin to confirm Studio access on live.
3. Decide whether to enforce the report-only CSP.

## Checks (1 November 2026)
`pnpm check` PASS · backend suites PASS (daily 19, cms 132, generator 42) · `pnpm test:cron` 12/12 PASS · `check-rebrand.py` PASS · live `/api/v1/daily` serves today's quiz.
