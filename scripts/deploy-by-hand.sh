#!/usr/bin/env bash
# Retired inherited operational helper. Source preserved; never target an old account by default.
echo "BLOCKED: use docs/07-operations/GITHUB-FTPS-SETUP.md for the new domain." >&2
exit 64

# Deploy origin/main to the cPanel host by hand from the Mac. GitHub Actions is disabled on
# the account, so this mirrors .github/workflows/deploy.yml (docs/07-operations/DEPLOYMENT.md
# section 7). Reads no secret: the build variables are the public repo variables.
#
#   bash scripts/deploy-by-hand.sh             # frontend and/or backend code, no migration
#   bash scripts/deploy-by-hand.sh --migrate   # back up the live database, then run migrations
#   bash scripts/deploy-by-hand.sh --skip-gates  # skip lint, typecheck and unit tests
#
# Rollback is printed at the end. Needs: ssh alias `cpanel`, rsync, gh, composer, node.
set -euo pipefail
export LC_ALL=C

migrate=0
gates=1
for arg in "$@"; do
  case "$arg" in
    --migrate) migrate=1 ;;
    --skip-gates) gates=0 ;;
    *) echo "usage: $0 [--migrate] [--skip-gates]" >&2; exit 64 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"
BACKEND=do-you-know-private
DOCROOT=doyouknow.space
APP_URL=https://doyouknow.space
PHP=/usr/local/bin/php

remote() { ssh -o BatchMode=yes cpanel "$@" 2> >(grep -v -E 'perl:|LANG|LC_|are supported' >&2); }

# 0. Only ever deploy a clean, pushed main.
git fetch -q origin main
[ "$(git branch --show-current)" = main ] || { echo "FAIL: not on main"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "FAIL: working tree is not clean"; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "FAIL: main differs from origin/main"; exit 1; }
SHA=$(git rev-parse HEAD)
before=$(remote "readlink ~/$BACKEND/current")
echo "Deploying ${SHA:0:7}. Live before: $before"

if [ "$gates" = 1 ]; then
  npm run -s lint
  npm run -s typecheck
  npm test --silent
fi

# 1. Build with the production variables, never the local env file.
VITE_APP_URL="$(gh variable get VITE_APP_URL)"
VITE_CLERK_PUBLISHABLE_KEY="$(gh variable get VITE_CLERK_PUBLISHABLE_KEY)"
export VITE_APP_URL VITE_CLERK_PUBLISHABLE_KEY

package() {
  rm -rf build/cpanel-*
  npm run -s build
  npm run -s check:htaccess | tail -1
  (cd backend && composer install --no-dev -q)
  node scripts/package-cpanel.mjs | sed -n 's/^cPanel release: //p'
  (cd backend && composer install -q)
}
R=$(package | tail -1)

# 2. Back up the database before any migration. The server script names the file before-0005
# whatever the migration; the timestamp in the name is what matters.
if [ "$migrate" = 1 ]; then
  remote "$PHP ~/private_backups/dyk/backup-db.php" | tail -2
  remote 'ls -t ~/private_backups/dyk/db-*.sql.gz | head -1'
fi

# 3. Backend release, then migrations from that release, then the one-step switch.
rsync -az --exclude config.php "$R/private/" "cpanel:$BACKEND/releases/$SHA/"
remote "cd ~/$BACKEND && ln -sfn ../../shared/config.php releases/$SHA/config.php"
if [ "$migrate" = 1 ]; then
  remote "cd ~/$BACKEND/releases/$SHA && DYK_CONFIG=\$HOME/$BACKEND/shared/migration.php $PHP bin/migrate.php"
fi
remote "cd ~/$BACKEND && ln -sfn releases/$SHA current.next && mv -Tf current.next current"

# 4. Public files. After a migration the prerender must read the new live API, so rebuild.
if [ "$migrate" = 1 ]; then R=$(package | tail -1); fi
rsync -az --exclude 'api/.htaccess' "$R/public/" "cpanel:$DOCROOT/"

# 5. Live checks.
curl --fail --silent "$APP_URL/api/v1/health" | grep -q '"status":"ok"' && echo "PASS health"
curl --fail --silent --output /dev/null "$APP_URL/" && echo "PASS home"
curl --fail --silent "$APP_URL/api/v1/daily" | head -c 120; echo
bundle=$(ls "$R/public/assets" | grep -o '^index-[A-Za-z0-9_-]*\.js' | head -1)
curl --silent "$APP_URL/" | grep -q "$bundle" && echo "PASS live bundle is $bundle" || echo "FAIL live bundle differs from $bundle"

# 6. Keep three releases and never the live one.
remote 'cd ~/do-you-know-private/releases && live=$(basename "$(readlink ../current)") \
  && ls -1t | tail -n +4 | grep -vxF "$live" | xargs -r rm -rf --; ls -1t'

echo
echo "Live now: $(remote "readlink ~/$BACKEND/current")"
echo "Rollback code: ssh cpanel \"cd ~/$BACKEND && ln -sfn $before current.next && mv -Tf current.next current\""
echo "  then check out the previous commit, build with the same variables and rsync its public/."
[ "$migrate" = 0 ] || echo "Rollback data: restore the newest ~/private_backups/dyk/db-*.sql.gz taken above."
echo "Still to do by hand: look at / and one category page at 390 and 1440 px with the console open."
