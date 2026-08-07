# Nexus POS — PostgreSQL Backup & Retention Strategy

> Phase 4.1 — Operational Documentation

---

## Arsitektur Backup

```
nexus-postgres (port 5432)
       │
       ▼
nexus-pg-backup (prodrigestivill/postgres-backup-local:16)
       │  SCHEDULE: @daily (jam 02:00 UTC / 09:00 WIB)
       │  POSTGRES_EXTRA_OPTS: -Z9 (gzip level 9)
       ▼
 Docker Volume: nexus_backups
   ├── daily/    ← 7 backup terakhir
   ├── weekly/   ← 4 backup terakhir
   └── monthly/  ← 3 backup terakhir
```

---

## Retention Policy

| Kategori | Frekuensi | Disimpan | Jadwal Hapus |
|---|---|---|---|
| **Daily** | Setiap hari 02:00 UTC | 7 hari terakhir | Lebih dari 7 hari |
| **Weekly** | Setiap Minggu | 4 minggu terakhir | Lebih dari 28 hari |
| **Monthly** | Setiap tanggal 1 | 3 bulan terakhir | Lebih dari 90 hari |

**Estimasi ukuran per backup** (kompresi gzip-9): ~5–50 MB tergantung jumlah data transaksi.

---

## File yang Dibuat

| File | Deskripsi |
|---|---|
| [`docker-compose.yml`](../docker-compose.yml) | Container `nexus-pg-backup` otomatis |
| [`scripts/backup_postgres.sh`](backup_postgres.sh) | Manual backup lokal + upload S3 opsional |
| [`scripts/restore_postgres.sh`](restore_postgres.sh) | Restore dari file `.sql.gz` dengan konfirmasi |

---

## Cara Jalankan Backup Manual (Windows)

### Menggunakan Docker (Direkomendasikan)

```powershell
# Trigger backup segera tanpa menunggu jadwal
docker exec nexus-pg-backup sh -c 'POSTGRES_HOST=$POSTGRES_HOST POSTGRES_DB=$POSTGRES_DB /backup.sh'
```

### Lihat Daftar Backup yang Tersimpan

```powershell
# List semua file backup
docker exec nexus-pg-backup ls -lah /backups/daily/
docker exec nexus-pg-backup ls -lah /backups/weekly/
docker exec nexus-pg-backup ls -lah /backups/monthly/
```

### Salin File Backup ke Host (Windows)

```powershell
# Copy file backup terbaru dari container ke folder lokal
docker cp nexus-pg-backup:/backups/daily/ C:\Users\nanda\Nexus\backups\
```

---

## Prosedur Restore

> [!CAUTION]
> Restore akan **menimpa seluruh data** database yang berjalan. Pastikan sudah backup terbaru sebelum restore.

### Via Script

```bash
# Linux/WSL/macOS
chmod +x scripts/restore_postgres.sh
./scripts/restore_postgres.sh backups/daily/nexus_nexus_20260801_020000.sql.gz
```

### Via Docker Manual

```bash
# 1. Decompress + pipe langsung ke psql
docker exec -i nexus-postgres sh -c \
  "PGPASSWORD=\$POSTGRES_PASSWORD psql -U \$POSTGRES_USER -d \$POSTGRES_DB" \
  < <(gunzip -c backups/daily/nexus_nexus_20260801_020000.sql.gz)
```

---

## Upload ke S3 (Opsional)

Tambahkan variabel berikut ke `.env`:

```env
BACKUP_S3_BUCKET=nama-bucket-kamu
```

Script `backup_postgres.sh` akan otomatis mendeteksi `aws-cli` dan meng-upload ke:
```
s3://nama-bucket-kamu/nexus-backups/daily/
```

---

## Monitoring Backup

```powershell
# Cek status container backup
docker ps | findstr pg-backup

# Cek log backup terakhir
docker logs nexus-pg-backup --tail 50

# Verifikasi file backup terbaru
docker exec nexus-pg-backup ls -lt /backups/daily/ | head -5
```

---

## Penting: pg_dump vs PgBouncer

> [!WARNING]
> `pg_dump` **tidak kompatibel** dengan PgBouncer dalam mode `transaction`. Backup container selalu koneksi langsung ke port `5432` (postgres), bukan `6432` (pgbouncer).
> Ini sudah dikonfigurasi di docker-compose: `POSTGRES_HOST: postgres`, `POSTGRES_PORT: 5432`.
