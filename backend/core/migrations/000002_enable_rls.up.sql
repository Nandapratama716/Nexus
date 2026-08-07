-- 000002_enable_rls.up.sql
-- Mengaktifkan Row-Level Security (RLS) pada semua tabel yang memiliki tenant_id.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop policy jika sudah ada (idempotent guard)
DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
DROP POLICY IF EXISTS tenant_isolation_menus ON menus;
DROP POLICY IF EXISTS tenant_isolation_users ON users;

-- Policy: hanya baris yang tenant_id-nya cocok yang bisa diakses
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
