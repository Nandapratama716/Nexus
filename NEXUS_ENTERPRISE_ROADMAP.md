
# Nexus POS: Enterprise & Production-Grade Enhancement Roadmap

> **Target**: Transforming Nexus POS into a High-Availability, Bank-Grade Secure, Multi-Tenant SaaS Platform for Enterprise Restaurant Chains.
> **AI Context Notice**: This document serves as the authoritative architectural blueprint for Nexus POS. All future subagents, AI coders, and developers must reference these specifications during feature expansion.

---

## 1. System Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  +-----------------------+   +------------------------+   +--------------------+  |
|  |  React Native Mobile  |   |  Next.js 16 Dashboard  |   |   Kitchen Display  |  |
|  | (Self-Service QR App) |   |    (Admin & POS)       |   |    System (KDS)    |  |
|  +-----------+-----------+   +-----------+------------+   +---------+----------+  |
+--------------|---------------------------|--------------------------|-------------+
               |                           |                          |
               +-------------------+-------+                          |
                                   |                                  |
+----------------------------------v----------------------------------v-------------+
|                            BACKEND CORE MICROSERVICES                            |
|  +-----------------------------------------------------------------------------+  |
|  | Go Fiber Core Engine (Clean Architecture, REST API, WebSocket Gateway)     |  |
|  +-----------------------------------+-----------------------------------------+  |
|                                      |                                            |
|  +-----------------------------------v-----------------------------------------+  |
|  | Python AI Service (LangChain, Ollama LLM, ChromaDB RAG Vector Store)        |  |
|  +-----------------------------------------------------------------------------+  |
+--------------------------------------|--------------------------------------------+
                                       |
+--------------------------------------v--------------------------------------------+
|                          DATA, CACHE & STORAGE LAYER                              |
|  +----------------+  +-----------------+  +-------------------+  +----------------+  |
|  | PostgreSQL DB  |  | Redis Cache/Pub |  | Supabase Storage  |  | ChromaDB RAG   |  |
|  | (GORM Domain)  |  | (WebSocket Hub) |  | (Menu CDN Assets) |  | (Vector Store) |  |
|  +----------------+  +-----------------+  +-------------------+  +----------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Production-Grade Infrastructure Enhancements

### 2.1 Supabase Object Storage Upgrade (Production Cloud Assets)

- **Current State**: Local file storage (`frontend/public/uploads/`) for zero-config offline development.
- **Production Standard**:
  - Implement a **Configurable Storage Adapter Pattern** (`StorageProvider` abstraction):
    - `STORAGE_PROVIDER=local` (Dev: writes to local filesystem).
    - `STORAGE_PROVIDER=supabase` (Production: uploads directly to Supabase Storage Bucket `nexus-menu-images`).
  - **Supabase Bucket Configuration**:
    - Bucket Name: `nexus-menu-images` (Public Read Policy enabled).
    - Client SDK: `@supabase/supabase-js` with environment credentials (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
    - Automated CDN caching headers (`Cache-Control: public, max-age=31536000, immutable`).
    - Automatic image compression and WebP formatting prior to upload.

### 2.2 Midtrans Gateway & HMAC SHA512 Webhook Security

- **Current State**: Mock Midtrans client for local development.
- **Production Standard**:
  - Integrate official Midtrans Snap SDK for QRIS, GoPay, ShopeePay, and Credit Cards.
  - Enforce mandatory HMAC SHA512 signature verification in `payment_handler.go`:
    $$
    \text{Signature} = \text{SHA512}(\text{order\_id} + \text{status\_code} + \text{gross\_amount} + \text{ServerKey})
    $$
  - Store payment transactions with idempotency keys to prevent double-charging on network retries.

### 2.3 Redis Distributed WebSocket Gateway

- **Current State**: In-memory WebSocket hub (`hub.go`).
- **Production Standard**:
  - Migrate `ws/hub.go` to **Redis Pub/Sub Adapter**.
  - Allows horizontal scaling of Go backend nodes across Kubernetes pods while maintaining sub-millisecond WebSocket broadcast sync to all KDS screens.

### 2.4 Thermal Printer Integration

- **Current State**: Browser print API & thermal receipt preview modal.
- **Production Standard**:
  - Implement native Bluetooth / USB Thermal Printer Driver Module (`react-native-thermal-receipt-printer`) for Android/iOS POS terminals.
  - Support ESC/POS raw command streams for 58mm and 80mm high-speed receipt printing.

### 2.5 Database Performance & Indexing

- **Production Standard**:
  - Create compound indexes in PostgreSQL for frequent query paths:
    ```sql
    CREATE INDEX idx_orders_status_created ON orders (status, created_at ASC);
    CREATE INDEX idx_orders_table_status ON orders (table_number, status);
    CREATE INDEX idx_menus_category_available ON menus (category, is_available);
    ```
  - Enforce PostgreSQL Connection Pooling (`SetMaxOpenConns(50)`, `SetMaxIdleConns(10)`, `SetConnMaxLifetime(30 * time.Minute)`).

---

## 3. UI/UX Excellence & Human-Centered Design

### 3.1 Mobile App (Customer Experience)

- **Skeleton Shimmer Loading**: Replace raw spinners with animated skeleton placeholders matching menu card layouts.
- **Dynamic Sticky Bottom Cart Bar**: Display a floating cart summary bar (`🛒 2 Items | Rp 45.000` -> `Checkout ➡️`) fixed at bottom of `MenuScreen.tsx` when cart is non-empty.
- **Lottie Status Animations**: Embed smooth Lottie vector animations for kitchen cooking (`🔥`) and order pickup ready (`🔔`).
- **Quick Dietary & Flavor Filter Chips**: Horizontal filter pills for `#Pedas`, `#Populer`, `#Vegetarian`, `#RekomendasiChef`.

### 3.2 Web Dashboard & KDS (Staff & Management)

- **Interactive Floor Plan Grid**: Visual grid map of restaurant tables showing realtime states:
  - 🟢 **Available (Kosong)**: Table unassigned.
  - 🔴 **Occupied (Terisi)**: Active dining session.
  - 🟡 **Needs Cleaning (Perlu Dibersihkan)**: Customer departed, awaiting waiter cleanup.
- **KDS High-Contrast Dark Mode**: Toggle for dark kitchen environments to reduce eye strain.
- **Chime Audio Alerts**: Crisp Web Audio API chime (*Ding-Dong*) triggered when new orders land on KDS or payment completes.

---

## 4. Enterprise-Grade Security & Multi-Tenancy

### 4.1 Multi-Tenant SaaS Architecture

- **Tenant & Branch Isolation**: Add `tenant_id` (UUID) and `branch_id` (UUID) across all domain models:
  ```go
  type Order struct {
      TenantID string `gorm:"type:uuid;not null;index"`
      BranchID string `gorm:"type:uuid;not null;index"`
      // ...
  }
  ```
- Enforce tenant boundary checks at the repository layer using GORM scopes.

### 4.2 Security & Compliance Controls

- **Rate Limiting**: Enforce IP & User-based rate limiting via Go Fiber limiter middleware (100 req/min per IP).
- **Audit Logging**: Maintain immutable `audit_logs` table for tracking managerial actions:
  ```sql
  CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      payload JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Secrets Management**: Inject API keys and DB credentials via AWS Secrets Manager or HashiCorp Vault.

---

## 5. Observability & Automated QA

### 5.1 Telemetry & Monitoring

- **Structured JSON Logging**: Use `uber-go/zap` for high-performance structured logging forwarded to Grafana Loki / ELK Stack.
- **Distributed Tracing**: OpenTelemetry instrumentation tracking request lifecycle across Go Core, Python AI, and PostgreSQL.
- **Kubernetes Health Probes**:
  - `/healthz/liveness`: Checks if service process is running.
  - `/healthz/readiness`: Verifies active DB connection and Redis ping.

### 5.2 CI/CD & Testing

- **E2E Automation**: Playwright test suites covering full order lifecycle (QR Scan -> Mobile Checkout -> KDS Dispatch -> Cashier Settlement -> Report Aggregation).
- **Zero-Downtime Deployment**: GitHub Actions workflow supporting Blue-Green deployment to AWS ECS / EKS.

---

## 6. Implementation Checklist for AI Agents

- [ ] **Context Ingestion**: Read this file before implementing multi-branch or enterprise features.
- [ ] **Storage Adapter**: Use `STORAGE_PROVIDER=supabase` for production uploads to bucket `nexus-menu-images`.
- [ ] **Schema Integrity**: Ensure all database edits retain backward compatibility and preserve audit trails.
- [ ] **Realtime Guarantees**: Verify WebSocket fallback handlers for disconnected clients.
- [ ] **UI Aesthetics**: Maintain rich visual standards (no default browser styling, harmonious color palettes, responsive layouts).
