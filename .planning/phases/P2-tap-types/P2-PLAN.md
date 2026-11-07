# P2 plan: tap-only types with server grading

Branch `phase/p2-tap-types` (from `main` at the P1 release). Planned directly from the code (Content.php, Game.php, the play hook and page). Test first for every task; one concern per commit. P2 ships in two slices, as the roadmap says.

## Slice 2.1 (this slice): number tiles and the `build` type

| # | Task | Tests first | Done when |
|---|---|---|---|
| T1 | **`build` in the content format.** `Content.php` accepts `type: build` with `build: {variant: spell\|gap\|order, tiles, answers, speak?, template?}` and validates it (tile counts and lengths, accepted sequences use only available tiles with the right multiplicity, one length for all answers, `order` uses every tile once, `gap` template has one `___` per slot, `speak` only on `spell` and equal to the word). Snapshot gets keyed tile ids. A ranked quiz must keep at least 3 questions that are not dictation | `backend/tests/content.php`: valid cases and every refusal | bad content is refused with a clear message; good content snapshots deterministically |
| T2 | **Serve and grade `build`.** `Game` serves slots and tiles as per-attempt keyed handles, always ordered by handle (never authoring order), with no accepted sequence in the payload. `/answer` takes `tiles` (handles in order), maps them to labels and compares case-insensitively with any accepted sequence; the reply reveals `correct_tiles` only after answering. Forged input (unknown, repeated, missing, extra, wrong-shaped handles, an option id) is a 400 `invalid_tiles`. The answer is stored in `attempt_answers.chosen_json` (migration 0018) and shown in the finish review | new `backend/tests/build.php` suite (payload leaks nothing, right, wrong, alternate answer, every forged shape, timer, review, stored answer) | all pass; no answer reaches the browser before `/answer` |
| T3 | **Dictation is practice only.** A question with `speak` is never dealt in a ranked round or the daily | `build.php`: ranked and daily hands contain none | verified for both |
| T4 | **Number tiles screen.** Existing `slider` questions show a tile keypad by default (digits, decimal point and minus only when the range needs them, delete, clear, Check); same `value` and server check. The slider component stays for the parent switch (P4) | unit tests for the keypad (input rules, range message, announcements) | a child answers a number question with taps only |
| T5 | **Build screen.** Slots and tile tray, tap to place, tap a slot to take back, Undo, Check enabled when every slot is full, feedback shows the right sequence; tiles and slots at least 56 px; keyboard and live-region announcements; works at 390 px | unit tests (placing, removing, undo, check, announcements); e2e plays spell, gap and order on phone and desktop | played through in the browser, axe clean |
| T6 | **Read aloud.** A speaker button reads the prompt (and the dictation word) with the device's British voice; hidden when there is no voice; never reads an answer; nothing leaves the device | unit tests with a faked speech API | works where the device has a voice, absent otherwise |
| T7 | **Studio does not break.** A draft that holds a `build` question loads, shows read-only, and is not damaged by saving other questions (editing forms are slice 2.2) | cms test: a build draft round-trips | no data loss |
| T8 | **Docs and audit.** CHANGELOG, AUDIT (security-audit on the grading), CURRENT-TASK, DEPLOYMENT note for migration 0018 | n/a | current |

## Out of this slice
`assign` (match, sort) and the Studio forms and import syntax (slice 2.2); content at scale (P3); any parent switch (P4).

## Release
Migration 0018 is additive and goes out alone first: its own commit on `main`, backup, `bin/migrate.php`, then the code. Needs the owner's "approved".

## Verification
`pnpm check`, `pnpm verify`, `bash scripts/test-backend.sh`, `pnpm test:e2e`; a phone walk of every changed screen with axe; `/security-audit` on the grading; then a stop.
