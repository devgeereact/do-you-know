# System Architecture — Do You Know

## 1. Topology
```text
┌──────────────────────────────────────────────────────────────────────┐
│                  Client Browser / Installed PWA                        │
│   React 18 + Vite + Tailwind · Service Worker (Workbox)               │
│   Static files on cPanel: prerendered SEO pages + SPA app shell        │
└──────┬────────────────┬───────────────┬───────────────┬──────────────┘
       │ RPC + REST     │ images        │ errors        │ events (write-only key)
       ▼                ▼               ▼               ▼
┌──────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐
│   Supabase   │  │  ImageKit  │  │   Sentry   │  │  Inngest (ingest)  │
│ Auth (anon,  │  │ avatars,   │  │  (EU, PII  │  │ avatar/requested   │
│ Google, link)│  │ scenes,    │  │  scrubbed) │  │ questions/draft... │
│ Postgres+RLS │  │ covers     │  └────────────┘  └─────────┬──────────┘
│ game RPCs    │  └─────▲──────┘                            │ invokes
│ pg_cron      │        │ upload                             ▼
│ Edge Funcs ◄─┼────────┴──────────────────── Supabase Edge Functions
└──────┬───────┘                              (inngest, trigger-rebuild)
       │ pg_net (publish → debounced hook)            │ OpenRouter (text + image models)
       ▼                                              ▼
 GitHub Actions: build → prerender → deploy dist/ to cPanel over FTP/SSH
```
The static bundle talks to each managed service over HTTPS. **cPanel only serves
files** — every piece of logic that must be trusted runs inside Supabase.

## 2. Directory layout
```text
src/
├── assets/        # images/svgs imported by code (mascot, scene layers)
├── components/
│   ├── ui/        # primitives: Button, Card, AnswerButton, ScoreRing, AvatarImage, Sheet
│   ├── game/      # QuestionView, ChoiceAnswers, SliderAnswer, FeedbackSheet, ResultsView, Timer
│   ├── admin/     # QuizEditor steps, QuestionForm, CsvImport, DailyCalendar, DraftReview
│   └── …          # ErrorBoundary, InstallPrompt, OfflineBanner, UpdatePrompt, ProtectedRoute
├── context/       # AuthProvider (+ auto guest sign-in), ThemeProvider (light default)
├── hooks/         # see docs/02-architecture/HOOKS.md (base + game hooks)
├── lib/
│   ├── env.ts         # validated, typed import.meta.env
│   ├── supabase.ts    # typed Supabase client
│   ├── sentry.ts      # Sentry init (EU, PII scrubbing)
│   ├── imagekit.ts    # ImageKit URL builder
│   ├── gameErrors.ts  # RPC error code → friendly copy
│   └── utils.ts       # cn() and small helpers
├── pages/         # route views (public, play, me, admin/*)
├── services/
│   ├── gameService.ts        # start/answer/next/finish RPCs
│   ├── catalogService.ts     # categories, quizzes, curriculum tags (public reads)
│   ├── leaderboardService.ts # get_leaderboard
│   ├── challengeService.ts   # create/get friend challenges
│   ├── profileService.ts     # profile, age band, nickname, delete account
│   ├── avatarService.ts      # request/activate avatars, poll status
│   ├── settingsService.ts    # app_settings (theme, notifications)
│   └── admin/                # quizzes, questions, CSV, drafts, daily, moderation (staff)
├── types/         # database.types.ts, game.ts (RPC payloads), admin.ts (staff-only)
├── App.tsx        # providers + router
├── main.tsx       # bootstrap: Sentry, SW registration, render
└── index.css      # Tailwind layers + theme CSS variables
scripts/
└── prerender.mjs  # build-time: static HTML for public pages + sitemap.xml
supabase/
├── migrations/    # 0001 base · 0002 core tables + RLS · 0003 game RPCs · 0004 jobs
├── functions/     # Edge Functions (inngest handler, trigger-rebuild) + server-only .env.example
└── tests/         # run_tests.sh: rebuilds a scratch DB and runs 61 behaviour checks
```
**Dependency direction:** `pages → services → lib`. Components consume `hooks` and
`context`. Nothing in `lib` imports from `pages`/`components`. Player code never imports
`types/admin.ts` or `services/admin/*`.

## 3. Rendering & routing
- SPA with **React Router** (`createBrowserRouter`), plus **prerendered HTML** for public,
  indexable routes so search engines and link previews see real content.

| Route | View | Indexed | Prerendered |
| --- | --- | :-: | :-: |
| `/` | Home: today's challenge, trending, categories | ✅ | ✅ |
| `/c/:slug` | Category: quizzes, age/curriculum filters | ✅ | ✅ |
| `/q/:slug` | Quiz landing: intro, details, Play, top 10 | ✅ | ✅ |
| `/play/:slug` | Game (practice or ranked) | ❌ | ❌ |
| `/daily` | Today's challenge → game | ✅ | ✅ |
| `/challenge/:code` | Friend-challenge preview → game | ❌ | ❌ (OG tags via share card) |
| `/leaderboards` | Boards by quiz / daily | ✅ | ✅ |
| `/me` | History, streak, avatar builder, settings, delete account | ❌ | ❌ |
| `/parent` | Parent sign-in + consent for an under-13 | ❌ | ❌ |
| `/admin/*` | CMS (staff only; `ProtectedRoute` + `is_staff()`) | ❌ | ❌ |
| `/how-to-play`, `/about`, `/contact`, `/privacy`, `/terms` | Static | ✅ | ✅ |

- Deep links work because `.htaccess` serves real files first (prerendered pages) and
  rewrites everything else to `index.html`; Workbox's `navigateFallback` does the same
  offline.
- First visit: `AuthProvider` calls `supabase.auth.signInAnonymously()` the first time a
  player presses Play, creating a **guest** with no email.

## 4. State management
- **Auth:** `AuthProvider` (Context) holds the Supabase session; guests are real
  (anonymous) sessions, so every RPC has an `auth.uid()`.
- **Game:** `useQuizAttempt` keeps the current `AttemptState`/`AnswerResult` in a
  reducer. The server is the source of truth; on reload the hook calls `start_attempt`,
  which **resumes** the open attempt with its clock intact.
- **Catalogue data:** fetched per view through `services/*`; Workbox caches GETs.
  (TanStack Query can be added later if caching needs grow.)
- **UI/theme:** `ThemeProvider` — light by default, follows device dark mode, toggle
  persisted (storage failures are tolerated).
- No global store in V1.

## 5. PWA & offline strategy
- `vite-plugin-pwa` (Workbox `generateSW`) precaches the hashed app shell, icons and the
  self-hosted fonts. Manifest: `orientation: any`, `display: standalone`,
  `theme_color #1570C2`, `background_color #EAF6FF`, categories `education, games`.
- **Runtime caching:** ImageKit → `CacheFirst` (30 days, 200 entries); Supabase REST GETs
  → `NetworkFirst` (5 s timeout, 5-min fallback). **Game RPCs are POSTs and never cached.**
- **Offline:** app shell, previously opened quiz pages and images load; Play shows "You
  need a connection to play — your answers are checked online". `public/offline.html` is
  the last-resort page.
- **Updates:** `registerType: 'prompt'`, `skipWaiting: false`; the "Reload to update"
  prompt is suppressed while a quiz is in progress.

## 6. Data flow: answering a question (the integrity path)
```text
QuestionView (player taps "Venus")
  → useQuizAttempt.answer(optionId)
    → gameService.answerQuestion(attemptId, optionId)
      → supabase.rpc('answer_question', { p_attempt_id, p_option_id })
        [Postgres, SECURITY DEFINER]
        · lock attempt row; check owner = auth.uid(), status, question was shown
        · read the answer key from the frozen quiz_versions snapshot
        · time = now() − current_sent_at (server clock), capped at 60 s / timer
        · insert attempt_answers; bump correct/answered/time; current_sent_at = null
        ← { is_correct, correct_option_ids, explanation, source_url, is_last }
  → FeedbackSheet shows result + explanation (clock is stopped while reading)
  → player taps Next → supabase.rpc('next_question')  (starts the next clock)
  → after the last one → supabase.rpc('finish_attempt')
        · totals on the server; writes all-time/weekly/daily bests; updates streak
        ← { correct, total, answer_time_ms, review[], ranks, versus, needs_nickname }
  → ResultsView: Play again · Challenge a friend · Share · Next quiz
  → errors: gameErrorMessage(code) for rule errors; Sentry for anything else
```
The browser never holds an answer before answering and never sends a score.

## 7. Background work, AI and scheduled jobs
All of this runs in Supabase — never on cPanel, never in the browser.

| Job | Trigger | Runs in | What it does |
| --- | --- | --- | --- |
| Avatar generation | client sends `avatar/requested {avatar_id}` after `request_avatar()` | Inngest → Edge Function `inngest` | Re-checks the row is `pending`; builds a prompt from traits + house style; calls the OpenRouter **image** model from `site_config.ai_models`; runs a safety check; uploads to ImageKit `/avatars/`; sets `ready` + `image_url` (or `failed`, freeing the combo). Retries 3× with backoff. |
| AI question drafts | staff inserts a draft row and sends `questions/draft.requested {draft_id}` | Inngest → Edge Function `inngest` | Calls the OpenRouter **text** model (web-search-capable) with a strict JSON schema; every question must include a `source_url`; stores the result and sets `ready`. Staff then run `import_ai_draft()`. |
| Daily switch | `pg_cron` hourly | Postgres `activate_daily_challenge()` | At 00:00 London, sets today live and freezes its quiz version. |
| Scheduled publish | `pg_cron` every 5 min | `publish_due_quizzes()` | Flips due `scheduled` quizzes to `published`. |
| Site rebuild | `pg_cron` every 5 min | `send_rebuild_hook()` → Edge Function `trigger-rebuild` | One debounced call per batch of publishes → GitHub `repository_dispatch` → Actions rebuild + prerender + deploy. |
| Housekeeping | `pg_cron` daily 03:30 UTC | `cleanup_stale_data()` | Abandons stale attempts, purges long-expired challenge links. |

Server-only secrets (set with `supabase secrets set`, never in this repo's `.env`):
`OPENROUTER_API_KEY`, `IMAGEKIT_PRIVATE_KEY`, `INNGEST_SIGNING_KEY`,
`REBUILD_HOOK_SECRET`, `GITHUB_DISPATCH_TOKEN`. See `supabase/functions/.env.example`.

## 8. Build & deploy pipeline
The server has **no Node/npm** — the build runs locally or in GitHub Actions and only
static artifacts ship. Full playbook + safety rules: **`docs/07-operations/DEPLOYMENT.md`**.
1. `npm run build` → `tsc --noEmit` (gate) → Vite build → `dist/` (+ `sw.js`, manifest, maps).
2. `node scripts/prerender.mjs` → reads **published** categories/quizzes with the anon key
   (RLS allows only public rows), writes `dist/q/<slug>/index.html`, `dist/c/<slug>/index.html`,
   etc. with real titles, descriptions, Open Graph tags and intro text, and `dist/sitemap.xml`.
3. Deploy `dist/*` and root `.htaccess` into **this app's own docroot** via SSH/rsync or
   FTP from Actions. **Never** a shared docroot; dry-run any delete first.
4. Upload source maps to Sentry; do not serve `*.map` (`.htaccess` denies them).

Triggers: push to `main` (after PR review) and `repository_dispatch: content-published`.

## 9. Security posture
- Browser-safe keys only: Supabase **anon** (RLS-guarded), ImageKit **public**, Inngest
  **write-only event** key, optional PostHog project key.
- `service_role`, OpenRouter, ImageKit private, Inngest signing and GitHub tokens are
  Edge Function secrets only.
- **Answers:** `questions`, `question_options`, `quiz_versions` are staff-only under RLS;
  players get questions only through `_public_question()`, which strips answer fields.
- **Writes:** players cannot insert/update attempts, answers, board rows, avatars or
  protected profile columns; only SECURITY DEFINER functions do, after checks.
- **Rate limits:** 5 attempt starts/minute; one answer per question; 3 avatars/day.
- **Children:** no real names stored; generated nicknames for under-13s; parent email
  only via parental consent; boards show nickname + avatar only.
- `.htaccess`: HTTPS redirect, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and denies `*.map`/backups.
- Tests: `supabase/tests/run_tests.sh` proves the rules (61 checks: answer hiding,
  privilege escalation, fake scores, double answers, timers, versioning, kids' rules).
