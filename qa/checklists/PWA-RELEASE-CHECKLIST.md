# PWA Release Gates

For every line record status, evidence, owner and date. Allowed statuses are `PASS`, `FAIL`, `PARTIAL`, `NOT TESTED`, `N/A` and `BLOCKED`. `N/A` requires a reason.

## Runtime and network

- [ ] Application works online.
- [ ] Network failure produces intentional behaviour.
- [ ] Offline behaviour matches the approved specification.
- [ ] Service worker registration, scope and lifecycle behave correctly.
- [ ] Old caches are removed safely.
- [ ] New versions update without trapping users on stale code.
- [ ] Failed requests recover appropriately.
- [ ] Duplicate submissions are prevented or made idempotent.
- [ ] API failures have visible, recoverable states.

## Installation and navigation

- [ ] Installation works on supported platforms.
- [ ] App icons and launch presentation work.
- [ ] The web app manifest is valid.
- [ ] Start URL, scope, deep links and refreshed routes work.

## Identity, data and synchronisation

- [ ] Authentication survives the intended application lifecycle.
- [ ] Private data is not cached accidentally.
- [ ] User work is not silently lost.
- [ ] Queueing, retry, conflict and synchronisation states are explicit where applicable.
- [ ] Database policies and permissions are verified.
- [ ] Role permissions are verified server-side.

## Experience and release

- [ ] Mobile layout works on supported sizes.
- [ ] Desktop layout works on supported sizes.
- [ ] Accessibility has been checked with recorded evidence.
- [ ] Production build succeeds.
- [ ] No critical console or runtime errors remain.
- [ ] No exposed secrets are present.
- [ ] No critical security findings remain open.
- [ ] Monitoring and error reporting are operational.
- [ ] Backup and recovery exist where applicable.
- [ ] Rollback is documented and feasible.
- [ ] The production environment has been verified directly.

Test online, slow, intermittent, offline and restored-network transitions. A simulated checkbox without observed behaviour is not a pass.

## Automated and manual assurance

- [ ] Applicable Foundry automated gates pass on the production build, including `accessibility` and `security`.
- [ ] Review `.agent/evidence/accessibility.json`, its axe scan details and any lower-severity violations or incomplete rules.
- [ ] Review `.agent/evidence/security.json`, dependency counts, static findings and any below-threshold advisories.
- [ ] Complete and record the separate manual accessibility audit in `qa/ACCESSIBILITY-AUDIT.md`.
- [ ] Complete the product-specific threat model and manual security review in `qa/SECURITY-AUDIT.md`.

An automated PASS applies only to the recorded policy, routes, states and source fingerprint. It is not proof of complete WCAG compliance or complete application security. Do not mark the manual assurance rows, production review or full release checklist PASS solely because automated gates pass. Missing or unavailable checks remain NOT TESTED, BLOCKED or FAIL as appropriate; they are never an automatic PASS.
