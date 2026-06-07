# GCP VM production stack (`munshi-prod`)

Deploy path on VM: **`/home/ubuntu/munshi-dada`**

Both **backend** (4001) and **ML** (8000) run on the same VM via Docker Compose.

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Backend + ML images from Docker Hub |
| `.env.example` | Backend secrets → copy to `.env` |
| `ml.env.example` | ML secrets → copy to `ml.env` (`OPENAI_API_KEY`) |

| Service | Image | Port |
|---------|-------|------|
| backend | `shantanugarg2004/munshi_dada:latest` | 4001 |
| ml | `shantanugarg2004/munshi_dada-intent-extracter:latest` | 8000 |

Backend uses `ML_URL=http://ml:8000` inside the compose network (set in `docker-compose.yml`).

## First-time setup (from your laptop)

Prerequisites: SSH works (`ssh -i .ssh/ssh ubuntu@VM_IP "echo ok"`).

```powershell
cd Munshi_Updated
.\scripts\sync-gcp-prod-stack.ps1 -HostIp 34.14.139.96
```

Then on the VM:

```bash
cd /home/ubuntu/munshi-dada
cp .env.example .env && nano .env
cp ml.env.example ml.env && nano ml.env
docker compose pull
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:4001/health/migrations
```

## CI deploy

GitHub Actions `docker compose pull` + restart pulls **both** images.  
See [docs/p0-gcp-deploy-ssh.md](../../docs/p0-gcp-deploy-ssh.md).

## Firewall

Allow **tcp:4001** for the API (and **8000** only if you need external ML access; usually internal-only).
