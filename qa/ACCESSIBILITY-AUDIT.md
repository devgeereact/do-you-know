> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

# Accessibility Audit

## Automated evidence

Run `./scripts/project accessibility` after `build`. The authoritative automated result is `.agent/evidence/accessibility.json`; detailed records are linked from it. This gate performs production-browser axe scans for the configured WCAG 2.2 AA tags and serious/critical threshold. This covers only automatically testable rules and configured routes/states, not complete WCAG compliance.

Automation never changes the manual audit table or `.agent/FOUNDRY.yml` `accessibility_manual` status. Audit timestamps and source fingerprints must match the version being released.

## Manual assurance

| Area | Method | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|
| Keyboard and focus | Manual | Complete operability and visible focus | `NOT TESTED` | NOT TESTED | `UNKNOWN` |

Include semantics, labels, headings, landmarks, contrast, zoom, touch targets, error identification, announcements, alternative text, reduced motion and representative assistive-technology checks.
