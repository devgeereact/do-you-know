# Do You Know — current project memory

Updated 25 October 2026. This is the new Route B destination for doyouknow.space. Older source release/PR/account notes are not this project's state.

## Verified locally
- Imported frontend, backend and tests exist in this project; name/slug are Do You Know / do-you-know.
- Destination Git had an unborn main branch, no commits and no remote at audit time.
- Canonical/SEO/robots/example origins are changed to https://doyouknow.space.
- Optional contact email defaults to empty, avoiding an inherited unverified mailbox.
- Legacy auto/SSH deployment is replaced by manual scoped public FTPS preparation. Private backend installation remains a separate task.
- Source project and its real configuration were not modified or copied.

## Owner-reported
The new domain is connected to cPanel. Exact document root, FTPS endpoint/account scope, origin/public TLS, Cloudflare and private backend setup still need verification.

## Blocked or not performed
The private repository https://github.com/gsakinz/do-you-know has been created and origin attached. See the rebrand verification record for the latest commit/push/Action evidence. No secrets, database/users/content, old server directories, Clerk domains or cron jobs were migrated. No app/coming-soon deployment was performed. Existing business modules need the normal test/review process before this new site is released.

## Continue
Read CLAUDE-CODE-HANDOFF.md and ../07-operations/GITHUB-FTPS-SETUP.md. Exact check results are in ../08-change-management/REBRAND-VERIFICATION.md. Follow the existing product/privacy constraints; do not treat backlog proposals as approved features.

## Repository baseline

Private repository created and origin attached: https://github.com/gsakinz/do-you-know. Initial reviewed source baseline be16ba09abbfea21e36680aac9a4d74fd5de5d59 pushed normally to main; staged secret guard passed. Manual verification run 40238993723 was dispatched with full_backend=false. See the verification record for its final result. No FTPS deployment or backend operation was run.
