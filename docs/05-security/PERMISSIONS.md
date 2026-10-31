# Permissions

Default is deny. Every rule below is enforced by the PHP API; the browser never decides.
Updated 31 October 2026 (Studio CMS, overall board, feedback).

| Role | Resource | Read | Create | Change | Delete | Approve | Server policy | Test |
|---|---|---|---|---|---|---|---|---|
| Anonymous | Published quizzes, categories, daily, public boards incl. the overall board (totals of likes only) | Allow | Deny | Deny | Deny | n/a | Public routes, whitelisted columns, rate limited | `integration.php`, `competition.php` |
| Guest (opaque token) | Own profile, attempts, history; like another player's entry (after a finished game) | Own only | Own attempts, own likes | Own nickname/avatar/settings | Own profile | n/a | `Identity::profile`, every private query filters by profile id | `integration.php`, `competition.php` |
| Guest or player | Send feedback (`POST /feedback`) | n/a | Preset messages only; free text and email only when 13–17, 18+ or signed in as an adult; rate limited | n/a | n/a | n/a | `Feedback.php` | `backend/tests/feedback.php` |
| Guest or player | Own messages (`/me/messages`): read staff replies; write back only when 13+ (or signed-in adult) and the thread is not resolved | Own only | Own answers | n/a | n/a | n/a | Thread must belong to the caller (404 otherwise); same 10/hour limit as feedback | `backend/tests/cms.php` |
| Signed-in adult (Clerk) | Same as guest, linked to a Clerk subject | Own only | Own only | Own only | Own profile | n/a | Verified Clerk session, subject mapped through `identities` | `integration.php`, `unit.php` |
| Super Admin | `/admin/*`: Studio quizzes (draft, check, publish, retire, restore), daily calendar, rounds (hide), feedback inbox (reply, note, status) | Allow | Allow | Allow | Retire only, never hard-delete content | Publish (human review, named reviewer) | Clerk subject must be in the private config `admin_subjects`, checked on every request in `Admin::guard` | `backend/tests/admin.php` |
| Super Admin | `/admin/generator*`: start runs, step them, approve/reject drafts, send to a quiz | Allow | Allow (when switched on, within the daily cap) | Decisions only | Never | Human approves every draft; publishing stays in Check & publish | Off unless `generator.enabled` and keys are set in the private config; outside calls only from the server; one step at a time per run | `backend/tests/generator.php` |
| Any other signed-in player or guest | `/admin/*` | Deny (403) | Deny | Deny | Deny | Deny | Same guard | `backend/tests/admin.php` |
| Service (cron) | Daily activation, cleanup, backup | n/a | Daily rows | Expired guests | Expired guests | n/a | CLI only, outside the webroot | `daily.php`, `cleanup.php` |

Notes
- `profiles.role` is not used for admin access. The allowlist lives only in the private server config.
- Admin writes are recorded in `admin_audit` (no personal data).
- AI output never publishes itself: a human reviews and an admin publishes (RULES.md).
