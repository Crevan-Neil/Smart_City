# ─────────────────────────────────────────────
#  AI SERVICE — Dockerfile
#  Python 3.11 · FastAPI · LangChain · SSE
# ─────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# System deps — gcc needed for some LangChain native builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]