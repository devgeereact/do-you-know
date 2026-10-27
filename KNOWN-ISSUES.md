# Current setup blockers

- Private GitHub repository created and origin attached; see the verification record for first push/run status.
- cPanel document root, scoped FTPS credentials and target marker need verification.
- New-domain PHP/database/Clerk/private runtime and recovery need configuration and tests.
- Public app release is intentionally gated; a coming-soon upload does not install backend code.
- Feature/CMS work and inherited technical-document inconsistencies belong to the Claude Code handoff.

Actual local rebrand checks: docs/08-change-management/REBRAND-VERIFICATION.md.

## Open items, 27 October 2026
- Old players, scores and streaks were not carried into the new live database (owner chose a fresh start).
- Admin area is Phase A only (access, audit log, shell). Dashboard, moderation, content manager, scheduler, growth tools and generator are planned, not built.
- `scripts/live-db.sh` used the dropped read-only account and needs a new one.
- Real Clerk sign-in to `/admin` has not been tested; local tests use a signed test token.
- Migration numbering skips 0009 (reserved for a generator branch that is not in this repository).
- Server database `devgeereact_dyk_dev` (early QA) still exists.
- Boards mix 20-question ranked and 10-question daily results on all-time/weekly; ordering is by correct/total.
