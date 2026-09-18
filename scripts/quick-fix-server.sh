#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# 1-Click Server Fix & Instant Login Setup
# Fixes database creation, rebuilds frontend/backend, and verifies superadmin
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

TARGET_HOST="fwcpl@103.166.172.36"
REMOTE_DIR="~/operation-fwcpl"

echo "=================================================================="
echo "  FWCPL OPERATIONS - INSTANT SERVER & LOGIN REPAIR TOOL"
echo "  Target: $TARGET_HOST"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Sync updated code
echo "🚀 1/4 Syncing fixes to $TARGET_HOST..."
rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.DS_Store' \
    "$PROJECT_DIR/" "${TARGET_HOST}:${REMOTE_DIR}/"

# 2. Remote execution
echo "🔧 2/4 Applying fixes on remote server..."
ssh -t "$TARGET_HOST" "cd ~/operation-fwcpl && chmod +x scripts/*.sh && bash scripts/remote-fix.sh"

echo ""
echo "=================================================================="
echo "🎉 REPAIR COMPLETED!"
echo "   Please refresh http://operation.fiberworld.net.np in your browser."
echo "   Username: superadmin"
echo "   Password: Nepal@123"
echo "=================================================================="
