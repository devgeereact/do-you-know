# Known Issues

| ID | Severity | Area | Evidence | Next action | Owner | Status |
|---|---|---|---|---|---|---|
| DEP-001 | High | Dependencies | Ubuntu `npm audit`: 14 advisories, 4 moderate and 10 high, at baseline `233cbc6` | Assess compatible patches separately; Tailwind fix suggestion includes a major upgrade | Build agent | Open |
| PWA-001 | High | Private data caching | Runtime cache check includes public catalogue only, excludes private reads/auth/RPCs and deletes old cache | Repeat against any production candidate and custom domain | Build agent | Resolved locally |
| PLAY-001 | Medium | Resumed timer | Migration 0005 and timer/resume checks pass | Include migration 0005 in future environment setup | Build agent | Resolved locally |
| SETUP-001 | Medium | Development backend | Local Supabase and loopback bindings pass | Verify the Mac-origin SSH tunnel; provision a restricted SQL role only if raw SQL access is needed | Gideon | Partially verified |
| DOC-001 | Low | Specifications | Additional GEE OS documents still contain UNKNOWN scaffolds | Populate only from confirmed implementation and decisions; use populated app specs meanwhile | Build agent | Open |
