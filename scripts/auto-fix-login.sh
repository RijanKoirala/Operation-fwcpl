#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Automated 1-Click Login Fix & Verification Tool (Mac Launcher)
# Syncs scripts and executes remote-fix.sh as a clean file on the server
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

TARGET_HOST="${1:-fwcpl@103.166.172.36}"
REMOTE_DIR="~/operation-fwcpl"

echo "=================================================================="
echo "  FWCPL OPERATIONS - 1-CLICK INSTANT LOGIN FIX & VERIFY"
echo "  Target: $TARGET_HOST"
echo "  Date:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Sync updated files
echo "🚀 1/2 Syncing fixed scripts and code to $TARGET_HOST..."
rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'uploads' \
    --exclude '.DS_Store' \
    "$PROJECT_DIR/" "${TARGET_HOST}:${REMOTE_DIR}/"

# 2. Run remote-fix.sh directly on the server
echo "🔧 2/2 Executing repair on server..."
ssh -t "$TARGET_HOST" "cd ~/operation-fwcpl && chmod +x scripts/*.sh && ./scripts/remote-fix.sh"
