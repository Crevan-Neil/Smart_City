# GitHub Actions — Required Secrets

## How to add secrets
Go to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret

---

## Secrets required per workflow

### backend.yml / simulation.yml / ai-service.yml / frontend.yml
These workflows use GITHUB_TOKEN automatically — no setup needed.
GITHUB_TOKEN is provided by GitHub Actions and allows pushing to GHCR.

---

### frontend.yml (Vercel deployment)
| Secret name        | Where to get it                                      |
|--------------------|------------------------------------------------------|
| VERCEL_TOKEN       | vercel.com → Settings → Tokens → Create token        |
| VERCEL_ORG_ID      | vercel.com → Settings → General → Your ID            |
| VERCEL_PROJECT_ID  | vercel.com → Your project → Settings → General       |

---

### deploy.yml (Render deployment)
| Secret name                     | Where to get it                               |
|---------------------------------|-----------------------------------------------|
| RENDER_DEPLOY_HOOK_BACKEND      | Render → backend service → Settings → Deploy hook |
| RENDER_DEPLOY_HOOK_SIMULATION   | Render → simulation service → Settings → Deploy hook |
| RENDER_DEPLOY_HOOK_AI           | Render → ai_service → Settings → Deploy hook  |
| RENDER_BACKEND_URL              | e.g. https://smart-city-backend.onrender.com  |
| RENDER_SIMULATION_URL           | e.g. https://smart-city-sim.onrender.com      |
| RENDER_AI_URL                   | e.g. https://smart-city-ai.onrender.com       |

---

## Environment variables needed on Render (set per service)

### Backend service
```
NODE_ENV=production
PORT=3001
MONGO_URI=mongodb+srv://...
REDIS_URL=rediss://...
INFLUX_URL=https://...
INFLUX_TOKEN=...
INFLUX_ORG=smart_city_org
INFLUX_BUCKET=city_sensors
JWT_SECRET=<long-random-string>
CLIENT_ORIGIN=https://your-app.vercel.app
AI_SERVICE_URL=https://smart-city-ai.onrender.com
SIM_URL=https://smart-city-sim.onrender.com
```

### Simulation service
```
REDIS_URL=rediss://...
REDIS_CHANNEL=city:live
SIM_INTERVAL_SEC=2
SIM_MINUTES_PER_TICK=2
```

### AI service
```
MONGO_URI=mongodb+srv://...
REDIS_URL=rediss://...
LLM_API_KEY=<your-gemini-key>
LLM_MODEL=gemini-1.5-flash
LLM_PROVIDER=gemini
ALLOWED_ORIGINS=["https://your-app.vercel.app"]
```

---

## Workflow trigger summary

| Workflow       | Triggers on                           | What it does                        |
|----------------|---------------------------------------|-------------------------------------|
| backend.yml    | push/PR touching backend/ or models/  | lint → test → build → push to GHCR  |
| simulation.yml | push/PR touching simulation/          | lint → test → build → push to GHCR  |
| ai-service.yml | push/PR touching ai_service/          | lint → test → build → push to GHCR  |
| frontend.yml   | push/PR touching frontend/            | lint → build → deploy to Vercel      |
| security.yml   | every push + weekly Monday 08:00 UTC  | secret scan, npm audit, pip-audit, Trivy |
| deploy.yml     | after CI workflows complete on main   | rolling deploy to Render             |
| pr-checks.yml  | every PR open/edit/push               | commit lint, PR size, auto-label     |