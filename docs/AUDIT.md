# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-10-31 · Profile, nickname-once and on-site replies (privacy and child safety)

Reviewer: Claude Code. Scope: `Player::nickname`, `Feedback::mine/playerReply/markSeen`, migration 0016, `/me`, `/contact`, Studio inbox.

- Children still never write free text: replies are read-only for them; the server refuses their answers (`free_text_not_allowed`, tested). PASS.
- Staff replies to children are new. Only a Super Admin can send one; each is audited; the Studio warns to keep it short and kind; no contact details are ever asked for or stored. ACCEPTED (owner request, 31 October 2026).
- A player can only read and answer their own threads (404 for others, tested); internal notes never reach the player (tested). PASS.
- Nickname change: once only, atomic (no double change), children limited to generated names, blocked-words check for typed names, no copying another player's name (tested). PASS.
- Email is now optional; "Delete my data" still wipes message and email. PASS.

## 2026-10-31 · Generator security and cost review

Reviewer: Claude Code. Scope: `Generator.php`, `GeneratorLive.php`, migrations 0014–0015, Studio Generator screen.

- Off by default: no outside call is possible unless `generator.enabled` is true and the Claude and Bright Data settings are present; recorded answers are refused outside the test environment (tests check both). PASS.
- Keys are read only from the private config, never sent to the browser; the status endpoint reports only true/false for each. PASS.
- Only Super Admins reach the routes (`Admin::guard`); players get 401/403 (tested). PASS.
- No player data leaves the server: requests carry the topic, age band and fetched public page text only. PASS.
- Output is untrusted: every draft is validated like hand-written content, its quote must appear in the fetched page, its source must be an https page on the trusted list, and it never publishes; approval and sending are audited. PASS.
- Cost control: daily run cap (default 20), at most one search, four page fetches and one model call per run, and a per-run step lock so a double click or two tabs never repeat a paid step (tested). PASS.
- Model output is parsed as JSON from a schema-constrained response; refusal and token-limit stops end the run with a readable reason. PASS.
- Not done: a live run (BLOCKED until the owner approves the cost and adds keys).

## 2026-10-31 · Rebrand, Studio and feedback release review (accessibility, security, privacy)

Reviewer: Claude Code for the owner. Scope: the Pop & Ink redesign, the Studio CMS, the overall leaderboard and contact/feedback, before the 31 October release.

**Accessibility**

- Colour contrast computed from the token values (WCAG formula): white on grape 5.3:1, ink on tangerine 7.4:1, ink on lemon 12.1:1, ink on mist 16.0:1, muted on white 6.8:1, white on correct 5.4:1, white on wrong 5.4:1; dark theme ink-dark on primary 6.2:1, muted on surface 7.8:1. White on tangerine (2.3:1) is never used: the play button uses ink text. PASS.
- Right and wrong answers always show an icon and words as well as colour; the explanation sheet keeps its auto-advance pause ("Stay here"). PASS (e2e play specs).
- Studio: nav is a labelled `nav`, the ⌘K palette is a modal dialog with a combobox and listbox (arrow keys, Enter, Escape), the confirm dialog traps focus. Unit-tested open/close. PASS.
- Not done: a screen-reader pass with VoiceOver on the new pages. OPEN.

**Security**

- Every `/admin/*` route goes through `Admin::guard` (Clerk subject in the private allowlist); guests and players get 403 (`backend/tests/admin.php`, 12 checks). PASS.
- Answers still never reach the browser before answering; the only new field on a public question is the cosmetic `scene` key (e2e leak check updated to allow it and nothing else). PASS.
- Feedback: rate limited (10 an hour per player); free text and email refused for children and unknown ages on the server, not just in the form (`backend/tests/feedback.php`). PASS.
- Studio content writes validate on the server (`Content::validateQuestion`, https sources, no duplicate prompts) and are logged in `admin_audit`. PASS (`backend/tests/cms.php`, 121 checks).
- Fixed in this review: `JSON_VALUE(... '$.review')` returns `1` on MariaDB 11.4, so live quizzes with edits waiting were hidden from "To check"; regression check added.
- Sourced generator makes no outbound calls; no Bright Data or Anthropic key exists in any config. PASS.

**Privacy**

- No new personal data for children. Adults may leave an email only with a message; it is stored in `feedback.email` and never shown publicly. PASS.
- Fixed in this review: "Delete my data" left a grown-up's feedback message and email behind (the row only lost its `profile_id`). `Player::delete` now wipes message, email and question prompt first; regression check in `backend/tests/feedback.php`; privacy notice updated (31 October 2026).
- Public surfaces still show nickname, preset character and score only. PASS.
