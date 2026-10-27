# Product Requirements Document (PRD) — Do You Know

## 1. Overview

**Do You Know** is a bright, playful quiz app for all ages — families, students and
trivia fans. It runs in any browser on any screen (portrait or landscape) and installs
to the home screen as a PWA. Players answer a quiz in seconds with no sign-up, learn
from an explanation after every answer, and come back for a daily challenge or to beat
a friend's score.

**Problem it solves:** most quiz sites are either one-off games with nothing to learn
(and easy to cheat), or school tools that feel like exams. Our closest reference,
quiz.bato.dev, is beautifully illustrated but runs one hard-coded quiz, blocks phones in
portrait, ships every answer to the browser, and lets the browser post its own score.

**Our edge, in order:**

1. **Plays anywhere** — phone-first, portrait and landscape, installable, light/dark.
2. **Can't be cheated** — the server holds the answers, grades every answer and
   measures time itself.
3. **Grows and brings people back** — a CMS-driven library of quizzes, one indexable
   page per quiz, a daily challenge, streaks and friend-challenge links.
4. **Safe for kids** — under-13s play with no personal data; nicknames are generated;
   public boards show nicknames only.

## 2. Target users & roles

| Persona       | Who                                                     | Needs                                                         |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Casual player | Adults and teens arriving from Google, WhatsApp, TikTok | Play now, no sign-up, a score worth sharing                   |
| Young learner | Children 6–12 (often with a parent nearby)              | Age-appropriate school-subject quizzes, kind feedback, safety |
| Student       | Teens revising school subjects across curricula         | Filter by age band and curriculum (UK, US, West Africa…)      |
| Competitor    | Trivia fans                                             | Daily challenge, leaderboards, streaks, beat-a-friend         |
| Editor        | Content writer                                          | Write and review questions, review AI drafts                  |
| Admin         | Owner                                                   | Publish, schedule, moderate, configure AI models              |

### Permission matrix

| Capability                                     | guest | player | editor | admin |
| ---------------------------------------------- | :---: | :----: | :----: | :---: |
| Play any published quiz (practice / ranked)    |  ✅   |   ✅   |   ✅   |  ✅   |
| Daily challenge (1 ranked play per day)        |  ✅   |   ✅   |   ✅   |  ✅   |
| Create / accept friend challenges              |  ✅   |   ✅   |   ✅   |  ✅   |
| Appear on leaderboards (needs a nickname)      |  ✅   |   ✅   |   ✅   |  ✅   |
| Choose a preset avatar                         |  ✅   |   ✅   |   ✅   |  ✅   |
| History across devices                         |   —   |   ✅   |   ✅   |  ✅   |
| Create / edit quizzes, questions, categories   |   —   |   —    |   ✅   |  ✅   |
| Review & import AI question drafts             |   —   |   —    |   ✅   |  ✅   |
| Moderate leaderboards & nicknames              |   —   |   —    |   ✅   |  ✅   |
| **Publish / schedule** quizzes, daily calendar |   —   |   —    |   —    |  ✅   |
| Site settings, AI models, roles                |   —   |   —    |   —    |  ✅   |

- **guest** = an opaque guest session issued by the PHP API (`POST /guest-sessions`), no
  email. Created automatically on first play and kept in this browser only.
- **Adults** (parents, staff) sign in with Clerk on `/account` only. Linking an adult
  account to game history, and therefore history across devices, is not built yet.
- **Under-13s** always play as guests and never use accounts. A parental consent flow is
  not designed yet: UNKNOWN (owner: Gideon, next check: before launch).

## 3. Goals & success metrics

| Area                   | Target (first 90 days after launch)                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Time to first question | < 2 s on a mid-range phone over 4G                                                                    |
| Start rate             | quiz_started ÷ quiz page views ≥ 60%                                                                  |
| Completion rate        | quiz_completed ÷ quiz_started ≥ 70%                                                                   |
| Share rate             | results shared or challenge created ÷ completed ≥ 5%                                                  |
| Challenge conversion   | challenge completed ÷ challenge link opened ≥ 30%                                                     |
| Day-7 return           | ≥ 15% of new players return within 7 days                                                             |
| Integrity              | 0 leaderboard entries not produced by server grading                                                  |
| Quality                | Lighthouse ≥ 95 (Performance, A11y, Best Practices, PWA); LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75 |
| Reliability            | 100% of unhandled errors captured in Sentry                                                           |

Targets are starting assumptions; tune them against real data after launch.

## 4. V1 feature set (MVP)

### 4.1 Public site & discovery

- Home: today's challenge, trending quizzes, categories, "Continue playing".
- Category pages `/c/:slug` and quiz landing pages `/q/:slug` (title, 150–300-word intro,
  difficulty, age band, curriculum tags, question count, Play) — **prerendered** for SEO.
- Filter by age band (6–8, 9–11, 12–14, 15–16, adult) and curriculum tag.
- Launch categories: General Knowledge, Science & Nature, Geography, History, Tech,
  Bible & Faith, plus school subjects (Maths, English, Science, Geography, History,
  Computing) tagged by age band and curriculum.
- How to play, About, Contact, Privacy, Terms. `sitemap.xml` and `robots.txt`.

### 4.2 The game

- Question types: **multiple choice** (2–6 options, one correct), **true/false**, and
  **slider estimate** (correct when inside an accepted range).
- One question at a time over the category's illustrated scene; position "3 / 10".
- After every answer: correct/incorrect moment, the right answer, an **explanation** and
  a source link. Correct answers can auto-advance; the player can always open "Why?".
- Optional per-question **timer** (set per quiz in the CMS).
- **Results:** score, accuracy, answer time, full review of every question, then
  **Play again · Challenge a friend · Share · Next quiz**.
- **Refresh-safe:** reloading mid-quiz resumes the same attempt with the clock intact.

### 4.3 Scoring & fairness (server-side)

- Score = correct answers. No multipliers.
- Ranking: most correct → lowest **answer time** → earliest finish.
- Answer time = server-measured time from showing a question to receiving the answer,
  capped at 60 s (or the timer). **Time spent reading explanations is never counted.**
- Practice vs ranked: every quiz is replayable; ranked/daily runs feed leaderboards; the
  player's best result is kept.

### 4.4 Daily challenge

- One featured quiz per day, scheduled in the CMS calendar, live at **00:00 Europe/London**.
- Same questions in the same order for everyone; one ranked play per player per day.
- Daily, weekly and all-time boards; **streak** of consecutive days played.

### 4.5 Friend challenges

- "Challenge a friend" creates a short link `/challenge/:code` (8 characters, 30-day expiry).
- The friend sees "BraveOtter42 scored 8/10 — can you beat it?", plays the **exact same
  questions in the same order**, and both see a head-to-head result.
- Links show nickname + score only. Share card image for WhatsApp/social previews.

### 4.6 Leaderboards

- Per quiz: all-time and this week; daily board for the daily challenge.
- Top 50 plus "your rank". Nickname + avatar + score + time only — never email or ids.
- Only players with a nickname appear. Staff can hide any entry.

### 4.7 Profiles, nicknames & avatars

- Age band asked once (under 13 / 13–17 / 18+); locked after (admin can change).
- 13+: choose a nickname (3–20 characters, blocked-words filter). Under-13: **generated
  nicknames only** ("BraveOtter42"), shuffle to reroll.
- **Preset avatar per player:** choose one of 12 friendly emoji characters on coloured
  circles (owner decision, 16 October 2026). No uploads, no photos, no AI images. Avatars
  are not unique; boards and challenge previews show them beside the nickname.
- `/me`: history, best scores, streak, avatar, settings, theme, **delete my account**.

### 4.8 CMS (`/admin`): in progress (Phase A foundation built 27 October 2026; see ADMIN-AREA-PLAN.md)

No authoring or publishing endpoints exist in the PHP API yet. Launch content arrives by
importing categories, quizzes, questions and daily challenges from the old Supabase
project into MySQL. The list below is the target, not current behaviour.

- Dashboard: plays today/7 days, completion rate, top quizzes, newest board entries.
- Quizzes: search/filter; edit, duplicate, preview, schedule, archive.
- Quiz editor: Details → Questions → Settings → Preview → Publish (autosaves drafts).
- Question bank: reusable questions with explanation, **source URL** and **review-by
  date** (all required to publish); CSV import lands as drafts.
- AI drafts (later, server-side only): drafts arrive for human review. **AI never publishes.**
- Daily calendar: assign a quiz to a date; shows gaps in the next 14 days.
- Categories & curriculum tags; leaderboard moderation; blocked words.
- Settings (admin): site settings and blocked words.
- Audit log of every content change and role change.
- Publishing freezes a **version**; editing later creates a new version and never
  changes past results.

### 4.9 PWA

- Installable (manifest, icons, maskable icon), **any orientation**, standalone display.
- Offline: app shell, recently opened quiz pages and images; clear offline banner.
  Play needs a connection (grading is server-side) — the UI says so plainly.
- Update prompt ("New version — Reload"), never an auto-reload mid-quiz.

## 5. Non-functional requirements

- **cPanel only:** static React PWA built in CI and served from cPanel, plus a private
  PHP 8.2+ API with MySQL/MariaDB. No Node runtime on the server.
- **Integrity:** answers never reach the browser before answering; the browser never
  posts a score. Enforced by the PHP API (backend checks in `backend/tests/`).
- **Children's privacy (UK Children's Code; COPPA for US users):** high-privacy defaults
  for everyone; no real names; generated nicknames for under-13s; no free-text chat;
  no personalised ads to anyone under 18; analytics cookieless for under-13s; children
  never use accounts.
- **UK GDPR / PECR:** optional analytics only after consent; privacy policy names every
  processor actually in use (hosting provider, Clerk, ImageKit, Sentry, analytics
  provider).
- **Accessibility:** WCAG 2.2 AA; 48 px touch targets; 16 px minimum body text; visible
  focus; reduced-motion mode; never colour alone for right/wrong.
- **Type-safe:** TypeScript strict, no implicit `any`.
- **Internationalisation:** English (en-GB) at launch; all UI copy in string catalogues.

## 6. Out of scope (V1)

Live multiplayer, real-money prizes, coins/reward currencies, public user-created
quizzes, native app-store apps, AI personalisation, a quiz builder for organisations,
ads and sponsorships (Phase 3), push notifications.

## 7. Roadmap

| Phase   | Theme   | Includes                                                                                                                  | Gate to start            |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| V1      | Launch  | Everything in §4; 30 reviewed quizzes (≈18 general + 12 school)                                                           | —                        |
| Phase 2 | Depth   | Image questions, media library, achievements, offline practice packs, more languages                                      | Day-7 return ≥ 15%       |
| Phase 3 | Revenue | Consent-gated, non-personalised display ads (never between questions), sponsored quizzes, optional CrazyGames embed build | Steady organic traffic   |
| Phase 4 | Scale   | Classrooms / private leagues, premium (ad-free), AI personalisation                                                       | Weekly returning players |

## 8. Launch checklist

- [ ] 30 quizzes reviewed; every question has a source and review-by date
- [ ] Privacy policy + terms written for our actual processors and children's code
- [ ] Analytics blocked until consent; cookieless for under-13s
- [ ] Backend checks in `backend/README.md` pass against a fresh `_test` database
- [ ] Sitemap submitted to Google Search Console (`/sitemap.xml` is generated by the API; category and quiz pages are prerendered at build)
- [ ] Sentry (EU region) alerts on; MySQL backups outside every webroot confirmed
- [ ] Played start-to-finish on a real iPhone and Android phone, portrait **and** landscape
