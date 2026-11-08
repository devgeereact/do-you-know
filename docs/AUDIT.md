# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-11-08 · Phase 1 code review (standard depth, 12 files), by the GSD reviewer

Result: 0 critical, 5 warnings, 5 info. Fixed with tests the same day: WR-01 (shared `/me` across sessions), WR-03 (DST in yesterday and the 7-day strip), the tap interception in WR-04. Open: WR-02 (out-of-order profile responses), WR-05 (`/grown-ups` loading with no timeout), the info items. Full report and resolution table: `.planning/phases/01-clean-up-and-foundations/01-REVIEW.md`. Checks after the fixes: `pnpm check` 405 unit PASS, browser suite 86 of 86 PASS. NOT TESTED: a phone.

## 2026-11-08 · Phase 1 close-out (clean-up and foundations, shipped 7 Nov as fc7b41e), by Claude Code

Scope: each "Done when" line of Phase 1 in `.planning/ROADMAP.md`, checked read-only on branch `phase/p1-housekeeping`. Commands run in this check: `pnpm vitest run <the five named files>` (5 files, 63 tests, all passed), the full `pnpm vitest run` (43 files, 398 tests, all passed), and `grep` over `src`, `tests`, `scripts`, `backend/src` and the config files. **Not run, by the owner's rule for this task:** any database, the PHP backend suites, the browser suite, the live site and a phone. Those results are NOT TESTED here, even where an older run passed; the test names are cited so they can be re-run.

| # | Done-when line | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Guest: no free-text field anywhere; server refuses an adult band without sign-in | **PARTIAL** | Seen passing now: `tests/unit/components/ChildPathTyping.test.tsx` (5 tests: nickname picker asks no age question and offers no text box; Contact has no "18 or over" tick and no free-text field; points to the contact email; a profile already holding an adult band keeps the form). Code present: `backend/src/Player.php:52` throws `adult_sign_in_required` (403). **NOT TESTED:** the refusal test `backend/tests/integration.php:127-136` (guest cannot claim `13_17` or `18_plus`; age stays unset; typed nickname still refused); the browser test `tests/e2e/ranked.spec.ts:100` "guests never get a free-text name box" (it covers the nickname change on `/me` only, not Contact); the by-hand phone check. |
| 2 | No hex colour and no `uppercase` in the play-stage CSS or components | **DONE** | `grep -nE '#[0-9a-fA-F]{3,8}\b' src/components/game/*.tsx src/pages/PlayPage.tsx` returned nothing; `grep -nE '\buppercase\b\|small-caps'` on the same files returned nothing; the same two patterns over the stage block of `src/index.css` ("The game stage" to "Scene motion") returned nothing. Guard that fails if they return: `tests/unit/lib/stageStyle.test.ts`, passed now (part of the 63). The "Ranked" tag is gone from the child path: `src/pages/PlayPage.tsx:239-240` sets the mode label to `null` for ranked. World palettes in `src/lib/worlds.ts` are illustration data and outside the guard by design. |
| 3 | The Play tab never shows "Uh-oh" after a finished daily; daily board and crown still work | **DONE** (closed by the evidence below) | The fix is a redirect, not a changed link target. `src/pages/PlayPage.tsx:311-313` sends `daily_already_played` to `/daily` with `<Navigate replace />`, so the Play tab (`src/components/navItems.tsx:57`), the header button (`SiteHeader.tsx:108`) and the two Leaderboards links (`LeaderboardsPage.tsx:189, 257`) still point at `/daily/play` and rely on it. Only the home page picks its target from `playedToday` (`HomePage.tsx:180, 493`). Seen passing now: `tests/unit/hooks/useQuizAttempt.test.tsx` (the hook exposes `errorCode: 'daily_already_played'` with friendly copy) and `tests/unit/components/DailyLeader.test.tsx`. **Gap:** the plan expected a unit test of the link target by `playedToday`; none exists. The redirect itself is covered only by `tests/e2e/daily.spec.ts` ("play today once, then the app says it is done", which opens `/daily/play` again and expects `/daily`) and the backend refusal by `backend/tests/competition.php:96` and `daily_deal.php:124`: all NOT TESTED here. |
| 4 | Area and level on `GET /quizzes`, covered by a test using the live catalogue's shapes | **DONE** (closed by the evidence below) | Code present: `backend/src/Catalog.php:175-176` sets `area` and `level` on each row; the types are in `src/types/domain.ts` (lines 110 and 136). Tests exist and are NOT TESTED here (they need the backend): `backend/tests/unit.php:144-170` (category and topic cases, odd age bands, 18 and over, no age) and `backend/tests/integration.php:49, 51` (single quiz and list both carry `area` and `level`, and `category_slug` stays private). |
| 5 | Every existing route still loads; existing tests pass unchanged except those that pinned the old behaviour | **DONE** (closed by the evidence below) | Seen now: the whole unit suite passes (43 files, 398 tests). **NOT TESTED:** route loading and the browser suite (needs a database), the backend suites, `pnpm check`'s build step. |

**Result.** One line is DONE (2). Four are PARTIAL because their server or browser proof was not run in this check, not because anything failed. No criterion failed anywhere that was run. To close the PARTIAL lines, run `bash scripts/test-backend.sh` (suites `unit integration competition`) and `pnpm test:e2e` (`ranked`, `daily`, `privacy`) on the throwaway stack, then add the results here. The missing link-target unit test (line 3) is a small test to add if you want the Play-tab behaviour pinned at unit level.

**Closing evidence (8 Nov, later the same day, branch `phase/p1-housekeeping` at b672c42).** Run after the check above, on the throwaway stack (MariaDB 11.4 on port 33999, nothing live): `bash scripts/test-backend.sh` PASS, exit 0, every suite (unit; integration 110 checks, which includes the adult-band refusal; competition 79; daily 20; daily_deal 43; build 31; assign 39; parent 64; learn 50; concurrency 9; feeds 35; content 135; cleanup 10; seo 27; admin 12; and the rest) and `pnpm test:e2e` 86 of 86 PASS (includes `daily`, `ranked`, `privacy`, `play`, `browse`), `pnpm check` PASS (398 unit), `npm run verify` PASS (37 of 37 Apache checks). That turns lines 3, 4 and 5 to DONE. **Line 1 stays PARTIAL:** the unit and server proof is seen, but the by-hand check of a guest on a phone was not done (NOT TESTED). **Finding on line 3:** the no-"Uh-oh" behaviour comes from the redirect in `PlayPage.tsx`, not from every link choosing its target; the Play tab, header button and Leaderboards links still point at `/daily/play`. It works (the daily browser test passes) but costs one extra navigation; planning a link-target unit test is optional.


### Dead code for your approval (nothing deleted, moved or edited)

Searched `src`, `tests`, `scripts`, `backend/src`, `backend/tests`, `index.html`, config files and `docs`. The untracked copies under `.claude/worktrees/` are stale agent checkouts and are left out. `package.json` lists no ImageKit or PostHog package, so removal touches no dependency.

**ImageKit** (no code requests an ImageKit URL; `docs/VERIFIED-STATE.md:56-57` agrees)

| Path | Verdict | Grep evidence |
| --- | --- | --- |
| `src/lib/imagekit.ts` (`buildImageKitUrl`, `ImageTransform`) | REMOVABLE | No importer: the only hits for `lib/imagekit`, `buildImageKitUrl` and `ImageTransform` are inside the file itself. |
| `src/lib/env.ts:11-12, 47-48` (`imagekitUrlEndpoint`, `imagekitPublicKey`) | REMOVABLE | Only reader is `src/lib/imagekit.ts:17`. |
| `src/vite-env.d.ts:9-10` (`VITE_IMAGEKIT_*` types) | REMOVABLE | Type declarations only. |
| `vite.config.ts:41-42` (env name list) and `129-136` (Workbox `CacheFirst` rule for `ik.imagekit.io`, cache `imagekit-media`) | REMOVABLE | Nothing in the app requests that host. Removing the rule changes the service worker; devices keep an old `imagekit-media` cache until it is cleared. |
| `.env.example:10-11` (`VITE_IMAGEKIT_*`) | REMOVABLE | Example file only. |
| `.htaccess:96` (`https://ik.imagekit.io` in the Report-Only CSP) | REMOVABLE | Server config; any change here is deployed, so it needs its own approval. |
| `src/pages/PrivacyPage.tsx:165` (says ImageKit "may deliver some quiz pictures") | IN USE as visible copy | Read by every visitor to the privacy page. It should be edited in the same change as the code removal. `docs/VERIFIED-STATE.md:57` records that `image_url` is never set in the content; NOT TESTED against the live database. |
| Docs: `docs/02-architecture/ARCHITECTURE.md:17, 58, 138, 193`, `docs/01-product/PRODUCT-SPEC.md:174`, `docs/08-change-management/DECISIONS.md:7`, `docs/DIRECTION.md:33`, `docs/REPLAN-CURRENT.md:40, 43`, `docs/VERIFIED-STATE.md:56-57`, `CHANGELOG.md:6`, `.agent/CURRENT-TASK.md:7` | IN USE as text | Mentions that would go stale on removal; update with it. |

**PostHog** (settings only; no SDK, no network call, no consent code)

| Path | Verdict | Grep evidence |
| --- | --- | --- |
| `src/lib/env.ts:15-16, 51-52` (`posthogKey`, `posthogHost`) | REMOVABLE | `posthogKey` and `posthogHost` are read nowhere in `src`, `tests`, `scripts`, `backend/src` or `index.html`. |
| `src/vite-env.d.ts:12-13` (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`) | REMOVABLE | Type declarations only. |
| `vite.config.ts:44-45` (env name list) | REMOVABLE | Names only. |
| `.env.example:12` (`VITE_POSTHOG_KEY`) | REMOVABLE | Example file only. |
| `.github/workflows/verify.yml:29` (`VITE_POSTHOG_KEY: ''` in the check step) | REMOVABLE | Sets an empty value for a variable nothing reads. |
| `.htaccess` | n/a | No PostHog entry in the CSP. |
| Docs: `docs/02-architecture/ARCHITECTURE.md:36, 194` (calls PostHog "optional, consent-gated", which is no longer true), `docs/REPLAN-CURRENT.md:40, 43`, `docs/VERIFIED-STATE.md:58`, `docs/DIRECTION.md:33`, `CHANGELOG.md:6` | IN USE as text | Update with the removal. |

**Decision for you.** Remove all of the above in one focused commit on a branch (files: `src/lib/imagekit.ts` deleted; `src/lib/env.ts`, `src/vite-env.d.ts`, `vite.config.ts`, `.env.example`, `.github/workflows/verify.yml`, `src/pages/PrivacyPage.tsx` and the docs edited), with the `.htaccess` line as a separate, later server change. It needs your explicit OK because it deletes a file and edits the privacy copy.

## 2026-11-08 · Live smoke test (guest and child path, parent area, Studio), by Claude Code in the owner's signed-in Chrome

Scope: https://doyouknow.space on a desktop window, read-only for the parent area and Studio (nothing toggled, imported, published or deleted), one practice question answered as the signed-in guest. **NOT TESTED:** a real child session (hand-over would sign the parent out and needs an email code; the child path is covered by the browser suite, 82 of 82 on 7 Nov), the phone-width layout (the browser window would not resize the viewport), the new P3 and P6 content (not imported yet).

**Worked.** Home, `/daily` (countdown, live board, streak), practice play with feedback, `/grown-ups` (parent sign-in recognised; Children, Switches and Contact tabs load; seven switches all off), Studio (To do, Library 262 quizzes and 5,689 questions all live, Check and publish, Import, Players), `/health`. No console errors on the pages visited.

**Needs fixing (most important first).** (Phone-width home checked after the window resized.)
1. **Wrong counts on the home page.** The hero says "100 quizzes" and "Showing 8 of 100", and the subject tiles show "0 quizzes" for Science & Nature, Geography, History, Tech, Bible & Faith, Maths, English, Computing and more. Cause: the home counts the list returned by `GET /quizzes`, which is capped at 100 (`LIMIT 100` in `Catalog.php`), but the library holds 262. After the P3 and P6 imports the gap grows. Also "Show all 76 quizzes" appears after "100" for the same list.
2. **Adult sets on a children's front door**, on desktop and on the phone home: "Everyone" and "Popular this week" list "Brain and nerves (adults)" and "The senses (adults)"; the "Try one" card showed "Sport and games (ages 15 to 16)".
3. **Returning visitors see the previous build until they tap "Update now".** My first look at the home page was served from the old cache (it still had capitals and bold labels); after the update the current build is clean (no uppercase, no bold, no wide tracking, checked in the page). A child on a stored home-screen app can therefore see an older design for days. The update should apply on the next page change, not wait for a tap.
4. **A dead end for a guest on `/learn/:area`:** "Uh-oh" with a "Try again" button that can never work. It should say plainly that a grown-up sets this up, with one button home.
5. **Phone home dead end and no areas.** The phone home ends after six quizzes with no way to browse the rest except 14 subject chips (General Knowledge first); the four areas (Words, Numbers, Science, Our world) are not offered to guests, and the "Carry on" card is cut off at two thirds width. On desktop the subject grid repeated "Suggest a subject" four times and showed "0 quizzes" for empty subjects (before the update).
6. **Scene does not match the topic:** the animal quiz is drawn in the "Long ago" world with pyramids.
7. **Feedback screen:** the "+1 · keep going" text is tiny and sits under the confetti; the friend (owl) is hidden behind the answer panel.
8. **The Studio Library "Level" column still shows KS1, KS3 and All**, not the child-facing levels (Starters to Scholars).
9. **The Studio daily calendar** lists anchor quizzes such as "Geography (adults)" although the daily now deals mixed hands and never includes 18+ questions; it reads as if adults' questions will be asked.
10. **The `/grown-ups` page shows plain "Loading…" for about two seconds**, and with no children yet it is mostly empty. A friendlier first-run (what a child gets, what the switches do) would help.

**Status (8 Nov, branch `phase/p7-home`, not released):** items 1, 2, 3, 4, 5, 6, 8 and 9 are fixed on the branch with tests (counts and paging, adult sets, update timing, guest screen, area browsing, scene by quiz title, Studio level and difficulty, daily anchor). Items 7 (feedback screen: friend now above the answer panel, larger cheer line) and 10 (`/grown-ups` first run: loading card, what-you-get list, clearer empty state) were fixed afterwards on the same branch (not yet released); the desktop "Try one" card now picks a primary-age quiz. Checked on the throwaway stack: desktop screenshots of both feedback states; NOT TESTED on a phone or on the live site.

**How to make it better.**
- One honest source for counts (a `quiz_count` on each category and a total on `GET /categories`), and paging on the quiz list instead of a hard cap.
- Make the four areas (Words, Numbers, Science, Our world) the front door for everyone, with the daily as the one big card and the sample question as a live, playable card.
- Hide 18+ sets from every public list unless the viewer chose them; keep the Trivia switch for children.
- Studio: show the child-facing level and a difficulty picker in the Library list, since learning steps follow difficulty and every import lands as "medium".
- Phone-width and screen-reader passes on the new learning screens, and a real hand-over test by the owner.

## 2026-11-07 · P6 content review (science and humanities drafts)

Reviewer: Claude Code authored 23 drafts (215 questions); one independent review agent then read every file cold as a fact-checker and primary teacher, with no access to my conclusions.

- **Mechanical checks (all PASS).** Every question parses with the Studio importer with no blocking problem and a reason line; the real server validator (`Content::validateQuiz`) accepts all 23 quizzes with 215 questions; no prompt repeats within the drafts or against the seed quizzes (12 repeats found and rewritten); tile labels are 24 characters or fewer; no American spellings; `p6Drafts.test.ts` confirms each quiz lands in the right area and level, every quiz has a tile question, match, sort, order and gap are all used, and no other faith is named.
- **Review findings, all fixed.** 10 factual errors (Ireland shares a land border so it cannot be a "mainland versus island" example; Ascension is 39 days after Easter Sunday, so the day counts were removed; granite forms from magma; a circuit works without a switch; not every metal makes hydrogen with an acid; "steam" is liquid droplets; "Tudors came to Britain"; a force list that included magnetism wrongly; a spire; a gospel birth claim), 10 answers a second option could defend (for example fox and burrow, window frames, the item "tablet" in a long-ago sort), 5 items below the age band (binary at 15-16 rewritten to 8-bit and byte values, baptism at 12-14), 4 neutrality points in Bible and Faith (stems now name the gospel, "celebrate" instead of "remember", plain distractors beside a sacred practice) and 13 reason lines that only repeated the answer. Low-severity level notes on two easy items were left.
- **Ages 15–16 humanities (3 quizzes, added 8 Nov).** A second cold read found no wrong date or sequence, and 12 smaller points, all fixed: an off-theme India date replaced by the Warsaw Pact; a true/false on the Berlin Wall (below GCSE) replaced by why it was built; circular or word-matching Match items (oxbow lake, letters named after their cities) rewritten; Pannotia (a contested supercontinent) dropped; a KS3 condensation gap replaced by coastal erosion; Stephen's stoning no longer given away by an Order card; "first" martyr and "lived before Jesus" claims removed as not what Acts says.
- **Stricter Christian rule applied (8 Nov).** An earlier Studio rewrite kept Bible questions free of "doctrine, sacraments, saints or denominational practice". The church-parts match (altar, font, pulpit, nave, spire) was replaced by a match from what the gospels say about named people. Still in, as plain facts or gospel accounts: the Christian calendar (Advent, Lent, Palm Sunday, Holy Week, Pentecost), the Jordan baptism and the bread and wine of the Last Supper. The owner can ask for these to go too.
- **Neutrality.** Every Bible and Faith question is what a named gospel or book says, or a plain fact about Christian practice or the calendar. No other faith is named (test). No doctrine stated as fact.
- **Not covered.** Nobody has yet read these as the owner will, and the AI review cannot grade tile questions. The questions were not played on a device. Facts rest on well-known sources, with no source link on each question (the Why line carries the reasoning); the owner can add a source in the Studio. Quiz difficulty is left at "medium" on import, so adaptive steps need difficulty set in the Studio (P5 note).
- **Child safety.** No personal data, no real children's names, nothing frightening.

## 2026-11-07 · P5 learning sessions (scope, data, fairness, sound)

Reviewer: Claude Code, focused review of `Learn`, the learn branches in `Game`, `/me/learn`, `/parent/children/:id/skills` and the new screens (security-audit skill, guidance mode, local tests only).

- **Who may play.** Only a profile with a `children` row can start a session (403 `child_required` for guests and adults, tested); area is checked against a fixed list (400 `invalid_area`). Sessions are excluded from every board and from friend challenges (`learn_not_shareable`), tested.
- **Answers stay hidden.** A learn hand is an ordinary attempt: the same keyed handles, the same grading, answers only after `/answer`. The hand is chosen by id on the server and the browser sees only questions one at a time.
- **Data.** The skill record, queue and stickers hold ids, counts and dates; the parent's skill map reply is tested to contain no question text, prompt or nickname. All four tables cascade with the child's profile; removing a child erased skills, queue, stickers and sessions in the test.
- **Scope.** A parent can read only their own child's skills (another parent gets 404, a child's token 403). Mutation checks: raising the retry cap, dropping the one-change-a-day rule, keeping a queue row after a right answer and removing the ownership check each made the suite fail.
- **Correctness.** The step rule is table-tested (14 cases: caps at 1 and 5, one change a day, scaled for shorter rounds). Finishing twice records once and returns the same stored summary. A queued question that no longer exists is dropped, not dealt. Queued questions wait as retries and are never dealt as fresh ones meanwhile.
- **Sound.** Web Audio tones made on the device; no files, no network. With the switch off no audio context is created at all (tested); a device without Web Audio or one that blocks it stays quiet without an error.
- **Known limits.** Steps follow each quiz's existing difficulty: the P3 quizzes were imported as "medium", so until their difficulty is set in the Studio a child at step 1 to 5 sees mostly the same medium sets (the session still works; adaptivity grows as difficulty varies). Dictation questions can be dealt in a learn session; each has a written clue for a device with no voice.
- **NOT TESTED:** migration 0020 on the live database; a full child session on a real phone; the new screens with a real Clerk sign-in (the skill map shows inside `/grown-ups`).

## 2026-11-07 · P4 parent area (sign-in scoping, children's data, hand-over, erasure)

Reviewer: Claude Code, focused review of `Family`, the `/parent/*` routes in `Api.php`, `Player::own`/`delete`/`erase`, `bin/cleanup.php`, the `/grown-ups` page and the switch effects (security-audit skill, guidance mode, local tests with locally signed test tokens only; nothing run against the live site).

- **Who may call.** The parent routes sit behind `Identity::profile` (a verified Clerk token: issuer, authorised party, expiry, not-before, issued-at, `user_` subject, `sess_` id), then refuse any `guest_` token with 403 `parent_sign_in_required`, so a child's token can never reach them. A verified sign-in with no linked profile is 401. Tested for no token, guest, child, unlinked and made-up tokens on every route. Mutation check: removing the guest refusal made the suite fail. PASS.
- **Scope.** Every child action calls `owned()`: the child must be in `children` with this parent's id; anything else, existing or not, is the same 404 `child_not_found`, so ids cannot be probed. Tested both ways across two parents for change, remove and hand-over. Mutation check: dropping the parent condition made the suite fail. PASS.
- **Children's data.** A child holds a generated nickname, one of 12 preset avatars and one of five level names. The routes reject any other key (typed nickname, name, birthday, age, URL avatar) with 400, tested. No identity row, no age band and no email exist for a child; a child cannot claim an adult band (403). PASS.
- **Hand-over.** A 256-bit random `guest_` token, stored only as its hash, replaces any earlier session of that child, and the response goes only to the signed-in parent. The browser installs it, then signs the parent out; if the sign-out fails the child token is dropped again so the device is never half handed over (unit-tested). **Residual (accepted):** the lock is the Clerk sign-out in the browser; the server does not end the parent's Clerk session, so a parent who is signed in on another tab or device stays signed in there. A PIN is a possible later change.
- **Erasure.** Removing a child, or deleting a parent, erases child profiles, their sessions, games and feedback text; `/me/delete` from a child device is refused (403). Tested including the games. **Found in review and fixed:** the hourly clean-up of unused guests would have deleted a child who had not played for 30 days after their code expired; children are now excluded (clean-up test added).
- **Switches.** Names come from a fixed list and values must be real booleans (tested: unknown, numbers, strings, empty all 400); the column name interpolated in the update is taken from that list only. A child sees only its own parent's switches; guests see all off (tested). PASS.
- **Disclosed limits.** "Trivia and grown-up sets" hides lists but not the daily hand, which is drawn from all live non-18+ quizzes (trivia questions can appear there). "Public boards" off makes the play buttons practice, but a direct `/play/:slug` link is still a ranked round. The daily board and its crown stay on for everyone, as decided.
- **NOT TESTED:** the real Clerk sign-in, modal and email code (the owner tests this on the live site after release; locally the server side was tested with locally signed tokens); the page at `/grown-ups` in a browser with a real session; migration 0019 on the live database.

## 2026-11-07 · P3 content review (literacy and numeracy drafts)

Reviewer: Claude Code authored; two independent review agents then read every file cold (one as an English teacher, one as a maths teacher, with no access to my conclusions) and recomputed every answer.

- **Mechanical checks (all PASS).** Every question parses with the Studio importer with no blocking problem and a reason line; the real server validator (`Content::validateQuiz`) accepts all 38 quizzes, with ranked rounds on except for the five dictation sets; no prompt repeats within the drafts or against the 46 seed quizzes; no American spellings (word list); every quiz has 6 or more questions. Numeracy answers are computed by code from the same expressions the prompt describes.
- **Review findings, all fixed.** Maths: no wrong answers; fixed one garbled reason, the pound sign shown after a number (now "in pounds" in the prompt), a true minus sign versus a hyphen on negative cards, "about how many" wording on an exact answer, and several items too easy for 12–16 (replaced with GCSE-style items). English: fixed decoys that also fit their gap ("The cat sat on the dog"), two gap questions with no time word so two tenses fitted, a dictation clue that used another answer, false spelling hints (stationery, twelfth, privilege, vegetable, queue, whole, principle, disagree), a sort item that is also a noun, alliteration in the personification and alliteration examples, and KS1-level grammar and vocabulary in the 9–14 sets and KS2-level terms in the 15–16 set (replaced).
- **Not covered.** Nobody has yet read these as the owner will (tone, fit with your classes). The AI review cannot grade tile questions. The questions were not played on a device: the tile screens were exercised in the browser suite, the new content was only parsed and validated.
- **Child safety.** No personal data, no names of real people (generic first names only), nothing frightening; dictation sets carry a written clue so a device with no English voice can still play.

## 2026-11-07 · P2 slice 2.2: the assign question and the Studio forms (grading, answer hiding, authoring)

Reviewer: Claude Code, focused review of `Game::tappedPairs`, `Game::answer` (assign branch), `Game::state`, `Content::validateAssign`, the snapshot and the Studio save path (security-audit skill, guidance mode, local tests only).

- **Answer hiding.** The payload is the variant plus items and targets as per-attempt keyed handles, sorted by handle. The key (`target` on each stored item) is never sent; items and targets never appear with a stored id (tested on every served question). The right pairs are returned only by `/answer`, as labels. PASS.
- **Grading is server-side and strict.** The input must be a list with exactly one `[item handle, target handle]` pair per item; every handle must be one this attempt issued, no item twice, and for a match no partner twice. 18 forged shapes (unknown, stored, foreign handles, an item used as a target, repeats, missing or extra pairs, objects, numbers, flat lists, strings, null), an `option_id` and a `tiles` body each return `400 invalid_pairs` and are never counted; extra fields such as a score are ignored. Mutation check: removing the repeated-item check and the match-partner check each made the suite fail. PASS.
- **Fairness.** One try per question, so guessing gains nothing beyond the same odds as a choice question (a 3-item match has 6 arrangements). Timer, daily hand and ranked round treat assign like any other type (tested). PASS.
- **Child safety.** Everything is a tap; no text box on the new screen (browser-tested at 390 px and desktop); stored answers are content labels. PASS.
- **Studio.** Tile text is entered by signed-in staff only and rendered as text, never HTML. Authoring forms only build the exact shapes the server validates; the server remains the authority (blank and broken tile questions save as problems, never as errors). The previous save path silently dropped the `build` part; fixed and unit-tested. PASS.
- **Phone audit** (390 px, axe-core): no violations and no sideways scroll on the assign screen. It found the Listen button's accessible name ("Read it aloud") did not contain its visible word; fixed.
- **Flake, explained later (7 Nov, P4):** the one-off mobile assign failure was a database deadlock between two game starts (HTTP 503). Fixed in P4 by retrying a transaction that loses a deadlock (`Database::transaction`, tested).
- NOT TESTED: the Studio forms in a real browser (they need an admin sign-in; covered by 22 unit tests and the server round-trip tests only); a real device voice; the live database.

## 2026-11-07 · P2 slice 2.1: the build question (grading, answer hiding, child safety)

Reviewer: Claude Code, focused review of `Game::state`, `Game::answer`, `Game::tappedLabels`, `Game::start`, `dealDaily`, `Content::validateBuild` and the new screens (security-audit skill, guidance mode, local tests only).

- **Answer hiding.** The payload holds the variant, the number of spaces, the tiles as per-attempt keyed handles (HMAC of attempt and tile id, never the stored id) and, only for a gap, its sentence. The accepted sequences are never sent (tested: no `answers`, no flag, no stored tile id in the payload). Tiles are always in handle order, never authoring order, so the order of a file cannot spell the answer. The right tiles come back only in the reply to `/answer`. PASS.
- **Grading is server-side and strict.** The input must be a list of exactly as many strings as there are spaces, each a handle this attempt issued, none repeated; anything else (unknown handle, a stored tile id, another attempt's handle, repeats, too few or too many, numbers, nested lists, an object, a string, null, an option id) is a `400 invalid_tiles` and is never counted (12 forged shapes tested). Extra fields such as a score are ignored. Mutation checks: allowing repeated handles, and allowing dictation in ranked rounds, each made the tests fail. PASS.
- **Timer.** A timed build question that runs out scores nothing and needs no input (tested). PASS.
- **Dictation (the one disclosed exception).** The spoken word is in the payload of a dictation question by necessity (the device has to say it), so someone with browser tools can read it. It is therefore practice only: excluded from ranked rounds and the daily (tested), and a ranked quiz must keep 3 non-dictation questions (validated). It touches no board. ACCEPTED.
- **Letters are visible by design.** A spelling question shows its letters (plus decoys), so it is easier than free typing; this is the task, not a leak. ACCEPTED.
- **Child safety.** Everything is a tap: no text box on any new screen (browser-tested), answers are stored as tile labels from content, never text typed by a child, and the rows go with the attempt. Read aloud uses the device's own voice and sends nothing anywhere; it speaks only when tapped. PASS.
- **Input handling.** Content labels are plain text, 1 to 24 characters, no control characters, at most 20 tiles and 12 spaces; all SQL is prepared; labels are rendered as text, never HTML. PASS.
- **Known gap (not a security issue):** a dictation question is unplayable on a device with no English voice. Dictation will be offered as its own quiz sets (P3), so a child can choose not to play one.
- NOT TESTED: migration 0018 and the new code on the live database (needs your approval and the two-step release); a real device voice (headless browsers have none).

## 2026-11-07 · P1 clean-up: typed-field gate, timer default, labels (security, child safety)

Reviewer: Claude Code, focused review of the P1 diff on `phase/p1-cleanup` (security-audit skill, guidance mode, source and local tests only; nothing run against the live site).

- **Typed-field gate (T1).** `Player::ageBand` is the only code that writes `profiles.age_band`, and it now refuses 13_17 and 18_plus (403 `adult_sign_in_required`) unless the profile has a Clerk identity. Only `Identity::adult` (a verified Clerk token plus an adult confirmation) and the local-only `bin/dev-admin-token.php` create a Clerk identity, so a guest cannot give itself one. `Feedback::mayWrite` already allowed any Clerk-linked profile, so the two rules now agree. Tested: both bands refused for a guest, band left unset, typed nickname still refused (`age_band_required`), under_13 still allowed (it only restricts), a Clerk-linked profile may set an older band. PASS.
- **UI (T1).** Guests are never asked their age, never shown a nickname box and have no "I'm 18 or over" tick; Contact shows the grown-up email only when one is configured. Unit-tested, and the tests were shown to fail on the old code. PASS.
- **Timer default (T4).** The timer applies only when the request has `timed` exactly `true`; any other value is untimed. A client can only choose a timer for itself, so there is no privilege issue. PASS.
- **Labels (T5).** `area` and `level` are derived in code from the category and title, hold no personal data and expose no new identifier (the category slug is removed from the row). PASS.
- **FINDING (decision, not changed): the untimed default also removes the brake on looking answers up.** Before P1 the quiz timer (about 20 s a question) limited how long anyone could take on a daily or ranked round. Now there is no limit, so a player can search for answers and win the daily crown; ties still prefer the faster total time but correct answers rank first. Severity: low (it weakens a deterrent, not an access control, and affects only board fairness). **Owner decision needed:** keep it as it is (calm sessions, matches DIRECTION.md), or give daily and ranked rounds a generous server cap (for example 45 s a question) while practice stays untimed.
- **Residual (documented):** profiles that already hold an adult band from the old tick keep typed fields. Fix when approved: count them with the read-only live tool and, if wanted, reset the band for profiles with no Clerk identity (a live data change, so it needs approval).
- **Pre-existing, found by axe, not fixed here:** home page quiz-card title is white on the lagoon fill (2.48:1, large bold text needs 3:1). The new home in P5 replaces that card.
- NOT TESTED: the real Clerk sign-in (owner tests it on the live site); the live database.

## 2026-11-07 · Daily challenge: private hands, live board, crown (security, integrity, child safety)

Reviewer: Claude Code, on branch `feat/daily-live-crown`. Scope: `Game::start/dealDaily/question/finish`, `Competition::record/createChallenge/dailyDetails`, `daily_deals` (migration 0017), Studio attribution queries, `DailyPage`, `DailyLeader`, `ResultsView`, `useLeaderboard`.

- No two players share a question: a unique key on `(daily_challenge_id, question_id, deal_no)` refuses a duplicate, and a row lock on the day serialises deals. Four simultaneous starts got 40 distinct questions (tested); with the lock removed the same test failed 3 runs out of 3 (mutation check), so the test can catch a regression. PASS.
- Answers stay hidden: the bank query reads only question ids; the page, the stops and the dealt state contain no prompt or `is_correct` (tested); grading is unchanged and still server-side against the version each question was dealt from (tested with a hand spanning several quizzes). PASS.
- Nothing computed in the browser: scores, ranks, the leader and the crown come from the server's board; the browser only polls (read-only, `GET /leaderboards`, `GET /daily`). Polling load: one request per open tab every 10 s, well under the 600 per minute per address limit; it stops while the tab is hidden. PASS.
- Child data: the leader card and board show nickname, preset avatar and score only. The ledger holds ids and counts, and goes with the attempt when a player is erased (cascade). PASS.
- Daily results no longer feed any single quiz's all-time or weekly board (a private mix of quizzes is not comparable there). Behaviour change, tested. A daily hand cannot be made into a friend challenge (it would break the friend's game); tested and the button is hidden.
- Fairness: hands are random across ages 4 to 16, so a very young player can draw hard questions and the board partly rewards luck. ACCEPTED for now; the planned parent-set level (replan Stage 3) lets each level have its own pool and crown.
- Capacity: with about 20 questions per quiz the bank is a few thousand questions, so roughly 100 to 500 players a day fit before a second lap (the exact number depends on the live bank; NOT TESTED against the live database). A fresh deal takes about 10 ms on the local database (about 1,400 questions); live is NOT TESTED.
- NOT TESTED: the migration and the new code against the live database (needs owner approval); Clerk sign-in; 18+ filter relies on `quizzes.age_min`, so a quiz with no age set is dealt.

## 2026-11-06 · AI review of imports (security, child safety, privacy, cost)

Reviewer: Claude Code. Scope: `Generator::review`, `POST /admin/import/review`, `AdminContent` `ai_fixes`, the Import and Editor review UI (ADR-021).

- Who can call it: staff only (`Admin::guard`); players get 403 (tested). Off until the generator is enabled with a model key; returns 409 `generator_off` otherwise (tested). PASS.
- Prompt injection from imported text: the questions are sent as JSON inside `<questions>` and the system prompt says they are untrusted data whose instructions must not be followed (tested). Whatever comes back is only a suggestion: each fix is checked like hand-written content (same number of answers, exactly one right, plain text without links, markdown or HTML, length limits, `Content::validateQuestion`) and becomes a flag when it fails (tested with recorded answers: wrong answer count, a link, two right answers). Sources are never taken from the model (tested). PASS.
- Nothing publishes or saves itself: the endpoint writes nothing to any quiz (tested); a person accepts each fix in the preview or editor. Accepted fixes are counted in the import audit (`ai_fixes`, tested). PASS.
- Child safety: the prompt asks for a kind, child-safe tone and wording for the age band from the heading; a person still reads every accepted fix. ACCEPTED (advisory).
- Privacy: only question text, answers, explanation, age band, subject and topic are sent; no player data, no names or emails. PASS.
- Cost: each call (up to 25 questions) is audited as `generator.review` and capped at `generator.review_daily` (default 100 a day, about 2,500 questions; tested). PASS.
- NOT TESTED: a live call to Anthropic or OpenRouter (recorded answers only; needs the owner's keys).

## 2026-11-02 · Science body-topics import: content review and publish

Reviewer: Claude Code, at the owner's request ("fix all the imported questions … publish"), through Studio's own admin API in the owner's signed-in session (no server files, no SQL).

- Scope: the 54 drafts from the owner's first import (9 topics × 6 age bands, 1,080 questions), made before the import fixes and stuck in To do: no intro (publish refused), 249 sources stored as `[url](url` (refused), age band inside the title, no age range or key stage.
- Placement: kept in the subject the file names, **Science** (School Science). Title "Topic (ages 4–5)" / "(adults)", intro "20 questions about …", age range per band, key stages 6–8 KS1+KS2, 9–11 KS2, 12–14 KS3, 15–16 KS4, difficulty easy/easy/easy/medium/medium/hard, timer 45/45/30/30/40/30 s. Slugs and quiz ids kept.
- Sources: 249 turned into plain https addresses.
- Content: every question read for the 12–14 and adult sets and scanned for the rest. 91 prompts reworded so the question fits its existing answers (answers and the right answer never changed); colliding rewrites made distinct so no prompt repeats another quiz's. Left as they are: sense questions sharing Sight/Hearing/Taste/Touch as distractors (correct by design).
- Result: 54 of 54 published, 0 held, 0 errors; To do empty (0 drafts with problems, 0 waiting for review). Duplicate check over all live content: 100 quizzes, 2,460 questions, 0 duplicate prompts, 0 duplicate titles.
- Gap: prerendered pages exist only for quizzes live at a release; 37 quizzes published after release `6e6c15c` serve the shell (canonical home) until the next release.
- Reworded prompts (old → new):
  - Which teeth are at the front of your mouth? → Which teeth cut into an apple first?
  - Which teeth help crush food at the back? → Which teeth crush and grind your food?
  - Can air also enter through your mouth? → Besides your nose, where else can air go in?
  - What are hormones: body messages or little bones? → What are hormones?
  - Can body messages help you grow? → What can body messages help control?
  - Can body messages help your body use food? → What can body messages help your body do?
  - Do hormones work as body messages? → What do hormones do?
  - Can tiny amounts of body messages have an effect? → How much of a body message can have an effect?
  - Do body messages stay in one shoe? → Where do body messages travel?
  - Can body messages help the body work together? → Why does your body send messages?
  - Which daily activity supports learning and development? → Why is sleep important for children?
  - Which statement about children’s growth is correct? → Do all children grow at the same speed?
  - Which action normally continues automatically during sleep? → Which action keeps going by itself while you sleep?
  - Why does the body use hormonal communication? → Why does the body send hormone messages?
  - Which trained professional helps care for patients? → Which trained worker helps care for patients?
  - Which term means a broken bone? → Which option best describes a fracture?
  - Which description of bone is scientifically correct? → Is bone a living tissue?
  - What are the finger-like projections of the small-intestinal lining? → Which option best describes villi?
  - What name describes the mixture leaving the stomach? → Which option best describes chyme?
  - Which structures contain cells that detect taste chemicals? → What are taste buds made of?
  - Which structures make up the central nervous system? → Which name covers the brain and spinal cord together?
  - What name is given to a specialised nerve cell? → Which option best describes a neuron?
  - At what junction can one neuron communicate with another cell? → Which option best describes a synapse?
  - Which insulating material surrounds many nerve fibres? → Which option best describes myelin?
  - Which process transfers oxygen and carbon dioxide between alveoli and blood? → Which option best describes gas exchange?
  - Which stage involves the body becoming physically capable of reproduction? → What best describes puberty?
  - Which statement about puberty timing is correct? → Does everyone start puberty at the same age?
  - What term describes a period of unusually rapid height increase? → Which option best describes a growth spurt?
  - What occurs when the genetic material of a sperm and egg combines? → What happens at fertilisation?
  - Which temporary organ supports exchange between maternal and fetal circulations? → Which option best describes the placenta?
  - Which fluid surrounds the developing fetus? → Which option best describes amniotic fluid?
  - What process produces new cells from existing cells? → Which option best describes cell division?
  - Which cellular changes contribute to an increase in body size? → How do cells make a body bigger?
  - Which life period includes transition from childhood towards adulthood? → Which option best describes adolescence?
  - Which skill type involves precise small movements such as writing? → What does fine motor development mean?
  - Which system consists of hormone-producing glands and their signals? → Which option best describes the endocrine system?
  - Which organs have adrenal glands sitting above them? → Where in the body do the adrenal glands sit?
  - Which signals coordinate many physical changes of puberty? → Are hormones involved in the changes of puberty?
  - What is the intended effect of an antiseptic applied appropriately to living tissue? → What does an antiseptic aim to reduce on living tissue?
  - Which method studies internal structures by carefully cutting them apart? → What does dissection involve?
  - Which field studies the structure of the body? → What is anatomy the study of?
  - Which field asks how body parts work? → What is physiology the study of?
  - Which instrument allows direct viewing inside body cavities? → Why would a doctor use an endoscope?
  - Why does a blocked nose reduce food flavour? → What does a blocked nose take away from food flavour?
  - What is menstruation? → What is shed during menstruation?
  - How can nutrition affect growth? → Why is growth not set by genes alone?
  - What is the main exchange function of the placenta? → What does the placenta exchange between mother and fetus?
  - What does a phagocyte do? → What does a phagocyte do to some microbes?
  - What is negative feedback? → What does negative feedback do to hormone production?
  - How does glucagon help raise blood glucose? → Which liver response does glucagon trigger?
  - Which enzyme class hydrolyses proteins? → Which option best describes a protease?
  - What name describes a swallowed mass of chewed food? → Which option best describes a bolus?
  - Which bone cells lay down new bone tissue? → What do osteoblasts mainly do?
  - Which cells remove bone during remodelling? → What do osteoclasts mainly do during remodelling?
  - Which bone tissue forms a dense outer layer? → Which option best describes compact bone?
  - Which term describes moving a limb away from the body’s midline? → What does abduction mean?
  - Which term describes bringing an outstretched arm back towards the body? → What does adduction mean?
  - How is a physical or chemical stimulus converted into nervous information? → Which option best describes sensory transduction?
  - Which brain structure receives early input from olfactory neurons? → Which option best describes the olfactory bulb?
  - What travels along an axon as a regenerating electrical signal? → Which option best describes an action potential?
  - What chemical carries a signal across many synapses? → Which option best describes a neurotransmitter?
  - What is the narrow gap between cells at a chemical synapse? → Which option best describes the synaptic cleft?
  - Which structure performs a nervous-system response? → Which option best describes an effector?
  - What fluid surrounds and cushions the brain and spinal cord? → Which option best describes cerebrospinal fluid?
  - Which function is performed by specialised brain capillary barriers? → What is the main job of the blood–brain barrier?
  - Which quantity equals heart rate multiplied by stroke volume? → Which option best describes cardiac output?
  - Which volume is ejected by one ventricle during one beat? → Which option best describes stroke volume?
  - What function is especially useful in veins carrying blood against gravity? → What do the valves in many veins do?
  - Which molecule allows red cells to carry large quantities of oxygen? → What does haemoglobin do with oxygen?
  - How do phagocytic white blood cells attack some pathogens? → What does a phagocyte do to some pathogens?
  - Which feature defines these vessel types despite oxygen-level exceptions? → What really distinguishes an artery from a vein?
  - Which mechanical change enlarges the thoracic cavity during inhalation? → What does the diaphragm do during inhalation?
  - Which process moves air between atmosphere and alveoli? → Which option best describes ventilation?
  - Which volume describes air moved in a normal quiet breath? → Which option best describes tidal volume?
  - What air remains after the strongest possible expiration? → Which option best describes residual volume?
  - Which volume can be exhaled after a maximal inhalation? → Which option best describes vital capacity?
  - Which airway volume does not directly exchange gases with blood? → Which option best describes anatomical dead space?
  - How does the mucociliary escalator clear inhaled particles? → What do cilia do in the airways?
  - What occurs when an early embryo embeds in the uterine lining? → Which option best describes implantation?
  - Which event releases an egg from an ovary? → Which option best describes ovulation?
  - Which uterine tissue changes across the menstrual cycle? → Which option best describes the endometrium?
  - How do unspecialised cells acquire distinct structures and functions? → Which option best describes differentiation?
  - Which cell type can self-renew and generate more specialised cells? → Which option best describes a stem cell?
  - Which term refers to an organism’s genetic constitution? → Which option best describes genotype?
  - Which term includes observable characteristics influenced by genes and environment? → Which option best describes phenotype?
  - What term describes differences in inherited genetic information among individuals? → Which option best describes genetic variation?
  - Which term refers to biological changes associated with ageing? → Which option best describes senescence?
  - Which event marks the end of menstrual cycles due to loss of ovarian follicular activity? → Which option best describes menopause?
  - Which hormone is a glucocorticoid involved in metabolic stress responses? → Which option best describes cortisol?
  - Which parathyroid hormone helps restore low plasma calcium? → Which hormone helps restore low plasma calcium?
  - What was the key diagnostic significance of Röntgen’s discovery? → Which discovery let doctors see bones without surgery?

## 2026-11-01 · Studio import changes (privacy, child safety, AI cost)

Reviewer: Claude Code. Branch `studio/import-2026-11`. Scope: optional sources and imported questions arriving checked (ADR-019), the AI writing helpers (ADR-020), import parsing and checks, body-world scenes.

- Privacy: no new personal data. Imports and the helpers carry quiz text only; helper requests send the title, or a question and its answer, and an age band to the model provider. No player data. PASS.
- Child safety: imported questions skip the per-question tick, so the person importing is the reviewer; the audit log records `imported: true` and who did it. The preview flags answers that repeat the question, yes/no answers to other questions, "which cells" questions answered with a process, repeated answer sets and hard words for ages 8 and under, without blocking. Players still never see answers before answering, and children still write no free text. ACCEPTED (owner decision, 1 November 2026).
- Sources optional: a given source must still be https, and player screens show it only when present (`isWebUrl`). Site copy no longer promises a source on every answer. PASS.
- AI output is untrusted: plain text only (links, HTML and markdown refused), length-capped, put into an editor field and never saved by the server; an AI-edited explanation leaves the question unchecked. Staff-only route behind `Admin::guard`; players get 403 (tested). PASS.
- AI cost: off until the generator is enabled and a key is set; one short call per click; own daily cap (default 200), counted from the audit log and tested at the limit. Live calls NOT TESTED (no keys; fixtures only).

## 2026-11-01 · Go-live security audit (full codebase, security-audit skill)

Reviewer: Claude Code. Branch `golive/2026-11`, source `80e1f23`. Profile standard: 12 coverage units, 7 hunters in two waves, 3 candidate verifiers, 3 record verifiers, 3 coverage critics (final pass clean). Audit agents read source only; every confirmed finding was reproduced with a failing check on the disposable local MariaDB (`scripts/test-backend.sh`). Run files (ledger, findings.json, reports) are in the gitignored `.local-test/security-audit/run-1/`.

**Findings**

| Severity | Finding | Status |
|---|---|---|
| Medium | Option ids were an unkeyed hash of each option's authored position, so a script could undo the shuffle. The right answer is written first in 615 of 1042 shipped questions (59% against 25% chance). This broke "answers never exposed before answering". | FIXED d18fc57: per-attempt HMAC handles, raw ids refused, shuffle by handle. Regression checks in integration.php |
| Medium | "Delete my data" kept the player's written thread answers, and the hourly guest purge kept message, email and answers. Staff could still read them, against the privacy notice. | FIXED 82c4d43: both paths scrub; checks in feedback.php and cleanup.php |
| Needs validation | Studio generator draft card used the model's `source_url` as an href with no scheme check (a `javascript:` link was possible, staff click needed, generator off by default) | Guard applied 4cd271e (`webHref`); browser behaviour NOT TESTED |
| — | No Critical or High findings | — |

**Checked and passing (source review):** every `/admin/*` route goes through `Admin::guard` before any handler, and every staff write is audited (except generator step, see below). All SQL is prepared, with emulation and multi-statements off; LIMIT, ORDER BY, IN and LIKE are built safely. Every player route takes identity from the token only; attempts and threads are owner-bound. Scoring, timing and once-only daily are enforced on the server. Clerk JWT is pinned to RS256 and checks iss, azp, exp, nbf, iat, `user_` and `sess_`; guest and Clerk tokens cannot be swapped. CORS is an exact allowlist with no credentials. Rate limits are atomic and keyed per IP (CF-Connecting-IP trusted only from Cloudflare ranges), per player and per route. Nicknames are ASCII-only and blocked-word filtered, and children cannot type them. React renders every user string as text. Prerender, JSON-LD and the sitemap escape their output. The service worker caches public catalogue routes only. The release puts no config, maps or dumps in the webroot (`verifyPublic`); bin scripts are CLI-only. The deploy job runs only on `main`, with pinned known_hosts. Migrations are checksummed.

**Hardening, not findings (left for later):** the CSP is Report-Only with `'unsafe-inline'` styles. The CF-RAY origin lock can be spoofed (nothing relies on it). `api/.htaccess` is server-managed and never deployed. deploy.yml uses mutable action tags, writes the deploy key before the build and has no GitHub environment. The generator follows redirects without per-hop checks, can approve drafts before the check stage (API only), does not audit `step` and has no retry cap. Nicknames have no unique index. Leaderboards return microsecond timestamps and attempt ids. The generator places answers at slot i % n. Clerk `sts` is not checked. Guest creation is per /64. Next and answer do not re-check that a quiz is still live.

**Go-live checklist (owner request, 1 Nov):**
- Keys hidden: no secret in 84 commits (gitleaks, full history) or in the build. The one `sk_live` pattern hit is the Clerk SDK's literal prefix check. The only env var the frontend reads is `VITE_*`, and the Clerk publishable key is public by design. PASS.
- Env files: the project rule forbids opening `.env*` and `config.php`, so their contents were NOT TESTED. Only `.env.example` is tracked. PASS for tracking.
- Admin routes, authentication, user access, forms and XSS, rate limits, API endpoints, CORS: see above. PASS.
- Security headers on live: HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and a report-only CSP are present. `Server: cloudflare` (origin version hidden), and no `X-Powered-By` on `/` or the API. `api.php` now strips `X-Powered-By` itself (bc5b559). Server version (`ServerTokens`) cannot be set from `.htaccess`; Cloudflare already replaces the header. PASS.
- Debug off: `display_errors` 0, generic error bodies, production environment required by Config, maps filtered out of the release, no `console.log`. PASS.
- Dependencies (821f4fa): in-range updates only. `pnpm audit` 41 → 5, 0 high. The 2 production advisories left need React Router 7 and do not apply (BrowserRouter only, no navigation to user-supplied URLs). The 3 dev ones are inside workbox-build. `composer audit` clean. Majors (React 19, Router 7, ESLint 10, Vite 7, Clerk PHP 2) are a planned task. PASS within scope.
- Unused packages: every npm and Composer dependency is referenced. PASS.
- Exposed files on live: `/.git/HEAD`, composer files, `/vendor/`, `phpinfo.php`, `.DS_Store`, `backup.sql`, `/server-status`, `api/.htaccess` and source maps all return 403 or 404. `.env` and `config.php` URLs were not probed (blocked by the agent guard; owner command in `.agent/CURRENT-TASK.md`).
- Database: prepared statements only, credentials outside the webroot, backups outside the webroot. The DB user's grants and remote access are server facts, NOT TESTED.
- Passwords: none stored. Clerk handles adult sign-in. Guest tokens are 256-bit random and stored as sha256, which is right for high-entropy tokens. PASS.

**Checks run:** `pnpm verify` and `pnpm format:check` before every commit, PASS. Backend suites unit, integration, competition, daily, concurrency, feeds, content, cleanup, seo, admin, feedback, cms and generator: PASS. `pnpm test:e2e`: 46/46 in 3 of 4 runs. One run had a single 503 on round start in `privacy.spec` (mobile) that 2 reruns and a 180-request concurrent-start stress test could not reproduce; the e2e API log is now kept at `.local-test/e2e-last-php.log` (97c8f55). Cause NOT FOUND.

## 2026-11-01 · Go-live SEO audit (claude-seo)

Reviewer: Claude Code. Full report: `.local-test/seo/doyouknow.space-audit/FULL-AUDIT-REPORT.md` and `ACTION-PLAN.md`. Live health score 29/100.

- Critical, FIXED in code (e1673b8): every live URL served the same empty shell with the canonical pointing at home, because the release build skipped prerender silently. Release builds now prerender from the live public catalogue and fail if they cannot.
- FIXED in code (3fa6ed2): the 7 info pages are prerendered; title and description fallbacks for quizzes; richer category pages; related-quiz links; Organization, WebSite and BreadcrumbList JSON-LD; a home title that says what the site is; `llms.txt`.
- FIXED in code (d9f7d0e): CLS (lab, throttled phone): home 0.30 → 0.002, category 0.26 → 0.001. The quiz page is 0.08–0.11, still open.
- Owner work: who makes it and how questions are checked (E-E-A-T), 46 quiz intros at 60–120 words, SEO titles and descriptions in Studio, category copy, a parents and teachers section, the contact line, Search Console, the Cloudflare GPTBot 429 rule. FAQ or Q&A rich results are deliberately not used (FAQ is restricted to gov and health sites; Q&A markup would expose answers).
- NOT TESTED: Lighthouse and PSI (API quota exhausted), CrUX field data, a live check of the new pages (not deployed).

## 2026-10-31 · Profile, nickname-once and on-site replies (privacy and child safety)

Reviewer: Claude Code. Scope: `Player::nickname`, `Feedback::mine/playerReply/markSeen`, migration 0016, `/me`, `/contact`, Studio inbox.

- Children still never write free text: replies are read-only for them; the server refuses their answers (`free_text_not_allowed`, tested). PASS.
- Staff replies to children are new. Only a Super Admin can send one; each is audited; the Studio warns to keep it short and kind; no contact details are ever asked for or stored. ACCEPTED (owner request, 31 October 2026).
- A player can only read and answer their own threads (404 for others, tested); internal notes never reach the player (tested). PASS.
- Nickname change: once only, atomic (no double change), children limited to generated names, blocked-words check for typed names, no copying another player's name (tested). PASS.
- Email is now optional; "Delete my data" still wipes message and email. PASS.

## 2026-10-31 · Generator security and cost review

Reviewer: Claude Code. Scope: `Generator.php`, `GeneratorLive.php`, migrations 0014–0015, Studio Generator screen.

- Off by default: no outside call is possible unless `generator.enabled` is true and the Claude and Bright Data settings are present; recorded answers are refused outside the test environment (tests check both). PASS.
- Keys are read only from the private config, never sent to the browser; the status endpoint reports only true/false for each. PASS.
- Only Super Admins reach the routes (`Admin::guard`); players get 401/403 (tested). PASS.
- No player data leaves the server: requests carry the topic, age band and fetched public page text only. PASS.
- Output is untrusted: every draft is validated like hand-written content, its quote must appear in the fetched page, its source must be an https page on the trusted list, and it never publishes; approval and sending are audited. PASS.
- Cost control: daily run cap (default 20), at most one search, four page fetches and one model call per run, and a per-run step lock so a double click or two tabs never repeat a paid step (tested). PASS.
- Model output is parsed as JSON from a schema-constrained response; refusal and token-limit stops end the run with a readable reason. PASS.
- Not done: a live run (BLOCKED until the owner approves the cost and adds keys).

## 2026-10-31 · Rebrand, Studio and feedback release review (accessibility, security, privacy)

Reviewer: Claude Code for the owner. Scope: the Pop & Ink redesign, the Studio CMS, the overall leaderboard and contact/feedback, before the 31 October release.

**Accessibility**

- Colour contrast computed from the token values (WCAG formula): white on grape 5.3:1, ink on tangerine 7.4:1, ink on lemon 12.1:1, ink on mist 16.0:1, muted on white 6.8:1, white on correct 5.4:1, white on wrong 5.4:1; dark theme ink-dark on primary 6.2:1, muted on surface 7.8:1. White on tangerine (2.3:1) is never used: the play button uses ink text. PASS.
- Right and wrong answers always show an icon and words as well as colour; the explanation sheet keeps its auto-advance pause ("Stay here"). PASS (e2e play specs).
- Studio: nav is a labelled `nav`, the ⌘K palette is a modal dialog with a combobox and listbox (arrow keys, Enter, Escape), the confirm dialog traps focus. Unit-tested open/close. PASS.
- Not done: a screen-reader pass with VoiceOver on the new pages. OPEN.

**Security**

- Every `/admin/*` route goes through `Admin::guard` (Clerk subject in the private allowlist); guests and players get 403 (`backend/tests/admin.php`, 12 checks). PASS.
- Answers still never reach the browser before answering; the only new field on a public question is the cosmetic `scene` key (e2e leak check updated to allow it and nothing else). PASS.
- Feedback: rate limited (10 an hour per player); free text and email refused for children and unknown ages on the server, not just in the form (`backend/tests/feedback.php`). PASS.
- Studio content writes validate on the server (`Content::validateQuestion`, https sources, no duplicate prompts) and are logged in `admin_audit`. PASS (`backend/tests/cms.php`, 121 checks).
- Fixed in this review: `JSON_VALUE(... '$.review')` returns `1` on MariaDB 11.4, so live quizzes with edits waiting were hidden from "To check"; regression check added.
- Sourced generator makes no outbound calls; no Bright Data or Anthropic key exists in any config. PASS.

**Privacy**

- No new personal data for children. Adults may leave an email only with a message; it is stored in `feedback.email` and never shown publicly. PASS.
- Fixed in this review: "Delete my data" left a grown-up's feedback message and email behind (the row only lost its `profile_id`). `Player::delete` now wipes message, email and question prompt first; regression check in `backend/tests/feedback.php`; privacy notice updated (31 October 2026).
- Public surfaces still show nickname, preset character and score only. PASS.
