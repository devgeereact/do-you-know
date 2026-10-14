# Functional evidence

Owner: Codex, 14 October 2026, Ubuntu, `feat/milestone-1-play`.

## Catalogue batch

PASS: headless Google Chrome with real local Supabase, using Playwright in a fresh browser context. Checked home → category → quiz landing, direct landing reload, curriculum match and empty filter states, unknown category/quiz slugs, a forced HTTP 503 followed by successful retry, offline play copy, and no guest session created while browsing. Checked no horizontal overflow at 375×812, 812×375 and 320×640; inspected portrait and landscape screenshots. No page exceptions.

Local evidence: `/tmp/dyk-catalogue-browser-20261014.mjs` and `/tmp/dyk-catalogue-{portrait,landscape}-20261014.png`. Transient artefacts remain on Ubuntu.

PARTIAL: quiz discovery is implemented, but Play is deliberately disabled until the game batch. Not a completed Milestone 1 journey.

NOT TESTED: real phones, assistive technology, production deep-link hosting, installed PWA, service-worker upgrades and the full network matrix. Automated overflow checks are not a complete accessibility audit.
