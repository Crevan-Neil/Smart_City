# ─────────────────────────────────────────────
#  SIMULATION SERVICE — Dockerfile
#  Python 3.11 · FastAPI · uvicorn
# ─────────────────────────────────────────────

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Health check — hits the FastAPI /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start uvicorn (docker-compose overrides this with --reload for dev)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]