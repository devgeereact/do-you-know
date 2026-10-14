# Functional evidence

Owner: Codex, 14 October 2026, Ubuntu, `feat/milestone-1-play`.

## Catalogue batch

PASS: headless Google Chrome with real local Supabase, using Playwright in a fresh browser context. Checked home → category → quiz landing, direct landing reload, curriculum match and empty filter states, unknown category/quiz slugs, a forced HTTP 503 followed by successful retry, offline play copy, and no guest session created while browsing. Checked no horizontal overflow at 375×812, 812×375 and 320×640; inspected portrait and landscape screenshots. No page exceptions.

Local evidence: `/tmp/dyk-catalogue-browser-20261014.mjs` and `/tmp/dyk-catalogue-{portrait,landscape}-20261014.png`. Transient artefacts remain on Ubuntu.

PARTIAL: quiz discovery is implemented, but Play is deliberately disabled until the game batch. Not a completed Milestone 1 journey.

NOT TESTED: real phones, assistive technology, production deep-link hosting, installed PWA, service-worker upgrades and the full network matrix. Automated overflow checks are not a complete accessibility audit.

## Milestone 1 player acceptance

PASS: fresh headless Chrome context against real local Supabase. Home → quiz → Play creates one anonymous session and one attempt under StrictMode. Refresh keeps the current question. Choice, true/false and slider all produce server feedback. Completing the fixture returns 3/3 from the finish RPC, three review entries and session-owned history on `/me`. No session is created merely by visiting `/me`.

PASS: portrait (375×812), landscape (812×375) and 320px feedback layouts without horizontal overflow; landscape gameplay and timed recovery; portrait results screenshot inspected. Wrong and timeout feedback contain icons and words. Dark feedback retains the designated white foreground token.

PASS: two immediate clicks submit once; offline answer/Next controls disable; if an answer reaches the server but its response is lost, explicit Resume advances to server state without another answer submission. Lost finish response retries the same idempotent finish RPC and returns results without a new attempt. Refreshing a timed question preserves the deadline; the server marks an expired answer timed out. RPC request bodies contain only sanctioned identifiers and answer choices, never scores/ranks/elapsed times. No page exceptions in the journey check.

Evidence scripts: `/tmp/dyk-play-browser.mjs`, `/tmp/dyk-game-recovery.mjs`. Screenshots: `/tmp/dyk-results-portrait.png`, `/tmp/dyk-feedback-landscape-dark.png`.

Local Milestone 1 acceptance: PASS. Real iPhone/Android, screen readers, broad expired-auth/slow-network matrix, production hosting and reviewed launch content remain NOT TESTED or pending. No release-readiness claim.
