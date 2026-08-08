-- 000007_perf_indexes.up.sql
-- Roadmap 2.5: Database Performance & Indexing
--
-- Index tambahan untuk query path yang paling sering digunakan:
--   1. KDS & MyOrdersScreen: filter by table_number + status
--   2. MenuScreen: filter by category + is_available
--   3. Dashboard analytics: order status + created_at range
--
-- MENGAPA DIBUTUHKAN:
--   - query GET /orders/active memfilter WHERE table_number = ? AND status != 'done'
--     Tanpa index, Postgres melakukan seq scan semua baris orders.
--   - query GET /menus memfilter WHERE category = ? AND is_available = true
--     Index partial (WHERE is_available = true) mengurangi ukuran index ~50%.
--   - Dashboard query GROUP BY status ORDER BY created_at sudah terdukung
--     lewat idx_orders_tenant_status (migration 000006), tapi belum ada
--     index untuk filter non-tenant (dev mode tanpa multi-tenant aktif).

-- 1. KDS & MyOrders: lookup cepat per meja + status
CREATE INDEX IF NOT EXISTS idx_orders_table_status
    ON orders (table_number, status);

-- 2. MyOrders + KDS: range query status DESC created_at
CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON orders (status, created_at ASC);

-- 3. MenuScreen: filter menu by category + is_available (partial index)
--    PARTIAL INDEX: hanya index baris is_available = true (~50% rows)
--    → ukuran index lebih kecil, lookup lebih cepat untuk menu yang aktif
CREATE INDEX IF NOT EXISTS idx_menus_category_available
    ON menus (category, is_available)
    WHERE is_available = true;

-- 4. Order lookup by tenant + table (multi-tenant KDS)
CREATE INDEX IF NOT EXISTS idx_orders_tenant_table
    ON orders (tenant_id, table_number, status);
