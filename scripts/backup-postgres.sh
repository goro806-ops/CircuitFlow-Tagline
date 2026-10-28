#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but was not found" >&2
  exit 1
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="$BACKUP_DIR/circuitflow-$stamp.dump"
tmp="$out.tmp"
trap 'rm -f "$tmp"' EXIT

umask 077
pg_dump --format=custom --no-owner --no-acl --file="$tmp" "$DATABASE_URL"
mv "$tmp" "$out"
sha256sum "$out" > "$out.sha256"
find "$BACKUP_DIR" -type f -name 'circuitflow-*.dump*' -mtime "+$RETENTION_DAYS" -delete

echo "Created backup; store it in encrypted storage: $out"
echo "Retention applied: $RETENTION_DAYS days"
