#!/usr/bin/env bash
# Off-server copy of the doyouknow.space database backups. Pulls the newest verified rolling
# backups (and the pinned pre-migration baseline) from the cPanel host over SSH into a private
# folder on this Mac, checks each SHA-256, and keeps only the newest three rolling copies here.
#
#   bash scripts/pull-backups.sh
#
# Read-only on the server. Never touches other projects' backups. A failed download or
# checksum means nothing local is pruned.
set -euo pipefail
KEEP=3
REMOTE_DIR=private_backups/dykspace
LOCAL="${DYK_BACKUP_DIR:-$HOME/Developer/Projects/do-you-know-backups/db}"
mkdir -p "$LOCAL/rolling" "$LOCAL/pinned"
chmod 700 "$LOCAL" "$LOCAL/rolling" "$LOCAL/pinned"
umask 077

# Newest rolling backups on the server.
remote_list=$(ssh -o BatchMode=yes cpanel "cd ~/$REMOTE_DIR/rolling && ls -1t db-*.sql.gz | head -n $KEEP" 2>/dev/null)
[ -n "$remote_list" ] || { echo "FAIL: no rolling backups found on the server" >&2; exit 1; }

fetched=0
for f in $remote_list; do
  if [ ! -f "$LOCAL/rolling/$f" ]; then
    scp -q "cpanel:$REMOTE_DIR/rolling/$f" "cpanel:$REMOTE_DIR/rolling/$f.sha256" "$LOCAL/rolling/"
    fetched=$((fetched+1))
  fi
  (cd "$LOCAL/rolling" && shasum -a 256 -c "$f.sha256" >/dev/null) || { echo "FAIL: checksum mismatch for $f; nothing pruned" >&2; exit 1; }
  gzip -t "$LOCAL/rolling/$f"
done

# Pinned baselines are copied once and never pruned.
for f in $(ssh -o BatchMode=yes cpanel "cd ~/$REMOTE_DIR && ls -1 db-pre-migrate-*.sql.gz 2>/dev/null" 2>/dev/null); do
  [ -f "$LOCAL/pinned/$f" ] || scp -q "cpanel:$REMOTE_DIR/$f" "$LOCAL/pinned/"
  gzip -t "$LOCAL/pinned/$f"
done

# Keep only the newest $KEEP rolling copies locally (our own files only).
ls -1t "$LOCAL"/rolling/db-*.sql.gz | tail -n +$((KEEP+1)) | while read -r old; do rm -f -- "$old" "$old.sha256"; done

echo "OK: fetched $fetched new; local rolling copies: $(ls -1 "$LOCAL"/rolling/db-*.sql.gz | wc -l | tr -d ' '), pinned: $(ls -1 "$LOCAL"/pinned/*.sql.gz 2>/dev/null | wc -l | tr -d ' ') in $LOCAL"
