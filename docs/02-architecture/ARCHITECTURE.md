# System Architecture: Do You Know

Updated 16 October 2026. Supabase was removed from the code on this date (ADR-003 in
`docs/08-change-management/DECISIONS.md`). The cPanel PHP/MySQL API is the only backend.

## 1. Topology

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  Client browser / installed PWA                      │
│   React 18 + Vite + Tailwind · service worker (Workbox)              │
│   Static files from cPanel: SPA app shell                            │
└──────┬───────────────────────┬───────────────┬──────────────┬────────┘
       │ HTTPS JSON /api/v1     │ adult sign-in │ images       │ errors (optional)
       ▼                       ▼ (/account)    ▼              ▼
┌────────────────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ cPanel (same origin)   │ │   Clerk    │ │  ImageKit  │ │   Sentry   │
│ api/api.php → private  │ │ (adults    │ │ (quiz cover│ │ (EU, PII   │
│ PHP 8.2+ in            │ │  only)     │ │  images)   │ │  scrubbed) │
│ ~/dyk-backend          │ └────────────┘ └────────────┘ └────────────┘
│ MySQL/MariaDB          │
└────────────────────────┘
```

- Site: `doyouknow.soulrefresh.net`, own docroot
  `/home/devgeereact/doyouknow.soulrefresh.net`, behind a proxied Cloudflare record with
  Full (strict) TLS.
- The static bundle is built in CI (or on the Mac) and served by Apache. The root
  `.htaccess` routes `/api/v1/*` to `api/api.php`, the only public PHP file. All PHP code,
  `vendor/` and `config.php` live outside every webroot, in private releases under
  `~/dyk-backend`.
- Everything that must be trusted (grading, timing, scores, ownership, nicknames,
  avatars) runs in the PHP API against MySQL/MariaDB.
- Clerk is loaded lazily on `/account` only. Its session tokens are verified server-side
  with `clerkinc/backend-php`. Children never use accounts.
- PostHog (optional, consent-gated) is configured through `VITE_POSTHOG_KEY`.

## 2. Directory layout

```text
src/
├── components/
│   ├── ui/          # Button, Card, Page, buttonClasses
│   ├── game/        # AnswerButton, SliderAnswer, TimerBadge, ProgressDots, ResultsView,
│   │                # ResultsBoard, LeaderboardTable, VersusPanel, ChallengeFriend,
│   │                # NicknamePicker, AgeBandPicker, QuizCard
│   └── …            # AvatarBadge, AdultAccountControls (Clerk), ErrorBoundary,
│                    # InstallPrompt, OfflineBanner, UpdatePrompt, AppLayout (shell),
│                    # SiteHeader, TabBar, SiteFooter, navItems, BackLink
├── context/         # SessionContext (guest session), ThemeContext (light default)
├── hooks/           # see docs/02-architecture/HOOKS.md
├── lib/
│   ├── api.ts         # the only door to the PHP API; guest token in localStorage 'dyk-guest'
│   ├── avatars.ts     # 12 preset avatars (must match Player::AVATARS on the server)
│   ├── env.ts         # validated, typed import.meta.env
│   ├── gameErrors.ts  # API error code → friendly copy
│   ├── imagekit.ts    # ImageKit URL builder (quiz cover images)
│   ├── quizLabels.ts  # display labels
│   ├── sentry.ts      # optional Sentry init (EU, PII scrubbing)
│   └── utils.ts       # cn() and small helpers
├── pages/           # route views (see §3)
├── services/
│   ├── catalogService.ts   # categories, quizzes, curriculum tags (public reads)
│   ├── gameService.ts      # attempts, daily, challenges, leaderboards, history
│   ├── profileService.ts   # profile, age band, nickname, avatar, delete
│   └── settingsService.ts  # theme and notification preferences
├── types/           # domain.ts (row shapes), game.ts (game payloads), index.ts
├── App.tsx          # providers + router
├── main.tsx         # bootstrap: Sentry, SW registration, render
└── index.css        # Tailwind layers + theme CSS variables
backend/
├── public/api.php   # public entry, deployed as api/api.php
├── src/             # Api, Catalog, Game, Competition, Daily, Player, Identity, RateLimit, Database, Config
├── migrations/      # additive MySQL migrations 0001–0004
├── bin/             # migrate.php (CLI ledger), cleanup.php and daily.php (cron)
├── tests/           # unit, HTTP/database, competition, daily, concurrency checks
└── config.example.php
scripts/             # package-cpanel.mjs, check-htaccess.sh, agent_guard.py, guard.py, verify.py
.github/workflows/   # verify.yml: secret-free frontend build and isolated backend checks
```

**Dependency direction:** `pages → hooks → services → lib/api.ts`. Components consume
`hooks` and `context`. Nothing in `lib` imports from `pages` or `components`.

## 3. Rendering and routing

SPA with React Router. Prerendered SEO pages are not built yet.

Browse pages render inside `AppLayout`: `SiteHeader` (logo home, and the main nav from
tablet width), the page, `SiteFooter` (settings, parents and staff) and, on phones, the
bottom `TabBar` (Quizzes, Today, Boards, Me). The nav list lives in
`components/navItems.tsx`, so header and tab bar never drift. Play screens sit outside the
layout and keep only their own back link. Every page below the top level starts with a
`BackLink` to its parent: quiz to its category, category to all quizzes, avatar, settings
and account to My games. Results offer "Next quiz" (next in the same category, then any
other), "Play again" where allowed and "More <category> quizzes".

| Route                                       | View                                                       |
| ------------------------------------------- | ---------------------------------------------------------- |
| `/`                                         | Home: today's challenge, categories, quizzes               |
| `/c/:slug`                                  | Category: quizzes with age/curriculum filters              |
| `/q/:slug`                                  | Quiz landing: intro, details, Play, top scores             |
| `/play/:slug`                               | Game (practice or ranked)                                  |
| `/daily`, `/daily/play`                     | Today's challenge and its game                             |
| `/challenge/:code`, `/challenge/:code/play` | Friend-challenge preview and game                          |
| `/leaderboards`                             | Boards by quiz / daily                                     |
| `/me`, `/me/avatar`                         | History, streak, age band, nickname, preset avatar, delete |
| `/me/settings`                              | Device settings (light or dark colours); no account needed |
| `/account`                                  | Adult (parent/staff) sign-in with Clerk, loaded lazily     |
| `/login`                                    | Redirects to `/account`                                    |
| `/dashboard`                                | Redirects to `/me/settings`                                |
| `/preview`                                  | Redirects to `/`                                           |

Deep links work because `.htaccess` serves real files first and rewrites everything else
to `index.html`; Workbox's `navigateFallback` does the same offline.

## 4. State management

- **Session:** `SessionProvider` (`src/context/SessionContext.tsx`) holds the guest
  session. `POST /guest-sessions` issues an opaque `guest_` token, stored in
  localStorage key `dyk-guest` and sent as a bearer token. A 401 clears it. Players never
  give an email. `useSession` and `useGuestSession` expose it.
- **Adults:** Clerk state lives only inside the lazily loaded `/account` page. It does not
  mark the guest session ready. Game history is not linked to adult accounts yet.
- **Game:** `useQuizAttempt` keeps the current attempt state in a reducer. The server is
  the source of truth; on reload `POST /attempts` resumes the open attempt with its clock.
- **Catalogue data:** fetched per view through `services/*`.
- **Theme:** `ThemeProvider`, light by default, toggle persisted (storage failures tolerated).

## 5. PWA and offline strategy

- `vite-plugin-pwa` (Workbox `generateSW`) precaches the hashed app shell, icons and
  self-hosted fonts. Manifest: `orientation: any`, `display: standalone`.
- **Runtime caching:** ImageKit → `CacheFirst` (30 days, 200 entries). Public catalogue
  GETs only (`/api/v1/categories|quizzes|curriculum-tags|daily`) → `NetworkFirst`
  (5 s timeout, 5-minute expiry). Player routes (`/me`, `/attempts`, `/session`,
  `/guest-sessions`) are never cached.
- **Offline:** app shell and previously loaded catalogue data. Play needs a connection
  because answers are checked online. `public/offline.html` is the last-resort page.
- **Updates:** `registerType: 'prompt'`, `skipWaiting: false`; the update prompt waits
  while a quiz is in progress.

## 6. Data flow: answering a question (the integrity path)

```text
Player taps an option
  → useQuizAttempt.answerOption(optionId)
    → gameService → api('/attempts/{id}/answer', { option_id })   (or { value } for a slider)
      [PHP Game.php, inside a transaction]
      · lock the profile, then the attempt; check owner and status
      · read the answer key from the frozen quiz_versions snapshot
      · time = server now − current_sent_at, capped by the frozen timer
      · insert attempt_answers; update counts and time; stop the clock
      ← { is_correct, correct_option_ids, explanation, source_url, is_last, … }
  → feedback shows the result and explanation (the clock is stopped while reading)
  → Next → POST /attempts/{id}/next (starts the next clock; returns a display deadline)
  → after the last → POST /attempts/{id}/finish
      · totals on the server; leaderboard bests; daily streak
      ← summary with review, ranks and versus data
  → errors: gameErrorMessage(code) for rule errors; Sentry for anything else
```

The browser never holds an answer before answering and never sends a score.

## 7. Background and scheduled work

| Job             | Trigger                                                                                      | What it does                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean-up        | cPanel cron, hourly at minute 17: `/usr/local/bin/php ~/dyk-backend/current/bin/cleanup.php` | Removes up to 1000 expired guest sessions and rate-limit buckets per run. Scheduled on the server 16 October 2026.                                                                                                     |
| Daily challenge | cPanel cron, hourly: `/usr/local/bin/php ~/dyk-backend/current/bin/daily.php` (`Dyk\Daily`)  | Uses the London date. Marks earlier `live` and missed `scheduled` rows `done`, makes today's `scheduled` row `live`, or auto-picks the least recently used published quiz and pins its current version. Safe to rerun. |

There are no background job queues, AI workers or rebuild hooks. `GET /daily` serves
today's row only when `status = 'live'`, so between London midnight and the next hourly
run it returns `null`.

## 8. Build and deploy pipeline

The server has no Node. Full playbook and safety rules: `docs/07-operations/DEPLOYMENT.md`.

1. CI (`.github/workflows/verify.yml`) runs typecheck, lint and build, plus backend checks
   on PHP 8.2 and 8.4 against a disposable MariaDB. It does not deploy.
2. `npm run package:cpanel` builds `dist/` and creates an ignored `build/cpanel-*`
   release with `public/` (docroot) and `private/` (outside every webroot) parts.
3. Release delivery through a GitHub Actions SSH deploy is planned and needs the owner's
   approval of the deploy key and secrets. It is not set up yet.

## 9. Security posture

- Browser-safe values only in `VITE_*`: API URL, Clerk publishable key, ImageKit URL
  endpoint and public key, Sentry DSN, PostHog key.
- Database credentials, the Clerk secret or JWT key and the rate-limit key live only in
  the private `config.php`.
- **Answers:** quiz versions (with answers) stay in MySQL. Public question payloads
  whitelist id, type, prompt, image, option id/label and slider display bounds only.
- **Writes:** a submitted score, role or profile ID is never trusted. Identity comes from
  the verified bearer token. Every query filters by owner.
- **Rate limits:** 120 API requests per minute and 10 new guest sessions per hour per
  network address (keyed hash, raw address not stored).
- **Children:** no real names, emails or photos; generated nicknames for under-13s;
  preset avatars only; boards and challenge previews show nickname, avatar and score only.
- `.htaccess`: HTTPS redirect, HSTS, `X-Content-Type-Options`, frame and referrer
  policies; denies `*.map`, dotfiles, `config.php` and stray PHP.
- Tests: `backend/tests/` (unit, HTTP/database, competition, concurrency).
