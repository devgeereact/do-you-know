> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

# Security Audit

## Automated evidence

Run `./scripts/project security` after `build`. The authoritative automated result is `.agent/evidence/security.json`; detailed records are linked from it. This gate performs a full locked dependency advisory audit and selected source/build checks. This is not a threat model, penetration test or proof of complete application security.

Automation never changes the manual audit table or `.agent/FOUNDRY.yml` `security_manual` status. Audit timestamps and source fingerprints must match the version being released.

## Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | `NOT TESTED` | Unknown | Critical until checked | `UNKNOWN` | `UNKNOWN` |

Cover authentication, authorisation, database policies, cross-user access, input handling, output encoding, injection, uploads, CSRF, CORS, rate limits, headers, cookies, dependencies, logging and production configuration as applicable.
