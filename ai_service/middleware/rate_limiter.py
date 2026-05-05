# ─────────────────────────────────────────────
#  ai_service/middleware/rate_limiter.py
#  Per-IP rate limiting for FastAPI
#
#  Two limiters:
#    chat_limiter    — 20 requests / minute (LLM API cost protection)
#    alert_limiter   — 60 requests / minute (anomaly narration)
# ─────────────────────────────────────────────

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


@dataclass
class RateLimitBucket:
    """Token bucket for one IP address."""
    tokens: float
    last_refill: float = field(default_factory=time.time)


class RateLimiter:
    """
    In-memory token bucket rate limiter.

    Each IP gets `max_requests` tokens per `window_seconds`.
    Tokens refill continuously (not at window boundaries),
    giving a smoother limit than a fixed window counter.

    For production: swap with a Redis-backed implementation
    so limits work across multiple ai_service instances.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_tokens = max_requests
        self.refill_rate = max_requests / window_seconds  # tokens per second
        self.window_seconds = window_seconds
        self._buckets: dict[str, RateLimitBucket] = defaultdict(
            lambda: RateLimitBucket(tokens=max_requests)
        )

    def is_allowed(self, ip: str) -> tuple[bool, int]:
        """
        Check if a request from this IP is allowed.

        Returns:
            (allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        bucket = self._buckets[ip]

        # Refill tokens based on elapsed time
        elapsed = now - bucket.last_refill
        bucket.tokens = min(
            self.max_tokens,
            bucket.tokens + elapsed * self.refill_rate,
        )
        bucket.last_refill = now

        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True, 0
        else:
            # How long until the next token is available
            retry_after = int((1 - bucket.tokens) / self.refill_rate) + 1
            return False, retry_after

    def cleanup(self, older_than_seconds: int = 300) -> None:
        """Remove stale buckets to prevent memory growth."""
        now = time.time()
        stale = [
            ip for ip, bucket in self._buckets.items()
            if now - bucket.last_refill > older_than_seconds
        ]
        for ip in stale:
            del self._buckets[ip]


# ── Limiter instances ─────────────────────────

# 20 chat requests per minute — protects LLM API costs
chat_limiter = RateLimiter(max_requests=20, window_seconds=60)

# 60 alert narrations per minute — backend-to-service calls
alert_limiter = RateLimiter(max_requests=60, window_seconds=60)

# 30 command parses per minute
command_limiter = RateLimiter(max_requests=30, window_seconds=60)


# ── FastAPI middleware ─────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies rate limits based on request path.
    Add to the FastAPI app via app.add_middleware().
    """

    # Map path prefix → limiter
    ROUTE_LIMITERS = {
        "/chat":    chat_limiter,
        "/alert":   alert_limiter,
        "/command": command_limiter,
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Health check is never rate-limited
        if request.url.path == "/health":
            return await call_next(request)

        # Determine client IP
        ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
            or "unknown"
        )

        # Find the appropriate limiter
        limiter = None
        for prefix, lim in self.ROUTE_LIMITERS.items():
            if request.url.path.startswith(prefix):
                limiter = lim
                break

        if limiter:
            allowed, retry_after = limiter.is_allowed(ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": "Rate limit exceeded. Please slow down.",
                        "retryAfterSeconds": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

        return await call_next(request)


def cleanup_all_limiters():
    """Trigger cleanup on all active limiters."""
    chat_limiter.cleanup()
    alert_limiter.cleanup()
    command_limiter.cleanup()