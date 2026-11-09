# Content pipeline and proactive app: design

Status: IN PROGRESS, 9 Nov 2026. Slices 1 and 2 are BUILT and tested on branch `feat/content-pipeline` (not released; slice 2 needs migration 0021 first). Slices 3 to 6 are PLANNED. Written for the owner; the Studio is the owner's daily tool.

## Why

Getting 61 quizzes from files to children took this session a stack of workarounds. The seams, all seen in the live Studio and code on 8 Nov:

| Seam | What happens today |
| --- | --- |
| Four doors | New quiz, Import, Generator and the editor each create content differently and land in different states. |
| Too many states | A quiz has `status` (draft, review, published, retired), an `in_review` flag, a hidden work copy (`has_draft`) and a per-question `checked` flag. "Is this live?" needs all four. |
| Import is easy to misuse | The screen parses only when "Check questions" is clicked, and that click also runs the AI review (costs credits). Creating twice makes duplicates: I made 40 by accident. |
| One at a time | 61 quizzes means 61 publishes, 61 difficulty edits (all arrive as "medium"), 5 ranked toggles. |
| Rules live in the wrong place | Christian-only, UK English, a reason on every question, tile labels of 24 characters or fewer, prompts unique, 18+ sets need `age_min`: these are repo tests on draft files. The Studio cannot show them, and its checks list blocks publishing, so it has no way to warn. |
| Two sources of truth | Draft text files in the repo and quizzes in the database. |
| Publish is not the end | A published quiz has no SEO page until a developer release prerenders it. |
| Reactive | Nothing tells the owner that a cell is thin, a review date has passed, an answer key looks wrong, or drafts have waited ten days. The owner has to go and look. |

## Principles

1. One door in, one door out. Everything that adds questions is "Add"; everything that makes them visible to children is "Publish".
2. Machines check the rules, people check the judgement. A person only sees what a rule could not settle.
3. Safe by default. Nothing reaches children without an explicit publish, and any step can be undone.
4. Never ask twice. Level, difficulty, ranked and subject get a sensible suggestion; the owner edits exceptions.
5. The app tells you; you do not go and look.

Non-goals: a new Studio technology, public submissions, children writing anything, automatic publication of AI-written content (the standing rule: no AI auto-publication).

## The target flow

```
Add (files, paste, generate, write)
   -> Batch: every quiz it makes, with suggested level, difficulty, ranked, subject
   -> Auto-checks run on each quiz (format, house rules, duplicates, AI review if asked)
   -> each quiz lands in Ready (all clear) or Needs a look (a rule or the AI wants a person)
   -> owner: fix the few "Needs a look", then "Publish ready" (now, or drip: N a day)
   -> Live; the public page and the sitemap exist without a release
   -> the app watches it: plays, right-rate, review dates, gaps; tells the owner what to do next
```

### States, before and after

Today: draft, review, published, retired, plus a review flag, a work copy and per-question checked.
Target, three visible states: **Draft** (being written or fixed), **Ready** (every check passed, awaiting publish), **Live**; plus **Retired**. "Editing a live quiz" is a Live quiz with unpublished changes, shown as such with a plain diff (what changes for children). The per-question `checked` flag stays in the data but is set by the pipeline (imports and passing checks), not by a person clicking through each question.

## Slices, in the order I recommend

Each slice ships alone and is useful alone.

1. **House rules in the server (S1).** Move the repo-only rules into the server validator with two levels: error (blocks) and warning (shows, never blocks). Same rules run in the Import preview and in the editor. Gives the warnings channel the age-gate idea needed. Backend and tests; no migration. Size: medium.
2. **One Add door, safe to repeat (S2).** Import takes many files at once, parses live (no "Check" gate), makes a Batch, and refuses to create a quiz whose content already exists (a content hash), so a repeat is a no-op. AI review becomes a separate, labelled button that says it costs credits. The Generator and "New quiz" hand their results to the same Batch screen. Size: medium. Likely one small migration (batch id and content hash).
3. **Ready, bulk and drip (S3).** The three-state view, auto-checks that move a quiz to Ready, a "Needs a look" queue limited to exceptions, bulk edit (difficulty, ranked, ages, subject) with suggested defaults, "Publish ready now" or "Publish 3 a day". Size: large. Migration for batches and the state collapse.
4. **Publish needs no release (S4).** Today the page for a new quiz appears only after a release builds it. Recommended: the PHP side adds each quiz's title, description, canonical and structured data to the page shell on request, and builds the sitemap from the database; the release stops depending on the live catalogue. Alternative if you prefer to keep the current build: a nightly redeploy only when content changed. The first is cleaner; the second is quicker. Size: medium, no migration.
5. **A proactive Studio (S5).** A weekly digest (in the Studio at once; by email when `mail_from` is set): drafts waiting more than a week; a level or subject cell below the target; questions past `review_by`; questions with a low right-rate (the answer key may be wrong); quizzes with no plays after 14 days; dailies not planned. Each line opens the right screen with the fix one click away. The Generator can propose "write 10 science questions for Explorers" from the gap. Size: medium.
6. **A proactive app for grown-ups and children (S6).** Child home: one large "Carry on" (the unfinished session or the next step) before anything else. Parent area: a weekly summary of what the child practised and one suggested next skill, with a tap to start it; in-app first, email later and only with the parent's consent. Nothing new is collected about children; this reads what the learning record already holds. Size: medium. Needs the owner's rule check on any email to parents.

## What stays as it is

The hand-written Studio screens, the server-side grading, Clerk sign-in, the parent switches, "no personal data from children", calm type and tap-only answers.

## Risks

- Collapsing states touches every quiz row and the Studio's central file (the editor is 1,354 lines). Do it behind a feature switch and keep the old states readable until the new view is proven on the live data.
- Auto-checks can give false comfort. Mitigation: the "Ready" label means "no rule objects", never "a person has read it", and the first publish of any batch always shows a sample of five questions to read.
- AI review is advisory only and stays optional (it costs credits and can be wrong).
- Moving SEO output to PHP must keep today's pages identical (titles, canonicals, JSON-LD); compare before and after on all 262 pages.

## Decisions for the owner

1. Order: start with S1 and S2 (cheapest, removes the pain you named), then S3. Agree?
2. S4: dynamic SEO in PHP (recommended) or a nightly redeploy (quicker)?
3. Drip publishing: should a batch ever go live by itself on a schedule, or must every batch always get a person's "Publish" click first? (Recommended: a person clicks once per batch; the drip then runs.)
4. S6: weekly parent summary in the app only, or also by email once `mail_from` is set?

## Measures of success

Time from "files in hand" to "live": today about an hour of clicks for 61 quizzes; target under ten minutes, most of it reading the exceptions. Duplicates created: zero. Release-dependent steps after a publish: zero. Weekly owner actions suggested by the app that the owner agrees with: most of them.
