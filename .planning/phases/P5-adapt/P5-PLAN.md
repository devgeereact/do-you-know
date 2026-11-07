# P5 plan: adapt, retry later, stickers, sound, mascot, new home (branch `phase/p5-adapt`, 7 Nov 2026)

Roadmap goal: a session adapts to the child, comes back to mistakes, and feels alive.

## Decisions (from the code, no questions asked)
- A **learn session** is an ordinary attempt (`mode='learn'`, `attempts.learn_area`) whose 10 questions come from the child's level and area, so the whole answer path (handles, grading, review) is reused. The mixed-quiz mechanism of the daily is generalised: `learn_cards` records which version each question came from, exactly as `daily_deals` does for the daily.
- **Only a child** has a skill record (guests save nothing, owner default 2). A guest or adult gets `403 child_required` on `/learn`.
- **Step** is not a new column on quizzes: it maps to the existing `difficulty` (steps 1-2 easy, 3 medium, 4-5 hard, nearest available). One nullable column fewer, nothing to backfill; a quiz's step is whatever the Studio already lets staff set.
- **Step rule** (docs/LEARNING-DESIGN.md section 3): 8 or more right twice running moves up one step; 4 or fewer moves down one; never more than one change a (London) day; steps stay 1 to 5. Every child starts at step 2.
- **Retry queue**: a wrong answer in a learn session joins the queue for that area; each session deals at most 2 queued questions first; a right answer removes it; a question that no longer exists in the live quiz is dropped.
- **Stickers**: a fixed list in code (`Learn::STICKERS`), earned at the end of a session; ids only in the database.
- **Skill map and Practise next** come from `GET /parent/children/{id}/skills` (parent) and `GET /me/learn` (child).

## Slices
| Slice | What | Evidence |
|---|---|---|
| 5.1 server | Migration 0020, `Learn` (deal, step rule, retry queue, stickers), `POST /attempts {mode:'learn', area}`, finish summary, `/me/learn`, `/parent/children/:id/skills` | backend suite `learn`: step rule table, retry cap and removal, finishing twice records once, scope, no leak, daily and existing quizzes unaffected |
| 5.2 screens | `/learn/:area` play, end-of-session (stars, sticker, next step), sticker book on `/me`, skill map and Practise next in `/grown-ups` | unit and browser tests, phone walk, axe |
| 5.3 alive | New home (four area tiles, who is playing, daily card), sound (Web Audio, off until a parent turns it on), owl reactions with short GSAP motion that respects reduced motion | unit tests, reduced-motion check, silent by default |

## Release
Migration 0020 goes out alone first, backed up, then the code. Needs the owner's "approved".

## Status (7 Nov 2026)
5.1 and 5.2 built and tested. 5.3: sound and the wrong-answer tilt built; the new home is held for the owner's landing notes (the owner said the landing needs other work). `step` stayed derived from `difficulty` (no column).
