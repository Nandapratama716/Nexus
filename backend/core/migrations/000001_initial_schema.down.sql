-- 000001_initial_schema.down.sql
-- Rollback: hapus seluruh tabel (hati-hati, ini menghapus semua data)

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS users;
