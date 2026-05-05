# ─────────────────────────────────────────────
#  ai_service/main.py — FastAPI entry point
#  Gen AI microservice:
#    POST /chat   → streaming SSE chat
#    POST /alert  → anomaly narration
#    POST /command → NL → sim job params
# ─────────────────────────────────────────────

import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, close_db
from routes.chat import router as chat_router
from routes.alert import router as alert_router
from routes.command import router as command_router
from middleware.rate_limiter import RateLimitMiddleware, cleanup_all_limiters


# ── Lifespan: startup + shutdown ──────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ai_service] starting up...")
    await init_db()
    
    # Start periodic background cleanup for rate limiters
    async def cleanup_loop():
        while True:
            await asyncio.sleep(300) # every 5 minutes
            cleanup_all_limiters()
            print("[ai_service] rate limiter cache cleaned")

    cleanup_task = asyncio.create_task(cleanup_loop())
    
    print("[ai_service] ready")
    yield
    print("[ai_service] shutting down...")
    cleanup_task.cancel()
    await close_db()


# ── App ───────────────────────────────────────
app = FastAPI(
    title="Smart City AI Service",
    description="LLM gateway + RAG for the campus digital twin",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware (order: Rate Limit -> CORS) ──
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────
app.include_router(chat_router,    prefix="/chat",    tags=["chat"])
app.include_router(alert_router,   prefix="/alert",   tags=["alert"])
app.include_router(command_router, prefix="/command",  tags=["command"])


# ── Health check ──────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": settings.LLM_MODEL,
        "service": "ai_service",
    }