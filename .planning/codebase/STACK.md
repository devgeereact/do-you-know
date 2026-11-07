# Stack and Integrations

**Analysis Date:** 2026-11-07

## Stack

- **Front end:** React 18, strict TypeScript, Vite, Tailwind tokens, GSAP, Lenis smooth scroll, vite-plugin-pwa (manifest and service worker generated at build, not tracked). ESLint plus Prettier (custom i18n lint rule). Vitest, Playwright.
- **Back end:** PHP (8.2 floor, server 8.4), Composer, MariaDB (CI and local 11.4). No framework; hand-written router.
- **Runtime/tooling:** Node 24 (`.node-version`), pnpm, `pnpm check` as the gate, Git hook runs `scripts/guard.py` and gitleaks.
- **Ports:** Vite 5202, PHP API 55439; e2e uses 5304 and 55503.

## Integrations

| Service | Use | State |
|---|---|---|
| Clerk | Adult sign-in at `/account`; Studio staff sign-in (`admin_subjects`) | Live sign-in to Studio NOT TESTED |
| Anthropic | Default generator/writer provider (ADR-017, Sonnet 5.5 per ADR-022) | Keys not set; BLOCKED |
| OpenRouter | Generator fallback | Keys not set |
| Bright Data | Optional search and page fetch for generator (zones `mcp_serp`, `mcp_unlocker`) | Keys not set |
| Sentry | Front-end error capture (`VITE_SENTRY_DSN`) | ASSUMPTION inactive in production |
| ImageKit | Env and PWA cache rule only | Dead: no code uses it |
| PostHog | Env keys only | Dead: no code uses it |
| Cloudflare | DNS/HTTPS; GPTBot 429 rule pending | Owner step open |
| GitHub Actions | `verify.yml` (CI), `deploy.yml` (SSH release), `semgrep.yml` (report-only until 11 Nov), Dependabot monthly | In use |
| cPanel (Namecheap) | Hosting, MariaDB, cron | In use |

Only public `VITE_*` names were read from source; no `.env*`, `config.php` or `.local-state/` was opened.
