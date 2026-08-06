-- 000002_enable_rls.down.sql
-- Rollback: hapus semua RLS policy dan nonaktifkan RLS

DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
DROP POLICY IF EXISTS tenant_isolation_menus ON menus;
DROP POLICY IF EXISTS tenant_isolation_users ON users;

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
