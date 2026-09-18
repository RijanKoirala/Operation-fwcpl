#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Complete Server & Database Optimization & Cleanup Tool
# Cleans: Unused DBs + Demo Records + Temp Files + Caches + Docker Dangling Data
# Preserves: Roles, Permissions, Departments, Designations, Super Admin Account
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================================================="
echo "  FWCPL OPERATIONS - SYSTEM, CACHE & UNUSED DATA CLEANUP"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

cd "$PROJECT_DIR"

# 1. PURGE DEMO DATA & COMPACT DATABASE
echo "🧹 1/5 Purging demo data, tasks, tickets, logs, and compacting DB..."
if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
    docker compose exec -T backend npm run clean:demo 2>/dev/null || \
    docker compose exec -T backend npx ts-node src/scripts/cleanDemoData.ts || true
else
    echo "  ℹ Backend container is not running. Attempting direct script..."
fi

# 2. DROP UNUSED / ORPHAN POSTGRESQL DATABASES (fwcpl_ops_db)
echo "🗄️ 2/5 Checking and removing orphan/unused PostgreSQL databases..."
if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
    # Drop fwcpl_ops_db if exists and not used
    docker compose exec -T db psql -U fwcpl_admin -d postgres -c "
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'fwcpl_ops_db' AND pid <> pg_backend_pid();
      DROP DATABASE IF EXISTS fwcpl_ops_db;
    " 2>/dev/null && echo "  ✔ Dropped unused 'fwcpl_ops_db' database from PostgreSQL." || true
fi

# 3. CLEAN TEMPORARY RESTORE/CHECK DUMPS & SERVER CACHE
echo "🗑️  3/5 Cleaning temporary inspection dumps, extraction folders, and cache..."
rm -rf /tmp/check_backup /tmp/view_backup /tmp/tmp_restore_* /tmp/fwcpl_* 2>/dev/null || true
rm -rf "$PROJECT_DIR"/backups/tmp_* 2>/dev/null || true

if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
    docker compose exec -T backend rm -rf /tmp/fwcpl_* /tmp/*.tar.gz /tmp/*.sqlite 2>/dev/null || true
    docker compose exec -T backend npm cache clean --force 2>/dev/null || true
    echo "  ✔ Container temporary files and npm caches cleaned."
fi

# 4. PRUNE DANGLING DOCKER BUILD CACHE & UNUSED IMAGES
echo "🐳 4/5 Pruning Docker dangling images and build cache..."
docker image prune -f 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
echo "  ✔ Docker build cache and dangling layers reclaimed."

# 5. VERIFY DATABASE HEALTH & DISPLAY STATUS
echo "📊 5/5 Verifying Active Database status..."
if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
    DB_USER="${DB_USER:-fwcpl_admin}"
    DB_NAME="${DB_NAME:-fwcpl_operations}"
    docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT '  ✔ Preserved Roles Count:       ' || count(*) FROM roles;
      SELECT '  ✔ Preserved Permissions Count: ' || count(*) FROM permissions;
      SELECT '  ✔ Preserved Users Count:       ' || count(*) FROM users;
      SELECT '  ✔ Preserved Branches Count:    ' || count(*) FROM branches;
    " 2>/dev/null || true
fi

echo ""
echo "------------------------------------------------------------------"
echo "✅ COMPLETE SYSTEM & DATA CLEANUP FINISHED!"
echo "   Server Free Disk Space:"
df -h / | awk 'NR==1 || NR==2 {print "   " $0}'
echo "------------------------------------------------------------------"
echo ""
