# Audit log

Every audit, review and checklist run for this project, newest first. Add new results here as a dated section; do not create separate audit files.

## 2026-11-06 · AI review of imports (security, child safety, privacy, cost)

Reviewer: Claude Code. Scope: `Generator::review`, `POST /admin/import/review`, `AdminContent` `ai_fixes`, the Import and Editor review UI (ADR-021).

- Who can call it: staff only (`Admin::guard`); players get 403 (tested). Off until the generator is enabled with a model key; returns 409 `generator_off` otherwise (tested). PASS.
- Prompt injection from imported text: the questions are sent as JSON inside `<questions>` and the system prompt says they are untrusted data whose instructions must not be followed (tested). Whatever comes back is only a suggestion: each fix is checked like hand-written content (same number of answers, exactly one right, plain text without links, markdown or HTML, length limits, `Content::validateQuestion`) and becomes a flag when it fails (tested with recorded answers: wrong answer count, a link, two right answers). Sources are never taken from the model (tested). PASS.
- Nothing publishes or saves itself: the endpoint writes nothing to any quiz (tested); a person accepts each fix in the preview or editor. Accepted fixes are counted in the import audit (`ai_fixes`, tested). PASS.
- Child safety: the prompt asks for a kind, child-safe tone and wording for the age band from the heading; a person still reads every accepted fix. ACCEPTED (advisory).
- Privacy: only question text, answers, explanation, age band, subject and topic are sent; no player data, no names or emails. PASS.
- Cost: each call (up to 25 questions) is audited as `generator.review` and capped at `generator.review_daily` (default 100 a day, about 2,500 questions; tested). PASS.
- NOT TESTED: a live call to Anthropic or OpenRouter (recorded answers only; needs the owner's keys).

## 2026-11-02 · Science body-topics import: content review and publish

Reviewer: Claude Code, at the owner's request ("fix all the imported questions … publish"), through Studio's own admin API in the owner's signed-in session (no server files, no SQL).

- Scope: the 54 drafts from the owner's first import (9 topics × 6 age bands, 1,080 questions), made before the import fixes and stuck in To do: no intro (publish refused), 249 sources stored as `[url](url` (refused), age band inside the title, no age range or key stage.
- Placement: kept in the subject the file names, **Science** (School Science). Title "Topic (ages 4–5)" / "(adults)", intro "20 questions about …", age range per band, key stages 6–8 KS1+KS2, 9–11 KS2, 12–14 KS3, 15–16 KS4, difficulty easy/easy/easy/medium/medium/hard, timer 45/45/30/30/40/30 s. Slugs and quiz ids kept.
- Sources: 249 turned into plain https addresses.
- Content: every question read for the 12–14 and adult sets and scanned for the rest. 91 prompts reworded so the question fits its existing answers (answers and the right answer never changed); colliding rewrites made distinct so no prompt repeats another quiz's. Left as they are: sense questions sharing Sight/Hearing/Taste/Touch as distractors (correct by design).
- Result: 54 of 54 published, 0 held, 0 errors; To do empty (0 drafts with problems, 0 waiting for review). Duplicate check over all live content: 100 quizzes, 2,460 questions, 0 duplicate prompts, 0 duplicate titles.
- Gap: prerendered pages exist only for quizzes live at a release; 37 quizzes published after release `6e6c15c` serve the shell (canonical home) until the next release.
- Reworded prompts (old → new):
  - Which teeth are at the front of your mouth? → Which teeth cut into an apple first?
  - Which teeth help crush food at the back? → Which teeth crush and grind your food?
  - Can air also enter through your mouth? → Besides your nose, where else can air go in?
  - What are hormones: body messages or little bones? → What are hormones?
  - Can body messages help you grow? → What can body messages help control?
  - Can body messages help your body use food? → What can body messages help your body do?
  - Do hormones work as body messages? → What do hormones do?
  - Can tiny amounts of body messages have an effect? → How much of a body message can have an effect?
  - Do body messages stay in one shoe? → Where do body messages travel?
  - Can body messages help the body work together? → Why does your body send messages?
  - Which daily activity supports learning and development? → Why is sleep important for children?
  - Which statement about children’s growth is correct? → Do all children grow at the same speed?
  - Which action normally continues automatically during sleep? → Which action keeps going by itself while you sleep?
  - Why does the body use hormonal communication? → Why does the body send hormone messages?
  - Which trained professional helps care for patients? → Which trained worker helps care for patients?
  - Which term means a broken bone? → Which option best describes a fracture?
  - Which description of bone is scientifically correct? → Is bone a living tissue?
  - What are the finger-like projections of the small-intestinal lining? → Which option best describes villi?
  - What name describes the mixture leaving the stomach? → Which option best describes chyme?
  - Which structures contain cells that detect taste chemicals? → What are taste buds made of?
  - Which structures make up the central nervous system? → Which name covers the brain and spinal cord together?
  - What name is given to a specialised nerve cell? → Which option best describes a neuron?
  - At what junction can one neuron communicate with another cell? → Which option best describes a synapse?
  - Which insulating material surrounds many nerve fibres? → Which option best describes myelin?
  - Which process transfers oxygen and carbon dioxide between alveoli and blood? → Which option best describes gas exchange?
  - Which stage involves the body becoming physically capable of reproduction? → What best describes puberty?
  - Which statement about puberty timing is correct? → Does everyone start puberty at the same age?
  - What term describes a period of unusually rapid height increase? → Which option best describes a growth spurt?
  - What occurs when the genetic material of a sperm and egg combines? → What happens at fertilisation?
  - Which temporary organ supports exchange between maternal and fetal circulations? → Which option best describes the placenta?
  - Which fluid surrounds the developing fetus? → Which option best describes amniotic fluid?
  - What process produces new cells from existing cells? → Which option best describes cell division?
  - Which cellular changes contribute to an increase in body size? → How do cells make a body bigger?
  - Which life period includes transition from childhood towards adulthood? → Which option best describes adolescence?
  - Which skill type involves precise small movements such as writing? → What does fine motor development mean?
  - Which system consists of hormone-producing glands and their signals? → Which option best describes the endocrine system?
  - Which organs have adrenal glands sitting above them? → Where in the body do the adrenal glands sit?
  - Which signals coordinate many physical changes of puberty? → Are hormones involved in the changes of puberty?
  - What is the intended effect of an antiseptic applied appropriately to living tissue? → What does an antiseptic aim to reduce on living tissue?
  - Which method studies internal structures by carefully cutting them apart? → What does dissection involve?
  - Which field studies the structure of the body? → What is anatomy the study of?
  - Which field asks how body parts work? → What is physiology the study of?
  - Which instrument allows direct viewing inside body cavities? → Why would a doctor use an endoscope?
  - Why does a blocked nose reduce food flavour? → What does a blocked nose take away from food flavour?
  - What is menstruation? → What is shed during menstruation?
  - How can nutrition affect growth? → Why is growth not set by genes alone?
  - What is the main exchange function of the placenta? → What does the placenta exchange between mother and fetus?
  - What does a phagocyte do? → What does a phagocyte do to some microbes?
  - What is negative feedback? → What does negative feedback do to hormone production?
  - How does glucagon help raise blood glucose? → Which liver response does glucagon trigger?
  - Which enzyme class hydrolyses proteins? → Which option best describes a protease?
  - What name describes a swallowed mass of chewed food? → Which option best describes a bolus?
  - Which bone cells lay down new bone tissue? → What do osteoblasts mainly do?
  - Which cells remove bone during remodelling? → What do osteoclasts mainly do during remodelling?
  - Which bone tissue forms a dense outer layer? → Which option best describes compact bone?
  - Which term describes moving a limb away from the body’s midline? → What does abduction mean?
  - Which term describes bringing an outstretched arm back towards the body? → What does adduction mean?
  - How is a physical or chemical stimulus converted into nervous information? → Which option best describes sensory transduction?
  - Which brain structure receives early input from olfactory neurons? → Which option best describes the olfactory bulb?
  - What travels along an axon as a regenerating electrical signal? → Which option best describes an action potential?
  - What chemical carries a signal across many synapses? → Which option best describes a neurotransmitter?
  - What is the narrow gap between cells at a chemical synapse? → Which option best describes the synaptic cleft?
  - Which structure performs a nervous-system response? → Which option best describes an effector?
  - What fluid surrounds and cushions the brain and spinal cord? → Which option best describes cerebrospinal fluid?
  - Which function is performed by specialised brain capillary barriers? → What is the main job of the blood–brain barrier?
  - Which quantity equals heart rate multiplied by stroke volume? → Which option best describes cardiac output?
  - Which volume is ejected by one ventricle during one beat? → Which option best describes stroke volume?
  - What function is especially useful in veins carrying blood against gravity? → What do the valves in many veins do?
  - Which molecule allows red cells to carry large quantities of oxygen? → What does haemoglobin do with oxygen?
  - How do phagocytic white blood cells attack some pathogens? → What does a phagocyte do to some pathogens?
  - Which feature defines these vessel types despite oxygen-level exceptions? → What really distinguishes an artery from a vein?
  - Which mechanical change enlarges the thoracic cavity during inhalation? → What does the diaphragm do during inhalation?
  - Which process moves air between atmosphere and alveoli? → Which option best describes ventilation?
  - Which volume describes air moved in a normal quiet breath? → Which option best describes tidal volume?
  - What air remains after the strongest possible expiration? → Which option best describes residual volume?
  - Which volume can be exhaled after a maximal inhalation? → Which option best describes vital capacity?
  - Which airway volume does not directly exchange gases with blood? → Which option best describes anatomical dead space?
  - How does the mucociliary escalator clear inhaled particles? → What do cilia do in the airways?
  - What occurs when an early embryo embeds in the uterine lining? → Which option best describes implantation?
  - Which event releases an egg from an ovary? → Which option best describes ovulation?
  - Which uterine tissue changes across the menstrual cycle? → Which option best describes the endometrium?
  - How do unspecialised cells acquire distinct structures and functions? → Which option best describes differentiation?
  - Which cell type can self-renew and generate more specialised cells? → Which option best describes a stem cell?
  - Which term refers to an organism’s genetic constitution? → Which option best describes genotype?
  - Which term includes observable characteristics influenced by genes and environment? → Which option best describes phenotype?
  - What term describes differences in inherited genetic information among individuals? → Which option best describes genetic variation?
  - Which term refers to biological changes associated with ageing? → Which option best describes senescence?
  - Which event marks the end of menstrual cycles due to loss of ovarian follicular activity? → Which option best describes menopause?
  - Which hormone is a glucocorticoid involved in metabolic stress responses? → Which option best describes cortisol?
  - Which parathyroid hormone helps restore low plasma calcium? → Which hormone helps restore low plasma calcium?
  - What was the key diagnostic significance of Röntgen’s discovery? → Which discovery let doctors see bones without surgery?

## 2026-11-01 · Studio import changes (privacy, child safety, AI cost)

Reviewer: Claude Code. Branch `studio/import-2026-11`. Scope: optional sources and imported questions arriving checked (ADR-019), the AI writing helpers (ADR-020), import parsing and checks, body-world scenes.

- Privacy: no new personal data. Imports and the helpers carry quiz text only; helper requests send the title, or a question and its answer, and an age band to the model provider. No player data. PASS.
- Child safety: imported questions skip the per-question tick, so the person importing is the reviewer; the audit log records `imported: true` and who did it. The preview flags answers that repeat the question, yes/no answers to other questions, "which cells" questions answered with a process, repeated answer sets and hard words for ages 8 and under, without blocking. Players still never see answers before answering, and children still write no free text. ACCEPTED (owner decision, 1 November 2026).
- Sources optional: a given source must still be https, and player screens show it only when present (`isWebUrl`). Site copy no longer promises a source on every answer. PASS.
- AI output is untrusted: plain text only (links, HTML and markdown refused), length-capped, put into an editor field and never saved by the server; an AI-edited explanation leaves the question unchecked. Staff-only route behind `Admin::guard`; players get 403 (tested). PASS.
- AI cost: off until the generator is enabled and a key is set; one short call per click; own daily cap (default 200), counted from the audit log and tested at the limit. Live calls NOT TESTED (no keys; fixtures only).

## 2026-11-01 · Go-live security audit (full codebase, security-audit skill)

Reviewer: Claude Code. Branch `golive/2026-11`, source `80e1f23`. Profile standard: 12 coverage units, 7 hunters in two waves, 3 candidate verifiers, 3 record verifiers, 3 coverage critics (final pass clean). Audit agents read source only; every confirmed finding was reproduced with a failing check on the disposable local MariaDB (`scripts/test-backend.sh`). Run files (ledger, findings.json, reports) are in the gitignored `.local-test/security-audit/run-1/`.

**Findings**

| Severity | Finding | Status |
|---|---|---|
| Medium | Option ids were an unkeyed hash of each option's authored position, so a script could undo the shuffle. The right answer is written first in 615 of 1042 shipped questions (59% against 25% chance). This broke "answers never exposed before answering". | FIXED d18fc57: per-attempt HMAC handles, raw ids refused, shuffle by handle. Regression checks in integration.php |
| Medium | "Delete my data" kept the player's written thread answers, and the hourly guest purge kept message, email and answers. Staff could still read them, against the privacy notice. | FIXED 82c4d43: both paths scrub; checks in feedback.php and cleanup.php |
| Needs validation | Studio generator draft card used the model's `source_url` as an href with no scheme check (a `javascript:` link was possible, staff click needed, generator off by default) | Guard applied 4cd271e (`webHref`); browser behaviour NOT TESTED |
| — | No Critical or High findings | — |

**Checked and passing (source review):** every `/admin/*` route goes through `Admin::guard` before any handler, and every staff write is audited (except generator step, see below). All SQL is prepared, with emulation and multi-statements off; LIMIT, ORDER BY, IN and LIKE are built safely. Every player route takes identity from the token only; attempts and threads are owner-bound. Scoring, timing and once-only daily are enforced on the server. Clerk JWT is pinned to RS256 and checks iss, azp, exp, nbf, iat, `user_` and `sess_`; guest and Clerk tokens cannot be swapped. CORS is an exact allowlist with no credentials. Rate limits are atomic and keyed per IP (CF-Connecting-IP trusted only from Cloudflare ranges), per player and per route. Nicknames are ASCII-only and blocked-word filtered, and children cannot type them. React renders every user string as text. Prerender, JSON-LD and the sitemap escape their output. The service worker caches public catalogue routes only. The release puts no config, maps or dumps in the webroot (`verifyPublic`); bin scripts are CLI-only. The deploy job runs only on `main`, with pinned known_hosts. Migrations are checksummed.

**Hardening, not findings (left for later):** the CSP is Report-Only with `'unsafe-inline'` styles. The CF-RAY origin lock can be spoofed (nothing relies on it). `api/.htaccess` is server-managed and never deployed. deploy.yml uses mutable action tags, writes the deploy key before the build and has no GitHub environment. The generator follows redirects without per-hop checks, can approve drafts before the check stage (API only), does not audit `step` and has no retry cap. Nicknames have no unique index. Leaderboards return microsecond timestamps and attempt ids. The generator places answers at slot i % n. Clerk `sts` is not checked. Guest creation is per /64. Next and answer do not re-check that a quiz is still live.

**Go-live checklist (owner request, 1 Nov):**
- Keys hidden: no secret in 84 commits (gitleaks, full history) or in the build. The one `sk_live` pattern hit is the Clerk SDK's literal prefix check. The only env var the frontend reads is `VITE_*`, and the Clerk publishable key is public by design. PASS.
- Env files: the project rule forbids opening `.env*` and `config.php`, so their contents were NOT TESTED. Only `.env.example` is tracked. PASS for tracking.
- Admin routes, authentication, user access, forms and XSS, rate limits, API endpoints, CORS: see above. PASS.
- Security headers on live: HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and a report-only CSP are present. `Server: cloudflare` (origin version hidden), and no `X-Powered-By` on `/` or the API. `api.php` now strips `X-Powered-By` itself (bc5b559). Server version (`ServerTokens`) cannot be set from `.htaccess`; Cloudflare already replaces the header. PASS.
- Debug off: `display_errors` 0, generic error bodies, production environment required by Config, maps filtered out of the release, no `console.log`. PASS.
- Dependencies (821f4fa): in-range updates only. `pnpm audit` 41 → 5, 0 high. The 2 production advisories left need React Router 7 and do not apply (BrowserRouter only, no navigation to user-supplied URLs). The 3 dev ones are inside workbox-build. `composer audit` clean. Majors (React 19, Router 7, ESLint 10, Vite 7, Clerk PHP 2) are a planned task. PASS within scope.
- Unused packages: every npm and Composer dependency is referenced. PASS.
- Exposed files on live: `/.git/HEAD`, composer files, `/vendor/`, `phpinfo.php`, `.DS_Store`, `backup.sql`, `/server-status`, `api/.htaccess` and source maps all return 403 or 404. `.env` and `config.php` URLs were not probed (blocked by the agent guard; owner command in `.agent/CURRENT-TASK.md`).
- Database: prepared statements only, credentials outside the webroot, backups outside the webroot. The DB user's grants and remote access are server facts, NOT TESTED.
- Passwords: none stored. Clerk handles adult sign-in. Guest tokens are 256-bit random and stored as sha256, which is right for high-entropy tokens. PASS.

**Checks run:** `pnpm verify` and `pnpm format:check` before every commit, PASS. Backend suites unit, integration, competition, daily, concurrency, feeds, content, cleanup, seo, admin, feedback, cms and generator: PASS. `pnpm test:e2e`: 46/46 in 3 of 4 runs. One run had a single 503 on round start in `privacy.spec` (mobile) that 2 reruns and a 180-request concurrent-start stress test could not reproduce; the e2e API log is now kept at `.local-test/e2e-last-php.log` (97c8f55). Cause NOT FOUND.

## 2026-11-01 · Go-live SEO audit (claude-seo)

Reviewer: Claude Code. Full report: `.local-test/seo/doyouknow.space-audit/FULL-AUDIT-REPORT.md` and `ACTION-PLAN.md`. Live health score 29/100.

- Critical, FIXED in code (e1673b8): every live URL served the same empty shell with the canonical pointing at home, because the release build skipped prerender silently. Release builds now prerender from the live public catalogue and fail if they cannot.
- FIXED in code (3fa6ed2): the 7 info pages are prerendered; title and description fallbacks for quizzes; richer category pages; related-quiz links; Organization, WebSite and BreadcrumbList JSON-LD; a home title that says what the site is; `llms.txt`.
- FIXED in code (d9f7d0e): CLS (lab, throttled phone): home 0.30 → 0.002, category 0.26 → 0.001. The quiz page is 0.08–0.11, still open.
- Owner work: who makes it and how questions are checked (E-E-A-T), 46 quiz intros at 60–120 words, SEO titles and descriptions in Studio, category copy, a parents and teachers section, the contact line, Search Console, the Cloudflare GPTBot 429 rule. FAQ or Q&A rich results are deliberately not used (FAQ is restricted to gov and health sites; Q&A markup would expose answers).
- NOT TESTED: Lighthouse and PSI (API quota exhausted), CrUX field data, a live check of the new pages (not deployed).

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
