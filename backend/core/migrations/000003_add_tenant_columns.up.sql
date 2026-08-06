-- 000003_add_tenant_columns.up.sql
-- Step 1: Tambahkan kolom tenant_id dan store_id sebagai NULLABLE (agar data lama tidak crash)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id VARCHAR(255);

ALTER TABLE menus ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS store_id VARCHAR(255);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id VARCHAR(255);
