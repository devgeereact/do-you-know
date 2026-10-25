#!/usr/bin/env bash
# Make sure the Do You Know cron jobs exist on the cPanel host, without touching any
# other line. The crontab is shared with other sites on the account, so this script
# only ever ADDS missing lines: it never rewrites, reorders or removes anything.
#
#   bash scripts/cron-ensure.sh            # add missing lines (backs up first)
#   bash scripts/cron-ensure.sh --dry-run  # report only
#
# Runs over `ssh cpanel` (see docs/07-operations/DEPLOYMENT.md). CRON_LOCAL=1 runs the
# same steps on this machine instead; scripts/cron-ensure.test.sh uses that with a fake
# crontab. Never pipe a single line into `crontab -`: that replaces every other job.
set -euo pipefail

mode=${1:-apply}
case "$mode" in apply | --dry-run) ;; *) echo "usage: $0 [--dry-run]" >&2; exit 64 ;; esac

remote() {
  if [ -n "${CRON_LOCAL:-}" ]; then bash -s -- "$@"; else ssh cpanel 'bash -s' -- "$@"; fi
}

remote "$mode" <<'REMOTE'
set -euo pipefail
mode=$1
base=${DYK_HOME:-$HOME}/do-you-know-private
shared=$base/shared
log=$shared/logs/cron.log
# Cron's PATH finds the CGI build of php on this host, which exits 0 and does nothing.
php=${DYK_PHP:-/usr/local/bin/php}

[ "$("$php" -r 'echo PHP_SAPI;')" = cli ] || { echo "FAIL: $php is not the PHP CLI"; exit 1; }
mkdir -p "$shared/logs"

# "\%" because cron turns a bare % into a newline. Each run logs a UTC timestamp.
want=(
  "17 * * * * { date -u +\%FT\%TZ; $php $base/current/bin/cleanup.php; } >> $log 2>&1"
  "5 * * * * { date -u +\%FT\%TZ; $php $base/current/bin/daily.php; } >> $log 2>&1"
)

current=$(mktemp); next=$(mktemp); trap 'rm -f "$current" "$next"' EXIT
crontab -l > "$current" 2>/dev/null || true
cp "$current" "$next"
added=0
new_lines=()
for line in "${want[@]}"; do
  job=$(printf '%s' "$line" | grep -o 'bin/[a-z]*\.php')
  if grep -qxF -- "$line" "$current"; then
    echo "ok      $job"
  elif grep -qF -- "$base/current/$job" "$current"; then
    echo "DIFFERS $job: an older line exists; left as is, fix it by hand"
  else
    echo "add     $job"
    printf '%s\n' "$line" >> "$next"
    new_lines+=("$line")
    added=$((added + 1))
  fi
done

if [ "$added" -eq 0 ]; then echo "No change."; exit 0; fi
if [ "$mode" = --dry-run ]; then echo "Dry run: $added line(s) would be added."; exit 0; fi

backup=$shared/crontab.bak-$(date +%Y%m%d%H%M%S)
cp "$current" "$backup"
crontab "$next"

# Prove nothing was lost: every earlier line is still there, plus the new ones.
installed=$(mktemp); crontab -l > "$installed"
while IFS= read -r old; do
  grep -qxF -- "$old" "$installed" || { echo "FAIL: lost a line; restore with: crontab $backup"; exit 1; }
done < "$current"
for line in "${new_lines[@]}"; do
  grep -qxF -- "$line" "$installed" || { echo "FAIL: a line was not added; restore with: crontab $backup"; exit 1; }
done
rm -f "$installed"
echo "Added $added line(s). Previous crontab saved to $backup."
REMOTE
