-- 000007_perf_indexes.down.sql
-- Rollback: hapus semua performance index dari migration 000007

DROP INDEX IF EXISTS idx_orders_table_status;
DROP INDEX IF EXISTS idx_orders_status_created;
DROP INDEX IF EXISTS idx_menus_category_available;
DROP INDEX IF EXISTS idx_orders_tenant_table;
