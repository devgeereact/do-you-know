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

Record test evidence in `qa/SECURITY-AUDIT.md`.
