#!/usr/bin/env bash
# Automated Daily Encrypted PostgreSQL Backup Script
# Usage: BACKUP_PASSPHRASE="strong_secret" ./backend/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgresql://gitagpt:gitagpt_secret@localhost:5432/gitagpt}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_FILE="${BACKUP_DIR}/gitagpt_backup_${TIMESTAMP}.sql.gz.enc"

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "ERROR: BACKUP_PASSPHRASE environment variable is required." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

pg_dump "${DB_URL}" --no-owner --no-privileges \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -pass env:BACKUP_PASSPHRASE -out "${OUT_FILE}"

# Retain last 14 daily backups
find "${BACKUP_DIR}" -name "gitagpt_backup_*.sql.gz.enc" -mtime +14 -delete

echo "Encrypted backup created at ${OUT_FILE}"
