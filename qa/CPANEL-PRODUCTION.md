# Production migration evidence

Overall: PARTIAL. Canonical base chosen by the owner. PR #4 merged to main at
ec51f70 after frontend/PHP 8.2/PHP 8.4 checks and CodeRabbit status completed.
No alternate branches deleted. Further work is isolated on feat/cpanel-production.
No full production deployment or frontend backend switch performed.

## Player and catalogue batch

PASS: 14 unit checks and 73 HTTP/database checks on PHP 8.5.10 and disposable
MariaDB 11.4.13 (matching the host's database major/minor). Both migration runs
succeed, the second is idempotent. HTTP evidence: qa/evidence/cpanel-production/.
New checks cover owner-only history, search escaping/filter validation, public
metadata typing, immutable age band, generated child nicknames, moderated older
nicknames, strict settings, mass-assignment rejection and confirmed deletion of
all sessions, owned attempts and settings. Existing grading/time/privacy tests pass.

Only scratch data was modified. Migration 0003 and new PHP modules have not been
applied to cPanel yet. Clerk account deletion, account linking, competition and
avatar workers remain incomplete. A blocked-word table is not a complete moderation
policy; approved contents and broader production privacy checks are still required.
