# ─────────────────────────────────────────────
#  simulation/middleware/rate_limiter.py
#  Rate limiting for the simulation service
#
#  The /trigger endpoint is the most critical —
#  a spam attack here floods Redis and the
#  BullMQ job queue, degrading all services.
# ─────────────────────────────────────────────

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


@dataclass
class Bucket:
    tokens: float
    last_refill: float = field(default_factory=time.time)


class SimRateLimiter:
    """
    Token bucket limiter for simulation endpoints.
    More aggressive than the AI limiter —
    simulation jobs are expensive to process.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_tokens = max_requests
        self.refill_rate = max_requests / window_seconds
        self._buckets: dict[str, Bucket] = defaultdict(
            lambda: Bucket(tokens=max_requests)
        )

    def is_allowed(self, ip: str) -> tuple[bool, int]:
        now = time.time()
        b = self._buckets[ip]
        elapsed = now - b.last_refill
        b.tokens = min(self.max_tokens, b.tokens + elapsed * self.refill_rate)
        b.last_refill = now

        if b.tokens >= 1:
            b.tokens -= 1
            return True, 0

        retry_after = int((1 - b.tokens) / self.refill_rate) + 1
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

# 10 trigger events per minute per IP
# Prevents queue flooding
trigger_limiter = SimRateLimiter(max_requests=10, window_seconds=60)

# 60 status checks per minute — these are cheap reads
status_limiter = SimRateLimiter(max_requests=60, window_seconds=60)


class SimRateLimitMiddleware(BaseHTTPMiddleware):
    """Applies rate limits to simulation endpoints."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in ("/health", "/status"):
            return await call_next(request)

        ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
            or "unknown"
        )

        if request.url.path == "/trigger":
            allowed, retry_after = trigger_limiter.is_allowed(ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": (
                            "Too many simulation events. "
                            f"You can trigger up to 10 events per minute."
                        ),
                        "retryAfterSeconds": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

        return await call_next(request)


def cleanup_all():
    """Trigger cleanup on all simulation limiters."""
    trigger_limiter.cleanup()
    status_limiter.cleanup()