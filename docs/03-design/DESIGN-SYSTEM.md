> New-domain baseline, 25 October 2026: imported technical/design history below is reference, not evidence of a doyouknow.space deployment. Current setup and status: docs/00-foundation/CLAUDE-CODE-HANDOFF.md and docs/07-operations/GITHUB-FTPS-SETUP.md. Verify private paths, auth, legal copy and runtime before release. Applied migrations are unchanged.

# Design System & Visual Guidelines — Do You Know

> Pop & Ink, approved by the owner on 31 October 2026 (ADR-014). Earlier "sky blue" values are gone from the code; this section is the reference.

## 1. Aesthetic direction

**Pop & Ink.** Bright, chunky and friendly for children, calm and readable for the grown-ups who sit beside them. Grape is the brand colour, tangerine is the one "play" action on a screen, lemon marks rewards, and deep ink carries the text.

- **Worlds:** every question plays inside a small illustrated world (Ocean, Jungle, Space, Desert, Arctic, City, Body, Past). The server sends a cosmetic `scene` key with each question (`Content::sceneFor`: prompt keywords, then the quiz's category, then a stable hash), so a round travels through several scenes. Art is typed inline SVG in `src/lib/art.ts`; there are no uploaded, generated or photographic images.
- **The framed stage:** the play screen is a thick coloured frame (`.stage-frame`) around a light card (`.stage-inner`), with a tab label, timer pill, host character, progress dots, the prompt and chunky answer pills. The explanation slides up as a sheet inside the frame.
- **Characters:** 13 object mascots (owl, bulb, globe, boat, battery, mug, rocket, star, planet, cactus, turtle, penguin, heart) with a mood (`happy`, `cheer`, `sad`, `think`). Preset avatars reuse them; stored avatar ids did not change (`src/lib/avatars.ts`).
- **Logo:** a grape speech bubble with a lemon question mark and a tangerine spark (`src/components/brand/Logo.tsx`, `public/favicon.svg`). PNG icons and the share image are rendered from the same art by `scripts/brand-assets.mjs`.
- **Phone vs computer:** phones get a stacked, thumb-first layout with the bottom tab bar; screens at 1024 px and wider get the top navigation, multi-column grids and the hero. `useMediaQuery(DESKTOP)` picks between two layouts where they differ (Home). Grids always fill their rows (filler "Suggest a subject/quiz" tiles), so there are no single orphan cards.
- **Fit pages:** Daily and Leaderboards fill exactly one screen (`h-dvh`) and scroll inside their list area, not the page.

## 2. Design tokens

Tokens map 1:1 to `tailwind.config.ts` and are RGB CSS variables in `src/index.css` (`:root` = light, `.dark` = dark). **Always use the token class, never a raw hex** (world gradients in `src/lib/art.ts` are the one exception: they are illustration).

### Colour

| Token             | Class                         | Light          | Dark      | Use                                  |
| ----------------- | ----------------------------- | -------------- | --------- | ------------------------------------ |
| Background        | `bg-background`               | `#F6F4FD` mist | `#151331` | App canvas                           |
| Surface           | `bg-surface`                  | `#FFFFFF`      | `#1F1C42` | Cards, sheets                        |
| Surface border    | `border-surface-border`       | `#E8E4F3`      | `#34305E` | Card outlines, dividers              |
| Primary (grape)   | `bg-primary` / `text-primary` | `#6C4CF5`      | `#9C86FF` | Buttons, links, focus, the brand     |
| Primary edge      | `shadow-edge-primary`         | `#4A2FC9`      | `#6C4CF5` | Pressed-button edge                  |
| Secondary (lemon) | `bg-secondary`                | `#FFD23F`      | same      | Streaks, rewards (dark text only)    |
| Tangerine         | `bg-tang`                     | `#FF8A3D`      | same      | The single "play" action (dark text) |
| Lagoon            | `bg-sky`                      | `#14B8A6`      | same      | Info, illustration fills             |
| Bubblegum         | `bg-gum`                      | `#FF6FA3`      | same      | Celebration accents only             |
| Content (ink)     | `text-content`                | `#17153A`      | `#F1EFFF` | Headings, body                       |
| Content muted     | `text-content-muted`          | `#5A5680`      | `#B4B0D6` | Captions, hints                      |
| Correct           | `bg-correct`                  | `#0F7A4F`      | `#1FB57A` | Right answer (+ ✓ and words)         |
| Wrong             | `bg-wrong`                    | `#C6312F`      | `#EF5A5E` | Wrong answer (+ ✕ and words)         |
| Warning           | `bg-warning`                  | `#F59E0B`      | same      | Timer running low (dark text)        |

**Contrast (computed 31 Oct 2026):** white on grape 5.3:1 · grape text on white 5.3:1 · ink on mist 16.0:1 · muted on mist 6.3:1 (on white 6.8:1) · ink on tangerine 7.4:1 · ink on lemon 12.1:1 · white on correct 5.4:1 · white on wrong 5.4:1 · dark: ink-dark on primary 6.2:1, content on background 15.8:1, muted on surface 7.8:1. **Never put white text on tangerine (2.3:1), lemon or lagoon.**

Inside the stage, `.stage-inner` forces the light tokens so the card reads the same in dark mode.

PWA manifest: `theme_color #6C4CF5`, `background_color #F6F4FD`.

### Typography

| Role               | Family                 | Class          | Notes                                                    |
| ------------------ | ---------------------- | -------------- | -------------------------------------------------------- |
| Display / headings | **Baloo 2** (variable) | `font-display` | Rounded and heavy; h1–h3 extrabold, `text-wrap: balance` |
| Body / UI          | **Outfit** (variable)  | `font-sans`    | Clean, readable at small sizes                           |
| Mono               | system mono            | `font-mono`    | Admin only                                               |

Fonts are **self-hosted** via `@fontsource-variable/*` (no Google Fonts request: better for children's privacy and offline play). Minimum body size 16 px.

### Spacing, radius, size

- 4 px base unit. `Page` containers: `narrow` = `max-w-3xl`, `wide` = `max-w-6xl`.
- Radius: buttons, chips and answer pills `rounded-full`; cards `rounded-2xl`/`rounded-3xl`; the stage frame `rounded-frame`.
- **Touch targets ≥ 48 px** (`min-h-tap`); answer pills ≥ 56 px.
- Shadows: `shadow-soft` for resting cards, `shadow-lift`/`shadow-float` for raised panels, and the chunky `shadow-edge-*` (primary, sun, tang, ink, surface) only on buttons and answers.
- Navigation that looks like a button uses `buttonClasses()` on a `<Link>`; variants `primary`, `secondary`, `ghost`, `play`.

## 3. Motion (GSAP + Lenis + CSS)

GSAP drives all JavaScript motion and Lenis gives the page a soft, smooth scroll (ADR-008).
Plugins register once in `src/lib/motion.ts`; import `gsap`, `ScrollTrigger`, `SplitText` and
`useGSAP` from there. Lenis runs once (`src/components/motion/SmoothScroll.tsx`) on GSAP's
ticker, so smooth scroll and ScrollTrigger share one frame loop.

| Interaction    | Spec                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button press   | Drops 3 px and its edge shadow shrinks (`shadow-edge-*` to `shadow-edge-pressed`), 120 ms. Hover lifts 2 px                                                                               |
| World scenes   | CSS keyframes (`swim`, `sway`, `twinkle`, `drift`, `beat`, `pulse-sun`) move props inside each world; Daily cross-fades one world per stop every 2 s                                      |
| Hero           | Headline rises word by word (`SplitText`), the ocean world follows the pointer a little (`quickTo` parallax), and the "Try one" card plays a real practice question                       |
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
| Timer low      | The stage timer pill (`.stage-pill`) (`data-low`) turns amber with ink text in the last seconds (no flashing)                                                                             |
| Reduced motion | Every GSAP animation sits in `gsap.matchMedia` with a reduced-motion branch; Lenis smoothing is off; CSS in `index.css` disables transforms. State is still shown by colour + icon + text |

Rules: animate only `opacity` and transforms (`autoAlpha` is avoided for reveals so content
stays visible to tests and assistive tech), clean up through `useGSAP`, and never make
motion the only signal. Confetti and the sky are decorative: `aria-hidden`, no pointer
events. Lenis needs `lenis/dist/lenis.css`; mark nested scroll areas with
`data-lenis-prevent`.

## 4. Accessibility (WCAG 2.2 AA)

- Text contrast ≥ 4.5:1 (palette above satisfies this).
- Touch targets ≥ 48 × 48 px; spacing between answers ≥ 8 px.
- Focus: global `:focus-visible` = 3 px grape outline + 2 px offset (buttons use a lemon ring).
- Right/wrong is never colour alone: always ✓/✕ icon + words ("Correct!").
- The slider is a native `<input type="range">` with a visible value and an
  `aria-label` naming the question; arrow keys move one step.
- Timers announce "10 seconds left" via an `aria-live="polite"` region; never flash.
- Images need `alt`; icon-only buttons need `aria-label`. Language `lang="en-GB"`.
- Copy, including accessible names, comes from `src/i18n/en-GB.ts` (see RULES.md §3).
- Plain, kind language at a reading age of about 8 for kids' screens.

## 5. Component conventions

- Primitives in `src/components/ui` (`Button`, `Card` with an `as` prop for `section`/`article`/`nav`, `Page`, plus `AnswerButton`,
  `ScoreRing`, `AvatarBadge`, the stage classes in `src/index.css`).
- **Page header pattern:** every browse page starts with `PageHeader` (optional back link, eyebrow, h1 at
  `text-4xl md:text-5xl`, lead, actions). Section titles use `SectionHeading` (`text-2xl md:text-3xl`, optional
  action link on the right using `sectionLinkClass`). Info pages get both through `InfoPage`.
- **Spacing rhythm:** `Page` starts at `pt-6 md:pt-10`; header to content `mb-6`–`mb-8`; sections `mt-12` (home
  `space-y-12 md:space-y-16`); card grids `gap-4`.
- **Clickable cards** (quiz cards, subject tiles, resume rows) share `cardLinkClass` from `ui/cardClasses.ts`:
  2 px border, `rounded-2xl`, hover lift 2 px with `shadow-lift`, sunshine focus ring. Filter chips use `chipClass`.
- Quiz rows and subject tiles always fill whole rows: Home pads subject tiles to a multiple of 6 and an odd list of quiz rows with "Suggest" tiles that open `/contact?type=idea`.
- Answer buttons for choice questions show a decorative A/B/C/D marker (`aria-hidden`), never on true/false.
- Variants are prop-driven class maps; compose with `cn()` (clsx + tailwind-merge).
- Game components in `src/components/game/`, admin in `src/components/admin/`.
- Inline `style` only for the world CSS variables (`frameStyle()` sets `--fc`, `--fd`, `--sky-top`, `--sky-bot`) and GSAP. Characters, worlds and scenes render through `Character`, `WorldGlyph`, `Scene` and `WorldBackdrop` in `src/components/art/Art.tsx` (static SVG from `src/lib/art.ts`, decorative, `aria-hidden`).
- Preset avatar circles use `bg-avatar-<id>` tokens (pastel in light, deeper in dark), defined in `src/index.css`.
