#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# 1-Click Production Deployment Tool (Run from your Mac)
# Deploys Electricity Meter, Share Information & Updates to 103.166.172.36
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

TARGET_HOST="fwcpl@103.166.172.36"
REMOTE_DIR="~/operation-fwcpl"

echo "=================================================================="
echo "  FWCPL OPERATIONS - 1-CLICK PRODUCTION DEPLOYMENT"
echo "  Target: $TARGET_HOST"
echo "  Source: $PROJECT_DIR"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Commit and push local changes to GitHub
echo "📦 1/4 Checking and committing local git changes..."
git add .
if ! git diff-index --quiet HEAD --; then
    git commit -m "Support multiple staff assignments for Tasks and New Connections with automated backfill, target sync integrity, and updated UI" || true
    echo "  ✔ Local changes committed to git."
    echo "  🚀 Pushing to GitHub (origin main)..."
    git push origin main || echo "  ℹ Git push skipped or failed (offline / auth); continuing with direct deployment."
else
    echo "  ✔ Working tree clean, no uncommitted changes."
fi

# 2. Sync Files from Mac to Remote Server via rsync
echo ""
echo "🚀 2/4 Syncing fresh codebase to $TARGET_HOST:$REMOTE_DIR..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.DS_Store' \
    "$PROJECT_DIR/" "${TARGET_HOST}:${REMOTE_DIR}/"

# 3. Execute Remote Deployment & Migration
echo ""
echo "🏗️ 3/4 Executing deployment and schema updates on remote server..."
ssh -t "$TARGET_HOST" "cd ~/operation-fwcpl && chmod +x scripts/*.sh && bash scripts/remote-deploy.sh"

echo ""
echo "=================================================================="
echo "🎉 DEPLOYMENT TO MAIN PRODUCTION SERVER FINISHED!"
echo "   Access URL:  http://operation.fiberworld.net.np"
echo "   Direct IP:   http://103.166.172.36"
echo "   Superadmin:  superadmin / Nepal@123"
echo "=================================================================="
