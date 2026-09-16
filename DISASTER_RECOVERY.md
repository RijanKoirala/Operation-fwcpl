# FWCPL Operations Platform - 1-Shot Disaster Recovery (DR) Guide

This guide explains how to restore the entire **Fiber World Operations Platform** on a brand-new VM server in **under 5 minutes** if the primary server (`vm-01`) ever crashes or is permanently lost.

---

## Architecture Summary
- **Source Code & Docker Configs**: Safely versioned on your Mac (`/Users/rijankoirala/Operation-fwcpl`).
- **Database & Media Backups**: Automatically emailed every night at 2:00 AM to `noc@fiberworld.net.np` (filename: `fwcpl_backup_YYYYMMDD_HHMMSS.tar.gz`).
- **Target New Server**: Any fresh Ubuntu/Debian Linux VM (e.g. `103.166.172.xx`).

---

## Method 1: The Automated 1-Shot Script (From Mac)

If your old server crashes and you provision a new VM:

1. Download the latest backup file from `noc@fiberworld.net.np` to your Mac (e.g. in your `Downloads` folder: `~/Downloads/fwcpl_backup_20260915_090342.tar.gz`).
2. Run this single command from your **Mac Terminal**:

```bash
cd /Users/rijankoirala/Operation-fwcpl
chmod +x scripts/*.sh

# Usage: ./scripts/deploy-new-vm.sh <username@new-vm-ip> <path-to-backup-file>
./scripts/deploy-new-vm.sh fwcpl@NEW_VM_IP ~/Downloads/fwcpl_backup_20260915_090342.tar.gz
```

### What this 1-shot script does automatically:
1. Connects to the new VM via SSH.
2. Automatically installs Docker and Docker Compose on the new VM.
3. Syncs the entire codebase, frontend, backend, Docker configurations, and `.env` settings to the new VM.
4. Transfers your backup archive to the new VM.
5. Builds and launches all Docker containers (`db`, `backend`, `frontend`).
6. Restores the Database (SQLite / PostgreSQL) and uploaded photos/attachments into the running containers.
7. Reconfigures the automated daily 2:00 AM backup cron job on the new VM.
8. Verifies the health check and prints your new portal URL!

---

## Method 2: Manual 3-Step Procedure

If you prefer to perform the recovery step by step:

### Step 1: On the New Server Terminal (Install Docker)
```bash
# 1. Connect to new server
ssh fwcpl@NEW_VM_IP

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: On Your Mac Terminal (Push Code & Backup)
```bash
# 1. Sync full software code
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' /Users/rijankoirala/Operation-fwcpl/ fwcpl@NEW_VM_IP:~/operation-fwcpl/

# 2. Transfer latest backup file (downloaded from noc@fiberworld.net.np)
ssh fwcpl@NEW_VM_IP "mkdir -p ~/operation-fwcpl/backups"
rsync -avz ~/Downloads/fwcpl_backup_*.tar.gz fwcpl@NEW_VM_IP:~/operation-fwcpl/backups/
```

### Step 3: On the New Server Terminal (Launch & Restore)
```bash
cd ~/operation-fwcpl
chmod +x scripts/*.sh

# 1. Build and boot containers
docker compose up -d --build

# 2. Restore database and media
./scripts/restore.sh backups/fwcpl_backup_*.tar.gz

# 3. Schedule automated daily backup cron
(crontab -l 2>/dev/null; echo "0 2 * * * /bin/bash $(pwd)/scripts/backup.sh >> $(pwd)/backups/backup.log 2>&1") | crontab -
```

---

## Verification & Recovery Checklist

After recovery, test the following:
1. **Web Portal**: Visit `http://NEW_VM_IP` in browser.
2. **Health Check API**: Visit `http://NEW_VM_IP/api/health` (should return `{ "status": "healthy" }`).
3. **Login Verification**: Log in with `superadmin` / `Nepal@123`.
4. **Data Verification**: Confirm that staff, roles, permissions, and settings are intact.
5. **DNS / IP Update**: In your domain registrar or router, point `operation.fiberworld.net.np` to the `NEW_VM_IP`.
