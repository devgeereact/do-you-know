# Deployment — doyouknow.space

Canonical instructions: [GITHUB-FTPS-SETUP.md](GITHUB-FTPS-SETUP.md).

This fresh destination has manual-only public FTPS workflows. The old workflow_run/SSH/rsync/prune release chain is retired. A verified scoped FTPS root, exact target marker, certificate hostname, public TLS and recovery backup are required before uploading. Coming-soon and full-app artifacts are separate choices. A full-app upload requires independently verified private PHP/database/Clerk configuration and PUBLIC_BACKEND_READY=true; it never uploads private code/config or runs migrations.

All backend code/vendor/config/uploads/logs/backups remain outside every webroot. Public API configuration and root Apache/Cloudflare/CSP rules require target-specific review. No live changes were made by the local rebrand. Scripts that previously assumed the old server directories are blocked; do not remove their guard just to deploy.
