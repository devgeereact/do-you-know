# Current task

Updated 1 November 2026 (evening). Finished work is in `HANDOFF.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`.

## Goal
Get doyouknow.space ready for go-live: security audit and fixes, SEO audit and fixes. Branches `golive/2026-11` and `studio/import-2026-11`: **deployed 2 Nov 2026** (main `82b7324`, release `20261102T085255Z`).

## Status
- Commits on `golive/2026-11` are all gated (`pnpm verify` + format check). The audits are in `docs/AUDIT.md` (1 Nov, two sections).
- Security: no Critical or High findings. Fixed 2 Medium (answer-position leak through option ids; erasure keeping written feedback) and the Studio `javascript:` source link. `api.php` strips `X-Powered-By`. Dependencies updated in range (0 high advisories).
- SEO: live now serves 65 prerendered pages with their own titles, canonicals and JSON-LD (checked 2 Nov).

## Studio import (branch `studio/import-2026-11`, on top of `golive/2026-11`)
- Import reads the owner's `# Science · Ages 4–5 · Topic` format: one quiz per heading with its age band, a plain intro and Science as the subject; markdown source links work; sources are optional (ADR-019); imported questions arrive checked so a quiz can be published at once. Non-blocking content notes in the preview.
- AI helpers in the editor (intro from title, explanation from question and answer), off until generator keys are set (ADR-020). AI review of whole imports not built.
- Body quizzes (title about digestion, bones, senses and so on) keep every question in the body world.
- Owner after deploy: re-import the science file in Studio → Import (the drafts made locally were in the test database only), look at the 35 "worth a second look" notes, then publish.

## AI review of imports (branch `studio/ai-import-review`, 6 Nov, not deployed)
- Import and Editor get "Review with AI": ok / fix (before and after, Accept or Reject) / flag per question; nothing saves until a person accepts (ADR-021). Off until `bash scripts/set-generator-keys.sh` has added a model key. Cap 100 calls a day (about 2,500 questions).
- Also fixed: Studio main area did not scroll on phones.
- Owner: approve the deploy, add keys, then Import → paste → Review with AI → Accept → Create drafts → publish.

## Science import (2 Nov)
- All 54 science quizzes published (School Science, age bands and key stages set, 91 prompts reworded, 249 sources fixed); To do empty, no duplicates. 4–5 age chip live.
- Needs one more release so the 37 quizzes published after release `6e6c15c` get prerendered pages (they serve the shell until then).

## Next steps (owner)
1. DONE 2 Nov: deployed. Undo if ever needed: `pnpm release --rollback --go`. Next in Studio → Import: re-paste the science file, read the 35 notes, create drafts, publish.
2. Run the exposed-file check for the private config and environment file URLs (command in Claude's go-live report; the agent guard blocks it). Expect 403 or 404 on every line.
3. Search Console: DNS verify, submit the sitemap. Content work: see `.local-test/seo/doyouknow.space-audit/ACTION-PLAN.md` (About "who" and "how we check", quiz intros, SEO titles).
4. Decide the CSP: enforcing needs a clean click-through of every journey including Clerk sign-in.
5. Cloudflare: GPTBot gets 429; check the rule does not catch search bots. GitHub: consider a `production` environment for `CPANEL_SSH_KEY`.

## Next steps (code, later)
Quiz page CLS (0.08–0.11); footer subject links; generator hardening (per-hop redirect checks, approve only when the stage is done, audit `step`, retry cap); deploy.yml SHA pins and building before the key is written; planned majors (React 19, Router 7, Vite 7, ESLint 10, Clerk PHP 2); find the intermittent e2e 503 (log now in `.local-test/e2e-last-php.log`).

## Checks (1 November 2026, branch)
`pnpm verify` PASS (each commit) · `pnpm check` PASS · backend 13 suites PASS · Apache 37/37 PASS · e2e 46/46 in 3 of 4 runs (1 unexplained 503) · gitleaks full history clean · `pnpm audit` 0 high · `composer audit` clean · lab CLS home 0.002 / category 0.001. NOT TESTED: Lighthouse/PSI (quota), live behaviour of the new code, private config contents (project rule), DB grants (server).
