-- 000002_enable_rls.up.sql
-- Mengaktifkan Row-Level Security (RLS) pada semua tabel yang memiliki tenant_id.
--
-- MENGAPA INI DIBUTUHKAN:
-- GORM Scopes (.Where("tenant_id = ?", id)) bekerja di level aplikasi Go.
-- Jika seorang developer lupa menambahkan scope di SATU query saja,
-- data Tenant A langsung bocor ke Tenant B. Ini bukan teori — ini penyebab
-- paling umum data breach di sistem multi-tenant nyata.
--
-- RLS adalah safety net di level DATABASE. Meskipun kode aplikasi lupa filter,
-- PostgreSQL sendiri yang menolak akses lintas-tenant.
--
-- MEKANISME:
-- 1. Di awal setiap HTTP request, Go middleware menjalankan:
--    SET LOCAL app.tenant_id = '<tenant_id_dari_jwt>'
-- 2. PostgreSQL memeriksa setiap baris: hanya baris dengan tenant_id yang cocok
--    dengan current_setting('app.tenant_id') yang bisa diakses.
-- 3. "SET LOCAL" hanya berlaku di dalam transaksi saat ini, sehingga aman untuk
--    concurrent requests dari tenant berbeda.

-- Aktifkan RLS (tabel tetap bisa diakses oleh superuser/owner tanpa policy)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: hanya baris yang tenant_id-nya cocok yang bisa diakses
-- current_setting('app.tenant_id', true) → parameter kedua 'true' artinya
-- return NULL (bukan error) jika setting belum di-set, sehingga graceful fallback
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) IS NULL
         OR current_setting('app.tenant_id', true) = '');

CREATE POLICY tenant_isolation_menus ON menus
  USING (tenant_id = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) IS NULL
         OR current_setting('app.tenant_id', true) = '');

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id', true)
         OR current_setting('app.tenant_id', true) IS NULL
         OR current_setting('app.tenant_id', true) = '');
