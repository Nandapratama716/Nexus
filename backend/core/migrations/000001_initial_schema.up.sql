-- 000001_initial_schema.up.sql
-- Skema awal Nexus POS: tabel users, menus, orders
-- Mencerminkan state MVP yang sudah berjalan di production

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255),
    store_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255),
    store_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'drink',
    tags TEXT DEFAULT '[]',
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    stock_qty INTEGER DEFAULT 25,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255),
    store_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    table_number VARCHAR(50),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    service_charge NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    qris_url TEXT,
    cash_paid NUMERIC(12,2) DEFAULT 0,
    cash_change NUMERIC(12,2) DEFAULT 0,
    order_type VARCHAR(50) DEFAULT 'dine_in',
    promo_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
