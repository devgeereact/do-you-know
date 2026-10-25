> Imported source QA reference. NOT evidence of a doyouknow.space deployment or a new passing test. See docs/08-change-management/REBRAND-VERIFICATION.md.

# Website Launch and Quality Gates

Record status, evidence, owner and date. The lists supplied by Gideon are consolidated here without duplicate or corrupted numbering.

## Launch essentials

- [ ] Privacy policy reflects real data practices and has appropriate review.
- [ ] Terms page uses verified organisation and jurisdiction details.
- [ ] Primary call to action is clear and works.
- [ ] FAQ answers real user questions.
- [ ] `robots.txt` is intentional and valid.
- [ ] `sitemap.xml` is current and reachable.
- [ ] A useful custom 404 page exists.
- [ ] Meaningful images have appropriate alternative text.
- [ ] Analytics is configured with consent where required.
- [ ] Every indexable page has a specific title and description.
- [ ] Social sharing metadata and preview imagery work.
- [ ] Favicon and required brand icons work.
- [ ] Canonical URLs are correct.
- [ ] Cookie consent matches actual storage and applicable law.
- [ ] Mobile layouts and interactions are tested.
- [ ] Keyboard, focus, labels, contrast, landmarks and touch targets are checked.
- [ ] Forms are tested for validation, success, failure and recovery.
- [ ] Internal and external links are checked.
- [ ] Images, fonts, scripts and critical rendering are tuned to agreed budgets.

## Interface repair

- [ ] No unintended horizontal scrolling exists.
- [ ] Buttons and links perform their labelled action.
- [ ] Mobile navigation works and is accessible.
- [ ] Footer links work.
- [ ] Success and error messages are clear and actionable.
- [ ] Placeholder copy, dead navigation and temporary assets are removed.
- [ ] Logo returns to the expected home route.
- [ ] Telephone numbers and email addresses are actionable where appropriate.
- [ ] Copyright details are current.

## Conversion risks

- [ ] Pop-ups are limited, timed responsibly and easy to dismiss.
- [ ] Headline and value proposition are specific.
- [ ] Calls to action do not compete without a clear hierarchy.
- [ ] Copy and imagery are credible, specific and consistent with the product.
- [ ] Page speed meets the agreed budget.
- [ ] Long text is structured for scanning without hiding necessary detail.
- [ ] Animation and video do not distract, block access or harm performance.
- [ ] Forms ask only for necessary information.
- [ ] Pricing visibility follows the approved commercial strategy.
- [ ] Social proof is authentic and permissioned.
- [ ] Navigation supports the next step.
- [ ] Cookies and trackers are necessary, documented and controlled.

## Security checks

- [ ] API keys and secrets are absent from client bundles and version history.
- [ ] Environment variables and production settings are verified.
- [ ] Administrative routes require server-side authorisation.
- [ ] Authentication and role permissions are tested.
- [ ] User input is validated and safely rendered.
- [ ] SQL injection controls and database policies are verified.
- [ ] Rate limiting and abuse controls match risk.
- [ ] Third-party spending limits and alerts exist where supported.
- [ ] File uploads validate type, size, ownership, storage and delivery.
- [ ] CSRF protection is present where the authentication design requires it.
- [ ] CORS permits only intended origins, methods and headers.
- [ ] HTTPS is enforced.
- [ ] Security headers match the application.
- [ ] Cookies use appropriate `Secure`, `HttpOnly` and `SameSite` settings.
- [ ] Debug mode and verbose error disclosure are disabled in production.

Do not mark the site ready while a critical gate is failed, blocked or not tested.

## Automated and manual assurance

- [ ] Applicable Foundry automated gates pass on the production build, including `accessibility` and `security`.
- [ ] Review `.agent/evidence/accessibility.json`, its axe scan details and any lower-severity violations or incomplete rules.
- [ ] Review `.agent/evidence/security.json`, dependency counts, static findings and any below-threshold advisories.
- [ ] Complete and record the separate manual accessibility audit in `qa/ACCESSIBILITY-AUDIT.md`.
- [ ] Complete the product-specific threat model and manual security review in `qa/SECURITY-AUDIT.md`.

An automated PASS applies only to the recorded policy, routes, states and source fingerprint. It is not proof of complete WCAG compliance or complete application security. Do not mark the manual assurance rows, production review or full release checklist PASS solely because automated gates pass. Missing or unavailable checks remain NOT TESTED, BLOCKED or FAIL as appropriate; they are never an automatic PASS.
