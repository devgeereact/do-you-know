# Current task

Updated 14 November 2026. Branch `chore/house-standard` (local, not pushed) holds Stages 0 to 3 of the house-standard rollout: Tailwind CSS v4, one docs tree, the working method. `main` is live at `5aec7bd`. Finished work is in `HANDOFF.md`; the live setup is in `docs/00-foundation/PROJECT-MEMORY.md`; versions and open items are in `docs/ROADMAP.md`.

## Goal

Stage 4: build and improve the app. Next build candidate is the content pipeline (`docs/CONTENT-PIPELINE-DESIGN.md`, ADR-024): the Library Draft, Ready and Live view, then slices 5 and 6. Keep the child and parent app calm, tap-only and server-graded.

## Status

- **Rollout:** READY TO BUILD once the branch is merged. Waiting on the owner's "approved: push and merge do-you-know". PUSH TO MAIN DEPLOYS do-you-know (deploy.yml runs on push to `main`); the change touches CSS, so a deploy is wanted.
- **Checks on this branch (14 Nov, Ubuntu):** `pnpm check` PASS (452 unit, build ok); `pnpm test:e2e` PASS 113/113; `pnpm verify` see HANDOFF. NOT TESTED: real phones, Safari, signed-in Studio screens, a visual side-by-side of v3 against v4 beyond the 113 browser tests.
- **CI on `main`:** verify.yml green on `49c3791` (run 42627529469); head `5aec7bd` is a docs-only `[skip ci]` commit; Deploy 42633420202 green; daily Page check green 13 Nov.
- **Backup:** git bundle in `~/Backups/projects/do-you-know/` (verified), linked from `.local-state/backups`.

## Next steps (owner)

1. Say "approved: push and merge do-you-know" (one push, one deploy). Then one scripted smoke of the live site.
2. Batches screen (60 imported quizzes), phone checks, `mail_from`: see `docs/ROADMAP.md`.
3. Remote branches left on GitHub, listed for you, none deleted: `chore/env-example-no-imagekit` (your `.env.example` edit, one commit), `design/content-pipeline` (superseded), `feat/content-pipeline`, `phase/p1-housekeeping`, `phase/p8-owner-calls`, `phase/p9-router-v7`.

## Next steps (code)

- Library Draft, Ready and Live view; slices 5 and 6; sticky answer sheet for the Next button at 375x667.
- Dev-dependency alerts and the planned majors are listed in `docs/ROADMAP.md`.
- `page-check.yml` fails when a published page has no prerendered head: run Deploy once when it does.
- Under load the e2e `sizes.spec.ts` friend test can miss by a few pixels while an animation runs; it passes alone.
