# ─────────────────────────────────────────────
#  ai_service/config.py
#  Centralised settings via pydantic-settings
# ─────────────────────────────────────────────

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── LLM ──────────────────────────────────
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-3-flash-preview"

    # Provider: "gemini" | "openai"
    LLM_PROVIDER: str = "gemini"

    # Max tokens in LLM response
    LLM_MAX_TOKENS: int = 1024

    # Temperature — lower = more factual, higher = more creative
    LLM_TEMPERATURE: float = 0.3

    # Auth
    JWT_SECRET: str = ""

    # ── MongoDB ───────────────────────────────
    MONGO_URI: str = "mongodb://localhost:27017/smart_city"
    MONGO_DB_NAME: str = "smart_city"

    # ── Redis ─────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Backend ───────────────────────────────
    BACKEND_URL: str = "http://localhost:3001"

    # ── CORS ──────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()