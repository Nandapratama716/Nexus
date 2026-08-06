-- 000005_tenant_not_null.up.sql
-- Step 3: Set constraint NOT NULL dan DEFAULT value setelah semua data terisi

ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN tenant_id SET DEFAULT 'default-tenant';
ALTER TABLE orders ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN store_id SET DEFAULT 'store-01';

ALTER TABLE menus ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE menus ALTER COLUMN tenant_id SET DEFAULT 'default-tenant';
ALTER TABLE menus ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE menus ALTER COLUMN store_id SET DEFAULT 'store-01';

ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET DEFAULT 'default-tenant';
ALTER TABLE users ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN store_id SET DEFAULT 'store-01';
