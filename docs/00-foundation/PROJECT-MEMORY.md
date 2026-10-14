# Project Memory — DO YOU KNOW

_Last updated: 2026-10-14 — SCAFFOLDED (project folder `do-you-know/`)_

Blueprint doc: https://claude.ai/code/artifact/2b9d6ebc-ae0c-432d-82bb-cb49f4ab5cf2

## Scaffold status (2026-10-14)
- Template copied + rebranded (customize.mjs: 0 missing anchors). Missing template dotfiles recreated (.env.example, .gitignore, .htaccess, .eslintrc.cjs, .prettierrc).
- Manifest orientation changed portrait → any; light-default theme via CSS-variable tokens; self-hosted Fredoka + Nunito; brand icons.
- Migrations 0002 (tables, RLS, guards), 0003 (game RPCs), 0004 (pg_cron jobs) — 61/61 behaviour checks pass on Postgres 16.
- 0002 fixes base schema: profiles.email nullable (guests), theme default light, protected profile columns (role escalation blocked), no Google name/photo copied.
- Docs rewritten: PRD, DESIGN, ARCHITECTURE, SCHEMA, RULES (+§9), AGENTS (+§8), HOOKS (+11 contracts), README (+build plan), CLAUDE, DEPLOYMENT, env files.
- Decision: under-13s play as guests; a parent upgrades the account with the parent's own email (Supabase magic link verifies it) + confirm_parental_consent(). No custom token.
- Next: Milestone 1 (Play) — player screens + useQuizAttempt/gameService.

## Confirmed Decisions
- App name: **DO YOU KNOW** (display "Do You Know"; slug `do-you-know`; short name `DoYouKnow`).
- Clean, responsive PWA: works in any mobile/desktop browser, all screen sizes, portrait and landscape; installable to phone/desktop home screen.
- Product direction B: entertainment + learning.
- Stack: fixed pwa-forge foundation (static React PWA on cPanel + Supabase). SEO via build-time prerender + rebuild on publish.
- Art: illustrations where possible; animated scenes use one scene set per category + one reusable mascot (not art per question).
- Launch categories: General Knowledge, Science & Nature, Geography, History, Tech, Bible & Faith, **plus school subjects to help children learn**.
- Launch content: 30 quizzes (~300 reviewed questions). Later: AI-generated questions using up-to-date information.
- Content authors/reviewers: editor, admin, and AI (AI drafts only; human publishes).
- Daily challenge (switch 00:00 Europe/London) and friend challenge links are **in V1**.
- Roles: guest, player, editor, admin.
- Profile avatars: 3D cartoon-portrait style (per user's reference image); **every profile avatar must be unique — no two alike in face, hair or clothing.**
- Server-side grading only; answers never reach the browser.
- Question types V1: multiple choice, true/false, slider estimate.

- **Audience includes under-13s.** Kid-safe defaults for everyone: nickname-only public display, no personalised ads, no free-text chat, parent email for under-13 accounts.
- **School content covers all curricula**: content is tagged by subject + age band, with optional curriculum tags (UK Key Stage, US grade, Nigerian/West African JSS/SSS, others). Players filter by age band and, optionally, curriculum.
- **Avatars generated per user**: player picks traits (skin tone, face shape, hair style, hair colour, eyes, outfit, outfit colour, accessory); an AI image model renders a 3D cartoon portrait in a fixed house style. Each trait combination can be used only once (DB unique constraint), so no two avatars match. Never generated from a photo. Style reference: `references/avatar-style-reference.jpg` (soft-lit 3D cartoon head-and-shoulders portrait, large expressive eyes, plain warm-grey background, everyday clothing). Traits also include an age look (child / teen / adult); facial hair only offered for the adult look.
- **AI via OpenRouter**: the API key lives server-side (Supabase Edge Function secret); admin picks the text model and image model in CMS settings.

## Assumptions
- ASSUMPTION: Guests use Supabase anonymous auth; nickname only.
- ASSUMPTION: Players 13+ sign in with Google or email magic link; under-13 accounts need a parent email confirmation link.
- ASSUMPTION: Under-13s get a generated nickname (e.g. "BraveOtter42") rather than free typing.
- ASSUMPTION: Avatar generation is async (background job, ~10–30 s), with a placeholder shown until ready; regenerations limited (e.g. 3 per day).
- ASSUMPTION: Every generated avatar passes an automated safety check plus admin spot review queue.
- ASSUMPTION: AI question drafts use a web-search-capable model via OpenRouter and must include a source URL; nothing publishes without editor/admin approval.
- ASSUMPTION: Launch content: 30 quizzes ≈ 18 general + 12 school (ages 7–14 core subjects: Maths, English, Science, Geography, History, Computing).

- **Look:** bright and playful — rounded shapes, chunky buttons, friendly for kids and adults.
- **Colours:** sky blue + sunshine yellow (palette below, contrast-checked).
- **Theme:** light by default, follows device setting, dark mode toggle.
- **Language:** English at launch; every UI string in translation files (i18n-ready).

## More Assumptions (batch 3)
- ASSUMPTION: Fonts — Fredoka (headings, rounded) + Nunito (body), both Google Fonts, self-hosted for offline.
- ASSUMPTION: Analytics — privacy-friendly, consent-gated product analytics (PostHog EU, cookieless mode for under-13s); gameplay stats come from the database regardless.
- ASSUMPTION: Email (magic links, parent confirmation) via Supabase Auth custom SMTP (Resend).
- ASSUMPTION: Domain not yet chosen — placeholder `https://doyouknow.example` in config until provided.

## Open Questions
- Production domain.

## Risks
- RISK (HIGH): Children as users. UK Age Appropriate Design Code (Children's Code) and, for US kids, COPPA apply. Requires high-privacy defaults, minimal data, no public real names, no personalised ads to children, safe friend-challenge sharing, parental route for accounts. Must be designed in, not bolted on.
- RISK: Per-user AI avatars cost money per image (~£0.02–0.10 depending on model), need a safety check, and AI images vary — "unique" is guaranteed by trait combination, not pixel-perfect. Consistency of the house style depends on the chosen image model; lock a reference prompt + style image.
- RISK: OpenRouter model availability/pricing changes; keep model IDs in settings, not code, and fall back to a default.
- RISK: "All curricula" multiplies content needs; launch with age bands + a few curriculum tags, grow from there.
- RISK: AI-generated "up-to-date" questions can be wrong or stale; every AI question needs a cited source and human approval before publishing.
- RISK: Daily + friend challenges in V1 adds ~2–3 weeks.
- RISK: Static hosting = new quiz pages live a few minutes after publish (rebuild).
- RISK: Original content only — never reuse Bato's questions, art or text.

## Future Features (V2+)
- Image questions, media library, streak rewards, calendar polish.
- Ads (consent-gated, non-personalised for children), sponsored quizzes, optional CrazyGames build.
- AI personalisation, premium, private leagues/classrooms, offline practice packs.

## Out of Scope (V1)
- Live multiplayer, real-money prizes, reward currencies, public user-created quizzes, native apps, quiz-builder for organisations.

## Captured Spec
### Product (→ PRODUCT-SPEC.md)
"Do You Know" — quiz entertainment + learning PWA for families, students and trivia fans. Play in <2 s with no sign-up. Results: review + explanations, Play again, Share/Challenge, Next quiz. Daily challenge + friend challenges in V1.

### Competitor teardown (quiz.bato.dev, observed 2026-10-14)
- Next.js on Vercel, Lottie/SVG scenes, GTM + consent, CrazyGames SDK.
- One quiz: 10 of 29 hard-coded questions; answers in JS bundle; client-side score submission; wall-clock timer.
- Landscape-only on phones; one unmoderated all-time leaderboard; name + email to join.
- No PWA, CMS, categories, share UI; sitemap 2 URLs.

### Users, Roles & Permissions (→ PRODUCT-SPEC.md / DATA-MODEL.md RLS)
- guest: play, nickname score, own attempts.
- player: + history across devices, avatar, streaks.
- editor: create/edit quizzes & questions, review AI drafts; cannot publish or manage users.
- admin: everything incl. publish, moderation, settings, roles.

### User Journeys & Screens (→ PRODUCT-SPEC.md / ARCHITECTURE.md)
/, /c/:category, /q/:slug (indexable), /play/:slug, /daily, /challenge/:code, /me, /leaderboards, static pages, /admin (dashboard, quizzes, editor, question bank + CSV, AI drafts, categories, daily calendar, leaderboard moderation, settings + audit log).

### Information Architecture (→ ARCHITECTURE.md)
Prerendered public pages; SPA game + account + CMS; noindex on play/challenge/results/account.

### Data Model / Entities (→ DATA-MODEL.md)
profiles (+ avatar_id unique), avatars, categories (+ subject/age band fields TBD), quizzes, questions, question_options, quiz_versions, attempts, attempt_answers, leaderboard_entries, daily_challenges, friend_challenges, ai_question_drafts, audit_log.

### App-specific Hooks & Services (→ HOOKS.md / ARCHITECTURE.md)
useQuizAttempt, useDailyChallenge, useFriendChallenge, useLeaderboard, useQuizCatalog, useAvatar, useAdminQuizEditor, useCsvImport, useAiDrafts.

### Design & Brand (→ DESIGN-SYSTEM.md)
Bright, playful, illustrated, game feel; 3D cartoon-portrait avatars; reduced-motion; WCAG 2.2 AA; child-friendly readability (min 16 px body, 48 px tap targets).
Palette (light):
- Primary sky blue `#1570C2` (buttons, links; white text passes AA)
- Sky light `#4FB3F6` (backgrounds, illustrations)
- Sky wash `#EAF6FF` (page background)
- Sunshine yellow `#FFC93C` (accents, highlights; dark text only)
- Ink `#1B2A3A` (text)
- Correct `#17804F`, Wrong `#C9363B` (both ≥4.9:1 with white text), Warning `#F59E0B` (dark text only)
- Contrast verified: white on primary 5.1:1; ink on wash 13.3:1; ink on yellow 9.5:1; primary on wash 4.6:1
Dark mode: background `#0F1B2A`, surface `#16263A`, primary `#4FB3F6`, yellow unchanged.
Fonts: Fredoka (headings), Nunito (body). Radius: 16 px cards, 999 px buttons. Motion: springy but short (≤300 ms), off when reduced-motion.
Manifest theme_color `#1570C2`, background_color `#EAF6FF`.

### AI / Automation / Background Jobs (→ ARCHITECTURE.md, Inngest)
pg_cron daily switch; Edge Functions: share card, rebuild hook; AI question drafting job (Inngest → Edge Function) landing as drafts for human review; avatar generation/assignment TBD.

### Integrations & External APIs (→ ARCHITECTURE.md / .env)
Supabase, ImageKit, Sentry, Inngest, GitHub Actions → cPanel; AI provider TBD; analytics TBD (consent-gated).

### Non-functional & Security notes (→ RULES.md / AGENTS.md / DATA-MODEL.md)
RLS everywhere; attempts/leaderboards written only by SECURITY DEFINER functions; rate limits; nickname filter; children's-privacy defaults; LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1; UK GDPR/PECR consent.

### Naming & Branding (→ forge.config.json)
appName "Do You Know", shortName "DoYouKnow", slug "do-you-know", themeColor "#1570C2", backgroundColor "#EAF6FF", url "https://doyouknow.example" (placeholder until domain chosen).
