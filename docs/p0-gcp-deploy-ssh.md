# P0 — GCP VM deploy SSH (GitHub Actions)

Production API runs on **GCP Compute Engine** (`munshi-prod`, default user **`ubuntu`**).  
CI deploy job: [.github/workflows/cicd.yml](../.github/workflows/cicd.yml) → `deploy-on-vm`.

Legacy secret names `EC2_HOST` / `EC2_SSH_KEY` are kept so existing GitHub Actions secrets keep working.

---

## GitHub Actions secrets

| Secret | Value |
|--------|--------|
| `EC2_HOST` | VM external IP, e.g. `34.14.139.96` |
| `EC2_SSH_KEY` | Full **private** OpenSSH key (see below) |
| `DOCKER_PASSWORD` | Docker Hub token/password |

---

## One-time VM setup

SSH into the VM (GCP Console → SSH, or local):

```bash
# 1) Add the GitHub Actions public key for user ubuntu
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMc96iDIAZMHxKkYtPvhQxyKCqtdgcFb1zxQDr7VGmFG github-actions-gcp
EOF
chmod 600 ~/.ssh/authorized_keys

# 2) Confirm deploy path exists
ls -la /home/ubuntu/munshi-dada/docker-compose.yml

# 3) ubuntu user can run docker
groups
# If docker not listed:
# sudo usermod -aG docker ubuntu   # then log out/in
```

Public key file in repo: [`.ssh/ssh.pub`](../.ssh/ssh.pub) (`github-actions-gcp`).

---

## GitHub secret `EC2_SSH_KEY`

Paste the **matching private key** (entire file, including `BEGIN`/`END` lines).  
It must pair with the public key in `authorized_keys` above.

**Do not commit private keys.** If you rotated keys, update both the VM `authorized_keys` and the GitHub secret.

Test from your laptop:

```bash
ssh -i /path/to/private_key ubuntu@34.14.139.96
```

---

## Deploy script (what CI runs)

```bash
cd /home/ubuntu/munshi-dada
docker compose pull
restart-docker-compose    # if installed on VM
# else: docker compose up -d --remove-orphans
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `unable to authenticate, attempted methods [none publickey]` | Wrong user (use `ubuntu`), wrong private key in `EC2_SSH_KEY`, or public key missing from `~ubuntu/.ssh/authorized_keys` |
| `cd: ... No such file` | Create `/home/ubuntu/munshi-dada` and copy `docker-compose.yml` + `.env` |
| `permission denied` on docker | Add `ubuntu` to `docker` group |
| Connection timeout | GCP firewall: allow `tcp:22` to the VM |

---

## Related

- [p0-production-database.md](./p0-production-database.md) — Supabase `POSTGRES_CONNECTION_STRING` on the VM
- [README.md](../README.md) — CI/CD overview
