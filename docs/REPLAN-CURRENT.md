# Replan: what exists today (7 Nov 2026)

Read-only survey of the code (branch `docs/replan`, nothing deployed). Sources: a full read of `src/`, `backend/` and `backend/content`, plus a code-only knowledge graph (1,941 nodes, 92 communities, built with graphify; docs and images were not graphed). Statements below come from the code, not the docs. Items marked ASSUMPTION or NOT TESTED were not run.

## In one line
A **general trivia quiz PWA** (timed, ranked, leaderboards, daily, friend challenges) with a staff Studio. It is not yet the four-area learning app: there is no spelling, dictation, fill-the-gap, verbal reasoning, ordering or matching, no read-aloud, no adaptive difficulty and no parent area.

## Per subject
| Area | Today | Strength |
|---|---|---|
| Literacy | Grammar/punctuation, phonics, literary devices, GCSE literature, one vocabulary quiz. **No spelling, dictation, gaps, verbal reasoning** | Thin |
| Numeracy | One maths quiz per stage (KS1 counting, KS2 tables, KS3 algebra, GCSE), 120 questions in the repo | Thin to medium |
| Science | Animals, body, space, plants, forces, GCSE bio/chem/physics, computing (algorithms, binary, GCSE CS), inventions | **Strong** |
| Humanities | Geography 210, History 210, Religious knowledge = Old and New Testament only (60 in the repo) | Geography/History good, RE thin |

Live content (CURRENT-TASK, 7 Nov): 262 published quizzes in Technology 54, Bible and faith 54, General Knowledge 60, School Science 60. The repo seed holds a different set (46 quizzes, 1,380 questions, 12 categories). The two have not been reconciled; the live database is the master.

## Screens and routes
- **Child/anyone:** `/` home (separate desktop and phone builds), `/c/:slug` subject, `/q/:slug` quiz page, `/daily`, `/leaderboards`, `/challenge/:code`, `/me`, `/me/settings` (theme only), info pages (`how-to-play`, `about`, `privacy`, `terms`, `contact`), `/account` (adult Clerk sign-in, linked from nowhere).
- **Full-screen play:** `/play/:slug`, `/daily/play`, `/challenge/:code/play` (one `PlayPage`: loading, question, feedback, results).
- **Staff:** `/admin/*` Studio (To do, Inbox, Library, Editor, Check and publish, Import, Generator, Subjects, Daily calendar, Players, Activity).
- **Redirect stubs:** `/me/avatar`, `/preview`, `/login`, `/dashboard`.
- **API:** about 45 public/guest routes and about 35 admin routes under `/api/v1`.

## Database (MariaDB)
`profiles, identities, guest_sessions, rate_limits, categories, quizzes, quiz_versions, attempts, attempt_answers, curriculum_tags, blocked_words, app_settings, daily_challenges, friend_challenges, leaderboard_entries, leaderboard_likes, content_reviews, admin_audit, feedback, feedback_messages, generator_runs, generator_pages, generator_drafts`. There is **no questions table**: a question is a JSON element inside `quiz_versions.snapshot`. Migration 0009 is a gap.

## Question types (3)
`choice` (1,042 in the repo), `boolean` (213), `slider` (125, native range input). Nothing else exists in types, UI, validator or generator.

## How it works
- **Storage:** quiz versions are immutable JSON snapshots; an editable draft lives in `quizzes.draft`. Validated by `Content.php`; the Studio mirrors the rules in `adminValidation.ts`.
- **Checking:** server-side only. Option ids are per-attempt HMAC handles, answers and explanations are revealed only after `/answer`, the server owns the clock (1.5 s grace). This is the strongest part of the app.
- **Progress:** all on the server: attempts, best-per-quiz boards, a daily streak. No XP, badges or coins. The browser keeps only the guest token and theme. Play needs the network.
- **Identity:** every player is a guest with a generated nickname and one of 12 preset characters. Clerk is used for staff and an unlinked adult sign-in. Guest history is never merged into an adult account.

## Breaks the hard rules
**Rule 1 (no typing):** answering never needs a keyboard, but the child experience still has typing: a typed nickname for "13+" (`NicknamePicker.tsx:97`, `MePage.tsx:322`), a reply textarea (`MePage.tsx:511`), and `/contact` (email, message). The age gate is self-declared and **a child can bypass it**: ticking "I'm 18 or over" on `/contact` permanently sets the band to adult (`ContactPage.tsx:62-70`). The slider needs dragging, which is not typing but is the hardest tap-only control.
**Rule 2 (no child data):** no names, photos, birthdates or location. But the profile stores a self-declared **age band** (under 13, 13-17, 18+). That is the nearest thing to age data and should go.
**Not rule-breaking but not child-safe either:** question images load from ImageKit (third party); source links open external sites from results; `VITE_POSTHOG_*` settings are declared and unused beside "no analytics" copy.

## Duplicated, unused, half-finished, inconsistent
- Unused: `lib/imagekit.ts` (plus its cache rule), PostHog settings, `AppSettings` types, `workbox-window`, `useGuestSession.isGuest`, 13 i18n keys, `quizzes.cover_image_url/seo_*`, `profiles.role` values, `abandoned` status, `image_url` (always null), `scene` and `round_size` (no file sets them).
- Duplicated: two publish paths (importer vs Studio, importer ignores the checked flags), `londonToday`, slug and week-start helpers, `/me` fetched four times, `QuizStatus`/`Difficulty` types defined twice, `SuggestQuiz`/`SuggestRow`, info link lists, Next quiz vs "What next?" on results.
- Inconsistent: a separate desktop and phone home that differ in features; the Play stage uses hard-coded hex colours outside the tokens; answers forced to uppercase (hard for early readers); two unrelated "age" ideas (profile band vs content chips); every Play button points to the daily round, so after playing it likely hits `daily_already_played` (inferred, NOT TESTED).
- Half-finished: generator keys unset (live run NOT TESTED); no sound anywhere; the tab bar has no profile tab.
- Content quality: the correct choice is first in 59% of choices in the repo seed, and 72% of true/false answers are "true" (shuffling hides the first; the second is guessable). All `review_by` dates cluster in two days.
- Tests: strong backend suite (13 suites) and 22 unit files, but `PlayPage`, `AnswerButton`, `SliderAnswer`, timer expiry, offline and the Studio have no tests; no coverage threshold.

## What is strong and worth keeping
Server-side grading and timing, answer-hiding, the Studio and import pipeline with versions and audit, the AI review that never publishes alone, prerendered SEO pages, the Pop & Ink design tokens and the release pipeline.

## Gaps against the new purpose
Question types (7 of the 10 needed are missing), Literacy topics, a real RE/Humanities spread, read-aloud audio, adaptive steps, retry-later, a parent area and parent-linked progress, and the removal of all typing and age data from the child path.
