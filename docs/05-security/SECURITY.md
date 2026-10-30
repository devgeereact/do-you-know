> New-domain baseline, 25 October 2026: imported technical/design history below is reference, not evidence of a doyouknow.space deployment. Current setup and status: docs/00-foundation/CLAUDE-CODE-HANDOFF.md and docs/07-operations/GITHUB-FTPS-SETUP.md. Verify private paths, auth, legal copy and runtime before release. Applied migrations are unchanged.

# Security Model

## Assets and threats

- Sensitive data and operations: `UNKNOWN`
- Trust boundaries: `UNKNOWN`
- Likely attackers and abuse paths: `UNKNOWN`
- Required controls: `UNKNOWN`

## Baseline controls

- Secrets stay outside client bundles, source and logs.
- Inputs are validated at trusted boundaries and outputs are safely rendered.
- Authorisation is enforced server-side with least privilege.
- Rate limiting, uploads, CORS, CSRF, cookies, headers and production settings are decided from the actual architecture.
- Dependencies, errors, monitoring and incident response have owners.

Record test evidence in `docs/AUDIT.md`.
