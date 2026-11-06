#!/usr/bin/env bash
# Save the Studio generator keys into the live private settings on the server.
#
#   bash scripts/set-generator-keys.sh            add or replace keys and switch the generator on
#   bash scripts/set-generator-keys.sh --status   show what is set (never the keys themselves)
#   bash scripts/set-generator-keys.sh --off      switch the generator off (keys stay)
#
# Run it on your own Mac. Keys are typed with hidden input, never printed, never put on a command
# line or in shell history, and travel to the server over SSH standard input. On the server the
# settings file is backed up first, only the "generator" section changes, and the new file is
# checked (valid PHP, every other setting identical) before it replaces the old one.
# Anthropic is the default writer; OpenRouter is the backup when Anthropic fails.
set -euo pipefail
HOST="${DYK_SSH_HOST:-cpanel}"
MODE="${1:-set}"

remote() {
  ssh -o BatchMode=yes "$HOST" 'bash -s' "$@"
}

if [ "$MODE" = "--status" ] || [ "$MODE" = "--off" ]; then
  remote <<EOF
set -euo pipefail
umask 077
f="\$HOME/do-you-know-private/shared/config.php"
if [ "$MODE" = "--off" ]; then
  cp -p "\$f" "\$HOME/backups/do-you-know/doyouknow/config.php.\$(date -u +%Y%m%dT%H%M%SZ)"
  php -r '\$c = require \$argv[1]; \$c["generator"]["enabled"] = false;
file_put_contents(\$argv[1] . ".new", "<?php\ndeclare(strict_types=1);\nreturn " . var_export(\$c, true) . ";\n");' "\$f"
  chmod 600 "\$f.new"; php -l "\$f.new" > /dev/null; mv "\$f.new" "\$f"
  echo "Generator switched off."
fi
php -r '\$g = (require \$argv[1])["generator"] ?? [];
foreach (["enabled", "model", "openrouter_model", "daily_runs"] as \$k) { echo str_pad(\$k, 18), var_export(\$g[\$k] ?? null, true), "\n"; }
foreach (["anthropic_api_key", "openrouter_api_key", "brightdata_api_key"] as \$k) { echo str_pad(\$k, 18), empty(\$g[\$k]) ? "not set" : "set", "\n"; }' "\$f"
EOF
  exit 0
fi

echo "Do You Know: save generator keys on $HOST"
echo "Press Enter to keep a key that is already saved."
read -rsp "Anthropic API key (sk-ant-...): " ANTHROPIC; echo
read -rsp "OpenRouter API key (sk-or-..., backup): " OPENROUTER; echo
read -rsp "Bright Data API key (optional, Enter to skip): " BRIGHTDATA; echo
BD_SERP=""; BD_UNLOCK=""
if [ -n "$BRIGHTDATA" ]; then
  read -rp "Bright Data SERP zone name: " BD_SERP
  read -rp "Bright Data Web Unlocker zone name: " BD_UNLOCK
fi
read -rp "Runs allowed per day [20]: " CAP; CAP="${CAP:-20}"

case "$ANTHROPIC" in ""|sk-ant-*) ;; *) echo "That doesn't look like an Anthropic key (it should start sk-ant-)." >&2; exit 1 ;; esac
case "$OPENROUTER" in ""|sk-or-*) ;; *) echo "That doesn't look like an OpenRouter key (it should start sk-or-)." >&2; exit 1 ;; esac
case "$CAP" in ''|*[!0-9]*) echo "Runs per day must be a number." >&2; exit 1 ;; esac

# Build the JSON locally from environment variables only (keys never appear in argv).
PAYLOAD=$(ANTHROPIC="$ANTHROPIC" OPENROUTER="$OPENROUTER" BRIGHTDATA="$BRIGHTDATA" BD_SERP="$BD_SERP" BD_UNLOCK="$BD_UNLOCK" CAP="$CAP" \
  python3 -c 'import json, os; print(json.dumps({k: os.environ[k] for k in ["ANTHROPIC", "OPENROUTER", "BRIGHTDATA", "BD_SERP", "BD_UNLOCK", "CAP"]}))')
unset ANTHROPIC OPENROUTER BRIGHTDATA

REMOTE_SCRIPT=$(cat <<'EOF'
set -euo pipefail
umask 077
f="$HOME/do-you-know-private/shared/config.php"
mkdir -p "$HOME/backups/do-you-know/doyouknow"
cp -p "$f" "$HOME/backups/do-you-know/doyouknow/config.php.$(date -u +%Y%m%dT%H%M%SZ)"
IFS= read -r payload
DYK_PAYLOAD="$payload" php -r '
$in = json_decode(getenv("DYK_PAYLOAD"), true, 4, JSON_THROW_ON_ERROR);
$c = require $argv[1];
$g = is_array($c["generator"] ?? null) ? $c["generator"] : [];
$keep = static fn(string $new, string $key) => $new !== "" ? $new : (string) ($g[$key] ?? "");
$g["enabled"] = true;
// Sonnet 5.5 is the default (owner, 6 Nov 2026). The old Opus default is moved over; any other model someone set by hand is kept.
$g["model"] = in_array($g["model"] ?? "", ["", "claude-opus-5-5"], true) ? "claude-sonnet-5-5" : $g["model"];
$g["openrouter_model"] = in_array($g["openrouter_model"] ?? "", ["", "anthropic/claude-opus-5.5"], true) ? "anthropic/claude-sonnet-5.5" : $g["openrouter_model"];
$g["anthropic_api_key"] = $keep($in["ANTHROPIC"], "anthropic_api_key");
$g["openrouter_api_key"] = $keep($in["OPENROUTER"], "openrouter_api_key");
$g["brightdata_api_key"] = $keep($in["BRIGHTDATA"], "brightdata_api_key");
$g["brightdata_serp_zone"] = $keep($in["BD_SERP"], "brightdata_serp_zone");
$g["brightdata_unlocker_zone"] = $keep($in["BD_UNLOCK"], "brightdata_unlocker_zone");
$g["daily_runs"] = (int) $in["CAP"];
$c["generator"] = $g;
file_put_contents($argv[1] . ".new", "<?php\ndeclare(strict_types=1);\nreturn " . var_export($c, true) . ";\n");
' "$f"
chmod 600 "$f.new"
php -l "$f.new" > /dev/null
php -r '$o = require $argv[1]; $n = require $argv[2];
foreach ($o as $k => $v) { if ($k !== "generator" && $n[$k] !== $v) { fwrite(STDERR, "unexpected change: $k\n"); exit(1); } }' "$f" "$f.new"
mv "$f.new" "$f"
echo "Saved. Checking the keys with each provider (free key checks, no questions generated):"
php -r '$g = (require $argv[1])["generator"];
$check = static function (string $url, array $headers): int {
  $c = curl_init($url); curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => $headers]);
  curl_exec($c); $s = (int) curl_getinfo($c, CURLINFO_RESPONSE_CODE); return $s;
};
if (!empty($g["anthropic_api_key"])) { $s = $check("https://api.anthropic.com/v1/models?limit=1", ["x-api-key: " . $g["anthropic_api_key"], "anthropic-version: 2023-06-01"]); echo "  Anthropic:  ", $s === 200 ? "OK" : "FAILED (HTTP $s)", "\n"; }
if (!empty($g["openrouter_api_key"])) { $s = $check("https://openrouter.ai/api/v1/key", ["Authorization: Bearer " . $g["openrouter_api_key"]]); echo "  OpenRouter: ", $s === 200 ? "OK" : "FAILED (HTTP $s)", "\n"; }
echo "  Model:      ", $g["model"], " (backup ", $g["openrouter_model"], ")\n";
echo "  Generator:  switched on, ", $g["daily_runs"], " runs a day\n";' "$f"
EOF
)
printf '%s\n' "$PAYLOAD" | ssh -o BatchMode=yes "$HOST" "bash -c $(printf '%q' "$REMOTE_SCRIPT")"
unset PAYLOAD
echo "Done. Open the Studio → Generator to start a run."
