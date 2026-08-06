-- 000003_add_tenant_columns.down.sql
-- Rollback: Hapus kolom tenant_id dan store_id

ALTER TABLE orders DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE orders DROP COLUMN IF EXISTS store_id;

ALTER TABLE menus DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE menus DROP COLUMN IF EXISTS store_id;

ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS store_id;
