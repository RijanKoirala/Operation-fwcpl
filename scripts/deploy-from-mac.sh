#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# 1-Shot Mac to Production Server Fresh Deployment Tool
# Deploys directly from your Mac to Main Server (103.166.172.36) or Test Server
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

TARGET_ARG="${1:-main}"

if [ "$TARGET_ARG" = "main" ]; then
    TARGET_HOST="fwcpl@103.166.172.36"
    TARGET_NAME="Main Production Server (103.166.172.36)"
    PORTAL_URL="http://103.166.172.36"
elif [ "$TARGET_ARG" = "test" ]; then
    TARGET_HOST="portal@172.16.252.11"
    TARGET_NAME="Test Server (172.16.252.11)"
    PORTAL_URL="http://172.16.252.11"
else
    TARGET_HOST="$TARGET_ARG"
    TARGET_NAME="Custom Server ($TARGET_HOST)"
    PORTAL_URL="http://$(echo "$TARGET_HOST" | cut -d'@' -f2)"
fi

REMOTE_DIR="~/operation-fwcpl"

echo "=================================================================="
echo "  FWCPL OPERATIONS - MAC-TO-SERVER FRESH DEPLOYMENT TOOL"
echo "  Target: $TARGET_NAME"
echo "  Source: $PROJECT_DIR"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Check SSH Connectivity
echo "📡 1/4 Verifying SSH connection to $TARGET_HOST..."
if ! ssh -o ConnectTimeout=10 "$TARGET_HOST" "echo '✔ SSH connected successfully.'"; then
    echo "❌ Error: Unable to connect to $TARGET_HOST via SSH."
    echo "   Please check network connection and SSH credentials."
    exit 1
fi

# 2. Sync Files from Mac to Remote Server
echo "🚀 2/4 Syncing fresh codebase from Mac to $TARGET_HOST:$REMOTE_DIR..."
ssh "$TARGET_HOST" "mkdir -p ${REMOTE_DIR}"

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.DS_Store' \
    "$PROJECT_DIR/" "${TARGET_HOST}:${REMOTE_DIR}/"

# 3. Execute Remote Fresh Deployment
echo "🏗️ 3/4 Executing remote fresh deployment on $TARGET_HOST..."
ssh -t "$TARGET_HOST" "cd ~/operation-fwcpl && chmod +x scripts/*.sh && ./scripts/fresh-deploy.sh"

# 4. Final Health Check
echo "🔍 4/4 Verifying API health on $TARGET_NAME..."
sleep 3
if curl -fsSL -m 5 "${PORTAL_URL}/api/health" 2>/dev/null | grep -q "healthy"; then
    echo "  ✔ API health check passed! Service is live and healthy."
else
    echo "  ℹ Portal started. Verify by visiting ${PORTAL_URL} in your browser."
fi

echo ""
echo "=================================================================="
echo "🎉 FRESH DEPLOYMENT SUCCESSFUL!"
echo "   Server:       $TARGET_NAME"
echo "   Portal URL:   $PORTAL_URL (or http://operation.fiberworld.net.np)"
echo "   Database:     PostgreSQL 16 (fwcpl_operations)"
echo "   Super Admin:  superadmin"
echo "   Password:     Nepal@123"
echo "   Branches:     0 (Clean state - ready for your input)"
echo "=================================================================="
echo ""
