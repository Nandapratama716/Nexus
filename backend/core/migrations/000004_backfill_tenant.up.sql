-- 000004_backfill_tenant.up.sql
-- Step 2: Backfill data lama yang bernilai NULL dengan tenant_id & store_id default

UPDATE orders SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE orders SET store_id = 'store-01' WHERE store_id IS NULL OR store_id = '';

UPDATE menus SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE menus SET store_id = 'store-01' WHERE store_id IS NULL OR store_id = '';

UPDATE users SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL OR tenant_id = '';
UPDATE users SET store_id = 'store-01' WHERE store_id IS NULL OR store_id = '';
