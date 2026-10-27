# Permissions

Default is deny. Every rule below is enforced by the PHP API; the browser never decides.
Updated 27 October 2026 (admin foundation, Phase A).

| Role | Resource | Read | Create | Change | Delete | Approve | Server policy | Test |
|---|---|---|---|---|---|---|---|---|
| Anonymous | Published quizzes, categories, daily, public boards (totals of likes only) | Allow | Deny | Deny | Deny | n/a | Public routes, whitelisted columns, rate limited | `integration.php`, `competition.php` |
| Guest (opaque token) | Own profile, attempts, history; like another player's entry (after a finished game) | Own only | Own attempts, own likes | Own nickname/avatar/settings | Own profile | n/a | `Identity::profile`, every private query filters by profile id | `integration.php`, `competition.php` |
| Signed-in adult (Clerk) | Same as guest, linked to a Clerk subject | Own only | Own only | Own only | Own profile | n/a | Verified Clerk session, subject mapped through `identities` | `integration.php`, `unit.php` |
| Super Admin | `/admin/*` | Allow | Allow (per phase) | Allow (per phase) | Retire only, never hard-delete content | Publish (human review) | Clerk subject must be in the private config `admin_subjects`, checked on every request in `Admin::guard` | `backend/tests/admin.php` |
| Any other signed-in player or guest | `/admin/*` | Deny (403) | Deny | Deny | Deny | Deny | Same guard | `backend/tests/admin.php` |
| Service (cron) | Daily activation, cleanup, backup | n/a | Daily rows | Expired guests | Expired guests | n/a | CLI only, outside the webroot | `daily.php`, `cleanup.php` |

Notes
- `profiles.role` is not used for admin access. The allowlist lives only in the private server config.
- Admin writes are recorded in `admin_audit` (no personal data).
- AI output never publishes itself: a human reviews and an admin publishes (RULES.md).
