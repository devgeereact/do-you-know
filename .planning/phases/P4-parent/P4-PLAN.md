# P4 plan: parent area (branch `phase/p4-parent`, 7 Nov 2026)

Goal (roadmap): a parent signs in, sets up each child with no personal data, chooses the level and the switches, and hands the device over.

## Design (decided from the code, no questions asked)
- A **child is a profile** (`role='guest'`, generated nickname, preset avatar) plus a row in a new `children` table linking it to a parent profile and holding the level. The child plays through an ordinary guest session, so nothing in the play path changes and a child can never reach a parent endpoint (those need a verified Clerk token whose subject has an identity).
- A **parent is a profile with a Clerk identity** (already how adults work). Up to 5 children each.
- **Switches** live in `parent_settings` (one row per parent, seven booleans, all default off). The effective switches for a request are the child's parent's, or the player's own row, or all-off for a guest. They are returned inside `GET /me`, so the app learns them in the one fetch it already makes.
- **Hand-over**: `POST /parent/children/{id}/hand-over` (Clerk token) returns a new guest token for that child's profile. The app stores it and signs Clerk out, so getting back to `/grown-ups` needs the parent's email code again.
- **Erasure**: deleting a parent also deletes every child profile (and so their attempts, sessions and settings). A child device cannot delete a child (403 `child_managed_by_parent`); the parent does it.
- No new personal data: nothing typed for a child; nickname is generated, avatar is one of the 12 presets, level is one of 5 names.

## Tasks (tests first)
| # | Task | Evidence |
|---|---|---|
| T1 | Migration 0019 (`children`, `parent_settings`, additive) | migrates on a fresh and an existing test DB |
| T2 | `Parent` class and routes: list, add (max 5), change level/avatar/re-roll name, remove, hand-over, read and set switches | backend suite `parent`: scope (parent A cannot see or change B's child), guest and child tokens refused on every route, 5-child cap, invalid input 400, switches default off |
| T3 | `GET /me` carries `switches` and `child` (level) | suite: guest all-off, child sees parent's, parent sees own |
| T4 | Erasure: deleting a parent removes children, their attempts and sessions; a child cannot delete itself | suite |
| T5 | `/grown-ups` page (Children, Switches, Contact), Clerk sign-in, hand-over, level and avatar pickers | unit tests with Clerk mocked; real sign-in is owner-tested live |
| T6 | Switch effects on the child path: boards and likes and Ranked (Public boards), friend challenge, Beat the clock (sends `timed`), slider vs number tiles, trivia and 18+ sets, Sound (stored, P5 uses it), Easy-read font (Atkinson Hyperlegible, self-hosted) | unit tests per switch; e2e: off hides, on shows, direct link still opens |
| T7 | Docs, audit (`/security-audit` on sign-in scoping and data), CHANGELOG, CURRENT-TASK | |

## Out
Skill map and Practise next (P5), sound itself (P5), a PIN lock (possible later), merging guest history into an account (existing rule: never).

## Release
Migration 0019 goes out alone first, backed up, then the code; needs the owner's "approved". Real Clerk sign-in is NOT TESTED locally; the owner tests it on the live site.

## Status (7 Nov 2026)
T1-T7 built and tested; see `.agent/CURRENT-TASK.md` and `docs/AUDIT.md`. Release waits for the owner's approval. Found while building: the unused-guest clean-up would have purged children; fixed with a test.
