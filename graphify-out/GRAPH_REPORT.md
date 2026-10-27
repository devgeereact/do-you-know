# Graph Report - do-you-know  (2026-10-27)

## Corpus Check
- 335 files · ~199,886 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 10, .css 2, .graphify-bak 1)

## Summary
- 1559 nodes · 3529 edges · 144 communities (76 shown, 68 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7738821`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin area plan (approved 27 October 2026)
- deploy-ftps.py
- PROJECT.yml
- env
- New repository and hosting setup — doyouknow.space
- gameService.ts
- ResultsView.tsx
- package.json
- content.php
- package.json
- test.ts
- gameService.ts
- .run
- i18n/index.ts
- Design System & Visual Guidelines — Do You Know
- useProfile.ts
- connections
- App.tsx
- reportError
- compilerOptions
- .execute
- prerender-html.mjs
- dependencies
- composer.json
- ApiError
- Hard Coding Rules & Standards — Do You Know
- lib/env.ts
- 4. V1 feature set (MVP)
- .one
- domain.ts
- Catalog
- Content
- api.ts
- scripts
- global-setup.ts
- reportError
- live-db.sh
- verify.yml
- backend
- MySQL Data Model and Access Rules: Do You Know
- Game hooks
- vitest
- MemoryStorage
- Daily
- with
- Custom Hooks Specification: Do You Know
- .adult
- System Architecture: Do You Know
- steps
- e2e
- useLeaderboard.ts
- Do You Know — agent contract
- pull-backups.sh
- vite.config.ts
- avatars.ts
- AvatarBadge.tsx
- full_backend
- PWA Release Gates
- Website Launch and Quality Gates
- react
- SiteHeader.tsx
- Clerk and cPanel API evidence, 15 October 2026
- Database
- AdminConsole.tsx
- Project Context
- ApiWatcher
- tailwindcss
- Production migration evidence
- deploy-by-hand.sh
- Security Model
- Test Strategy
- Accessibility Audit
- Security Audit
- check-htaccess.sh
- cron-ensure.test.sh
- prerender-html.d.mts
- admin.php
- Changelog
- Claude Code — Do You Know
- Evidence Status — doyouknow.space
- env
- Admin
- cron-ensure.sh
- vite-env.d.ts
- UX and navigation audit, 16 October 2026
- .roundSize
- CODEX.md
- CHANGE-SAFETY-PROTOCOL.md
- ENGINEERING-RULES.md
- BUSINESS-RULES.md
- USER-JOURNEYS.md
- USER-ROLES.md
- API-SPEC.md
- INTEGRATIONS.md
- ACCESSIBILITY.md
- UX-SPEC.md
- OFFLINE-SPEC.md
- PWA-SPEC.md
- SYNC-SPEC.md
- UPDATE-STRATEGY.md
- AUTH-MODEL.md
- DATA-PRIVACY.md
- PERMISSIONS.md
- BACKUP-RECOVERY.md
- CPANEL-MIGRATION.md
- EMAIL-SPEC.md
- MONITORING.md
- NOTIFICATIONS-SPEC.md
- PRODUCTION-CUTOVER.md
- LAUNCH-CHECKLIST.md
- RELEASE-REPORT.md
- RESTRUCTURE-PLAN.md
- KNOWN-ISSUES.md
- icons/README.md
- AVATAR-CONFIGURATION-CHECK.md
- FUNCTIONAL-AUDIT.md
- bootstrap-github.sh
- cleanup-merged-branches.sh
- enforce-csp.sh
- owner-tasks.sh
- scripts/README.md
- integration/README.md
- regression/README.md
- DEFAULT_DESCRIPTION
- SITE
- PlayPage.tsx
- useDailyChallenge.ts
- InstallPrompt.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 69 edges
2. `enGB` - 64 edges
3. `t` - 63 edges
4. `cn()` - 56 edges
5. `Card()` - 42 edges
6. `useDocumentMeta()` - 40 edges
7. `Button` - 35 edges
8. `api()` - 33 edges
9. `ApiError` - 32 edges
10. `react-router-dom` - 32 edges

## Surprising Connections (you probably didn't know these)
- `Phase A: Foundation` --references--> `getToken()`  [INFERRED]
  docs/01-product/ADMIN-AREA-PLAN.md → tests/unit/components/AdminConsole.test.tsx
- `Phase D: Quiz and content manager` --references--> `ContentImporter`  [INFERRED]
  docs/01-product/ADMIN-AREA-PLAN.md → backend/src/ContentImporter.php
- `2. `useOnlineStatus`` --references--> `useOnlineStatus()`  [INFERRED]
  docs/02-architecture/HOOKS.md → src/hooks/useOnlineStatus.ts
- `4. Styling` --references--> `cn()`  [INFERRED]
  docs/00-foundation/RULES.md → src/lib/utils.ts
- `Open, needs a decision or more work` --references--> `Page()`  [INFERRED]
  qa/UX-NAVIGATION-AUDIT.md → src/components/ui/Page.tsx

## Import Cycles
- None detected.

## Communities (144 total, 68 thin omitted)

### Community 0 - "Admin area plan (approved 27 October 2026)"
Cohesion: 0.12
Nodes (15): Admin area plan (approved 27 October 2026), Context, Critical files, Deferred (not in this version), Deployment per phase, Findings that shape the design, Phase B: Dashboard (read-only), Phase C: Leaderboard moderation (+7 more)

### Community 1 - "deploy-ftps.py"
Cohesion: 0.07
Nodes (12): decide(), env_in_command(), main(), secret_path(), deploy(), main(), payload(), remote_path() (+4 more)

### Community 2 - "PROJECT.yml"
Cohesion: 0.04
Nodes (46): current_task, dev_server, command, port, hosting, deployed_by_this_task, deployment, document_root (+38 more)

### Community 3 - "env"
Cohesion: 0.04
Nodes (46): concurrency, cancel-in-progress, group, description, required, type, BACKEND_READY, CONFIRM (+38 more)

### Community 4 - "New repository and hosting setup — doyouknow.space"
Cohesion: 0.05
Nodes (36): Current task — doyouknow.space is live, Content review and publishing, cPanel API package, Files and deployment layout, Implemented API, Production port progress, Verification, Checks and limits (+28 more)

### Community 5 - "gameService.ts"
Cohesion: 0.21
Nodes (21): FeedbackPanelProps, ResultsViewProps, VersusPanelProps, AttemptPhase, errorCode(), useQuizAttempt, wait(), api() (+13 more)

### Community 6 - "ResultsView.tsx"
Cohesion: 0.25
Nodes (12): ChallengeFriend(), accuracy(), answerText(), cheer(), NextSteps(), ResultsView(), ReviewRow(), VersusPanel() (+4 more)

### Community 7 - "package.json"
Cohesion: 0.12
Nodes (16): allowScripts, esbuild@0.25.12, fsevents@2.3.3, description, @types/react@^18.3.18, @typescript-eslint/eslint-plugin@^8.19.0, @typescript-eslint/parser@^8.19.0, engines (+8 more)

### Community 9 - "package.json"
Cohesion: 0.09
Nodes (23): devDependencies, autoprefixer@^10.4.20, eslint@^8.57.1, eslint-plugin-react-hooks@^5.1.0, eslint-plugin-react-refresh@^0.4.16, jsdom@^27.4.0, postcss@^8.4.49, prettier@^3.4.2 (+15 more)

### Community 10 - "test.ts"
Cohesion: 0.31
Nodes (8): answerCurrentQuestion(), ApiRecord, expectNoHorizontalOverflow(), Fixtures, playThrough(), QUIZ, test, watchConsole()

### Community 11 - "gameService.ts"
Cohesion: 0.12
Nodes (19): SliderAnswerProps, GameErrorCode, LeaderboardRow, LikeResult, PublicOption, PublicQuestion, PublicSlider, QuestionType (+11 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.13
Nodes (23): AdultAccountControls(), Props, State, AgeBandPicker(), BANDS, ChallengeFriendProps, NicknamePickerProps, ShareResult() (+15 more)

### Community 14 - "Design System & Visual Guidelines — Do You Know"
Cohesion: 0.29
Nodes (6): 1. Aesthetic direction, 2. Design tokens, 4. Accessibility (WCAG 2.2 AA), Colour, Design System & Visual Guidelines — Do You Know, Typography

### Community 15 - "useProfile.ts"
Cohesion: 0.26
Nodes (14): AgeBandPickerProps, useProfile, clearSession(), assignRandomNickname(), deleteMyAccount(), getProfile(), setAgeBand(), setAvatar() (+6 more)

### Community 16 - "connections"
Cohesion: 0.08
Nodes (24): connections, database, design, github, hosting, monitoring, purpose, status (+16 more)

### Community 17 - "App.tsx"
Cohesion: 0.06
Nodes (94): Phase A: Foundation, 5. Component conventions, Spacing, radius, size, Decision Log, @clerk/react, react-router-dom, AccountPage, AdminApp (+86 more)

### Community 18 - "reportError"
Cohesion: 0.21
Nodes (12): ADR-0005, useBestScores, useContinuePlaying, useGuestSession, useMyGames, useSession(), GameHistoryItem, listContinuePlaying() (+4 more)

### Community 19 - "compilerOptions"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - ".execute"
Cohesion: 0.11
Nodes (8): {closure#1}(), {closure#2}(), {closure#4}(), ContentImporter, feedQuiz(), finishedAttempt(), seoCategory(), seoQuiz()

### Community 21 - "prerender-html.mjs"
Cohesion: 0.16
Nodes (20): dist, getJson(), ageLabel(), ageRange(), categoryPage(), DEFAULT_DESCRIPTION, DIFFICULTY, escapeHtml() (+12 more)

### Community 22 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, @clerk/react@^6.17.8, clsx@^2.1.1, @fontsource-variable/fredoka@^5.3.0, @fontsource-variable/nunito@^5.3.0, gsap@^3.15.0, @gsap/react@^2.1.2, lenis@^1.3.27 (+12 more)

### Community 23 - "composer.json"
Cohesion: 0.09
Nodes (21): autoload, psr-4, config, platform, sort-packages, description, license, name (+13 more)

### Community 24 - "ApiError"
Cohesion: 0.10
Nodes (7): ApiError, {closure#2}(), {closure#4}(), {closure#6}(), {closure#7}(), Game, {closure#2}()

### Community 25 - "Hard Coding Rules & Standards — Do You Know"
Cohesion: 0.06
Nodes (25): 1. Architecture, 2. TypeScript, 3. React, 4. Styling, 5. Data & security, 6. Errors & logging, 7. Git & reviews, 8. Deploy hygiene (see `docs/07-operations/DEPLOYMENT.md`) (+17 more)

### Community 26 - "lib/env.ts"
Cohesion: 0.27
Nodes (8): 1. `usePWAInstall`, 2. `useOnlineStatus`, 2a. `useDocumentMeta`, 3. `useOptimizedImage`, Base hooks, useOptimizedImage(), buildImageKitUrl(), ImageTransform

### Community 27 - "4. V1 feature set (MVP)"
Cohesion: 0.10
Nodes (19): 1. Overview, 2. Target users & roles, 3. Goals & success metrics, 4.1 Public site & discovery, 4.2 The game, 4.3 Scoring & fairness (server-side), 4.4 Daily challenge, 4.5 Friend challenges (+11 more)

### Community 28 - ".one"
Cohesion: 0.23
Nodes (5): Competition, {closure#8}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 29 - "domain.ts"
Cohesion: 0.20
Nodes (9): getSettings(), updateSettings(), AppSettings, AppSettingsUpdate, AttemptStatus, Difficulty, QuizStatus, Role (+1 more)

### Community 30 - "Catalog"
Cohesion: 0.15
Nodes (5): Catalog, {closure#1}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 32 - "api.ts"
Cohesion: 0.10
Nodes (18): 4. State management, SessionContext, SessionContextValue, SessionProvider(), SessionUser, ApiError, ensureGuest(), hasSession() (+10 more)

### Community 33 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, check:htaccess, check:rebrand, cron:ensure, dev, format, format:check (+8 more)

### Community 34 - "global-setup.ts"
Cohesion: 0.14
Nodes (19): @playwright/test@^1.64.1, @playwright/test, globalSetup(), mysqlAdmin(), php(), waitForHealth(), API_PORT, API_URL (+11 more)

### Community 35 - "reportError"
Cohesion: 0.25
Nodes (16): useQuiz, CatalogFilters, useQuizCatalog, useTrendingQuizzes, reportError(), getCategory(), getQuiz(), listCategories() (+8 more)

### Community 36 - "live-db.sh"
Cohesion: 1.00
Nodes (3): listening(), open_tunnel(), live-db.sh script

### Community 37 - "verify.yml"
Cohesion: 0.14
Nodes (13): concurrency, cancel-in-progress, group, runs-on, timeout-minutes, jobs, frontend, unit (+5 more)

### Community 38 - "backend"
Cohesion: 0.14
Nodes (14): if, runs-on, services, timeout-minutes, env, image, options, ports (+6 more)

### Community 39 - "MySQL Data Model and Access Rules: Do You Know"
Cohesion: 0.15
Nodes (12): 1. Entity relationships, 2. Tables, 3. Access rules (enforced in PHP), 4. API surface, 5. Versioning, 6. TypeScript types, 7. Testing the schema, 8. Migration policy (+4 more)

### Community 40 - "Game hooks"
Cohesion: 0.15
Nodes (13): 10. `useMyGames`, 11. `useDailyChallenge`, 12. `useFriendChallenge`, 13. `useLeaderboard`, 14. `useProfile`, 15. `useTrendingQuizzes`, 16. `useContinuePlaying`, 17. `useBestScores` (+5 more)

### Community 41 - "vitest"
Cohesion: 0.20
Nodes (8): @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.3, vitest@^4.1.12, @testing-library/jest-dom, @testing-library/react, vitest, getToken(), service

### Community 43 - "Daily"
Cohesion: 0.24
Nodes (5): {closure#1}(), Daily, {closure#1}(), {closure#2}(), {closure#3}()

### Community 44 - "with"
Cohesion: 0.18
Nodes (11): with, cache, coverage, extensions, name, node-version, path, persist-credentials (+3 more)

### Community 45 - "Custom Hooks Specification: Do You Know"
Cohesion: 0.33
Nodes (5): 4. `useSession`, 5. `useGuestSession`, Conventions, Custom Hooks Specification: Do You Know, Session hooks

### Community 47 - "System Architecture: Do You Know"
Cohesion: 0.22
Nodes (8): 1. Topology, 2. Directory layout, 5. PWA and offline strategy, 6. Data flow: answering a question (the integrity path), 7. Background and scheduled work, 8. Build and deploy pipeline, 9. Security posture, System Architecture: Do You Know

### Community 48 - "steps"
Cohesion: 0.42
Nodes (9): steps, steps, steps, if, name, run, uses, working-directory (+1 more)

### Community 49 - "e2e"
Cohesion: 0.22
Nodes (9): env, if, runs-on, timeout-minutes, E2E_DB_ADMIN_HOST, E2E_DB_ADMIN_PASSWORD, E2E_DB_ADMIN_USER, E2E_DB_USER_HOST (+1 more)

### Community 50 - "useLeaderboard.ts"
Cohesion: 0.21
Nodes (15): LeaderboardTableProps, LikeButton(), toggle(), LikeButtonProps, ResultsBoardProps, challengeUrl(), useFriendChallenge, gameErrorMessage() (+7 more)

### Community 51 - "Do You Know — agent contract"
Cohesion: 0.25
Nodes (7): Authority and Git, Checks and handoff, Deployment, Do You Know — agent contract, Security and game integrity, Sources of truth, Stack and coding

### Community 53 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): vite@^6.0.5, vite-plugin-pwa@^0.21.1, @vitejs/plugin-react@^4.3.4, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 55 - "avatars.ts"
Cohesion: 0.22
Nodes (4): privateDir, publicDir, root, verifyPublic()

### Community 56 - "AvatarBadge.tsx"
Cohesion: 0.31
Nodes (5): AvatarBadgeProps, SIZES, AVATARS, findAvatar(), PresetAvatar

### Community 57 - "full_backend"
Cohesion: 0.29
Nodes (7): default, description, type, full_backend, on, workflow_dispatch, inputs

### Community 58 - "PWA Release Gates"
Cohesion: 0.29
Nodes (6): Automated and manual assurance, Experience and release, Identity, data and synchronisation, Installation and navigation, PWA Release Gates, Runtime and network

### Community 59 - "Website Launch and Quality Gates"
Cohesion: 0.29
Nodes (6): Automated and manual assurance, Conversion risks, Interface repair, Launch essentials, Security checks, Website Launch and Quality Gates

### Community 60 - "react"
Cohesion: 0.21
Nodes (10): react, AUTO_ADVANCE_MS, RANK_STYLE, ProgressDotsProps, TimerBadgeProps, CountUpProps, COLUMNS, SegmentedControlProps (+2 more)

### Community 61 - "SiteHeader.tsx"
Cohesion: 0.17
Nodes (19): 3. Rendering and routing, 3. Motion (GSAP + Lenis + CSS), Fixed on branch `fix/navigation-structure`, AppLayout(), Cloud(), SkyBackdrop(), STARS, iconProps (+11 more)

### Community 62 - "Clerk and cPanel API evidence, 15 October 2026"
Cohesion: 0.33
Nodes (5): Clerk and cPanel API evidence, 15 October 2026, Clerk development setup, Hosted development origin checks, Limits and next action, PHP and database

### Community 63 - "Database"
Cohesion: 0.10
Nodes (5): Config, Database, {closure#3}(), completeGame(), request()

### Community 64 - "AdminConsole.tsx"
Cohesion: 0.39
Nodes (7): Access, SECTIONS, adminCall(), AuditEntry, getAdminMe(), getAuditLog(), GetToken

### Community 65 - "Project Context"
Cohesion: 0.40
Nodes (4): Boundaries, Fact register, Problem and outcome, Project Context

### Community 66 - "ApiWatcher"
Cohesion: 0.20
Nodes (6): End-to-End Tests, Journeys, Needs, Rules every test gets for free, What the run builds, ApiWatcher

### Community 67 - "tailwindcss"
Cohesion: 0.40
Nodes (3): tailwindcss@^3.4.17, tailwindcss, config

### Community 68 - "Production migration evidence"
Cohesion: 0.40
Nodes (4): Clerk production DNS, 16 October 2026, Competition and clock batch, Player and catalogue batch, Production migration evidence

### Community 69 - "deploy-by-hand.sh"
Cohesion: 0.60
Nodes (4): LC_ALL, package(), remote(), deploy-by-hand.sh script

### Community 70 - "Security Model"
Cohesion: 0.50
Nodes (3): Assets and threats, Baseline controls, Security Model

### Community 71 - "Test Strategy"
Cohesion: 0.50
Nodes (3): Coverage plan, Risk priorities, Test Strategy

### Community 72 - "Accessibility Audit"
Cohesion: 0.50
Nodes (3): Accessibility Audit, Automated evidence, Manual assurance

### Community 73 - "Security Audit"
Cohesion: 0.50
Nodes (3): Automated evidence, Manual assurance, Security Audit

### Community 74 - "check-htaccess.sh"
Cohesion: 0.83
Nodes (3): body(), check(), check-htaccess.sh script

### Community 75 - "cron-ensure.test.sh"
Cohesion: 0.83
Nodes (3): check(), run(), cron-ensure.test.sh script

### Community 76 - "prerender-html.d.mts"
Cohesion: 0.50
Nodes (3): PrerenderCategory, PrerenderPage, PrerenderQuiz

### Community 80 - "Evidence Status — doyouknow.space"
Cohesion: 0.33
Nodes (5): Content and full app release (step E) — 26 October 2026, Evidence Status — doyouknow.space, Hosting, first deployment and Clerk — 26 October 2026, Local backend and Apache checks — 25 October 2026, Private backend, database and backups (step D) — 26 October 2026

### Community 81 - "env"
Cohesion: 0.67
Nodes (3): VITE_POSTHOG_KEY, VITE_SENTRY_DSN, env

### Community 82 - "Admin"
Cohesion: 0.15
Nodes (3): Admin, {closure#2}(), RateLimit

### Community 139 - "PlayPage.tsx"
Cohesion: 0.17
Nodes (18): AnswerButton(), AnswerButtonProps, AnswerButtonState, MARKERS, STATES, FeedbackPanel(), headline(), ProgressDots() (+10 more)

### Community 140 - "useDailyChallenge.ts"
Cohesion: 0.33
Nodes (8): londonYesterday(), useDailyChallenge, getDailyToday(), hasFinishedDaily(), londonToday(), daily, session, profile()

### Community 141 - "InstallPrompt.tsx"
Cohesion: 0.18
Nodes (11): InstallPrompt(), recentlyDismissed(), OfflineBanner(), useOnlineStatus(), BeforeInstallPromptEvent, detectInstalled(), usePWAInstall, isPlayPath() (+3 more)

## Knowledge Gaps
- **4 isolated node(s):** `DEFAULT_DESCRIPTION`, `SITE`, `ADR-0005`, `LC_ALL`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 684 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phases (each is deployable on its own)` connect `Admin area plan (approved 27 October 2026)` to `App.tsx`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `cn()` (e.g. with `4. Styling` and `5. Component conventions`) actually correct?**
  _`cn()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DEFAULT_DESCRIPTION`, `SITE`, `ADR-0005` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin area plan (approved 27 October 2026)` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `Phase A: Foundation` connect `App.tsx` to `Admin area plan (approved 27 October 2026)`, `vitest`, `gameService.ts`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Card()` (e.g. with `Phase A: Foundation` and `5. Component conventions`) actually correct?**
  _`Card()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `deploy-ftps.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06509803921568627 - nodes in this community are weakly interconnected._