# UX and navigation audit, 16 October 2026

Scope: live `doyouknow.soulrefresh.net` (release `838335e`) and the codebase, after the
owner reported that the UI looked unstructured, with back and next navigation missing.
Method: three read-only code audits (routes and navigation; SEO, PWA and security config;
UI consistency and accessibility) and a live browser walk-through at 390, 820 and 1440 px.
Play was then tested on a local MariaDB copy with fixture quizzes, not on production,
because every live play creates a real guest.

## Fixed on branch `fix/navigation-structure`

| Pri | Problem | Fix | Verified |
| --- | ------- | --- | -------- |
| P1 | Home had no header, so Leaderboards was unreachable from it; Settings, 404 and quiz-not-found had no header either | `AppLayout` wraps every browse page with `SiteHeader`, `SiteFooter` and a phone `TabBar` (Quizzes, Today, Boards, Me) | Local, 320 to 1440 px: every page has the shell and one h1 |
| P1 | No way up from a quiz to its category, from a category to all quizzes, or out of Settings | Shared `BackLink`: quiz to its category, category to all quizzes, avatar, settings and account to My games | Local click-through |
| P1 | Results ended in a dead end: no next quiz, review had no links, daily "Back to quiz" went to the quiz page | Results show "Next quiz" (same category first), "Play again" and a "What next?" block; the play header link reads "Back to quiz", "Today's challenge" or "Back to the challenge" after the game | Local practice game through to results |
| P1 | Settings page offered "Sign out" to guests, which forgets the guest token and with it every game on the device; its notifications toggle drives nothing | `/me/settings` now holds only the light or dark colour choice (the theme toggle existed but nothing used it). `/dashboard` redirects there | Local |
| P1 | Install banner covered answers on `/daily/play` and `/challenge/:code/play`, and came back on every page load | Hidden on every play path; "Not now" holds for 14 days; it sits above the tab bar | Code and local |
| P2 | Page titles went stale (Home, My games, Account, 404 kept the previous title); no canonical, robots or Open Graph tags | `useDocumentMeta` on every page: title, description, canonical, robots (`noindex` on personal and play pages), `og:*`. Static Open Graph and Twitter tags in `index.html` | Local: titles, canonical and robots read back per page |
| P2 | `favicon.svg` was linked relatively, so deep links requested `/q/favicon.svg` and got a 404 | Absolute `/favicon.svg` | Live console showed the 404; local console clean after |
| P2 | `robots.txt` pointed at `doyouknow.example`; no sitemap; `/account` and `/daily/play` not disallowed | robots fixed; `public/sitemap.xml` lists the fixed pages | Build |
| P2 | Quizzes without cover art showed a large empty "?" panel, so a phone showed one quiz per screen | Compact row card when there is no cover | Local screenshot at 390 px |
| P2 | Home hero filled 85% of the screen with a decorative teaser; two competing calls to action duplicated the daily banner; only 9 quizzes listed with no "see all" | Shorter hero, teaser hidden under 640 px, one primary action, all quizzes listed | Local |
| P2 | Silent states: quiz top players stuck on "Loading…" after an error; daily top 10 showed nothing while loading or on error; leaderboards ignored a catalogue error and had no message when no quiz is ranked; unknown category showed filters under "Category not found" | Loading and error text added; unknown category shows the not-found page | Code; local happy paths |

## Open, needs a decision or more work

| Pri | Item | Why it is not fixed here |
| --- | ---- | ------------------------ |
| P1 | No privacy notice for a children's app (UK GDPR, Age Appropriate Design Code) | Legal text needs the owner and legal review; nothing was invented |
| P1 | Content-Security-Policy not enforced | Report-only header added 16 October 2026 (`docs/07-operations/DEPLOYMENT.md`). Enforce after a clean run of every journey, including Clerk sign-in |
| P2 | ~~Sentry session replay on a kids' app~~ | Fixed 17 October 2026: replay removed, `sendDefaultPii: false` explicit (AGENTS.md §8 data minimisation); main bundle 342 KB to 215 KB |
| P2 | ~~No social preview image~~ | Fixed 17 October 2026: `public/og-image.png` (1200 × 630, brand fonts and logo), `og:image` and `summary_large_image` |
| P2 | Sitemap lists fixed pages only | Category and quiz URLs come from the database; needs a server route |
| P3 | ~~Small buttons and short standalone links~~ | Fixed 17 October 2026 (branch `chore/p3-polish`) |
| P3 | ~~Penguin avatar colour missing; raw palette classes~~ | Fixed 17 October 2026: `bg-avatar-*` tokens |
| P3 | ~~Hand-rolled card markup; varied container widths~~ | Fixed 17 October 2026: `Page` and `Card as` (two fixed prompts keep their own overlay markup) |
| P3 | ~~`format:check` failing on 9 files~~ | Fixed 17 October 2026 |

Not tested: real phone hardware, screen reader runs, live deploy of this branch, Clerk
sign-in on `/account`.
