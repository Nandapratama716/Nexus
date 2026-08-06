-- 000004_backfill_tenant.down.sql
-- Rollback Step 2: Kembalikan nilai default ke NULL

UPDATE orders SET tenant_id = NULL WHERE tenant_id = 'default-tenant';
UPDATE orders SET store_id = NULL WHERE store_id = 'store-01';

UPDATE menus SET tenant_id = NULL WHERE tenant_id = 'default-tenant';
UPDATE menus SET store_id = NULL WHERE store_id = 'store-01';

UPDATE users SET tenant_id = NULL WHERE tenant_id = 'default-tenant';
UPDATE users SET store_id = NULL WHERE store_id = 'store-01';
