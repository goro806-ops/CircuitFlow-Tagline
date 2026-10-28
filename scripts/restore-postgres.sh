#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${BACKUP_FILE:?BACKUP_FILE must point to a pg_dump custom-format file}"

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Refusing restore. Set CONFIRM_RESTORE=YES explicitly after reviewing the target database and backup." >&2
  exit 2
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi
if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required but was not found" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$BACKUP_FILE"
echo "Restore completed. Verify /ready, authentication, project reload, and one smoke test before reopening traffic."
