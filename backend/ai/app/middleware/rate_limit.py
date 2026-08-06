import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class AIRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate Limiter Middleware untuk AI Microservice.
    Membatasi request ke endpoint LLM (/chat) hingga 10 request/menit per IP.
    Mencegah penyalahgunaan komputasi GPU/LLM dan pembengkakan biaya API.
    """
    def __init__(self, app, max_requests: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Hanya batasi endpoint /chat atau /api/v1/chat
        if request.url.path.endswith("/chat"):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()

            # Bersihkan timestamp di luar jendela waktu (window_seconds)
            timestamps = [t for t in self.requests[client_ip] if now - t < self.window_seconds]
            self.requests[client_ip] = timestamps

            if len(timestamps) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Batas penggunaan AI ({self.max_requests} request/menit) terlampaui. Silakan tunggu beberapa saat."
                    },
                    headers={"Retry-After": str(self.window_seconds)}
                )

            self.requests[client_ip].append(now)

        response = await call_next(request)
        return response
