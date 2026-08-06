-- 000006_composite_indexes.down.sql
-- Rollback: Hapus composite indexes

DROP INDEX IF EXISTS idx_orders_tenant_store_created;
DROP INDEX IF EXISTS idx_menus_tenant_store_category;
DROP INDEX IF EXISTS idx_users_tenant_store_email;
DROP INDEX IF EXISTS idx_orders_tenant_status;
