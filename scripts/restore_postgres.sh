#!/usr/bin/env bash
# =============================================================================
# Nexus POS — Restore PostgreSQL dari File Backup
#
# CARA PAKAI:
#   chmod +x scripts/restore_postgres.sh
#   ./scripts/restore_postgres.sh backups/daily/nexus_nexus_20260101_020000.sql.gz
#
# PERINGATAN: Restore akan MENGHAPUS seluruh data database yang ada!
#             Pastikan sudah ada konfirmasi eksplisit sebelum menjalankan.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-nexus_db}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
DB_NAME="${POSTGRES_DB:-nexus}"

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "❌ USAGE: $0 <path/to/backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ File backup tidak ditemukan: ${BACKUP_FILE}"
  exit 1
fi

echo "=============================================="
echo "[Nexus Restore] File  : ${BACKUP_FILE}"
echo "[Nexus Restore] Target: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "⚠️  PERINGATAN: Semua data di database ${DB_NAME} akan DIGANTI!"
echo "=============================================="

read -rp "Ketik 'RESTORE' untuk melanjutkan: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
  echo "Restore dibatalkan."
  exit 0
fi

echo "[Nexus Restore] Memulai restore dari: ${BACKUP_FILE}"

# Decompress dan restore via psql
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-password

echo "[Nexus Restore] ✅ Restore berhasil selesai: $(date)"
echo "=============================================="
