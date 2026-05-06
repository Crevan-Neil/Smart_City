# ─────────────────────────────────────────────
#  simulation/main.py — FastAPI entry point
#  Simulation microservice:
#    GET  /health    → liveness check
#    GET  /metrics   → Prometheus scrape endpoint
#    POST /trigger   → inject a sim event
#    POST /start     → start the sim loop
#    POST /stop      → stop the sim loop
#    GET  /status    → current sim state
# ─────────────────────────────────────────────

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Gauge

from config import settings
from publisher.redis_pub import init_redis, close_redis
from generator.sim_loop import SimLoop
from middleware.rate_limiter import SimRateLimitMiddleware, cleanup_all

# ── Custom Prometheus metrics ─────────────────

# Counter — total number of simulation ticks published to Redis
simulation_ticks_total = Counter(
    "simulation_ticks_total",
    "Total number of simulation ticks generated and published to Redis",
)

# Gauge — 1 if the sim loop is running, 0 if stopped
simulation_loop_running = Gauge(
    "simulation_loop_running",
    "Whether the simulation tick loop is currently running (1=yes, 0=no)",
)

# ── Global sim loop instance ──────────────────
sim_loop: SimLoop | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sim_loop

    print("[simulation] starting up...")
    await init_redis()

    # Boot the sim loop immediately on startup
    sim_loop = SimLoop()
    asyncio.create_task(sim_loop.run())
    simulation_loop_running.set(1)
    print("[simulation] sim loop started")

    # Start periodic background cleanup for rate limiters
    async def cleanup_loop():
        while True:
            await asyncio.sleep(300) # every 5 minutes
            cleanup_all()
            print("[simulation] rate limiter cache cleaned")

    cleanup_task = asyncio.create_task(cleanup_loop())

    yield

    print("[simulation] shutting down...")
    cleanup_task.cancel()
    if sim_loop:
        await sim_loop.stop()
    simulation_loop_running.set(0)
    await close_redis()


app = FastAPI(
    title="Smart City Simulation Service",
    description="Generates and publishes sensor data for the campus digital twin",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Prometheus auto-instrumentation ──────────
# Exposes /metrics with HTTP request count, duration histograms, etc.
Instrumentator().instrument(app).expose(app)

# ── Middleware (order: Rate Limit -> CORS) ──
app.add_middleware(SimRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Import routers after app is created ───────
from routes.trigger import router as trigger_router
app.include_router(trigger_router, tags=["simulation"])


# ── Health ────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "running": sim_loop.running if sim_loop else False,
        "interval": settings.SIM_INTERVAL_SEC,
        "service": "simulation",
    }


# ── Status ────────────────────────────────────
@app.get("/status")
async def status():
    if not sim_loop:
        return {"running": False, "tick": 0, "active_events": []}
    return sim_loop.get_status()


# ── Start / Stop ──────────────────────────────
@app.post("/start")
async def start():
    global sim_loop
    if sim_loop and sim_loop.running:
        return {"success": False, "message": "Sim loop already running"}
    sim_loop = SimLoop()
    asyncio.create_task(sim_loop.run())
    simulation_loop_running.set(1)
    return {"success": True, "message": "Sim loop started"}


@app.post("/stop")
async def stop():
    if not sim_loop or not sim_loop.running:
        return {"success": False, "message": "Sim loop not running"}
    await sim_loop.stop()
    simulation_loop_running.set(0)
    return {"success": True, "message": "Sim loop stopped"}