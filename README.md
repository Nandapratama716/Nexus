# Nexus - Smart POS & AI Order Assistant

Sistem Point of Sale (POS) modern dengan chatbot asisten pemesanan berbasis RAG. Memiliki fitur manajemen pesanan, dashboard admin realtime, dan integrasi QRIS. Dibangun menggunakan arsitektur microservices enterprise.

## Arsitektur Sistem (Polyglot Microservices)

Proyek memisahkan beban kerja untuk performa dan skalabilitas maksimal:

- **Core Service (Golang):** Menangani beban tinggi transaksi, CRUD menu, In-Memory WebSockets untuk KDS, dan Webhook payment (idempotent).
- **AI Service (Python/FastAPI):** Khusus melayani RAG pipeline (LangChain + ChromaDB) dan streaming respons LLM via SSE.
- **Sinkronisasi Data:** Menggunakan **Redis Streams** untuk replikasi data menu (durability & replayable) dari Core ke AI service.

## Tech Stack Utama

- **Frontend:** React Native (Customer App), Next.js 14 (Admin Dashboard & KDS).
- **Backend:** Golang (Fiber), Python (FastAPI).
- **Database/Infra:** PostgreSQL, Redis, ChromaDB, Docker.
- **AI/ML:** LangChain, OpenAI API / Ollama.
- **Payment:** Midtrans Sandbox (QRIS).

## Fitur Teknis Kunci

- **Cross-Service Auth:** JWT Symmetric Key (HS256) antar container.
- **Realtime KDS:** In-Memory WebSocket Hub (upgrade path: Redis Pub/Sub).
- **Payment Webhook:** Verifikasi signature & penanganan state asinkron Midtrans.
- **CI/CD:** Table-driven tests (Go), Pytest (Python), GitHub Actions pipeline.
