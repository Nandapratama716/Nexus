#!/usr/bin/env bash
# =============================================================================
# Nexus POS — PostgreSQL Backup Script
# Strategi: Daily Full Dump + Retention 7 hari harian, 4 minggu mingguan, 3 bulan bulanan
#
# CARA PAKAI:
#   chmod +x scripts/backup_postgres.sh
#   ./scripts/backup_postgres.sh
#
# OTOMATIS via Cron (contoh):
#   0 2 * * * /path/to/Nexus/scripts/backup_postgres.sh >> /var/log/nexus_backup.log 2>&1
#
# DEPENDENCIES: pg_dump, gzip, aws-cli (opsional untuk upload ke S3)
# =============================================================================

set -euo pipefail

# --- Konfigurasi dari .env ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Fallback default jika .env tidak tersedia
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-nexus_db}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
DB_NAME="${POSTGRES_DB:-nexus}"

# Gunakan PgBouncer port jika tersedia (6432), fallback ke Postgres langsung (5432)
# CATATAN: pg_dump TIDAK kompatibel dengan transaction-mode pooling.
# Selalu koneksi langsung ke Postgres (5432) untuk backup!
BACKUP_PORT="${DB_PORT}"

# Direktori backup (absolut)
BACKUP_DIR="${SCRIPT_DIR}/../backups"
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")    # 1=Senin … 7=Minggu
DAY_OF_MONTH=$(date +"%d")   # 01 – 31

BACKUP_FILENAME="nexus_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "=============================================="
echo "[Nexus Backup] Mulai: $(date)"
echo "[Nexus Backup] Target DB: ${DB_NAME}@${DB_HOST}:${BACKUP_PORT}"
echo "=============================================="

# --- 1. Jalankan pg_dump ---
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  --host="${DB_HOST}" \
  --port="${BACKUP_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --format=plain \
  --no-password \
  --verbose \
  | gzip -9 > "${BACKUP_DIR}/daily/${BACKUP_FILENAME}"

echo "[Nexus Backup] ✅ Backup selesai: ${BACKUP_DIR}/daily/${BACKUP_FILENAME}"
echo "[Nexus Backup] Ukuran: $(du -sh "${BACKUP_DIR}/daily/${BACKUP_FILENAME}" | cut -f1)"

# --- 2. Salin ke weekly (setiap Minggu = hari 7) ---
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
  cp "${BACKUP_DIR}/daily/${BACKUP_FILENAME}" "${BACKUP_DIR}/weekly/${BACKUP_FILENAME}"
  echo "[Nexus Backup] 📅 Weekly backup disimpan."
fi

# --- 3. Salin ke monthly (setiap tanggal 1) ---
if [ "${DAY_OF_MONTH}" -eq 1 ]; then
  cp "${BACKUP_DIR}/daily/${BACKUP_FILENAME}" "${BACKUP_DIR}/monthly/${BACKUP_FILENAME}"
  echo "[Nexus Backup] 🗓️  Monthly backup disimpan."
fi

# --- 4. Retention Policy ---
echo "[Nexus Backup] Membersihkan backup lama..."

# Hapus daily backup lebih dari 7 hari
find "${BACKUP_DIR}/daily" -name "*.sql.gz" -mtime +7 -delete
echo "[Nexus Backup] ✔ Daily retention: 7 hari diterapkan."

# Hapus weekly backup lebih dari 4 minggu (28 hari)
find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -mtime +28 -delete
echo "[Nexus Backup] ✔ Weekly retention: 4 minggu diterapkan."

# Hapus monthly backup lebih dari 3 bulan (90 hari)
find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -mtime +90 -delete
echo "[Nexus Backup] ✔ Monthly retention: 3 bulan diterapkan."

# --- 5. Upload ke S3 (Opsional — aktifkan jika aws-cli tersedia) ---
if command -v aws &> /dev/null && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "[Nexus Backup] ☁️  Upload ke S3: s3://${BACKUP_S3_BUCKET}/nexus-backups/"
  aws s3 cp "${BACKUP_DIR}/daily/${BACKUP_FILENAME}" \
    "s3://${BACKUP_S3_BUCKET}/nexus-backups/daily/${BACKUP_FILENAME}" \
    --storage-class STANDARD_IA
  echo "[Nexus Backup] ✅ Upload S3 selesai."
else
  echo "[Nexus Backup] ℹ️  S3 upload dilewati (BACKUP_S3_BUCKET tidak di-set atau aws-cli tidak ada)."
fi

echo "=============================================="
echo "[Nexus Backup] Selesai: $(date)"
echo "=============================================="
