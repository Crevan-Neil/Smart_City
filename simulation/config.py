# ─────────────────────────────────────────────
#  simulation/config.py — settings
# ─────────────────────────────────────────────

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Redis ─────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_CHANNEL: str = "city:live"

    # ── Simulation ────────────────────────────
    # How often (seconds) the sim emits new sensor values
    SIM_INTERVAL_SEC: float = 2.0

    # Simulated "clock speed" — each tick advances by this many minutes
    # Default: 1 tick = 2 real seconds = 2 sim minutes → full day in 24 mins
    SIM_MINUTES_PER_TICK: float = 2.0

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()