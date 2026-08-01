import os

# Ollama / LLM
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral")

# ChromaDB
CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8001"))
CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "nexus_menus")

# Redis
REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
REDIS_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}"

# Go Core Service
CORE_SERVICE_URL: str = os.getenv("CORE_SERVICE_URL", "http://localhost:8080")

# Security & CORS
JWT_SECRET: str = os.getenv("JWT_SECRET", "default-dev-secret-change-in-production")
ALLOWED_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]
