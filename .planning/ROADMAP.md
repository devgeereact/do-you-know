# Roadmap: Do You Know

## Overview

Existing product, adopted into GSD on 2026-11-07. The live app is the baseline (v1.0). This roadmap is milestone **v2.0 Learning app**: children practise literacy, numeracy, science and humanities in short, calm sessions where every answer is a tap; the parent sets up the child, chooses the level and sees progress.

**Status: APPROVED by the owner at Gate 3 on 7 Nov 2026.** Two owner decisions the same day: (1) Clerk sign-in is tested by the owner on the live site, so that step stays NOT TESTED locally and is recorded as owner-tested; (2) Religious knowledge stays **Christian only**, with no other faiths. Nothing below is started. Inputs, all approved: `docs/DIRECTION.md` (Gate 1), `docs/LEARNING-DESIGN.md` and `docs/SCREENS.md` (Gate 2), `docs/VERIFIED-STATE.md` (facts). Rule 3 holds in every phase: nothing that works is deleted; what does not fit moves behind a parent switch.

## Milestones

- ✅ **v1.0 Baseline (live)**: deployed 2026-11-07. Includes the daily upgrade shipped the same day (private hands, live board, crown; migration 0017).
- 📋 **v2.0 Learning app**: phases P1 to P6 below.

## How every phase runs (the same checklist, so it is written once)

1. `/gsd-plan-phase`, then `/gsd-execute-phase` on its own branch (`phase/pN-name`), test first, small commits, one concern each.
2. Gate before "done": `pnpm check`, `pnpm verify`, `bash scripts/test-backend.sh`, `pnpm test:e2e`, and a phone-size play of every changed screen (390 wide, plus 834 and 1280 for layout work) with the axe audit at zero violations and no horizontal overflow.
3. Then `/gsd-verify-work` and `/superpowers:verification-before-completion`. `/security-audit` for anything touching grading, sign-in or data. Evidence goes in `docs/AUDIT.md` (dated section) and the phase's status uses DONE, PARTIAL, NOT TESTED or BLOCKED only.
4. Same commit: `.agent/CURRENT-TASK.md`, `CHANGELOG.md`, and every document the change touches.
5. **Nothing is pushed, deployed, migrated on real data, or published without your explicit "approved".** A migration the new code needs goes out alone first, is backed up and run, and only then does the code follow (the method used for 0017, in `docs/07-operations/DEPLOYMENT.md`).
6. Each phase ends with a stop and a short report: what I found, what I did, what I need from you.

## Order and size

| Phase | Size | Needs | Can overlap with |
|---|---|---|---|
| P1 Clean-up and foundations | S | nothing | none |
| P2 Tap-only types with server grading | L (two slices) | P1 | none |
| P3 Literacy and numeracy content | L (authoring) | P2 types | P4 code |
| P4 Parent area | L | P1 | P3 |
| P5 Adapt, retry later, stickers, sound, mascot | L | P2, P4 | none |
| P6 Humanities and science spread | M (authoring) | P2 | P5 |

Sizes are relative effort, not dates. The order follows your brief; P3 content work can run beside P4 code because they touch different files.

## Phases

### P1: Clean-up and foundations

**Goal.** The child path is tap-only, calm and token-based, and the safe defaults are in, so every later phase lands on a clean base.

**In.**
- Close the typing bypass: the "I'm 18 or over" tick no longer lets an unsigned-in visitor reach typed fields; typed nickname, the contact free-text fields and the reply box are for signed-in adults only (server refuses to set the adult band without an adult identity; the preset-only player feedback stays).
- No forced capitals in the play stage; the play stage's hard-coded hex colours become tokens (the table in `docs/SCREENS.md` section 8); no "Ranked" tag on the child path.
- Safe defaults for everyone until P4 gives parents the switches: untimed sessions, quiz leaderboards, challenge-a-friend and trivia/18+ sets off the default path (direct links still work).
- Fix the Play-tab dead end (a finished daily no longer sends a child to "Uh-oh").
- An area label for every quiz, derived in code from the mapping table in `docs/LEARNING-DESIGN.md` section 5 (no database change; a stored `area` column only if Studio needs to edit it later), and a level derived from the quiz's age band.
- Housekeeping that blocks later work: one `/me` fetch instead of four, the duplicated types and London-date helper merged, the e2e README recipe for the project's own MariaDB, `.agent/CURRENT-TASK.md` made current.

**Out.** New question types (P2), parent accounts and switches that can be flipped (P4), the new home (P5). Dead code (ImageKit helper, PostHog settings) stays and is listed for a clean-up you approve later.

**Done when.**
- As a guest on a phone, no free-text field is reachable anywhere (tested in the browser suite and by hand), and setting an adult band without sign-in is refused by the server (test).
- `grep` finds no hex colour in the play-stage CSS or components, and no `uppercase` in them.
- The Play tab never shows "Uh-oh" after a finished daily; the daily board and crown still work.
- Every existing route still loads; all existing tests pass unchanged except the ones that pinned the old behaviour, and those are updated in the same commit with the reason.
- Area and level appear on `GET /quizzes` and are covered by a test using the live catalogue's shapes.

**Risks.** Adults lose their quick "I'm 18" path to feedback until P4: they use the existing Clerk sign-in at `/account` meanwhile. Untimed by default changes feel and pacing for existing players. Some e2e tests pin the old defaults. All three are called out in the phase report.

### P2: Tap-only types with server grading

**Goal.** Every new answer format works end to end, graded on the server with the answer hidden until the child has answered.

**In.**
- Slice 2.1: number tiles as the default screen for the existing `slider` questions (no server change), and the **`build`** type (spell, dictation, fill the gap, order the cards): `Content.php` validation and its Studio mirror, keyed tile handles in `Game`, grading by label sequence, migration 0018 (`attempt_answers.chosen_json`, additive), the tile tray component, the read-aloud button (device British voice), dictation excluded from the daily and ranked rounds.
- Slice 2.2: the **`assign`** type (match pairs, sort into groups), its component, and the Studio editor forms and import syntax for both new types, with a live preview.
- Sample draft quizzes for each type so the screens can be played and tested.

**Out.** Authoring content at scale (P3, P6), per-child adaptivity (P5), any parent switch (P4).

**Done when.**
- Every row of the test table in `docs/LEARNING-DESIGN.md` section 6 exists and passes: no answer or key in any payload before answering, forged and repeated handles return 400 and never 500, correct answers revealed only after `/answer`, a daily or ranked round never contains a dictation question, and no free text from a child ever reaches the server.
- Each type is played through in the browser on phone and desktop; targets measure 56 px or more; keyboard and screen-reader paths work; axe zero violations.
- `/security-audit` run on the grading changes; the section is added to `docs/AUDIT.md`.
- Migration 0018 goes out alone, backed up, with your approval.

**Risks.** The largest phase, so it ships as two slices and 2.1 can go live without 2.2. Letter tiles show the letters of the word by design, so spelling is easier than free typing; decoy letters limit that. Dictation puts the word in the payload (practice only; the audit says so plainly). A validator or importer bug could let a bad question through, so the existing checks and the AI review stay in the loop.

### P3: Literacy and numeracy content

**Goal.** Literacy and numeracy stop being the thin areas: at least 6 quiz sets in each area at every level (they have about 2 each today).

**In.**
- About 40 new quiz sets (4 per level per area) written to `docs/LEARNING-DESIGN.md` section 4: spelling and dictation, fill the gap, sentence building, verbal reasoning and comprehension for literacy; number facts on number tiles, sequences and patterns, quantitative analysis, order and sort for numeracy.
- A small validator change to allow a short passage in a comprehension prompt.
- Written in the Studio (import and editor), reviewed with the AI review, then read by a person; every question has a reason line, a source or note and a `review_by` date.

**Out.** Science and humanities (P6), retiring or rewriting any existing quiz.

**Done when.**
- The area-and-level table in `docs/LEARNING-DESIGN.md` shows at least 6 in every Literacy and Numeracy cell (counted from the live catalogue).
- Studio "To do" shows no drafts with problems; no exact or near repeats against the rest of the site (the existing duplicate rule); UK English checked.
- Content goes live only with your approval, followed by a release so the new pages are prerendered.

**Risks.** Authoring volume and quality are the real cost; a person must check every question. The AI review cannot grade tile questions, so those get a manual pass. Word lists for spelling and dictation must be original wording. Live content and the repo seed have already diverged (46 versus 262 quizzes); live stays the source of truth and new content is exported to the repo only if you ask.

### P4: Parent area

**Goal.** A parent signs in, sets up each child with no personal data, chooses the level and the switches, and hands the device over.

**In.**
- Migration 0019 (additive): children linked to a parent account with a preset nickname, preset avatar and level; parent settings (the switches).
- API: add, change and remove a child (up to 5), read and set switches, hand-over; every call scoped to the signed-in parent; a child session cannot reach any of it.
- `/grown-ups` with Children, Switches and Contact tabs and the hand-over action; leaving child mode needs the parent's email code again. Typed fields (contact message, reply box) live only here.
- The switches work as defined in `docs/DIRECTION.md`: Public boards, Challenge a friend, Beat the clock, Slider questions, Trivia and grown-up sets, plus Sound and Easy-read font (Atkinson Hyperlegible, self-hosted). All off by default; direct links still work.
- Child data erasure through the existing delete flow, extended to children.

**Out.** The skill map and Practise next (P5 supplies their data).

**Done when.**
- Tests for every switch (off hides, on shows, direct link still opens), and for scope: parent A cannot read or change parent B's children; a child token is refused by every parent endpoint; deleting a parent removes the children.
- No real name, birthday, photo, location or free text is collected for a child (checked in the code and the audit).
- `/security-audit` on sign-in, scoping and data; a click-through of the real Clerk sign-in recorded.
- Migration 0019 goes out alone, backed up, with your approval.

**Risks.** Clerk sign-in cannot be tested locally without Clerk keys (secrets I will not handle). **Owner decision 7 Nov:** the owner tests sign-in on the live site, so locally it stays NOT TESTED and the audit records it as owner-tested after release. Guest history is never merged into an account (existing rule), so a child added by a parent starts fresh. Handing over on a shared device relies on the email-code lock; a PIN is a possible later change.

### P5: Adapt, retry later, stickers, sound, mascot

**Goal.** A session adapts to the child, comes back to mistakes, and feels alive: stars, stickers, a friendly owl and optional sound.

**In.**
- Migration 0020 (additive): the retry queue, the skill record (area, topic, step, recent results) and earned stickers, all keyed to the child profile and holding ids and counts only. A nullable `step` on quizzes, filled from today's difficulty.
- The session: `/learn/:area` deals 10 questions from the child's level and step, retry-later questions first (at most 2), and moves the step up or down one at a time by the rule in `docs/LEARNING-DESIGN.md` section 3.
- The end-of-session screen (stars, sticker, one next step), the sticker book on `/me`, the skill map and Practise next in `/grown-ups`.
- One home for phone and desktop with the four area tiles, Who's playing and the daily card. The two old home builds stay in the code, unrouted, until you approve removing them.
- Sound with Web Audio (off until a parent turns it on) and the owl's reactions, with short GSAP motion that respects reduced motion.

**Out.** New content (P3, P6), social features, any tracking or advertising.

**Done when.**
- A table-driven test of the step rule; the retry queue never exceeds 2 a session and a question leaves it after one right answer; finishing twice records once; the daily and the existing quizzes are unaffected.
- No personal data in any new table; erasing a child erases their rows.
- A phone play of a full adaptive session, the end screen and the sticker book; axe zero violations; reduced motion respected; sound silent by default.
- `/security-audit` on the new tables and the session grading path.
- Migration 0020 goes out alone, backed up, with your approval.

**Risks.** The `step` for old content is coarse (three difficulties spread over five steps), so adaptivity can feel uneven until P3 and P6 add content. Thin pools at some levels. Motion and sound must stay calm. Replacing the home touches the most visited page, so its tests are written first and the old home is kept to compare.

### P6: Humanities and science spread

**Goal.** Humanities and science cover their ground at every level, with the tile formats used where they teach best.

**In.**
- About 20 new quiz sets: science chemistry and materials, physics and earth science at the younger levels, computer science and biology with tiles; humanities timelines, sorting and places, festivals and religious knowledge.
- Fix the odd age bands as content is added so each quiz sits in the right level; a stored `area` column only if Studio needs to edit it.
- A coverage report per area and level in the docs.

**Out.** Rewriting or retiring any existing quiz. **Owner decision 7 Nov: religious knowledge stays Christian only; no other faiths are added.**

**Done when.**
- Every Science and Humanities cell has at least 6 quizzes (counted from the live catalogue), reviewed and published with your approval, then released so pages are prerendered.
- The neutrality rule for religious knowledge holds (what a named book says, or plain facts; no doctrine).

**Risks.** Fact-checking cost; religious knowledge neutrality; geography without maps or images; the same authoring volume as P3.

## Assumptions (decided for you, say if any should change)

- Phases ship in the order above; P3 and P4 may overlap.
- An area is derived in code first, not stored, so nothing is written to the live database in P1.
- Child mode is locked by the parent's email code; up to 5 children per parent; about 20 stickers to start.
- Practice-only dictation; one point per question for every type; step and level rules as in `docs/LEARNING-DESIGN.md`.
- Old code (homes, ImageKit helper, PostHog settings, unused columns) is kept until you approve a clean-up.
- Content volume figures are proposals for you to size.
- Religious knowledge is Christian only (owner decision 7 Nov); Clerk sign-in is tested by the owner on the live site.

## Progress

| Milestone | Phases | Status |
|-----------|--------|--------|
| v1.0 Baseline | n/a (pre-GSD history in `.agent/HANDOFF.md`) | Live |
| v2.0 Learning app | P1 to P6 | Roadmap proposed, not started |
