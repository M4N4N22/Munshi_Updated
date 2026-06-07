# P0 — GCP VM deploy SSH (GitHub Actions)

Production: **GCP Compute Engine** `munshi-prod` (`asia-south1-b`), user **`ubuntu`**, path **`/home/ubuntu/munshi-dada`**.

CI: [.github/workflows/cicd.yml](../.github/workflows/cicd.yml)  
Manual redeploy only: [.github/workflows/deploy-gcp-vm.yml](../.github/workflows/deploy-gcp-vm.yml)

---

## Fix `unable to authenticate` (do both steps)

### Step A — Add public key on the VM (required)

**Option 1 — GCP Console (easiest)**

1. [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances) → **munshi-prod** → **Edit**
2. Scroll to **SSH Keys** → **Add item**
3. Paste this **entire line**:

   ```text
   ubuntu:ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMc96iDIAZMHxKkYtPvhQxyKCqtdgcFb1zxQDr7VGmFG github-actions-gcp
   ```

4. Save

Also in repo: [deploy/github-actions-gcp.pub](../deploy/github-actions-gcp.pub)

**Option 2 — Browser SSH on the VM**

```bash
curl -sSL https://raw.githubusercontent.com/ShantanuGarg2004/Munshi_Updated/main/scripts/bootstrap-gcp-vm-deploy-access.sh | bash
```

Or copy [scripts/bootstrap-gcp-vm-deploy-access.sh](../scripts/bootstrap-gcp-vm-deploy-access.sh) and run on the VM.

---

### Step B — Set GitHub secrets

| Secret | Value |
|--------|--------|
| `EC2_HOST` | `34.14.139.96` (your VM external IP) |
| `EC2_SSH_KEY` | Private key matching the public key above |

**From Windows (GitHub CLI):**

```powershell
cd Munshi_Updated
.\scripts\set-github-deploy-secrets.ps1 -HostIp 34.14.139.96
```

Private key file: `.ssh/ssh` (local only, gitignored).

**Or manually:** GitHub → Munshi_Updated → Settings → Secrets → Actions → paste full private key into `EC2_SSH_KEY` (include `BEGIN`/`END` lines, no extra quotes).

---

## Verify before re-running CI

```bash
ssh -i Munshi_Updated/.ssh/ssh ubuntu@34.14.139.96 "echo ok"
```

Must print `ok`. If **Permission denied (publickey)**, Step A is not done.

---

## Re-run deploy

- **Actions** → **Deploy GCP VM (manual)** → **Run workflow**  
  (skips build; only pull + restart)

Or push to `main` for full CI/CD.

---

## Bootstrap production stack (first time)

Files live in [deploy/gcp-vm/](../deploy/gcp-vm/).

**From Windows (after SSH `echo ok` works):**

```powershell
cd Munshi_Updated
.\scripts\sync-gcp-prod-stack.ps1 -HostIp 34.14.139.96
```

**Or on the VM (browser SSH):**

```bash
curl -sSL https://raw.githubusercontent.com/ShantanuGarg2004/Munshi_Updated/main/scripts/install-gcp-prod-stack.sh | bash
cd /home/ubuntu/munshi-dada
cp .env.example .env && cp ml.env.example ml.env
nano .env    # Supabase, Olli, MUNSHI_PUBLIC_API_HOST
nano ml.env  # OPENAI_API_KEY
docker compose pull && docker compose up -d
```

See [deploy/gcp-vm/README.md](../deploy/gcp-vm/README.md).

---

## What CI runs on the VM

```bash
cd /home/ubuntu/munshi-dada
docker compose pull
restart-docker-compose   # or: docker compose up -d --remove-orphans
```

Ensure `ubuntu` is in the `docker` group: `sudo usermod -aG docker ubuntu`

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `unable to authenticate` | Step A + B above |
| `EC2_SSH_KEY is not a valid OpenSSH private key` | Secret is truncated or you pasted the `.pub` file |
| `cd: ... No such file` | Create `/home/ubuntu/munshi-dada` with `docker-compose.yml` |
| Connection timeout | GCP firewall: allow `tcp:22` |

---

## Related

- [p0-production-database.md](./p0-production-database.md) — Supabase on VM
- [README.md](../README.md)
