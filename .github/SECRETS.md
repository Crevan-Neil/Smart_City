# GitHub Secrets Reference

This document lists all secrets required for CI/CD to work.
Add these at: **GitHub → Repository → Settings → Secrets and variables → Actions**

---

## 🔑 Azure Secrets (Required for deployment)

| Secret | Where to get it | Example |
|---|---|---|
| `AZURE_VM_HOST` | Azure Portal → VM → Public IP address | `20.123.45.67` |
| `AZURE_VM_USER` | Set during VM creation | `azureuser` |
| `AZURE_VM_SSH_KEY` | Your local `~/.ssh/id_rsa` private key | `-----BEGIN OPENSSH...` |
| `AZURE_VM_API_URL` | `http://<VM_PUBLIC_IP>` | `http://20.123.45.67` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure Portal → Static Web Apps → Manage deployment token | `abc123...` |

---

## 🔑 Application Secrets (Required for runtime)

These are used both by the GitHub Actions CI environment (for tests) and stored in `.env.prod` on the VM.

| Secret | Description |
|---|---|
| `JWT_SECRET` | Random 64-character string. Generate with: `openssl rand -base64 48` |
| `LLM_API_KEY` | Gemini API key from [aistudio.google.com](https://aistudio.google.com) |
| `MONGO_URI` | MongoDB Atlas M0 connection string: `mongodb+srv://user:pass@cluster.mongodb.net/smart_city` |
| `INFLUX_TOKEN` | Strong random string — set same value in `.env.prod` on VM |

---

## 🔑 GHCR Secret (Required for VM to pull Docker images)

| Secret | How to create |
|---|---|
| `GHCR_TOKEN` | GitHub → Settings → Developer Settings → Personal Access Tokens (Classic) → New token → tick `read:packages` |

---

## ❌ Secrets to Remove (Render/Vercel — no longer needed)

If you had these, you can delete them:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_SIMULATION`
- `RENDER_DEPLOY_HOOK_AI`
- `RENDER_DEPLOY_HOOK_BACKEND`
- `RENDER_SIMULATION_URL`
- `RENDER_AI_URL`
- `RENDER_BACKEND_URL`

---

## 📋 How to Generate the SSH Key

Run this on your **local machine** (not the VM):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/azure_vm_deploy
```

This creates:
- `~/.ssh/azure_vm_deploy` — **Private key** → paste into `AZURE_VM_SSH_KEY` secret
- `~/.ssh/azure_vm_deploy.pub` — **Public key** → paste into the VM's `~/.ssh/authorized_keys`

To add the public key to the VM:
```bash
ssh-copy-id -i ~/.ssh/azure_vm_deploy.pub azureuser@<VM_PUBLIC_IP>
```

---

## 📋 VM `.env.prod` File

On the Azure VM, create `~/smart-city/.env.prod` with these values:

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_city?retryWrites=true&w=majority
INFLUX_USER=admin
INFLUX_PASS=<strong_password>
INFLUX_ORG=smart_city_org
INFLUX_BUCKET=city_sensors
INFLUX_TOKEN=<strong_random_token>
JWT_SECRET=<64_char_random_string>
JWT_EXPIRES_IN=24h
LLM_API_KEY=<your_gemini_key>
LLM_MODEL=gemini-1.5-flash
FRONTEND_URL=https://<your-app>.azurestaticapps.net
```