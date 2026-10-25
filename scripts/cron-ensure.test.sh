#!/usr/bin/env bash
# Local proof for scripts/cron-ensure.sh against a fake crontab. Touches no server.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
pass=0; fail=0
check() { if eval "$2"; then echo "PASS $1"; pass=$((pass + 1)); else echo "FAIL $1"; fail=$((fail + 1)); fi; }

# Fake `crontab`: -l prints the file, `crontab FILE` replaces it.
mkdir -p "$work/bin" "$work/home"
cat > "$work/bin/crontab" <<SHIM
#!/usr/bin/env bash
if [ "\${1:-}" = -l ]; then cat "$work/crontab" 2>/dev/null || exit 1; else cp "\$1" "$work/crontab"; fi
SHIM
chmod +x "$work/bin/crontab"
run() { CRON_LOCAL=1 DYK_HOME="$work/home" DYK_PHP="${PHP_CLI:-$(command -v php)}" PATH="$work/bin:$PATH" bash "$root/scripts/cron-ensure.sh" "$@"; }

printf '%s\n' 'SHELL="/bin/bash"' '*/15 * * * * /usr/local/bin/php /home/x/other-site/cron.php >/dev/null 2>&1' '*/4 * * * * curl -fsS https://example.test/health' > "$work/crontab"
cp "$work/crontab" "$work/original"

out=$(run --dry-run)
check "dry run reports two additions" '[[ "$out" == *"2 line(s) would be added"* ]]'
check "dry run writes nothing" 'cmp -s "$work/crontab" "$work/original"'

out=$(run)
check "adds both jobs" '[ "$(grep -c "do-you-know-private/current/bin/" "$work/crontab")" -eq 2 ]'
check "keeps every other line" 'while IFS= read -r l; do grep -qxF -- "$l" "$work/crontab" || exit 1; done < "$work/original"'
check "escapes % for cron" 'grep -qF "date -u +\%FT\%TZ" "$work/crontab"'
check "never calls a bare php" '! grep -E "(^| )php " "$work/crontab"'
check "backs up the previous crontab" 'ls "$work/home/do-you-know-private/shared"/crontab.bak-* >/dev/null'

before=$(cat "$work/crontab")
out=$(run)
check "second run changes nothing" '[[ "$out" == *"No change."* ]] && [ "$(cat "$work/crontab")" = "$before" ]'

printf '%s\n' "17 * * * * php $work/home/do-you-know-private/current/bin/cleanup.php >/dev/null 2>&1" > "$work/crontab"
out=$(run)
check "older cleanup line is reported, not duplicated" '[[ "$out" == *"DIFFERS bin/cleanup.php"* ]] && [ "$(grep -c "bin/cleanup.php" "$work/crontab")" -eq 1 ]'

out=$(PHP_CLI=/usr/bin/false run 2>&1 || true)
check "refuses a php that is not the CLI" '[[ "$out" == *"is not the PHP CLI"* ]]'

echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ]
