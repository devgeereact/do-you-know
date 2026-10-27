# User Roles

Updated 27 October 2026.

| Role | Purpose | May view | May create or change | May approve or delete | Enforcement |
|---|---|---|---|---|---|
| Anonymous visitor | Browse and read | Published quizzes, public boards, daily challenge | Nothing | Nothing | Public API routes only |
| Guest player | Play without sign-up (children included) | Own history and settings | Own attempts, nickname (generated for under-13s), avatar, likes on others' entries | Own profile deletion | Opaque `guest_` token, server-side ownership |
| Signed-in adult | Keep a Clerk-linked profile | Same as guest | Same as guest | Own profile deletion | Verified Clerk session |
| Super Admin | Run the site | Everything under `/admin` | Content, moderation, daily schedule (by phase) | Publish and retire content after human review | Clerk subject in private `admin_subjects`, checked per request |
| Editor (deferred) | Content help | Not built | Not built | Not built | Not built; `profiles.role` value exists but is unused |
| Service identities | Cron jobs | n/a | CLI scripts only | n/a | Run from the private backend, outside the webroot |

Denial: an admin route without a token returns 401; a guest, ordinary player or any unlisted account gets 403 `forbidden`. Tested in `backend/tests/admin.php`.
