# Archive

Superseded history, newest first. Nothing here is current: see `docs/ROADMAP.md`, `.agent/CURRENT-TASK.md` and `docs/00-foundation/PROJECT-MEMORY.md`.

## 2026-11-14 · GSD planning folder and the replan survey retired

The tracked `.planning/` folder (GSD) and `docs/REPLAN-CURRENT.md` are folded here and into `docs/ROADMAP.md`. The phase plans (P1 to P6), the Phase 1 plan, summary, review and verification, and the `codebase/` notes (ARCHITECTURE, CONCERNS, STACK, TESTING) are not copied: they are in git history at commit `5aec7bd` (`git show 5aec7bd:.planning/<path>`) and in the bundle in `~/Backups/projects/do-you-know/`. The Phase 1 review is summarised in `docs/AUDIT.md`. The sections below are the GSD state, roadmap and project notes, and the replan survey, text unchanged apart from heading levels.

## GSD project state (8 Nov 2026, said 17% done; P2 to P9 were built outside GSD)

### Project Reference

See: .planning/PROJECT.md (updated 2026-11-07)

**Core value:** Children can play fair, trustworthy quizzes safely (server-graded, no personal data from children).
**Current focus:** owner's phone checks (01-HUMAN-UAT.md), then release of phase/p1-housekeeping. P2-P6 already built; GSD roadmap not yet reconciled with them.

### Current Position

Phase: 2
Plan: Not started
Status: Ready to plan
Last activity: 2026-11-08

Progress: n/a

### Accumulated Context

#### Decisions

Decisions are logged in PROJECT.md Key Decisions and `docs/08-change-management/DECISIONS.md`.

#### Pending Todos

See "Active" in PROJECT.md (owner steps and planned work). None scheduled.

#### Blockers/Concerns

- Generator keys not set, so the live generator is BLOCKED/NOT TESTED
- Live Studio sign-in NOT TESTED
- `.agent/CURRENT-TASK.md` had an uncommitted one-line edit (not deployed -> deployed) at the time of import; made by another session, left untouched
- Docs and tracking files are behind the code; see `.planning/codebase/CONCERNS.md`

### Deferred Items

None.

### Session Continuity

Last session: 2026-11-07
Stopped at: GSD baseline written to `.planning/` (uncommitted)
Resume file: none

## GSD roadmap for the v2.0 learning app (P1 to P6)

### Overview

Existing product, adopted into GSD on 2026-11-07. The live app is the baseline (v1.0). This roadmap is milestone **v2.0 Learning app**: children practise literacy, numeracy, science and humanities in short, calm sessions where every answer is a tap; the parent sets up the child, chooses the level and sees progress.

**Status: APPROVED by the owner at Gate 3 on 7 Nov 2026.** Two owner decisions the same day: (1) Clerk sign-in is tested by the owner on the live site, so that step stays NOT TESTED locally and is recorded as owner-tested; (2) Religious knowledge stays **Christian only**, with no other faiths. Nothing below is started. Inputs, all approved: `docs/DIRECTION.md` (Gate 1), `docs/LEARNING-DESIGN.md` and `docs/SCREENS.md` (Gate 2), `docs/VERIFIED-STATE.md` (facts). Rule 3 holds in every phase: nothing that works is deleted; what does not fit moves behind a parent switch.

### Milestones

- ✅ **v1.0 Baseline (live)**: deployed 2026-11-07. Includes the daily upgrade shipped the same day (private hands, live board, crown; migration 0017).
- 📋 **v2.0 Learning app**: phases P1 to P6 below.

### How every phase runs (the same checklist, so it is written once)

1. `/gsd-plan-phase`, then `/gsd-execute-phase` on its own branch (`phase/pN-name`), test first, small commits, one concern each.
2. Gate before "done": `pnpm check`, `pnpm verify`, `bash scripts/test-backend.sh`, `pnpm test:e2e`, and a phone-size play of every changed screen (390 wide, plus 834 and 1280 for layout work) with the axe audit at zero violations and no horizontal overflow.
3. Then `/gsd-verify-work` and `/superpowers:verification-before-completion`. `/security-audit` for anything touching grading, sign-in or data. Evidence goes in `docs/AUDIT.md` (dated section) and the phase's status uses DONE, PARTIAL, NOT TESTED or BLOCKED only.
4. Same commit: `.agent/CURRENT-TASK.md`, `CHANGELOG.md`, and every document the change touches.
5. **Nothing is pushed, deployed, migrated on real data, or published without your explicit "approved".** A migration the new code needs goes out alone first, is backed up and run, and only then does the code follow (the method used for 0017, in `docs/07-operations/DEPLOYMENT.md`).
6. Each phase ends with a stop and a short report: what I found, what I did, what I need from you.

### Order and size

| Phase                                          | Size           | Needs    | Can overlap with |
| ---------------------------------------------- | -------------- | -------- | ---------------- |
| P1 Clean-up and foundations                    | S              | nothing  | none             |
| P2 Tap-only types with server grading          | L (two slices) | P1       | none             |
| P3 Literacy and numeracy content               | L (authoring)  | P2 types | P4 code          |
| P4 Parent area                                 | L              | P1       | P3               |
| P5 Adapt, retry later, stickers, sound, mascot | L              | P2, P4   | none             |
| P6 Humanities and science spread               | M (authoring)  | P2       | P5               |

Sizes are relative effort, not dates. The order follows your brief; P3 content work can run beside P4 code because they touch different files.

### Phases

#### Phase 1: Clean-up and foundations (P1)

**Goal.** The child path is tap-only, calm and token-based, and the safe defaults are in, so every later phase lands on a clean base.

**In.**

- Close the typing bypass: the "I'm 18 or over" tick no longer lets an unsigned-in visitor reach typed fields; typed nickname, the contact free-text fields and the reply box are for signed-in adults only (server refuses to set the adult band without an adult identity; the preset-only player feedback stays).
- No forced capitals in the play stage; the play stage's hard-coded hex colours become tokens (the table in `docs/SCREENS.md` section 8); no "Ranked" tag on the child path.
- Untimed sessions by default (the quiz timer applies only when asked for). _Scope change at planning (7 Nov): hiding quiz leaderboards, challenge-a-friend and trivia/18+ sets moved to P4, so they are hidden and switchable together._
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

**Risks.** Adults lose their quick "I'm 18" path to feedback until P4: they use the contact email meanwhile (the Clerk account is not linked to play until P4). Untimed by default changes feel and pacing for existing players. Some e2e tests pin the old defaults. All three are called out in the phase report.

#### Phase 2: Tap-only types with server grading (P2)

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

#### Phase 3: Literacy and numeracy content (P3)

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

#### Phase 4: Parent area (P4)

**Goal.** A parent signs in, sets up each child with no personal data, chooses the level and the switches, and hands the device over.

**In.**

- Migration 0019 (additive): children linked to a parent account with a preset nickname, preset avatar and level; parent settings (the switches).
- API: add, change and remove a child (up to 5), read and set switches, hand-over; every call scoped to the signed-in parent; a child session cannot reach any of it.
- `/grown-ups` with Children, Switches and Contact tabs and the hand-over action; leaving child mode needs the parent's email code again. Typed fields (contact message, reply box) live only here.
- Hide quiz leaderboards, challenge-a-friend and trivia/18+ sets from the default path _(moved here from P1)_. The switches work as defined in `docs/DIRECTION.md`: Public boards, Challenge a friend, Beat the clock, Slider questions, Trivia and grown-up sets, plus Sound and Easy-read font (Atkinson Hyperlegible, self-hosted). All off by default; direct links still work.
- Child data erasure through the existing delete flow, extended to children.

**Out.** The skill map and Practise next (P5 supplies their data).

**Done when.**

- Tests for every switch (off hides, on shows, direct link still opens), and for scope: parent A cannot read or change parent B's children; a child token is refused by every parent endpoint; deleting a parent removes the children.
- No real name, birthday, photo, location or free text is collected for a child (checked in the code and the audit).
- `/security-audit` on sign-in, scoping and data; a click-through of the real Clerk sign-in recorded.
- Migration 0019 goes out alone, backed up, with your approval.

**Risks.** Clerk sign-in cannot be tested locally without Clerk keys (secrets I will not handle). **Owner decision 7 Nov:** the owner tests sign-in on the live site, so locally it stays NOT TESTED and the audit records it as owner-tested after release. Guest history is never merged into an account (existing rule), so a child added by a parent starts fresh. Handing over on a shared device relies on the email-code lock; a PIN is a possible later change.

#### Phase 5: Adapt, retry later, stickers, sound, mascot (P5)

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

#### Phase 6: Humanities and science spread (P6)

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

### Assumptions (decided for you, say if any should change)

- Phases ship in the order above; P3 and P4 may overlap.
- An area is derived in code first, not stored, so nothing is written to the live database in P1.
- Child mode is locked by the parent's email code; up to 5 children per parent; about 20 stickers to start.
- Practice-only dictation; one point per question for every type; step and level rules as in `docs/LEARNING-DESIGN.md`.
- Old code (homes, ImageKit helper, PostHog settings, unused columns) is kept until you approve a clean-up.
- Content volume figures are proposals for you to size.
- Religious knowledge is Christian only (owner decision 7 Nov); Clerk sign-in is tested by the owner on the live site.

### Progress

| Milestone         | Phases                                       | Status                                                                                       |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| v1.0 Baseline     | n/a (pre-GSD history in `.agent/HANDOFF.md`) | Live                                                                                         |
| v2.0 Learning app | P1 to P6                                     | P1 live (7 Nov); P2 slice 2.1 built on `phase/p2-tap-types` (not deployed); rest not started |

## GSD project notes

### What This Is

A quiz PWA for children, families and trivia fans, live at https://doyouknow.space. Players take timed multiple-choice, true/false and slider quizzes as guests (generated nickname, preset character), with a daily quiz, friend challenges and leaderboards. A staff-only Studio (`/admin`) lets the owner write, import, check and publish quizzes, with optional AI help that never publishes on its own.

### Core Value

Children can play fair, trustworthy quizzes safely: the server grades and times every answer, answers are never exposed early, and no personal data is collected from children.

ASSUMPTION: worded from the product rules in AGENTS.md; owner to confirm or reword.

### Requirements

#### Validated

<!-- Shipped and live as of 2026-11-07 (deploy 32648cd, smoke 3/3). Evidence: .agent/CURRENT-TASK.md, docs/06-quality/EVIDENCE-STATUS.md, docs/AUDIT.md. -->

- ✓ Quiz play: choice, true/false, slider; practice 10 questions, ranked 20; server-side grading and timing
- ✓ Daily quiz at London midnight (hourly cron plus self-heal on `GET /daily`)
- ✓ Friend challenges (30-day link, same questions and order)
- ✓ Overall leaderboard (today/week/month/all), per-quiz boards, likes
- ✓ Guest profiles: generated nickname (one change), preset character, streak, messages, delete-my-data
- ✓ Adult Clerk sign-in at `/account` (not linked to game history)
- ✓ Child safety rules: no free text, names, birthdates or photos from children; preset-only feedback
- ✓ Studio CMS: library, editor (autosave, versions, delete never-published drafts), check and publish, import, daily calendar, players, subjects, inbox, audit log, command palette
- ✓ AI helpers (advisory, person accepts every change): intro/explanation drafts, import review
- ✓ SEO: prerendered info, category and quiz pages (283 pages), sitemap via API, llms.txt, JSON-LD
- ✓ PWA: install prompt, update prompt, offline banner
- ✓ Release pipeline: push to `main` runs `scripts/release.mjs` (checks, build, snapshot, upload, smoke, auto-restore)
- ✓ Catalogue: 262 published quizzes, 0 drafts (per CURRENT-TASK.md, 7 Nov)

#### Active

<!-- Recorded as open in the repo docs. NOT scheduled into any phase. -->

- [ ] Owner: set generator keys (`scripts/set-generator-keys.sh`); live generator run is BLOCKED/NOT TESTED
- [ ] Owner: live Studio sign-in test (NOT TESTED); inbox email untested
- [ ] Owner: exposed-file probe for `.env` / `config.php` (NOT TESTED)
- [ ] Owner: Search Console, CSP enforce decision, Cloudflare GPTBot 429 rule
- [ ] Quiz page CLS (0.08–0.11); footer subject links
- [ ] Generator hardening; `deploy.yml` action SHA pins
- [ ] Semgrep to blocking on 11 Nov
- [ ] Major upgrades as planned tasks: React 19, Router 7, Vite 7, ESLint 10, Clerk PHP 2
- [ ] VoiceOver pass (OPEN); Lighthouse, PSI, CrUX (NOT TESTED)

#### Candidates

<!-- From the 7 Nov read-only map. Findings, not decisions. See .planning/codebase/CONCERNS.md. Owner chooses what becomes scope. -->

- [ ] Fix defects and risks listed in CONCERNS.md (editor AI Undo, generator `send` double-append, `create` TypeError, and others)
- [ ] Bring stale docs and tracking files up to date (including a `docs/AUDIT.md` section for the 7 Nov rewrite)

#### Out of Scope

- New tracking or ad SDKs, generated player photos, AI auto-publication — AGENTS.md rules
- Collecting real names, birthdates, photos, location, contacts or free text from children — AGENTS.md rules
- Supabase/Neon, FTP accounts, force pushes and mirror-delete deploys — owner global rules

### Context

- Existing, live product; GSD adopts it as-is. This is the starting point, not a plan.
- Sources of truth stay where they are: `.agent/CURRENT-TASK.md`, `.agent/HANDOFF.md`, `docs/`. `.planning/` summarises the 7 Nov map and links back; it does not replace them.
- Frontend: React 18, TypeScript strict, Vite, Tailwind tokens, ~84 `.tsx` and 87 `.ts` tracked files. Backend: private PHP (8.2 floor, server 8.4), MariaDB, 15 migration files (0009 intentionally absent), 24 tables, 13 PHP test suites.
- Seed content in `backend/content/` (46 quizzes, 1,380 questions) is a 25 Oct seed; the live catalogue (262) is owned by Studio.

### Constraints

- **Tech stack**: pnpm, Node 24 (`.node-version`), ESLint plus Prettier (custom i18n lint rule), PHP prepared statements, applied migrations immutable
- **Security**: never expose answers before answering; trusted scores, times and permissions computed server-side only; `VITE_*` is public; secrets outside webroots
- **Process**: anything on the server (deploys, migrations, cron, files) needs explicit owner OK in the session; focused commits; `pnpm check` is the gate
- **Hosting**: cPanel (Namecheap), Cloudflare DNS/HTTPS, GitHub (`devgeereact/do-you-know`, private, `main`)

### Key Decisions

Existing ADRs live in `docs/08-change-management/DECISIONS.md` and remain authoritative. Those cited by the 7 Nov read-through:

| Decision                                                                | Rationale                                                      | Outcome                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| ADR-007 / ADR-009: practice 10, ranked 20 questions                     | Round sizing                                                   | — in force                                           |
| ADR-013: deploy through GitHub Actions `deploy.yml` (owner, 30 Oct)     | Overrides the global "Mac-built release" rule for this project | — in force; stale comment in `scripts/release.mjs:4` |
| ADR-017 / ADR-022: Anthropic default provider, Sonnet 5.5 default model | ADR-016/017 still say Opus; supersession not marked            | ⚠️ Revisit docs                                      |
| ADR-018: daily self-heals on `GET /daily`                               | Survives a missed cron                                         | — in force                                           |
| ADR-019: import sources optional                                        | Contradicted by PRODUCT-SPEC.md:148 and backend/README.md      | ⚠️ Revisit docs                                      |
| ADR-020 / ADR-021: AI drafts and advisory import review                 | A person accepts every change                                  | — in force                                           |

---

_Last updated: 2026-11-07 after importing the read-only map as the GSD starting point_

## Replan: what existed on 7 Nov 2026 (read-only survey)

Read-only survey of the code (branch `docs/replan`, nothing deployed). Sources: a full read of `src/`, `backend/` and `backend/content`, plus a code-only knowledge graph (1,941 nodes, 92 communities, built with graphify; docs and images were not graphed). Statements below come from the code, not the docs. Items marked ASSUMPTION or NOT TESTED were not run.

### In one line

A **general trivia quiz PWA** (timed, ranked, leaderboards, daily, friend challenges) with a staff Studio. It is not yet the four-area learning app: there is no spelling, dictation, fill-the-gap, verbal reasoning, ordering or matching, no read-aloud, no adaptive difficulty and no parent area.

### Per subject

| Area       | Today                                                                                                                                    | Strength                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Literacy   | Grammar/punctuation, phonics, literary devices, GCSE literature, one vocabulary quiz. **No spelling, dictation, gaps, verbal reasoning** | Thin                            |
| Numeracy   | One maths quiz per stage (KS1 counting, KS2 tables, KS3 algebra, GCSE), 120 questions in the repo                                        | Thin to medium                  |
| Science    | Animals, body, space, plants, forces, GCSE bio/chem/physics, computing (algorithms, binary, GCSE CS), inventions                         | **Strong**                      |
| Humanities | Geography 210, History 210, Religious knowledge = Old and New Testament only (60 in the repo)                                            | Geography/History good, RE thin |

Live content (CURRENT-TASK, 7 Nov): 262 published quizzes in Technology 54, Bible and faith 54, General Knowledge 60, School Science 60. The repo seed holds a different set (46 quizzes, 1,380 questions, 12 categories). The two have not been reconciled; the live database is the master.

### Screens and routes

- **Child/anyone:** `/` home (separate desktop and phone builds), `/c/:slug` subject, `/q/:slug` quiz page, `/daily`, `/leaderboards`, `/challenge/:code`, `/me`, `/me/settings` (theme only), info pages (`how-to-play`, `about`, `privacy`, `terms`, `contact`), `/account` (adult Clerk sign-in, linked from nowhere).
- **Full-screen play:** `/play/:slug`, `/daily/play`, `/challenge/:code/play` (one `PlayPage`: loading, question, feedback, results).
- **Staff:** `/admin/*` Studio (To do, Inbox, Library, Editor, Check and publish, Import, Generator, Subjects, Daily calendar, Players, Activity).
- **Redirect stubs:** `/me/avatar`, `/preview`, `/login`, `/dashboard`.
- **API:** about 45 public/guest routes and about 35 admin routes under `/api/v1`.

### Database (MariaDB)

`profiles, identities, guest_sessions, rate_limits, categories, quizzes, quiz_versions, attempts, attempt_answers, curriculum_tags, blocked_words, app_settings, daily_challenges, friend_challenges, leaderboard_entries, leaderboard_likes, content_reviews, admin_audit, feedback, feedback_messages, generator_runs, generator_pages, generator_drafts`. There is **no questions table**: a question is a JSON element inside `quiz_versions.snapshot`. Migration 0009 is a gap.

### Question types (3)

`choice` (1,042 in the repo), `boolean` (213), `slider` (125, native range input). Nothing else exists in types, UI, validator or generator.

### How it works

- **Storage:** quiz versions are immutable JSON snapshots; an editable draft lives in `quizzes.draft`. Validated by `Content.php`; the Studio mirrors the rules in `adminValidation.ts`.
- **Checking:** server-side only. Option ids are per-attempt HMAC handles, answers and explanations are revealed only after `/answer`, the server owns the clock (1.5 s grace). This is the strongest part of the app.
- **Progress:** all on the server: attempts, best-per-quiz boards, a daily streak. No XP, badges or coins. The browser keeps only the guest token and theme. Play needs the network.
- **Identity:** every player is a guest with a generated nickname and one of 12 preset characters. Clerk is used for staff and an unlinked adult sign-in. Guest history is never merged into an adult account.

### Breaks the hard rules

**Rule 1 (no typing):** answering never needs a keyboard, but the child experience still has typing: a typed nickname for "13+" (`NicknamePicker.tsx:97`, `MePage.tsx:322`), a reply textarea (`MePage.tsx:511`), and `/contact` (email, message). The age gate is self-declared and **a child can bypass it**: ticking "I'm 18 or over" on `/contact` permanently sets the band to adult (`ContactPage.tsx:62-70`). The slider needs dragging, which is not typing but is the hardest tap-only control.
**Rule 2 (no child data):** no names, photos, birthdates or location. But the profile stores a self-declared **age band** (under 13, 13-17, 18+). That is the nearest thing to age data and should go.
**Not rule-breaking but not child-safe either:** question images load from ImageKit (third party); source links open external sites from results; `VITE_POSTHOG_*` settings are declared and unused beside "no analytics" copy.

### Duplicated, unused, half-finished, inconsistent

- Unused: `lib/imagekit.ts` (plus its cache rule), PostHog settings, `AppSettings` types, `workbox-window`, `useGuestSession.isGuest`, 13 i18n keys, `quizzes.cover_image_url/seo_*`, `profiles.role` values, `abandoned` status, `image_url` (always null), `scene` and `round_size` (no file sets them).
- Duplicated: two publish paths (importer vs Studio, importer ignores the checked flags), `londonToday`, slug and week-start helpers, `/me` fetched four times, `QuizStatus`/`Difficulty` types defined twice, `SuggestQuiz`/`SuggestRow`, info link lists, Next quiz vs "What next?" on results.
- Inconsistent: a separate desktop and phone home that differ in features; the Play stage uses hard-coded hex colours outside the tokens; answers forced to uppercase (hard for early readers); two unrelated "age" ideas (profile band vs content chips); every Play button points to the daily round, so after playing it likely hits `daily_already_played` (inferred, NOT TESTED).
- Half-finished: generator keys unset (live run NOT TESTED); no sound anywhere; the tab bar has no profile tab.
- Content quality: the correct choice is first in 59% of choices in the repo seed, and 72% of true/false answers are "true" (shuffling hides the first; the second is guessable). All `review_by` dates cluster in two days.
- Tests: strong backend suite (13 suites) and 22 unit files, but `PlayPage`, `AnswerButton`, `SliderAnswer`, timer expiry, offline and the Studio have no tests; no coverage threshold.

### What is strong and worth keeping

Server-side grading and timing, answer-hiding, the Studio and import pipeline with versions and audit, the AI review that never publishes alone, prerendered SEO pages, the Pop & Ink design tokens and the release pipeline.

### Gaps against the new purpose

Question types (7 of the 10 needed are missing), Literacy topics, a real RE/Humanities spread, read-aloud audio, adaptive steps, retry-later, a parent area and parent-linked progress, and the removal of all typing and age data from the child path.
