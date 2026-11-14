# Roadmap

One place for what is live, what is planned and what is parked. Current work is in `.agent/CURRENT-TASK.md`; finished sessions are in `.agent/HANDOFF.md`. Status words: DONE, PARTIAL, NOT TESTED, BLOCKED, PLANNED. Updated 14 Nov 2026.

## Versions

| Version                                                       | What                                                                                                                                                                   | Status                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| V1.0 Baseline                                                 | General quiz PWA, Studio, daily challenge, friend challenges                                                                                                           | DONE, live 7 Nov           |
| V2.0 Learning app, P1 to P9                                   | Clean-up, tap-only question types with server grading, literacy and numeracy content, parent area, adapt/retry/stickers/sound, humanities and science spread, router 7 | DONE, merged and live      |
| Content pipeline (ADR-024, `docs/CONTENT-PIPELINE-DESIGN.md`) | Slice 1 house rules, 2 one safe Add door, 3 batches and read-five-first, 4 publishing needs no release                                                                 | DONE, live (slices 1 to 4) |
| Content pipeline slice 5                                      | Weekly Studio digest                                                                                                                                                   | PLANNED                    |
| Content pipeline slice 6                                      | Proactive app for children and grown-ups                                                                                                                               | PLANNED                    |
| Draft V1 finish line                                          | 5 of 10 ticked (see `docs/06-quality/EVIDENCE-STATUS.md`); open items below                                                                                            | PARTIAL                    |

## Open items

| Item                                                                                                                                                                                                                                                      | Next step is   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Batches screen: the 60 imported quizzes (45 ready, 15 need a look): Practice-only on the 5 "Listen and spell" quizzes, choose which copy of the 9 repeated questions to keep, keep or cut the 6 baptism or Last Supper ones, read five, publish at a pace | Owner          |
| Phone checks (table below): real phone, Safari, real Clerk sign-in at `/grown-ups`                                                                                                                                                                        | Owner          |
| `mail_from`: add `'mail_from' => 'no-reply@doyouknow.space'` to the private server config (SPF, DKIM, DMARC exist)                                                                                                                                        | Owner          |
| Studio Batches and Import checked signed in, in a real browser                                                                                                                                                                                            | Owner          |
| Library Draft, Ready and Live view (rest of slice 3)                                                                                                                                                                                                      | Claude         |
| Sticky answer sheet so the Next button stays on screen at 375x667 for tall questions                                                                                                                                                                      | Claude         |
| Dev alerts: `minimatch` (next dev round), `deepmerge` (no patched version)                                                                                                                                                                                | Claude         |
| Majors as planned tasks: `@clerk/backend-php` 1 to 2, `actions/checkout`, `pnpm/action-setup`                                                                                                                                                             | Claude         |
| Safari-engine run (needs a Playwright WebKit download)                                                                                                                                                                                                    | Owner approves |

## Phone checks (from the Phase 1 UAT, 8 Nov 2026)

#### 1. A guest on a phone cannot type anywhere

expected: Open the live site on a phone with no sign-in. Visit Home, Play, Contact, nickname, My games and Leaderboards: no text box, no "I'm 18 or over" tick; Contact shows the grown-up email instead.
result: [partial, 8 Nov 2026] PASS in emulation: `tests/e2e/sizes.spec.ts` at 375, 390, 430, 360, 768, 820, 1024, 1280 and 1440 wide, touch on (Chromium, not Safari): no text box, no tick, no sideways scroll on /, a quiz page, /contact, /me, /leaderboards, /privacy. NOT TESTED on a real phone or in Safari.

#### 2. The friend on the play screen on a phone and on a tablet

expected: Answer a right and a wrong question. The friend sits above the answer panel, never covers an answer, and tapping where it stands still answers the question.
result: [partial, 8 Nov 2026] FOUND AND FIXED: on tablets (768 to 1024 wide) the friend overlapped an answer; it is now 96 px up to laptop width with matching room reserved. PASS in emulation at all nine sizes (no overlap, a tap on the friend lands underneath). OPEN: on small phones (375x667, 360x740) the answer sheet's Next button sits below the fold for tall question types such as the keypad, so the player scrolls (worse by a few pixels would not matter; this was already so before). NOT TESTED on a real phone or in Safari.

#### 3. A real child session on a real phone

expected: Hand a child profile over from `/grown-ups`, play Words and Numbers for one session; steps, stickers and the end screen all read clearly with no "Uh-oh" after a finished daily.
result: [partial, 8 Nov 2026] PASS in emulation: a fixture child plays a Words session of ten at every size, sees the end screen with a sticker, no "Uh-oh", no sideways scroll. The hand-over from `/grown-ups` is NOT TESTED (needs the real sign-in).

#### 4. Real Clerk sign-in at `/grown-ups`

expected: Email code arrives, sign-in works, add a child, flip a switch, hand over, and getting back needs a new code. The loading card is replaced by the area within a few seconds.
result: [pending]

## Parked: growth ideas (suggestions only, none started)

Stage 6 of the replan, 7 Nov 2026. Ranked best first by benefit for effort. None of these is in the roadmap; each would need your approval and its own plan. All keep the standing rules: no ads or tracking SDKs, nothing personal from children, answers graded on the server, UK English.

Effort: S is days of work, M is a phase's worth, L is several phases. Benefit is for parents choosing the app and children coming back.

| #   | Idea                                                                                                                                  | Effort | Benefit     | Why it is worth it                                                                                                                                                     | Watch out for                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Area landing pages for search**, such as "Year 4 spelling practice" and "Ages 6 to 8 times tables", prerendered like the quiz pages | S      | High        | Parents find the app by searching for what their child needs. The prerender and SEO pipeline already exists and the area and level labels from P1 supply the structure | Pages must hold real content (a sample question and the quiz list), not thin text; wait for P3 so literacy and numeracy pages are not empty          |
| 2   | **Family board**: a private daily board that shows only a parent's own children, so siblings can race each other                      | M      | High        | Children like winning; it gives that without any public ranking or strangers. Reuses the daily board and crown                                                         | Needs P4 (children linked to a parent); shows nicknames and avatars only                                                                             |
| 3   | **Weekly progress email to the parent**: stars gained, topics to practise, one suggested session                                      | M      | High        | Brings parents back, and parents are the ones who choose the app. Uses the skill record from P5                                                                        | The first thing that sends email, so it needs sending setup and an unsubscribe; sent only to the signed-in parent, never to or about a child by name |
| 4   | **Printable certificate and progress sheet** for a parent to print or share                                                           | S      | Medium      | A tangible reward that a child shows off; helps parents and tutors                                                                                                     | Nickname and stars only; no real name on the page                                                                                                    |
| 5   | **Seasonal quiz weeks** (Christmas, Easter, bonfire night, back to school) with a themed sticker                                      | M      | Medium      | Gives a reason to come back and fresh shareable moments; Christian festivals fit the existing Bible content                                                            | Authoring cost; keep the neutrality rule for religious content                                                                                       |
| 6   | **Share the crown**: a friendly image or link saying "I wore the crown today", sent by a parent or the child on a shared device       | S      | Medium      | Free word of mouth built on the thing children already enjoy                                                                                                           | Nickname and score only; the share button sits behind the parent switch for child mode                                                               |
| 7   | **Gentle streaks**: a streak that survives one missed day ("rest day") and shows as stickers, not numbers                             | S      | Medium      | Keeps habit without guilt or pressure                                                                                                                                  | Needs P5; avoid anything that nags                                                                                                                   |
| 8   | **Curriculum labels for parents** (Year group and key stage next to each topic)                                                       | S      | Medium      | Helps parents trust what a session covers; the tags already exist on quizzes                                                                                           | Must be accurate; only show where reviewed                                                                                                           |
| 9   | **Read-along mode for the youngest** (highlight each word as the device reads the question)                                           | M      | Medium      | Helps early readers at level 1                                                                                                                                         | Device voices vary and give no reliable word timings, so test across phones first                                                                    |
| 10  | **Offline sessions** (cache a session's questions to play without a connection)                                                       | L      | Low for now | Useful on journeys                                                                                                                                                     | Conflicts with server grading and hidden answers: it would need a different trust model. Not recommended until the rest is done                      |

### What I would do first

Ideas 1 and 2 give the most for the least once their dependencies are in: 1 after P3, 2 after P4. Idea 4 and 6 are cheap extras. I would leave 10 alone.
