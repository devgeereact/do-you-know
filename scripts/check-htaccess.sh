#!/usr/bin/env bash
# Local proof for the root .htaccess: serves dist/ through a throwaway Apache on
# 127.0.0.1:8089 (macOS built-in httpd or any Apache 2.4) and checks routing, caching
# and deny rules. Run after `pnpm build`. Changes nothing outside a temp folder.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$root/dist/index.html" ] || { echo "BLOCKED: run pnpm build first"; exit 69; }
mods=${APACHE_MODULES:-/usr/libexec/apache2}
tmp="$root/.local-test/tmp"; mkdir -p "$tmp"
work=$(mktemp -d "$tmp/dyk-htaccess.XXXXXX")
cp -R "$root/dist" "$work/www"; cp "$root/.htaccess" "$work/www/"
mkdir -p "$work/www/api" "$work/www/.well-known/acme-challenge"
echo api > "$work/www/api/api.php"; echo x > "$work/www/config.php"; echo x > "$work/www/other.php"
echo token > "$work/www/.well-known/acme-challenge/t"; echo x > "$work/www/.hidden"
cat > "$work/httpd.conf" <<CONF
ServerRoot "$work"
Listen 127.0.0.1:8089
PidFile "$work/httpd.pid"
ErrorLog "$work/error.log"
LoadModule mpm_prefork_module $mods/mod_mpm_prefork.so
LoadModule authz_core_module $mods/mod_authz_core.so
LoadModule unixd_module $mods/mod_unixd.so
LoadModule dir_module $mods/mod_dir.so
LoadModule mime_module $mods/mod_mime.so
LoadModule rewrite_module $mods/mod_rewrite.so
LoadModule headers_module $mods/mod_headers.so
LoadModule env_module $mods/mod_env.so
LoadModule setenvif_module $mods/mod_setenvif.so
ServerName localhost
DocumentRoot "$work/www"
# The work folder sits inside the repo (.local-test/tmp), so Apache would also read the repo's
# own .htaccess as an ancestor. Switch overrides off everywhere except the throwaway docroot.
<Directory />
  AllowOverride None
  Require all denied
</Directory>
<Directory "$work/www">
  AllowOverride All
  Require all granted
</Directory>
CONF
httpd -f "$work/httpd.conf" -k start
trap 'httpd -f "$work/httpd.conf" -k stop; rm -rf "$work"' EXIT
sleep 1
base=http://127.0.0.1:8089; hdr="X-Forwarded-Proto: https"; cf="CF-RAY: local-check"; pass=0; fail=0
asset=$(cd "$root/dist/assets" && ls | grep '\.js$' | head -1)
icon=$(cd "$root/dist/icons" && ls | head -1)
workbox=$(cd "$root/dist" && ls | grep '^workbox-.*\.js$' | head -1)
check() { # name expected-status path [header text]
  out=$(curl -s -D - -o /dev/null -H "$hdr" ${cf:+-H "$cf"} "$base$3" | tr -d '\r')
  code=$(echo "$out" | head -1 | awk '{print $2}')
  if [ "$code" = "$2" ] && { [ -z "${4:-}" ] || echo "$out" | grep -qi "$4"; }; then
    echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1 (status $code)"; fail=$((fail+1)); fi
}
cf="" check "origin lock: no CF-RAY is refused" 403 /
mkdir -p "$work/www/.well-known" && echo ok > "$work/www/.well-known/probe.txt"
cf="" check "origin lock: /.well-known/ stays open" 200 /.well-known/probe.txt
check "app shell revalidated" 200 / "cache-control: no-cache, no-store"
check "deep link serves the shell" 200 /play/daily "cache-control: no-cache, no-store"
check "hashed asset immutable" 200 "/assets/$asset" immutable
check "icon immutable" 200 "/icons/$icon" immutable
check "service worker revalidated" 200 /sw.js no-store
check "manifest revalidated" 200 /manifest.webmanifest no-store
[ -n "$workbox" ] && check "workbox runtime revalidated" 200 "/$workbox" no-store
check "source map denied" 403 /sw.js.map
check "config.php denied" 403 /config.php
check "missing backend config denied" 403 /backend/config.php
check "stray PHP denied" 403 /other.php
check "dotfile denied" 403 /.hidden
check "missing static file is 404" 404 /assets/missing.js
check "API routes to api.php" 200 /api/v1/health
body() { # name expected-status path text-in-body
  out=$(curl -s -w '\n%{http_code}' -H "$hdr" -H "$cf" "$base$3")
  code=$(echo "$out" | tail -1)
  if [ "$code" = "$2" ] && echo "$out" | grep -qF -- "$4"; then
    echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1 (status $code)"; fail=$((fail+1)); fi
}
body "sitemap.xml routes to the API" 200 /sitemap.xml api
[ ! -f "$root/dist/sitemap.xml" ] && { echo "PASS dist has no static sitemap.xml"; pass=$((pass+1)); } || { echo "FAIL dist/sitemap.xml would go stale"; fail=$((fail+1)); }
# Prerendered pages (scripts/prerender.mjs) are served without a slash redirect.
for kind in q c; do
  slug=$( (cd "$root/dist/$kind" 2>/dev/null && ls | head -1) || true)
  if [ -z "$slug" ]; then echo "SKIP no prerendered /$kind/ page in dist (API unreachable at build?)"; continue; fi
  check "/$kind/<slug> serves its page with no redirect" 200 "/$kind/$slug" "cache-control: no-cache, no-store"
  body "/$kind/<slug> has its own canonical" 200 "/$kind/$slug" "<link rel=\"canonical\" href=\"https://doyouknow.space/$kind/$slug\""
  body "/$kind/<slug>/ with a slash serves the same page" 200 "/$kind/$slug/" "/$kind/$slug\""
  body "/$kind/<slug> page carries the static intro block" 200 "/$kind/$slug" '<div id="prerender"'
done
check "folder without a slash is not listed" 404 /assets
check "folder with a slash is not listed" 404 /assets/
body "unknown quiz slug falls back to the shell" 200 /q/no-such-quiz-here '<link rel="canonical" href="https://doyouknow.space/" />'
check "HSTS on HTTPS" 200 / "strict-transport-security"
check "nosniff" 200 / "x-content-type-options: nosniff"
check "CSP report-only sent" 200 / "content-security-policy-report-only: default-src 'self'"
# The CSP allows the inline theme script by hash; a changed script needs a new hash.
inline_hash=$(python3 - "$root/dist/index.html" <<'PY2'
import base64, hashlib, re, sys
html = open(sys.argv[1]).read()
for body in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S):
    print('sha256-' + base64.b64encode(hashlib.sha256(body.encode()).digest()).decode())
PY2
)
for h in $inline_hash; do
  if grep -q "'$h'" "$root/.htaccess"; then pass=$((pass+1)); echo "PASS CSP hash $h"
  else fail=$((fail+1)); echo "FAIL inline script $h missing from CSP in .htaccess"; fi
done
hdr="X-None: 1"
check "plain HTTP redirects" 301 /play "location: https://"
check "ACME challenge over HTTP" 200 /.well-known/acme-challenge/t
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ]
