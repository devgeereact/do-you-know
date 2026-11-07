# P1 plan: clean-up and foundations

Branch `phase/p1-cleanup`. Planned directly from the code map (no separate researcher or checker agents: the phase is small and Stage 1 already verified the code). Test first for every task. One concern per commit.

## Scope change from the roadmap (recorded, owner told)

| Roadmap said | Plan does | Why |
|---|---|---|
| Hide quiz boards, challenge-a-friend and trivia/18+ from the default path in P1 | **Moved to P4** | Without the parent switches there is no way to turn them back on, which would remove them in effect (rule 3). They are hidden and made switchable together in P4 |
| "Adults use the Clerk sign-in at /account meanwhile" | **Adults use the contact email meanwhile** | Play sessions are guest-only; the Clerk account is not linked to play until P4, so the server cannot see a signed-in adult yet |
| Housekeeping: one `/me` fetch, merge duplicate types | **Deferred to P4/P5** | They touch the profile hooks that P4 and P5 rewrite |

## Tasks

| # | Task | Tests first | Done when |
|---|---|---|---|
| T1 | **Close the typing bypass.** Server: `/me/age-band` accepts 13_17 and 18_plus only for a profile with a Clerk identity (403 `adult_sign_in_required`); under_13 stays allowed. UI: no age question for guests (generated nicknames only); no "I'm 18 or over" tick; Contact shows the grown-up email instead of the adult form unless the profile already holds an adult band (existing profiles keep working) | backend: guest cannot set 13_17 or 18_plus, a Clerk-linked profile can, under_13 still works; unit: NicknamePicker shows no age question; e2e: guest sees no free-text field on /contact or the nickname step | server refuses; no typed field reachable by a new guest |
| T2 | **Play stage tokens and case.** Stage CSS and components use tokens, not hex (new tokens `right-*`, `wrong-*`, `stage-*` from `docs/SCREENS.md`); no `uppercase` in the stage; no "Ranked" tag on the child path | unit/grep guard: a test fails if hex or `uppercase` returns to the stage files | grep finds none; screenshots match before/after apart from case |
| T3 | **Daily dead end.** The Play tab and every "Play" link go to the daily only when it is not finished; otherwise to Daily (board) | unit: link target by `playedToday` | no "Uh-oh" for a finished daily |
| T4 | **Untimed by default.** `POST /attempts` uses the quiz timer only when the request says `timed: true`; otherwise the attempt has no limit. The client does not send it yet (P4 sends it when a parent turns "Beat the clock" on) | backend: default start has no limit and no deadline; `timed:true` keeps the old behaviour (existing timer tests send it); a resumed attempt keeps what it started with | children are not timed; the old behaviour is still reachable |
| T5 | **Area and level on quizzes.** `Catalog` adds `area` and `level` (derived from the mapping in `docs/LEARNING-DESIGN.md` section 5 and the age band); no database change | backend: mapping table cases from the live shapes (category and topic stem, odd age bands, 18+ and trivia) | `GET /quizzes` carries both, covered by tests |
| T6 | **Docs.** e2e README recipe for the project MariaDB; CURRENT-TASK, CHANGELOG, AUDIT updated | n/a | stale notes gone |

## Verification (before "done")

`pnpm check`, `pnpm verify`, `bash scripts/test-backend.sh`, `pnpm test:e2e`; phone-size walk (390 wide) of the play stage, contact, nickname step and daily; axe on those screens; then `/gsd-verify-work`, `/superpowers:verification-before-completion`, `/security-audit` (T1 and T4 touch sign-in and grading). Nothing is deployed or pushed.
