---
status: partial
phase: 01-clean-up-and-foundations
source: [01-VERIFICATION.md]
started: 2026-11-08T02:40:00Z
updated: 2026-11-08T02:40:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. A guest on a phone cannot type anywhere
expected: Open the live site on a phone with no sign-in. Visit Home, Play, Contact, nickname, My games and Leaderboards: no text box, no "I'm 18 or over" tick; Contact shows the grown-up email instead.
result: [pending]

### 2. The friend on the play screen on a phone and on a tablet
expected: Answer a right and a wrong question. The friend sits above the answer panel, never covers an answer, and tapping where it stands still answers the question.
result: [pending]

### 3. A real child session on a real phone
expected: Hand a child profile over from `/grown-ups`, play Words and Numbers for one session; steps, stickers and the end screen all read clearly with no "Uh-oh" after a finished daily.
result: [pending]

### 4. Real Clerk sign-in at `/grown-ups`
expected: Email code arrives, sign-in works, add a child, flip a switch, hand over, and getting back needs a new code. The loading card is replaced by the area within a few seconds.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

None recorded yet. Known and advisory (not Done-when lines): out-of-order profile responses (WR-02) and a `/grown-ups` timeout if Clerk never loads (WR-05), both in `01-REVIEW.md`.
