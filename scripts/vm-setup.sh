#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  scripts/vm-setup.sh
#  One-time bootstrap for a fresh Azure Ubuntu VM.
#
#  Run ONCE after creating the VM:
#    chmod +x scripts/vm-setup.sh
#    ./scripts/vm-setup.sh
#
#  Assumes: Ubuntu 24.04 LTS, user = azureuser
# ─────────────────────────────────────────────

set -euo pipefail

REPO_OWNER="Crevan-Neil"
REPO_NAME="Smart_City"

echo "════════════════════════════════════════"
echo "  Smart City VM Bootstrap"
echo "════════════════════════════════════════"

# ── 1. System packages ─────────────────────
echo "[1/7] Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git ufw

# ── 2. Install Docker (official script) ────
echo "[2/7] Installing Docker Engine..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "  ✓ Docker installed. You may need to log out and back in."
else
    echo "  ✓ Docker already installed: $(docker --version)"
fi

# ── 3. Install Docker Compose plugin ───────
echo "[3/7] Verifying Docker Compose plugin..."
docker compose version

# ── 4. UFW Firewall ────────────────────────
echo "[4/7] Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Nginx → API)
sudo ufw allow 443/tcp   # HTTPS (future)
# Internal ports (NOT exposed to internet):
#   3001 backend, 8000 simulation, 8001 ai, 6379 redis
#   8086 influx, 9090 prometheus — all stay behind nginx
sudo ufw --force enable
echo "  ✓ UFW enabled (ports 22, 80, 443 open)"

# ── 5. Clone repo ──────────────────────────
echo "[5/7] Cloning repository..."
if [ ! -d "$HOME/$REPO_NAME" ]; then
    git clone "https://github.com/$REPO_OWNER/$REPO_NAME.git" "$HOME/$REPO_NAME"
    echo "  ✓ Repo cloned to $HOME/$REPO_NAME"
else
    echo "  ✓ Repo already exists — skipping clone"
fi
cd "$HOME/$REPO_NAME"

# ── 6. GHCR login ──────────────────────────
echo "[6/7] Logging in to GitHub Container Registry..."
echo "  → You'll need your GitHub PAT (GHCR_TOKEN secret)"
echo "  → Run this manually:"
echo "      echo \$GHCR_TOKEN | docker login ghcr.io -u $REPO_OWNER --password-stdin"

# ── 7. Create .env.prod template ───────────
echo "[7/7] Creating .env.prod template..."
if [ ! -f ".env.prod" ]; then
    cat > .env.prod << 'EOF'
# ─────────────────────────────────────────────
#  .env.prod — Production environment variables
#  Fill in ALL values before running docker compose
# ─────────────────────────────────────────────

# MongoDB Atlas M0 connection string
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart_city?retryWrites=true&w=majority

# InfluxDB (running in Docker)
INFLUX_USER=admin
INFLUX_PASS=changeme_strong_password
INFLUX_ORG=smart_city_org
INFLUX_BUCKET=city_sensors
INFLUX_TOKEN=changeme_strong_token_here

# JWT
JWT_SECRET=changeme_64char_random_secret_here
JWT_EXPIRES_IN=24h

# AI / LLM
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-1.5-flash

# Frontend URL (your Azure Static Web Apps URL)
FRONTEND_URL=https://your-app.azurestaticapps.net
EOF
    echo "  ✓ .env.prod created — FILL IN ALL VALUES before starting services!"
else
    echo "  ✓ .env.prod already exists — skipping"
fi

# ── Done ───────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "  1. Fill in .env.prod with your real secrets"
echo "  2. Log into GHCR:"
echo "       echo \$GHCR_TOKEN | docker login ghcr.io -u $REPO_OWNER --password-stdin"
echo "  3. Pull and start services:"
echo "       docker compose --env-file .env.prod -f docker-compose.prod.yml pull"
echo "       docker compose --env-file .env.prod -f docker-compose.prod.yml up -d"
echo "  4. Check service health:"
echo "       docker compose -f docker-compose.prod.yml ps"
echo "════════════════════════════════════════"
