#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# 1-Shot Automated Disaster Recovery & New VM Deployment Script
# Run from your Mac to deploy the entire stack to a brand new VM in minutes!
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$1" ]; then
    echo "=================================================================="
    echo "  FWCPL OPERATIONS - 1-SHOT DISASTER RECOVERY & DEPLOYMENT TOOL"
    echo "=================================================================="
    echo "Usage: $0 <user@new-vm-ip> [path-to-backup-tar-gz]"
    echo ""
    echo "Examples:"
    echo "  $0 fwcpl@103.166.172.38"
    echo "  $0 fwcpl@103.166.172.38 ~/Downloads/fwcpl_backup_20260915_090342.tar.gz"
    echo ""
    exit 1
fi

TARGET_HOST="$1"
BACKUP_ARCHIVE="$2"
REMOTE_DIR="~/operation-fwcpl"

echo "=================================================================="
echo "  FWCPL 1-SHOT DISASTER RECOVERY LAUNCHER"
echo "  Target VM:       $TARGET_HOST"
echo "  Source Folder:   $PROJECT_DIR"
if [ -n "$BACKUP_ARCHIVE" ]; then
echo "  Backup Archive:  $BACKUP_ARCHIVE"
fi
echo "=================================================================="

# 1. Test SSH Connection
echo "📡 1/6 Testing SSH connectivity to $TARGET_HOST..."
if ! ssh -o ConnectTimeout=10 "$TARGET_HOST" "echo '✔ SSH connected successfully.'"; then
    echo "❌ Error: Cannot connect to $TARGET_HOST via SSH. Please check IP and credentials."
    exit 1
fi

# 2. Check & Install Docker on New VM if not present
echo "🐳 2/6 Checking Docker & Docker Compose on new VM..."
ssh "$TARGET_HOST" 'bash -s' << 'DOCKER_SETUP'
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo "  Docker not found. Installing latest Docker & Docker Compose..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo "  ✔ Docker installed successfully."
else
    echo "  ✔ Docker and Docker Compose are already installed."
fi
DOCKER_SETUP

# 3. Sync full software stack from Mac to New VM
echo "🚀 3/6 Syncing software stack from Mac to new VM ($REMOTE_DIR)..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.DS_Store' \
    "$PROJECT_DIR/" "${TARGET_HOST}:${REMOTE_DIR}/"

# 4. Transfer Backup File if provided
if [ -n "$BACKUP_ARCHIVE" ] && [ -f "$BACKUP_ARCHIVE" ]; then
    echo "📦 4/6 Transferring backup archive to new VM..."
    ssh "$TARGET_HOST" "mkdir -p ${REMOTE_DIR}/backups"
    rsync -avz "$BACKUP_ARCHIVE" "${TARGET_HOST}:${REMOTE_DIR}/backups/"
    REMOTE_BACKUP_PATH="${REMOTE_DIR}/backups/$(basename "$BACKUP_ARCHIVE")"
else
    echo "ℹ️ 4/6 No specific backup file provided via CLI argument. Checking existing backups..."
    REMOTE_BACKUP_PATH=""
fi

# 5. Build and launch containers on New VM
echo "🏗️ 5/6 Building and launching application containers on new VM..."
ssh "$TARGET_HOST" "cd ${REMOTE_DIR} && chmod +x scripts/*.sh && docker compose up -d --build"

# 6. Restore Database & Uploads from Backup
echo "🔄 6/6 Restoring Database and operational data..."
ssh "$TARGET_HOST" "bash -s" << EOF
cd ${REMOTE_DIR}

# If specific backup path was passed
if [ -n "$REMOTE_BACKUP_PATH" ] && [ -f "$REMOTE_BACKUP_PATH" ]; then
    echo "  Restoring from: $REMOTE_BACKUP_PATH"
    ./scripts/restore.sh "$REMOTE_BACKUP_PATH"
else
    # Find latest backup in backups/ if exists
    LATEST=\$(ls -t backups/fwcpl_backup_*.tar.gz 2>/dev/null | head -n 1 || true)
    if [ -n "\$LATEST" ] && [ -f "\$LATEST" ]; then
        echo "  Found existing backup: \$LATEST. Restoring..."
        ./scripts/restore.sh "\$LATEST"
    else
        echo "  ℹ No backup archive found in backups/ directory. System initialized clean."
    fi
fi

# Set up automatic daily backup cron job
CRON_JOB="0 2 * * * /bin/bash \$(pwd)/scripts/backup.sh >> \$(pwd)/backups/backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "\$CRON_JOB") | crontab -
echo "  ✔ Daily automated backup cron job scheduled for 2:00 AM."

# Restart backend to ensure it connects cleanly to restored database
docker compose restart backend
EOF

echo ""
echo "=================================================================="
echo "🎉 1-SHOT DISASTER RECOVERY & DEPLOYMENT COMPLETE!"
echo "   New Server:      $TARGET_HOST"
echo "   Portal URL:      http://$(echo "$TARGET_HOST" | cut -d'@' -f2)"
echo "   API Health:      http://$(echo "$TARGET_HOST" | cut -d'@' -f2)/api/health"
echo "=================================================================="
echo ""
