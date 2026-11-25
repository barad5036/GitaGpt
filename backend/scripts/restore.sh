#!/usr/bin/env bash
# Encrypted PostgreSQL Restore Script
# Usage: BACKUP_PASSPHRASE="strong_secret" ./backend/scripts/restore.sh ./backups/gitagpt_backup_YYYYMMDD.sql.gz.enc

set -euo pipefail

BACKUP_FILE="${1:-}"
DB_URL="${DATABASE_URL:-postgresql://gitagpt:gitagpt_secret@localhost:5432/gitagpt}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: BACKUP_PASSPHRASE=... $0 <path-to-encrypted-backup>" >&2
  exit 1
fi

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "ERROR: BACKUP_PASSPHRASE environment variable is required." >&2
  exit 1
fi

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_PASSPHRASE -in "${BACKUP_FILE}" \
  | gunzip \
  | psql "${DB_URL}"

echo "Database successfully restored from ${BACKUP_FILE}"
