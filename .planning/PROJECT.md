# Do You Know

## What This Is

A quiz PWA for children, families and trivia fans, live at https://doyouknow.space. Players take timed multiple-choice, true/false and slider quizzes as guests (generated nickname, preset character), with a daily quiz, friend challenges and leaderboards. A staff-only Studio (`/admin`) lets the owner write, import, check and publish quizzes, with optional AI help that never publishes on its own.

## Core Value

Children can play fair, trustworthy quizzes safely: the server grades and times every answer, answers are never exposed early, and no personal data is collected from children.

ASSUMPTION: worded from the product rules in AGENTS.md; owner to confirm or reword.

## Requirements

### Validated

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

### Active

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

### Candidates

<!-- From the 7 Nov read-only map. Findings, not decisions. See .planning/codebase/CONCERNS.md. Owner chooses what becomes scope. -->

- [ ] Fix defects and risks listed in CONCERNS.md (editor AI Undo, generator `send` double-append, `create` TypeError, and others)
- [ ] Bring stale docs and tracking files up to date (including a `docs/AUDIT.md` section for the 7 Nov rewrite)

### Out of Scope

- New tracking or ad SDKs, generated player photos, AI auto-publication — AGENTS.md rules
- Collecting real names, birthdates, photos, location, contacts or free text from children — AGENTS.md rules
- Supabase/Neon, FTP accounts, force pushes and mirror-delete deploys — owner global rules

## Context

- Existing, live product; GSD adopts it as-is. This is the starting point, not a plan.
- Sources of truth stay where they are: `.agent/CURRENT-TASK.md`, `.agent/HANDOFF.md`, `docs/`. `.planning/` summarises the 7 Nov map and links back; it does not replace them.
- Frontend: React 18, TypeScript strict, Vite, Tailwind tokens, ~84 `.tsx` and 87 `.ts` tracked files. Backend: private PHP (8.2 floor, server 8.4), MariaDB, 15 migration files (0009 intentionally absent), 24 tables, 13 PHP test suites.
- Seed content in `backend/content/` (46 quizzes, 1,380 questions) is a 25 Oct seed; the live catalogue (262) is owned by Studio.

## Constraints

- **Tech stack**: pnpm, Node 24 (`.node-version`), ESLint plus Prettier (custom i18n lint rule), PHP prepared statements, applied migrations immutable
- **Security**: never expose answers before answering; trusted scores, times and permissions computed server-side only; `VITE_*` is public; secrets outside webroots
- **Process**: anything on the server (deploys, migrations, cron, files) needs explicit owner OK in the session; focused commits; `pnpm check` is the gate
- **Hosting**: cPanel (Namecheap), Cloudflare DNS/HTTPS, GitHub (`devgeereact/do-you-know`, private, `main`)

## Key Decisions

Existing ADRs live in `docs/08-change-management/DECISIONS.md` and remain authoritative. Those cited by the 7 Nov read-through:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ADR-007 / ADR-009: practice 10, ranked 20 questions | Round sizing | — in force |
| ADR-013: deploy through GitHub Actions `deploy.yml` (owner, 30 Oct) | Overrides the global "Mac-built release" rule for this project | — in force; stale comment in `scripts/release.mjs:4` |
| ADR-017 / ADR-022: Anthropic default provider, Sonnet 5.5 default model | ADR-016/017 still say Opus; supersession not marked | ⚠️ Revisit docs |
| ADR-018: daily self-heals on `GET /daily` | Survives a missed cron | — in force |
| ADR-019: import sources optional | Contradicted by PRODUCT-SPEC.md:148 and backend/README.md | ⚠️ Revisit docs |
| ADR-020 / ADR-021: AI drafts and advisory import review | A person accepts every change | — in force |

---
*Last updated: 2026-11-07 after importing the read-only map as the GSD starting point*
