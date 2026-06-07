# GCP VM production stack (`munshi-prod`)

Deploy path on VM: **`/home/ubuntu/munshi-dada`**

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Pulls `shantanugarg2004/munshi_dada:latest` from Docker Hub |
| `.env.example` | Template — copy to `.env` on VM with real secrets |

## First-time setup (from your laptop)

Prerequisites: SSH works (`ssh -i .ssh/ssh ubuntu@VM_IP "echo ok"`).

```powershell
cd Munshi_Updated
.\scripts\sync-gcp-prod-stack.ps1 -HostIp 34.14.139.96
```

Then on the VM (browser SSH or `ssh ubuntu@...`):

```bash
cd /home/ubuntu/munshi-dada
cp .env.example .env
nano .env   # fill Supabase, Olli, MUNSHI_PUBLIC_API_HOST, etc.
docker compose pull
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:4001/health/migrations
```

## CI deploy

GitHub Actions runs `docker compose pull` + restart in this folder.  
See [docs/p0-gcp-deploy-ssh.md](../../docs/p0-gcp-deploy-ssh.md).

## Firewall

Allow **tcp:4001** (or put nginx/Caddy on 443 in front).
