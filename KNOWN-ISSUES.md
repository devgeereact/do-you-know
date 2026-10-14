# Known Issues

| ID | Severity | Area | Evidence | Next action | Owner | Status |
|---|---|---|---|---|---|---|
| DEP-001 | High | Dependencies | Ubuntu `npm audit`: 14 advisories, 4 moderate and 10 high, at baseline `233cbc6` | Assess compatible patches separately; Tailwind fix suggestion includes a major upgrade | Build agent | Open |
| PWA-001 | High | Private data caching | `vite.config.ts` caches all Supabase REST GETs | Allow only public catalogue reads; remove the legacy API cache before player history work | Build agent | Open |
| PLAY-001 | Medium | Resumed timer | `_attempt_state` returns server time and limit but no question start/deadline | Add a numbered migration and database check before showing an accurate resumed countdown | Build agent | Open |
| SETUP-001 | Medium | Development backend | Local Supabase and loopback bindings pass | Verify the Mac-origin SSH tunnel; provision a restricted SQL role only if raw SQL access is needed | Gideon | Partially verified |
| DOC-001 | Low | Specifications | Additional GEE OS documents still contain UNKNOWN scaffolds | Populate only from confirmed implementation and decisions; use populated app specs meanwhile | Build agent | Open |
