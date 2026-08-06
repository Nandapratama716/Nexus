-- 000006_composite_indexes.up.sql
-- Membuat composite index (index gabungan) untuk optimasi query multi-tenant
--
-- MENGAPA INI DIBUTUHKAN:
-- Pada sistem multi-tenant, query tidak pernah hanya memfilter "WHERE created_at > x".
-- Query selalu memfilter gabungan: "WHERE tenant_id = 'A' AND store_id = 'B' AND created_at > x".
-- B-Tree Index per-kolom tunggal kurang optimal karena Postgres harus melakukan BitmapAnd scan.
-- Composite index gabungan langsung menunjuk ke baris spesifik dalam 1 kali lookup B-Tree.

CREATE INDEX IF NOT EXISTS idx_orders_tenant_store_created ON orders (tenant_id, store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menus_tenant_store_category ON menus (tenant_id, store_id, category);
CREATE INDEX IF NOT EXISTS idx_users_tenant_store_email ON users (tenant_id, store_id, email);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders (tenant_id, status, created_at ASC);
