> New-domain baseline, 25 October 2026: imported technical/design history below is reference, not evidence of a doyouknow.space deployment. Current setup and status: docs/00-foundation/CLAUDE-CODE-HANDOFF.md and docs/07-operations/GITHUB-FTPS-SETUP.md. Verify private paths, auth, legal copy and runtime before release. Applied migrations are unchanged.

# Design System & Visual Guidelines — Do You Know

## 1. Aesthetic direction

**Bright and playful.** Sunny colours, rounded shapes, chunky pill buttons and friendly
illustrated scenes. It should feel like a game a 7-year-old and their parent both enjoy —
never like an exam. Light mode is the default; dark mode follows the device or the
player's toggle.

- **Scenes:** one illustrated, lightly animated scene set **per category** (sky,
  ocean, space, jungle, city, classroom…) plus one recurring **mascot** who reacts to
  answers. Not one illustration per question.
- **Feedback moments:** correct → sky brightens, mascot cheers, a soft "pop"; wrong →
  gentle shake, mascot shrugs, then the explanation. Kind words always ("So close!").
- **Avatars:** 3D cartoon head-and-shoulders portraits, soft studio lighting, large
  expressive eyes, warm plain background, everyday clothing. Style reference:
  `references/avatar-style-reference.jpg` (outside the repo, kept with the planning
  files). Shown in a circle on boards and profiles.
- **Layout:** works in portrait **and** landscape on every screen. Never ask the player
  to rotate. Portrait: question on top, answers stacked. Landscape/tablet: scene on one
  side, question and answers on the other.

## 2. Design tokens

Tokens map 1:1 to `tailwind.config.ts` and are CSS variables in `src/index.css`
(`:root` = light, `.dark` = dark). **Always use the token class, never a raw hex.**

### Colour

| Token                | Class                         | Light              | Dark      | Use                           |
| -------------------- | ----------------------------- | ------------------ | --------- | ----------------------------- |
| Background           | `bg-background`               | `#EAF6FF` sky wash | `#0F1B2A` | App canvas                    |
| Surface              | `bg-surface`                  | `#FFFFFF`          | `#16263A` | Cards, sheets                 |
| Surface border       | `border-surface-border`       | `#CFE4F5`          | `#283E58` | Card outlines, dividers       |
| Primary              | `bg-primary` / `text-primary` | `#1570C2` sky blue | `#4FB3F6` | Main buttons, links, focus    |
| Primary foreground   | `text-primary-fg`             | `#FFFFFF`          | `#0F1B2A` | Text on primary               |
| Secondary (sun)      | `bg-secondary`                | `#FFC93C`          | `#FFC93C` | Highlights, streaks, badges   |
| Secondary foreground | `text-secondary-fg`           | `#1B2A3A`          | `#1B2A3A` | Text on yellow (dark only)    |
| Sky                  | `bg-sky`                      | `#4FB3F6`          | `#4FB3F6` | Illustration fills            |
| Content              | `text-content`                | `#1B2A3A` ink      | `#EAF6FF` | Headings, body                |
| Content muted        | `text-content-muted`          | `#4A5E73`          | `#A0B6CC` | Captions, hints               |
| Correct              | `bg-correct`                  | `#17804F`          | `#17804F` | Right answer (+ ✓ icon)       |
| Wrong                | `bg-wrong`                    | `#C9363B`          | `#C9363B` | Wrong answer (+ ✕ icon)       |
| Warning              | `bg-warning`                  | `#F59E0B`          | `#F59E0B` | Timer running low (dark text) |

**Contrast (checked):** white on primary 5.1:1 · ink on background 13.3:1 · ink on yellow
9.5:1 · white on correct 5.0:1 · white on wrong 5.2:1 · dark text on dark-mode primary
7.5:1. Never put white text on yellow or on `sky`.

PWA manifest: `theme_color #1570C2`, `background_color #EAF6FF`.

### Typography

| Role               | Family                 | Class          | Notes                                         |
| ------------------ | ---------------------- | -------------- | --------------------------------------------- |
| Display / headings | **Fredoka** (variable) | `font-display` | Rounded, friendly; h1–h3 use it automatically |
| Body / UI          | **Nunito** (variable)  | `font-sans`    | Readable at small sizes                       |
| Mono               | system mono            | `font-mono`    | Admin only                                    |

Fonts are **self-hosted** via `@fontsource-variable/*` (no Google Fonts request — better
for children's privacy and offline play).

Scale: `text-base` (16 px, minimum body) · `text-lg` answers · `text-2xl`–`text-3xl`
question prompt (`text-4xl` on tablets) · `text-5xl md:text-6xl` hero and final score.
Line-height 1.6 for body.

### Spacing, radius, size

- 4 px base unit. Generous padding: cards `p-6` (`p-5` for compact cards), screens `px-4 md:px-8` through the `Page` container (`narrow` = `max-w-2xl`, `wide` = `max-w-5xl` for card grids).
- Radius: answer buttons and CTAs `rounded-full`; surfaces (`Card`, sheets, prompts) `rounded-2xl`; quiz list cards `rounded-xl`.
- **Touch targets ≥ 48 px**: use `min-h-tap` / `min-w-tap`. Answer buttons ≥ 56 px tall.
- Shadows: one soft shadow for raised cards; borders do most of the work.
- Buttons sit on a darker edge (`shadow-edge-primary`, `shadow-edge-sun`, `shadow-edge-surface`), coloured by `--primary-edge` and `--sun-edge` in `src/index.css`. This is the "chunky game button" signature: keep it on CTAs and answer buttons, not on cards.
- Raised panels (hero teaser, login card, prompts) use `shadow-lift`, a soft primary-tinted shadow.
- Navigation that looks like a button uses `buttonClasses()` on a `<Link>`. Never wrap a `<Button>` in a `<Link>`.

## 3. Motion (GSAP + Lenis + CSS)

GSAP drives all JavaScript motion and Lenis gives the page a soft, smooth scroll (ADR-008).
Plugins register once in `src/lib/motion.ts`; import `gsap`, `ScrollTrigger`, `SplitText` and
`useGSAP` from there. Lenis runs once (`src/components/motion/SmoothScroll.tsx`) on GSAP's
ticker, so smooth scroll and ScrollTrigger share one frame loop.

| Interaction    | Spec                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button press   | Drops 3 px and its edge shadow shrinks (`shadow-edge-*` to `shadow-edge-pressed`), 120 ms. Hover lifts 2 px                                                                               |
| Sky backdrop   | `SkyBackdrop`: sun, clouds and stars drift slowly and move at different speeds on scroll (ScrollTrigger scrub)                                                                            |
| Hero           | Headline rises word by word (`SplitText`, masked lines, reverted after), squiggle draws under the accent word                                                                             |
| Scroll reveal  | `useReveal`: `[data-reveal]` items rise 28 px and fade in, in staggered batches, once                                                                                                     |
| Question in    | Prompt card lifts, its words rise, answers stagger up (about 600 ms, never blocks input)                                                                                                  |
| Correct answer | `animate-pop` + a short confetti burst from the chosen answer (`burstConfetti`)                                                                                                           |
| Wrong answer   | `animate-shake` (±6 px, 250 ms) then explanation slides up                                                                                                                                |
| Results        | Card pops in, score ring fills to the accuracy, confetti at 70% or more                                                                                                                   |
| Page enter     | `usePageEnter` in `AppLayout`: each new browse page fades up 14 px in 450 ms, then its inline styles are cleared                                                                          |
| Nav indicator  | Header: a 3 px underline glides to the current section (scaleX + x). Tab bar: a soft pill slides behind the current tab. `aria-current` and colour still mark the page                    |
| Segmented tabs | `SegmentedControl` (leaderboards): equal-width buttons, a primary pill slides with `xPercent`; `aria-pressed` stays                                                                       |
| Count-up       | `CountUp` (My games stats) and the results ring percentage count up with the fill; screen readers get the final number only                                                               |
| Lists          | Leaderboard rows rise in with a short stagger on every load; review rows, avatar tiles, info cards and My games rows use `useReveal`                                                      |
| Timer low      | `TimerBadge` turns amber and gives one soft scale beat per second (no flashing)                                                                                                           |
| Reduced motion | Every GSAP animation sits in `gsap.matchMedia` with a reduced-motion branch; Lenis smoothing is off; CSS in `index.css` disables transforms. State is still shown by colour + icon + text |

Rules: animate only `opacity` and transforms (`autoAlpha` is avoided for reveals so content
stays visible to tests and assistive tech), clean up through `useGSAP`, and never make
motion the only signal. Confetti and the sky are decorative: `aria-hidden`, no pointer
events. Lenis needs `lenis/dist/lenis.css`; mark nested scroll areas with
`data-lenis-prevent`.

## 4. Accessibility (WCAG 2.2 AA)

- Text contrast ≥ 4.5:1 (palette above satisfies this).
- Touch targets ≥ 48 × 48 px; spacing between answers ≥ 8 px.
- Focus: global `:focus-visible` = 3 px sunshine outline + 2 px offset.
- Right/wrong is never colour alone: always ✓/✕ icon + words ("Correct!").
- The slider is a native `<input type="range">` with a visible value and an
  `aria-label` naming the question; arrow keys move one step.
- Timers announce "10 seconds left" via an `aria-live="polite"` region; never flash.
- Images need `alt`; icon-only buttons need `aria-label`. Language `lang="en-GB"`.
- Copy, including accessible names, comes from `src/i18n/en-GB.ts` (see RULES.md §3).
- Plain, kind language at a reading age of about 8 for kids' screens.

## 5. Component conventions

- Primitives in `src/components/ui` (`Button`, `Card` with an `as` prop for `section`/`article`/`nav`, `Page`, plus `AnswerButton`,
  `ScoreRing`, `AvatarImage`, `ProgressDots`, `Sheet` as they are built).
- **Page header pattern:** every browse page starts with `PageHeader` (optional back link, eyebrow, h1 at
  `text-4xl md:text-5xl`, lead, actions). Section titles use `SectionHeading` (`text-2xl md:text-3xl`, optional
  action link on the right using `sectionLinkClass`). Info pages get both through `InfoPage`.
- **Spacing rhythm:** `Page` starts at `pt-6 md:pt-10`; header to content `mb-6`–`mb-8`; sections `mt-12` (home
  `space-y-12 md:space-y-16`); card grids `gap-4`.
- **Clickable cards** (quiz cards, subject tiles, resume rows) share `cardLinkClass` from `ui/cardClasses.ts`:
  2 px border, `rounded-2xl`, hover lift 2 px with `shadow-lift`, sunshine focus ring. Filter chips use `chipClass`.
- Home lists the first 9 quizzes, then a "Show all" button (`aria-expanded`) reveals the rest.
- Answer buttons for choice questions show a decorative A/B/C/D marker (`aria-hidden`), never on true/false.
- Variants are prop-driven class maps; compose with `cn()` (clsx + tailwind-merge).
- Game components in `src/components/game/`, admin in `src/components/admin/`.
- No inline `style={{}}`. Avatars and scenes render as `<img>` with token classes.
- Preset avatar circles use `bg-avatar-<id>` tokens (pastel in light, deeper in dark), defined in `src/index.css`.
