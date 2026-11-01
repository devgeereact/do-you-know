# Do You Know

Fun, fair quizzes for every age, live at **https://doyouknow.space**. A React/TypeScript PWA with a private PHP API on cPanel, MariaDB and Clerk for grown-ups. Private repository `devgeereact/do-you-know`.

## Start here

1. `AGENTS.md`: rules for anyone (or any agent) changing the code.
2. `docs/00-foundation/PROJECT-MEMORY.md`: what is live and how it runs.
3. `.agent/CURRENT-TASK.md`: what is being worked on now.

## Local development

Node 24 (`.node-version`) and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev          # Vite on http://localhost:5202 + PHP API on 127.0.0.1:55439
pnpm check        # lint, format, typecheck, unit tests, build: the gate before every commit
bash scripts/test-backend.sh   # every PHP suite against the throwaway MariaDB in .local-test/
pnpm test:e2e     # browser journeys (see tests/e2e/README.md)
```

## Structure

- `src/`: pages, components, hooks, typed services; copy in `src/i18n/en-GB.ts`. The Studio is `src/pages/admin/`.
- `backend/`: private PHP API (`src/`), migrations, content seed files, CLI jobs (`bin/`) and tests.
- `public/`: icons, offline page, robots.
- `scripts/`: release, backend tests, brand assets, guards, `set-generator-keys.sh`.
- `docs/`: product, architecture, design, security, operations, decisions, audits.

## Deploying

A push to `main` releases over SSH (`docs/07-operations/DEPLOYMENT.md`). Database migrations are run by hand after a pinned backup.

## Safety

Answers and scores are decided on the server. Children stay guests and never type free text. No real `.env`, keys or server config in Git; `VITE_*` values are public. AI drafts never publish themselves.
