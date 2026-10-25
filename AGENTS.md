# Do You Know — agent contract

Read `.agent/PROJECT.yml`, `.agent/CURRENT-TASK.md`, `docs/00-foundation/PROJECT-MEMORY.md` and `docs/00-foundation/CLAUDE-CODE-HANDOFF.md` first. Read the relevant product/architecture/security docs before changes. This is a fresh Route B destination for **doyouknow.space**, not the old production checkout.

## Authority and Git
The active user request authorises local rebranding/setup files, not unrelated feature development, user/database migration or unreviewed deployment. Preserve the source project and this destination's loose work. There is no initial commit/remote at the baseline audit; do not blindly pull or push a nonexistent origin. Create/attach the intended private repository only with valid authorised access. No force push, destructive reset, broad clean or remote branch deletion. Use focused commits, staged secret checks and appropriate review. A plugin or CodeRabbit installation is not assumed.

## Sources of truth
- Current state/handoff: docs/00-foundation/PROJECT-MEMORY.md and CLAUDE-CODE-HANDOFF.md.
- Product and rules: docs/01-product/PRODUCT-SPEC.md and docs/00-foundation/RULES.md.
- Architecture/data/hooks: docs/02-architecture/.
- Quality: docs/06-quality/EVIDENCE-STATUS.md and docs/08-change-management/REBRAND-VERIFICATION.md.
- Hosting: docs/07-operations/GITHUB-FTPS-SETUP.md and DEPLOYMENT.md.

Technical documents may describe imported capabilities. They are not proof that a new-domain backend, database, Clerk instance, cron job or release exists. Record IMPLEMENTED, VERIFIED, PLANNED and BLOCKED accurately; do not relabel inherited test evidence as a new passing check.

## Stack and coding
React 18, strict TypeScript, Vite and Tailwind tokens; PHP 8.2+ private backend with MySQL/MariaDB. Use npm and package-lock.json; dev port 5202 remains unchanged. Do not alter machine-global port registries or assume an Ubuntu build machine/GEE OS installation exists. No Node runtime is required on cPanel. Preserve the established layout and hook/service/API boundaries. Components use typed services; PHP uses validated input, prepared statements and server-side scope checks. Applied migrations remain immutable.

## Security and game integrity
Never expose answers before answering or compute trusted scores/times/permissions in the browser. Preserve server-side grading and ownership. Children remain guest-first; collect no new real names, birthdates, photos, location, contacts or free text. Public surfaces show nickname, preset avatar and score only. No new tracking/ad SDK, generated player photos or AI auto-publication. Existing optional integrations remain off unless configured and approved.

Never open real .env files, keys or private config just to perform branding. Examples contain placeholders only. VITE_* values are public; backend secrets/config/backups stay outside every webroot. `.claude/settings.json` retains the existing agent guard; Codex applies the same restrictions manually. Enable the Git hook deliberately once the owner adopts this repository; run `scripts/guard.py` on staged files before commits.

## Deployment
Only domain: doyouknow.space. Exact cPanel public/private paths and scoped FTPS account must be verified; do not reuse old server directories. Manual workflows only; no workflow_run/push-trigger deployment. No mirror-delete, unknown remote cleanup, database migration or cron modification from the public FTPS workflow. A public-root account cannot deploy a private backend outside that root. Backend install/configuration/migrations require a separate approved procedure. Before publishing the app, verify Clerk origins, private API configuration, disposable-db tests and backup/recovery. Coming-soon is a separate allowlisted artifact. Use valid FTPS certificates; never plaintext FTP or insecure TLS.

## Checks and handoff
Run typecheck, lint, relevant tests and a build for meaningful source changes. PHP/database/browser/Apache checks need their matching environment; label unavailable checks NOT TESTED/BLOCKED. Update current docs and task memory with actual results. No fabricated production readiness.
