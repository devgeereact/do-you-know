# Learning design: four areas, every answer a tap

Stage 3 of the replan. Status: **PROPOSED, waiting for owner approval together with the screens (Gate 2).** Nothing here is built. Rule 3 applies: all existing content, routes and tables stay; everything below is additive. Facts come from the live catalogue (read-only public API, 7 Nov 2026) and the code (`Content.php`, `Game.php`), not from older notes.

## 1. What exists today

| Area | Live quizzes (not counting adult 18+) | What they cover | Verdict |
|---|---|---|---|
| Literacy | 11 (English 4, plus General Knowledge "Language and literature" 6 and "Words and Language Challenge" 1) | phonics, grammar and punctuation, literary devices, GCSE literature | **Thin**: about 2 quizzes per level. No spelling, dictation, gaps or verbal reasoning |
| Numeracy | 11 (Maths 4, plus "Maths and logic" 6 and "Time and Calendars" 1) | counting and adding, times tables, number and algebra, GCSE maths | **Thin**: about 2 per level. No sequences, patterns, quantitative reasoning or data |
| Science (biology and computer science) | 136 | body topics (9 topics × 6 bands), technology and computing (9 topics × 6 bands), space, animals, GCSE bio, chem, physics | **Strong** for biology and computing; weak for chemistry, physics and earth science below GCSE |
| Humanities | 82 | Bible and faith (9 topics × 6 bands, Christian only), geography 7, history 7, plus General Knowledge history and geography | **Medium**: RE is one faith; geography and history are single sets with odd age bands |
| Kept behind the trivia switch | 22 | sport, art, everyday world, record breakers and the like | not offered to children by default |

Quizzes per area and level (7 Nov, proposed mapping, nothing relabelled yet):

| Area | Starters 4-5 | Explorers 6-8 | Adventurers 9-11 | Challengers 12-14 | Scholars 15-16 |
|---|---|---|---|---|---|
| Literacy | 2 | 2 | 2 | 2 | 2 |
| Numeracy | 2 | 3 | 2 | 2 | 1 |
| Science | 22 | 27 | 22 | 24 | 21 |
| Humanities | 11 | 21 | 13 | 13 | 13 |

**The point of Stage 3:** literacy and numeracy together are about 8% of the content, yet they are two of the four areas. Only 4 topic sets (Science, Technology, Bible, General Knowledge) have the full six-band ladder; every other set is a single, oddly banded quiz.

Question formats today: `choice`, `boolean` (true/false) and `slider` only. Everything is a tap or a drag already, but there is no spelling, no ordering, no matching and no gap-filling.

## 2. The formats

Eleven tap-only formats. Three need a new server type; the rest reuse what exists. Each has the same rules: one point per question, graded only on the server, nothing in the payload that reveals the answer before `/answer`, a correct answer plus one line of reason shown afterwards.

| # | Format | How a child answers | Engine type | New server work |
|---|---|---|---|---|
| 1 | Choose one | tap a card | `choice` (exists) | none |
| 2 | True or false | tap one of two | `boolean` (exists) | none |
| 3 | Number tiles | tap digit tiles, then OK | `slider` data, tile keypad as the default screen | **none on the server**: the same `value` and accept window; the slider stays behind its switch |
| 4 | Odd one out | tap the odd card | `choice` | none (authoring template and prompt wording) |
| 5 | Complete the sequence | tap the next item, or key it with number tiles | `choice` or `slider` | none |
| 6 | Tap to spell | tap letter tiles into slots | **`build`** (variant `spell`) | new type |
| 7 | Dictation | hear the word (device voice), then tap letter tiles | **`build`** (variant `spell` plus `speak`) | new type |
| 8 | Fill the gap | tap word-bank chips into the gaps of a sentence | **`build`** (variant `gap`) | new type |
| 9 | Order the cards | tap cards into a line | **`build`** (variant `order`) | new type |
| 10 | Match pairs | tap an item, then its partner | **`assign`** (variant `match`) | new type |
| 11 | Sort into groups | tap an item, then its group | **`assign`** (variant `sort`) | new type |

So the real engine change is two types, `build` and `assign`, each with variants. This is the smallest clean change: one tile tray with ordered slots, and one "send each item to a target" screen.

### 2.1 `build`: ordered slots (spell, dictation, gap, order)

- **Question payload (before answering):** `slots` (how many), `layout` (`letters`, `words` or `cards`), `tiles` (id and label for each, shuffled), optional `template` (the sentence with numbered gaps) and optional `speak` (the text for read-aloud). No answer, no accepted list.
- **Tile ids:** per-attempt keyed handles, exactly like option handles today (`Game::handle`), so ids reveal nothing about position. Decoy tiles (extra letters, extra words) are mixed in and look identical.
- **Child's answer:** the ordered list of tile handles they tapped, up to `slots`.
- **Grading (server):** map each handle back to its label, compare the label sequence with `accept` (one or a few allowed sequences, case-insensitive for spelling; two identical letters are interchangeable). Right or wrong, no part marks, so a 10-question session still scores out of 10.
- **After answering:** the right sequence and the one-line reason; wrong answers join the retry-later queue.
- **Limits:** up to 12 slots, 20 tiles, labels up to 24 characters, so it fits a phone.

### 2.2 `assign`: item to target (match, sort) — BUILT 7 Nov 2026 (slice 2.2, not yet released)

- **Payload:** `items` and `targets` (handles and labels, shuffled). No key.
- **Child's answer:** a list of item-to-target pairs; every item must be placed before it can be sent.
- **Grading:** every pair must match the stored key (`match`: one partner each; `sort`: several items per group). All or nothing.
- **Limits:** up to 6 items and 3 targets (match: 5 pairs).

### 2.3 Read aloud and the one honest exception

- **Read aloud** uses the device's own British voice (`speechSynthesis`, language `en-GB`), so nothing leaves the device and there are no audio files to make or host. If the device has no voice the button is not shown. It reads the prompt, the choices and the explanation. It never reads out an answer before the child has answered.
- **Dictation** is the exception: the word to be spelled has to reach the browser so the device can say it, so it is in the payload (though never on screen). Someone using browser tools could read it. So **dictation is practice only**: it is never dealt in the daily or ranked rounds, where a crown is at stake. Everything else keeps the answer hidden.

### 2.4 The Studio

"Studio unchanged plus new question types": the editor gets one form per new type (a tile list and accepted sequence for `build`; items and targets for `assign`), the validator in `Content.php` and its mirror in `adminValidation.ts` learn the two types, and the import format gets one line per type, for example `Spell: because | decoys: x z | speak: because`. The AI helpers and AI review stay as they are and are not asked to grade tile questions. This is part of P2.

## 3. The session

| Rule | Design | Exists today? |
|---|---|---|
| 10 questions, about 5 minutes | `DEFAULT_ROUND = 10`; no timer by default (the clock is the "Beat the clock" switch); about 30 seconds a question | round of 10 yes; the timer is on by default today and moves behind the switch |
| A wrong answer shows the right one with one line of reason | `explanation` already exists on every question and is shown after answering; for tile questions the correct sequence is shown too | partly |
| Wrong answers come back later | a per-child **retry queue**: wrong question ids wait, and return in the next sessions of that area (at most 2 per session), dropped after a right answer | no |
| Gentle step up or down | after each session in an area: 8 or more right twice running moves up one step; 4 or fewer moves down one step; never more than one step a day. Steps run 1 to 5 inside the child's level | no |
| Read aloud | see 2.3 | no |
| Calm and short | one question per screen, large tap targets, no forced capitals, sound off until a parent turns it on | partly |
| No ads, no tracking | unchanged | yes |
| UK English | unchanged | yes |

Steps need a home in the content. Today a quiz only has `difficulty` (easy, medium, hard). **Assumption:** add an optional `step` (1 to 5) per quiz, filled from the existing difficulty for old content (easy 2, medium 3, hard 4) and set by hand for new content. Additive, one nullable column.

New server data (all additive, none on a child): `attempt_answers` gains a JSON column for tile and pair answers; a **retry queue** and a **skill record** (area, topic, step, last results) hang off the child profile (P5). They hold question ids and counts only.

## 4. Per area: what to add

All new content is added, never rewritten, in the same Studio flow, and every question keeps its source and `review_by` date. Targets are proposals for the owner to size.

### Literacy (add about 20 quiz sets, 4 per level)
- **Spelling** by level: Starters sound-and-letter words; Explorers common exception words and plurals; Adventurers homophones and prefixes; Challengers tricky words and suffixes; Scholars academic and GCSE spellings. `build` spell.
- **Dictation** (practice only): the same word lists, spoken. `build` spell with `speak`.
- **Fill the gap:** grammar, tenses, punctuation choice, vocabulary in context. `build` gap.
- **Sentence building:** put the words in order. `build` order.
- **Verbal reasoning:** analogies, odd one out, word relationships, letter and word sequences. `choice`.
- **Comprehension:** a short passage in the prompt, tap the answer. `choice` (needs a longer prompt limit; a small validator change).
- Existing English quizzes and "Language and literature" stay and are re-homed here.

### Numeracy (add about 20 quiz sets, 4 per level)
- **Number facts and mental maths** by level, answered on number tiles (existing slider data, no new type).
- **Sequences and patterns:** complete the sequence by choice or number tiles.
- **Quantitative analysis:** ratio, percentages, word problems, and reading a small table (as text in the prompt, since there are no images).
- **Order and sort:** order numbers and fractions (`build` order); sort odd and even, multiples, shapes (`assign` sort).
- Existing maths and "Maths and logic" stay and are re-homed here.

### Science (add about 10 quiz sets; biology and computing are already strong)
- **Chemistry and materials, physics (forces, light, sound, electricity), earth and space** at the younger levels, where there is almost nothing today.
- **Computer science with tiles:** put algorithm steps in order (`build` order), binary on number tiles, sort hardware from software (`assign`).
- **Biology with tiles:** match organ to job, order a food chain, sort living and non-living.
- Technology becomes Science (computer science) by label only.

### Humanities (add about 10 quiz sets)
- **Timelines:** order events (`build` order); sort Ancient, Medieval and Modern (`assign`).
- **Places:** sort countries by continent; match capital to country. No map images yet.
- **Religious knowledge:** festivals and places matched and sorted. The neutrality rule stays: what a named book says, or plain facts, no doctrine. **Owner decision, 7 Nov 2026: religious knowledge stays Christian only. No other faiths are added.**

## 5. Re-homing (labels only)

No quiz is rewritten, retired or moved in the database by this design. An area is a label that the app derives, held in one place.

| Existing set | Area |
|---|---|
| English (4), General Knowledge "Language and literature", "Words and Language Challenge" | Literacy |
| Maths (4), General Knowledge "Maths and logic", "Time and Calendars" | Numeracy |
| Science (60), Science & Nature, Technology and computing, Tech, Computing, General Knowledge "Science and space" and "Animals and nature" | Science |
| Bible and faith, Bible & Faith, Geography, History, General Knowledge "History" and "Geography" | Humanities |
| General Knowledge sport, art, everyday world, record breakers, great minds | behind the "Trivia and grown-up sets" switch |
| Anything with an age of 18 or over | behind the same switch, never a level |

**Mechanism (assumption):** one additive nullable `area` column on quizzes, filled from this table. Writing it to the live database is a live content change and gets its own approval. The two duplicate categories (`bible-faith`, `tech`) are left alone, as the table already covers them. Levels come from `age_min` (4-5 Starters, 6-8 Explorers, 9-11 Adventurers, 12-14 Challengers, 15-16 Scholars); the odd bands (7-up, 11-14, 14-16, 16-up) land in the level that holds their lower age and are fixed in Studio as content is added.

## 6. Server rules for every new type (tests come first)

| Rule | `build` | `assign` | Test that must exist before the code |
|---|---|---|---|
| The payload holds no answer | no `accept`, no key, ids are keyed handles | no key, ids are keyed handles | payload JSON holds no accepted sequence and no snapshot id |
| Grading is server-side only | handles to labels, compared to `accept` | pairs compared to the key | right, wrong, partial and forged answers; the browser sends no score |
| Forged input is refused | unknown handle, repeated handle, too many tiles, wrong count | unknown handle, missing item, two targets for one item | each returns a 400 and never a 500 |
| The answer is revealed only after `/answer` | right sequence, reason | right pairs, reason | not present in the state before answering |
| Same fairness as today | timer, daily hand, retry queue behave as for `choice` | same | daily hand mixes types, and a dictation question is never dealt in a daily or ranked round |
| Nothing personal | answers hold tile ids only | same | no free text from a child ever reaches the server |

## 7. Assumptions and risks

- **ASSUMPTION** Two new engine types are enough for all eleven formats. If a format later needs more, it is a new variant, not a new design.
- **ASSUMPTION** One point per question for every type; no part marks.
- **ASSUMPTION** `step` and `area` are additive nullable columns; nothing existing changes.
- **RISK** New content is the real cost: about 60 quiz sets of authored questions. The Studio import and the AI helpers speed this up, but a person checks every question (existing rule).
- **RISK** Tile questions on a small phone: slots and tiles must stay at least 44 px high. Checked in Stage 4 and in the phase's phone walk.
- **RISK** Letter-tile spelling shows the letters of the word by design. That is the task, not a leak, but it means spelling is easier than free typing; decoy letters keep it honest.
- **NOT TESTED** Everything in this document is a design; none of it is built.
