# Changelog

## 7 November 2026 (branch `phase/p6-spread`, not deployed) — P6: science and humanities content
- **23 quiz drafts (215 questions)**, not yet imported: 10 Science (including Computing) and 13 Humanities (three of them for ages 15 to 16), led by the tile formats (order, match, sort, gap). They fill the topic gaps: materials, forces, light, sound, electricity, earth and space, living things at the younger levels; timelines, places and capitals; and Christian religious knowledge (the Christian year, books of the Bible, church words). Christian only, as decided on 7 Nov.
- **Finding:** the "at least 6 per cell" test was already met (Science 21 to 27 per level, Humanities 11 to 21), so P6 targeted topics and formats instead. Coverage report: `docs/LEARNING-DESIGN.md` section 8.
- Guard tests: `p3Drafts.test.ts` now covers both P3 and P6 files with the real subjects; new `p6Drafts.test.ts` checks area, level, tile use and the Christian-only rule. No code or database change; nothing goes live until the owner imports the drafts.

## 7 November 2026 (branch `phase/p5-adapt`, not deployed) — P5: learning sessions, stickers, skill map, sound
- **Migration 0020 (needs the two-step release):** the attempt mode check allows `learn` (relaxing only), plus `learn_cards`, `skills`, `retry_questions` and `stickers`, all hanging off the child's profile and holding ids, counts and dates only.
- **Learning sessions** (`POST /attempts {mode:'learn', area}`, screen `/learn/:area`): ten questions from the child's level in one of four areas (literacy, numeracy, science, humanities), nearest the child's step, least recently seen first, and at most two earlier mistakes brought back first. Only a child set up by a parent can start one (guests save nothing). A session is private: no boards, no sharing, no friend challenge. Step is read from each quiz's existing difficulty (1-2 easy, 3 medium, 4-5 hard), so no content had to change.
- **The step rule:** 8 in 10 right twice running moves up one step, 4 in 10 or fewer moves down, at most one change a day, steps 1 to 5, start at 2. **Retry queue:** a wrong answer waits; a right answer removes it; a question that has gone is dropped quietly.
- **End of session:** stars, how the step moved, one sticker and a single next step. **Stickers (9)** are kept in a book on the child's profile. **Parents** see a step bar per area, sessions so far, where to practise next and stickers earned on each child's card, never which question was missed.
- **Home** shows four area tiles to a child. **Sound** (Web Audio, made on the device, silent unless the parent's Sound switch is on, no audio context even created while off) and a gentle tilt from the friend on the stage after a wrong answer.
- Not in this phase yet: the new home redesign (waiting for your landing notes).

## 7 November 2026 (branch `phase/p4-parent`, live since `be2a57b`) — P4: the parent area
- **Migration 0019 (needs the two-step release):** `children` and `parent_settings`. A child is a guest-role profile with a generated nickname, a preset avatar and a level; the parent's seven switches are all off until turned on.
- **Server:** parent routes need a verified Clerk sign-in (guest and child tokens get 403), every child call is scoped to its parent (another parent's child is 404), at most 5 children, hand-over issues a fresh child session and revokes older ones, removing a child or deleting a parent erases the children and their games. A child's device cannot delete the child. `GET /me` carries `switches` and `child.level`. **Fix:** the hourly clean-up of unused guests no longer deletes a child a parent set up.
- **`/grown-ups`** (Children, Switches, Contact; footer link): add a child by picking a level and a picture (nothing typed), change level or picture, re-roll the made-up name, hand over (the parent is signed out so coming back needs a new email code), remove. Typed contact fields live here for signed-in grown-ups.
- **Switches now act on the child path:** Public boards (leaderboards tab, quiz boards and ranked play, home weekly card; the daily board stays on), Challenge a friend, Beat the clock (sends `timed`), Slider questions (keypad unless on), Trivia and grown-up sets (hidden from lists, links still open), Sound (stored; sound itself comes in P5), Easy-read font (Atkinson Hyperlegible, self-hosted, loaded only when on). Guests get everything off.
- Privacy notice updated for parent accounts, children and erasure. New dependency: `@fontsource/atkinson-hyperlegible`.
- **A cleaner look everywhere (owner request, 7 Nov):** no bold text and no forced capitals across the whole app, the Studio included. Every weight class now renders at 500 (strong text at 600), the play stage no longer uses 800, wide letter-spacing and `uppercase` are gone, and the few headlines typed in capitals are sentence case. The landing's "Suggest a subject" tile is one wide tile that fills the row instead of the same tile repeated up to five times. The old display decisions stay in the design file; the full home redesign is still P5.
- **Fix (server): a game start could fail with a 503 when two players started at the same instant** (a database deadlock between the two start transactions). A transaction that loses a deadlock is now run again, up to three times, so neither player sees an error. This is also the cause of the one-off browser-test failure noted in the P2 audit.
- Browser tests: journeys that need boards or friend challenges play as a fresh child whose parent turned those switches on, one per test.

## 7 November 2026 (branch `phase/p3-content`, not deployed) — P3: literacy and numeracy content
- **38 new quiz drafts, 364 questions** in `backend/content/drafts/p3-*.txt`, in the Studio import format: 19 English (spelling taps, listen-and-spell, grammar, vocabulary, reading short passages) and 19 Maths (number facts on the keypad, patterns, fractions, percentages, algebra, data, order and sort), four to five per age band from 4–5 to 15–16. Once imported and published they bring every literacy and numeracy cell to 6 quizzes. They are drafts only: nothing is live and nothing was imported.
- Uses the new types: 50 tap-spell, 50 dictation, 15 gap, 19 order, 14 match, 17 sort, 143 number, 56 choice. Five sets are dictation, each with a written clue so it can still be answered where a device has no English voice; they must be switched to practice-only in the Studio.
- Prompts may now be up to 600 characters (was 300) so a reading question can carry its short passage; a long prompt is set as reading text on the play screen.
- The Studio editor has an "Allow ranked rounds" tickbox, so a practice-only set can be made (the server already stored the flag; the Studio had no way to change it).
- A guard test (`tests/unit/content/p3Drafts.test.ts`) keeps the drafts importable: no blocking problem, every question has a reason, no repeated prompt (also against the seed quizzes), UK spelling, every quiz at least 6 questions.

## 7 November 2026 (branch `phase/p2-assign`, not deployed) — P2 slice 2.2: match and sort, Studio forms, import lines
- **New question type `assign`** (match pairs: 2 to 5; sort into 2 or 3 groups: 3 to 6 things): the child taps a thing, then where it goes. Content format `assign: {variant, targets, items:[{label, to}]}`; the snapshot keys items and targets and stores the key as target ids. The server sends items and targets as per-attempt keyed handles in handle order and never the key, grades `{ "pairs": [[item, target], …] }` all-or-nothing, and refuses anything malformed with `400 invalid_pairs` (unknown, foreign or stored ids, repeats, missing items, two items on one match partner, wrong shapes). No migration: the answer is stored as labels in `attempt_answers.chosen_json`. Allowed in ranked rounds and the daily.
- **Studio**: new forms for spell (word, extra letters, dictation tick), gap (sentence, right words, extras, other right answers), order (cards), match (rows) and sort (groups and things), a live preview showing the right answer in green, and the validator mirrored on the client. **Fix:** saving from the Studio used to drop the `build` part of a tile question (the client sent only the old answer types); it now carries `build` and `assign`.
- **Import** reads `Spell: cat | extra: xz | speak`, `Gap: The cat ___ on the ___. = sat, mat | extra: dog | also: sits, mat`, `Order: a, b, c`, `Match: Fish = Sea; Bird = Nest` and `Sort: Odd = 3, 5; Even = 8, 12`. AI review stays for multiple-choice questions only.
- The Listen button's accessible name now starts with its visible word (found by the phone audit).

## 7 November 2026 (branch `phase/p2-tap-types`, not deployed) — P2 slice 2.1: build questions and number tiles
- **New question type `build`** (spell, fill the gap, put cards in order): the child taps tiles into spaces. The content format, validator and snapshot accept it (up to 20 tiles, up to 4 accepted answers, one `___` per gap, dictation by `speak`). The server sends the spaces and tiles as keyed per-attempt handles, always in handle order and never with an accepted sequence, grades the tapped handles on the server, refuses every malformed answer (`400 invalid_tiles`) and reveals the right tiles only after answering. The answer is stored as labels in `attempt_answers.chosen_json` (**migration 0018**, additive, not yet applied on the server).
- **Dictation is practice only**: a spell question with `speak` is never dealt in a ranked round or the daily, and a ranked quiz must keep at least 3 questions that are not dictation.
- **Number tiles**: number questions (the old slider) are answered on a tile keypad, no keyboard and no dragging; same `value`, same server check. The slider component stays for the parent switch (P4).
- **Read aloud**: a Listen button reads the question (or the dictation word) with the device's own British voice; hidden when the device has no English voice.
- The Studio opens and saves quizzes holding build questions without losing them (editing forms come in slice 2.2). Tile and key targets are at least 56 px.
- Docs: API and data model notes brought up to date (including the earlier daily ledger).

## 7 November 2026 (branch `phase/p1-cleanup`, not deployed) — P1 clean-up and foundations
- A guest can no longer gain typed fields: the server accepts the 13-17 and 18+ age bands only for a profile linked to a Clerk sign-in (`403 adult_sign_in_required`). Guests are not asked their age or shown a nickname box, and the Contact page loses the "I'm 18 or over" tick (grown-ups get the contact email until the parent area). Profiles that already hold an adult band keep working.
- Children are not timed by default: `POST /attempts` uses the quiz timer only when the request says `timed: true`; the quiz page says "No timer".
- A finished daily opened at `/daily/play` goes to `/daily` instead of an error screen.
- The play stage uses design tokens (new `stage-*`, `right-*`, `wrong-*` and `correct-soft`) instead of hex colours, shows normal case everywhere (no forced capitals, no small caps), and no longer says "Ranked". A unit test stops hex colours and forced capitals returning.
- Quizzes carry derived `area` and `level` labels (nothing stored).
- Not in this phase, moved to P4 with the parent switches: hiding quiz leaderboards, challenge-a-friend and trivia/18+ sets from the default path.

## 7 November 2026 (branch `feat/daily-live-crown`, deployed the same day) — private daily hands, live board, crown
- The daily gives every player their own 10 questions from all live quizzes except 18+, with no question shared between players until the whole bank has been dealt once (then a second lap). The least-dealt questions go first; one lock per day plus a unique key on the new `daily_deals` ledger make it hold for simultaneous starts.
- Daily page and results: a live board (refreshes every 10 s while open, quietly, and again when you return to the tab), a "Top score today" card, a crown on rank 1 and a "You're wearing the crown!" banner. The page is named "Today's challenge" instead of one quiz title; a short ten-stop route stays as decoration.
- A daily result now counts on the day's board only (before, it also fed one quiz's all-time and weekly boards). A daily hand cannot be sent as a friend challenge (`daily_not_shareable`), and its button is not shown. The Studio credits each daily answer to the quiz its question came from.
- Migration `0017_daily_deals.sql` (additive). It was released alone first, backed up and run on the server (backup `db-pre-migrate-0017-20261107T131208Z.sql.gz`) before this code went out. Phone layout: the three small stat tiles move to tablet and up; the leaderboard list no longer overflows narrow columns.

## 7 November 2026 (branch `feat/delete-unpublished-draft`) — delete a draft that was never published
- Studio → Editor: "Delete draft…" for a quiz with no published version; it removes the quiz for good after a confirmation. A quiz that has ever been published can only be retired (players, boards and dailies point at its versions).
- Server: `POST /admin/quizzes/{id}/delete` answers `{id, deleted:true}`; 409 `quiz_published` for a quiz that has a version; 404 `quiz_not_found` when it is gone. Recorded in the audit log as `quiz.delete` with the title. No migration.
- Content (done in Studio on live data, no code): 180 quizzes rewritten with 20 new label-free questions each, no repeats between bands, Bible questions limited to what a named book says or plain facts (see `.agent/CURRENT-TASK.md`).

## 6 November 2026 — Sonnet 5.5 by default
- The generator, the editor's AI helpers and the AI import review use Claude Sonnet 5.5 (`claude-sonnet-5-5`), with OpenRouter's `anthropic/claude-sonnet-5.5` as backup (ADR-022). Re-running `scripts/set-generator-keys.sh` moves a saved config off the old Opus default and prints the model in use.

## 6 November 2026 (branch `studio/ai-import-review`) — AI review of imports
- Studio → Import: after "Check questions" the AI reviews every multiple-choice question (by itself for up to about 100 questions; a "Review with AI" button for bigger files, with the number of AI calls shown first). Each question shows "looks fine", a flag with its reason, or a suggested fix as before and after with Accept and Reject; "Accept all" for the whole import or one quiz. Accepted fixes replace the question before the drafts are created, and the import audit records how many were accepted. A failed batch is shown with a Retry.
- Studio → Editor: the same "Review with AI" for a quiz already imported; an accepted fix is an edit, so the question needs ticking again.
- Server (ADR-021): `POST /admin/import/review`, up to 25 questions a call, questions fenced as untrusted data, every fix checked like hand-written content and turned into a flag if it fails, sources never changed, nothing saved; audited (`generator.review`) with a daily cap of 100 calls. Off until the generator keys are set.
- Studio on phones: the main area scrolls again (long pages such as Import could not be scrolled to their buttons).

## 2 November 2026 — 4–5 age band
- A 4–5 age chip on the home page and every subject page (it shows quizzes for ages 4–5 and the KS1 quizzes that start at 5); the 6–8 chip no longer needs to stand in for the youngest players.

## 1 November 2026 (branch `studio/import-2026-11`) — Studio import fixes
- Worlds: a quiz whose title is about the body (digestion, bones, senses, brain, heart, breathing, hormones, growth, medicine and similar) shows every question in the body world, so a prompt that says "waves" or "map" no longer gets an ocean or desert. A question's own scene still wins; other quizzes are unchanged.
- Sources are optional (ADR-019): a question without a source can be published; a source that is given must be https. Site copy (description, About, Contact, llms.txt) no longer says every answer is sourced.
- Studio → Import reads the owner's format: `# Science · Ages 4–5 · Topic` headings (each heading becomes its own quiz, titled "Topic (ages 4–5)" or "Topic (adults)", with its age band and a plain starting intro), `A) x  B) y*` options, `Why:` and markdown `Source: [url](url)` links. Imported questions arrive checked (ADR-019), so a quiz can be published straight away. The preview flags, without blocking, answers that repeat the question, yes/no answers to other questions, "which cells" questions answered with a process, repeated answer sets, repeated questions across quizzes and hard words for ages 8 and under.
- Studio editor: "Write the intro with AI" (from the quiz title) and "Write the explanation with AI" (from the question and its right answer) fill the field with a short draft to read and change; nothing is saved by the server, every call is audited, and there is a daily cap of 200. Shown only when the generator is on and a model key is set (ADR-020).

## 1 November 2026 (go-live branch `golive/2026-11`) — Security fixes from the go-live audit
- Answers: players now see per-attempt option ids keyed with a server secret instead of the stored ids. The stored ids were an unkeyed hash of each option's authored position, so a script could undo the shuffle; in the shipped content the right answer is written first in 59% of questions. Shuffling now follows the keyed ids too. No migration. Old ids are refused on purpose (accepting them would let a script submit "authored first option" directly), so a question on screen at the moment of release needs a reload; resuming a round works as before.
- Privacy: "Delete my data" now also removes the written answers a player left in their message threads, and the hourly clean-up of unused guests wipes their feedback message, email and written answers the same way (before, both kept that text for staff, against the privacy notice).
- Studio: source links on the Generator draft cards and the Check screen are only links when they are http(s), so a model-written `javascript:` source can never run in a staff session.
- SEO: release builds now prerender the 12 category and 46 quiz pages from the live public catalogue and fail if they cannot. Until now the release skipped this step without failing, so every URL on the live site served the same empty shell with the home page as its canonical link.
- SEO: the 7 info pages (About, How to play, Today's challenge, Leaderboards, Contact, Privacy, Terms) are prerendered from the app's own copy; category pages describe each quiz and link the other subjects; quiz pages link up to four sibling quizzes. Quiz titles add "quiz" when the title does not say so, and descriptions add the size and ages (shared helper `src/lib/seoText.ts`, used by the app and the prerender). Organization and WebSite JSON-LD in the shell; BreadcrumbList on every prerendered page. Home title now says what the site is. `public/llms.txt` added.
- Layout shift: the phone home holds the "Carry on" row and the category page holds the banner, description and list space while data loads. Measured locally on a throttled phone profile against live data: home CLS 0.30 → 0.002, category 0.26 → 0.001 (target under 0.1).
- API: `api.php` removes `X-Powered-By` itself, so the PHP version is never named even if the host has `expose_php` on or a request bypasses the .htaccess.
- Dependencies: in-range updates only (no majors): react-router-dom 6.30.6 (fixes the open-redirect advisory), vite 6.4.5, @clerk/react 6.18.4, @sentry/react 8.55.2, TypeScript 5.9, ESLint/Prettier tooling. `pnpm audit`: 41 advisories (21 high, all build/dev-time) down to 5 (0 high); the 2 production ones need React Router 7 and do not apply (BrowserRouter only, no navigation to user-supplied URLs). `composer audit`: none.

## 1 November 2026 — Daily auto-pick fix, generator providers, clean-up
- Daily auto-pick: the server's crontab had been emptied, so 1 Nov had no daily. Jobs restored; `GET /daily` and starting a daily round now activate today's daily themselves when the job missed it; the Studio calendar preview uses the quizzes live at pick time, so it matches the real pick.
- Generator: Anthropic is the default writer and searcher, OpenRouter (same Claude Opus 5.5) the backup; Bright Data is optional. `scripts/set-generator-keys.sh` saves keys on the server with hidden prompts.
- Clean-up: removed blank template docs and pre-launch records (FTPS setup, rebrand verification, old cPanel evidence, launch/release stubs, PWA/API/email templates); rewrote README, project memory, security, backup and deployment docs; removed dead code (`useOptimizedImage`, `settingsService`, unused helpers) and FTPS-era scripts; `check-rebrand.py` checks only tracked files; `cron-ensure.sh` refuses to install when the crontab cannot be read.

## 31 October 2026 (evening) — Profile, info pages and on-site replies
- One profile page (`/me`): character picker, nickname, stats, messages, rounds and best scores. The avatar menu is gone; the avatar in the top bar links straight to the profile and shows a dot for a new reply. `/me/avatar` now opens the picker on the profile.
- Nicknames can be changed once (migration 0016). Children and players with no age pick from four generated names; 13+ may also type one. No two players can take the same name in a change. A confirm step says it is final.
- Replies live on the site: players read Studio replies under Messages; teenagers and adults can write back, which puts the thread back to "new" in the Studio inbox. Staff can now reply to any message (children can read, not write). Email is optional.
- How to play, About, Privacy, Terms, Contact and Settings share a full-width shell with a side menu and "On this page" list.
- Footer: removed "Parents and staff" and the "nicknames only, no adverts" line.

## 31 October 2026 (later) — Generator, tidy-up
- Sourced question generator built and switched off (Studio → Generator): trusted-site search and page reading through Bright Data, drafts from Claude using only that text, quote/source/rule/duplicate checks, approve and send to a quiz. Migrations 0014, 0015. ADR-016.
- Removed HeroTeaser, SkyBackdrop, ProgressDots and TimerBadge (unused after the redesign).
- Inbox reply emails tell grown-ups to answer through the contact form (sender is no-reply).
- ESLint ignores `backend/vendor`.

## 31 October 2026 — Pop & Ink rebrand, Studio and one board for every subject
- Our own logo (grape speech bubble, lemon question mark) across the header, footer, favicon, app icons and share image (`scripts/brand-assets.mjs`).
- Pop & Ink colours, Baloo 2 + Outfit fonts, 13 illustrated object characters (avatar ids unchanged) and eight worlds. Every question now plays inside its own world on a framed game stage; the explanation is a sheet inside the frame. ADR-014.
- New Home (desktop hero with a real practice question; separate phone layout), subject and quiz pages with world banners, Daily and Leaderboards that fit one screen, Me inside the avatar menu.
- Overall leaderboard across every subject: Today (default), week, month, all time; points, then accuracy, then speed (`GET /leaderboards/overall`). ADR-015.
- Contact and feedback: preset messages for players, written messages and email for adults only; report a question from the game. Everything lands in the Studio inbox (`POST /feedback`).
- Studio (`/admin`): library, editor with live preview, import from pasted text or files, checks, publish/retire/restore, daily calendar, rounds, subjects, players, activity and the feedback inbox. The database is the content master. The sourced question generator is built but switched off until its cost is approved.
- Grown-up Clerk sign-ins now link to a server identity (`POST /account/session`).
- Migration `0013_cms_feedback.sql` (additive): quiz drafts, version dates, review actions, hidden rounds, feedback tables.
- `scripts/test-backend.sh` runs every backend suite against the local test database.
- "Delete my data" now also wipes any message or email written in feedback; privacy notice updated (31 October 2026).
- Studio: white sidebar grouped Work / Content / Site, breadcrumbs and a ⌘K search palette, matching design file v2.0.

## 2026-10-30
- Docs tidy (owner rule: one source of truth): Markdown moved into docs/, audits and checklists merged into docs/AUDIT.md, exact duplicates removed, links updated. No code changed.


## 27 October 2026
- Ranked games are 20 random questions from the quiz pool (practice 10, daily fixed at 10). Boards rank by correct/total so mixed round sizes compare fairly.
- Leaderboard likes: one per player per entry, not your own, removable, totals only (migration 0011, `POST /likes`, heart button). Released to live (frontend run 40457359055, commit 501026a).
- Live moved to a fresh database `devgeereact_doyouknow` (old `devgeereact_dykspace` dropped after a verified final dump; old players and scores not carried over).
- Dev server proxies `/api` to a local PHP API (`vite.config.ts`).
- Admin area Phase A (NOT released): guarded `/admin` API, `admin_audit` (migration 0012), lazy noindex staff shell, dev-only token script, `admin_subjects` config key. Plan: `docs/01-product/ADMIN-AREA-PLAN.md`.
- Disposable test setup moved to gitignored `.local-test/`; DB-backed tests refuse to run unless the config is inside it and is a local `_test` database (`backend/tests/guard.php`). Reports, caches and temp files also go there.

## Unreleased — new-domain baseline, 25 October 2026
- Rebrand imported Do You Know source for doyouknow.space.
- Fresh README, project memory and Claude Code handoff.
- Manual-only verification/public FTPS workflows and independent coming-soon payload.
- Remove inherited deployment assumptions and default old contact mailbox.

No release to doyouknow.space was performed by this task. Imported version numbers and modules do not imply a released version on the new domain.
