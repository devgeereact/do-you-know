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

## Competition and clock batch

PASS locally: 73 HTTP/player/catalogue checks, 63 competition checks, 9 concurrent
HTTP checks and 14 unit checks against MariaDB 11.4.13. Multi-worker PHP receives
real parallel requests for starts, answers, finishes, daily starts and share codes.
Tests confirm one accepted answer and one board record per player/period.

Competition checks cover server grading, best-score preservation, elapsed-time tie
breaks, public identity exclusion, private me rows, daily London date/order, once-only
daily rank/streak writes, own progress, original friend order, idempotent share,
30-day expiry and practice exclusion from ranked boards. An edited quiz timer cannot
extend an open attempt. Time limits and friend timers are frozen server-side.

PASS: 4 browser timer checks using a temporary development harness: server remaining
time, single expiry, already-expired deadline under StrictMode and legacy fallback.
The harness was removed after verification. Typecheck/lint/static build PASS.
No hosted migration/deployment or full frontend cutover in this batch.
GitHub CI PASS at e176957: frontend and PHP 8.2/8.4 jobs, run 38865109314.

## Clerk production DNS, 16 October 2026

PASS: existing Clerk application app_3KkAGkEUg8ST1ts6ydvb9DWKhI9 now has production
instance ins_3Kla98MIcql96UMCix0F4nkMef9, domain doyouknow.soulrefresh.net.
Confirmed Cloudflare zone soulrefresh.net and its account before mutation. No
conflicting records existed. Added these five CNAMEs with automatic TTL and proxy
disabled. Existing proxied app A record and unrelated records were preserved.

| Host under doyouknow.soulrefresh.net | Target |
| --- | --- |
| clerk | frontend-api.clerk.services |
| accounts | accounts.clerk.services |
| clkmail | mail.02snqjrmihkh.clerk.services |
| clk._domainkey | dkim1.02snqjrmihkh.clerk.services |
| clk2._domainkey | dkim2.02snqjrmihkh.clerk.services |

PASS: all five public CNAME answers returned their expected targets through 1.1.1.1.
Clerk deploy status confirms dns=complete, mail=complete, no pending DNS records.
PARTIAL: automatic SSL issuance remains pending; Google OAuth is pending custom
production credentials. A completed Google sign-in is NOT TESTED. No keys were
read, replaced or committed, and no full production cutover occurred.

Rollback for this DNS batch: remove only these newly created records by their
Cloudflare IDs if the Clerk production configuration is withdrawn:
0cad6597a4cde56ad036e67b17191767, 185f35a74bf372d83861d39eb642f0ee,
9aeb210711146f248856cb577552de00, 919007b9bf6a49ed6b997bf25263d57c,
2c40326a75e812fa62360b18c6c11376. Recheck the app A record and preview afterwards.
