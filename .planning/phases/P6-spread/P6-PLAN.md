# P6 plan: science and humanities content spread (branch `phase/p6-spread`, 7 Nov 2026)

Roadmap goal: science and humanities cover their ground at every level, with the tile formats used where they teach best.

## What the live catalogue says (7 Nov 2026, read-only public API, all 262 quizzes)
The roadmap's "done when" (at least 6 quizzes in every Science and Humanities cell) is **already true**: Science has 21 to 27 per level and Humanities 11 to 21. Counting quizzes is therefore the wrong test for P6. The real gaps are:
- **Topics**: no chemistry, materials, forces, light, sound, electricity or earth science below GCSE except "Our Solar System" and "Forces, Matter and Cells" (ages 11 to 14). No timelines or sorting in history, no places beyond capitals and continents, and Christian religious knowledge has no tile questions at all.
- **Formats**: all 136 science and 82 humanities quizzes are choice, true/false or number questions. None uses order, match, sort or gap.

So P6 is scoped to topic and format gaps, not to a head count.

## Decisions (defaults, nothing asked)
- **23 new quiz sets** (the roadmap said about 20): 10 Science (one is Computing), 13 Humanities. Every quiz has at least one tile question; the set as a whole uses match, sort, order and gap.
- **Subjects** use the existing categories (Science, Computing, History, Geography, Bible & Faith) so Areas.php labels each one with no code change and no migration.
- **Religious knowledge stays Christian only** (owner, 7 Nov). Each Bible & Faith question is either what a named Bible book says or a plain fact about Christian practice or the calendar. A guard test fails on the name of any other faith.
- **Nothing existing is rewritten, retired or moved.** The odd age bands on existing quizzes are listed in the coverage report for the owner to decide in the Studio; no live data is changed here.
- Drafts are import text in `backend/content/drafts/p6-*.txt`, like P3. They are **not imported or published** by this branch.
- New content is written to the same rules as P3: a reason line on every question, tile labels of 24 characters or fewer, prompts unique across the drafts and the seed.

## Slices
| Slice | What | Evidence |
|---|---|---|
| 6.1 drafts | 10 files, 23 quizzes, tile-led | `tests/unit/content/p3Drafts.test.ts` (importable, reasons, no repeats, UK English) and `p6Drafts.test.ts` (area and level, tile formats, Christian only) |
| 6.2 review | An independent read of every question for facts, defensible alternatives, level and neutrality; fixes applied | `docs/AUDIT.md` (P6 content review) |
| 6.3 report | Coverage report per area, level and topic; odd age bands listed | `docs/LEARNING-DESIGN.md` section 8 |

## Release
Code-only: the guard tests and docs. The 23 quizzes go live only when the owner imports them in the Studio and publishes them; a release afterwards prerenders the new pages. No migration.

## Status (7 Nov 2026)
6.1, 6.2 and 6.3 done on the branch. 23 quizzes, 215 questions; server validator accepts all; independent review fixed (see `docs/AUDIT.md`). Not imported, not played on a device.
