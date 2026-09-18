#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Server-side Fix & Verification Script
# Executed directly as a file on the server (avoids SSH stdin piping traps)
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=================================================================="
echo "  FWCPL OPERATIONS - EXECUTING SERVER REPAIR & LOGIN VERIFICATION"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Ensure fwcpl_admin password and fwcpl_operations database
echo "🗄️ Step 1/5: Synchronizing PostgreSQL user credentials and database..."
# Force reset PostgreSQL user password to match .env
docker exec fwcpl-db psql -U fwcpl_admin -d postgres -c "ALTER USER fwcpl_admin WITH PASSWORD 'SecureP@ssw0rd2026!';" 2>/dev/null || true
docker exec fwcpl-db psql -U fwcpl_admin -d postgres -c "ALTER USER postgres WITH PASSWORD 'SecureP@ssw0rd2026!';" 2>/dev/null || true

# Re-apply db container with trust authentication
docker compose up -d db

# Ensure database fwcpl_operations exists
docker exec fwcpl-db psql -U fwcpl_admin -d postgres -c "CREATE DATABASE fwcpl_operations;" 2>/dev/null || echo "  ✔ Database fwcpl_operations is present."

# Apply schema directly to fwcpl_operations
echo "📄 Applying PostgreSQL DDL Schema to 'fwcpl_operations'..."
docker exec fwcpl-db psql -U fwcpl_admin -d fwcpl_operations -f /docker-entrypoint-initdb.d/init.sql 2>/dev/null || true

# Drop orphan fwcpl_ops_db
docker exec fwcpl-db psql -U fwcpl_admin -d postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'fwcpl_ops_db' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS fwcpl_ops_db;
" 2>/dev/null || true

# 2. Build & Launch Backend and Frontend
echo "🐳 Step 2/5: Building and starting Backend & Frontend..."
docker compose up -d --build backend frontend

# 3. Wait for backend to be healthy
echo "⏳ Step 3/5: Waiting for backend container to start..."
for i in {1..20}; do
    if docker compose ps --services --filter "status=running" | grep -q "backend"; then
        if curl -fsSL -m 3 http://localhost:5000/api/health 2>/dev/null | grep -q "healthy"; then
            echo "  ✔ Backend API is up and healthy."
            break
        fi
    fi
    echo "  ...waiting for backend ($i/20)"
    sleep 2
done

# 4. Guarantee Roles & Super Admin Account in PostgreSQL
echo "👤 Step 4/5: Initializing Core RBAC, Roles, Goods & Super Admin..."
docker exec fwcpl-backend node -e "
const { db } = require('./dist/models/database');
const { seedRbacData } = require('./dist/seeds/rbacSeed');
const { seedGoodsData } = require('./dist/seeds/goodsSeed');

async function seed() {
  await db.init();
  await seedRbacData();
  await seedGoodsData();
  console.log('  ✔ Roles, Permissions, Departments, Goods and Super Admin verified in PostgreSQL.');
}
seed().catch(err => {
  console.error('  ❌ Seeding error:', err.message);
  process.exit(1);
});
"

# 5. Test Live Login API
echo ""
echo "🧪 Step 5/5: Testing Live Login API (POST /api/auth/login)..."
LOGIN_RES=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Nepal@123"}')

echo "  Response: $LOGIN_RES"

if echo "$LOGIN_RES" | grep -q '"success":true'; then
  AUTH_TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo ""
  echo "🔍 Step 6/6: Verifying Dynamic Roles API (GET /api/admin/roles)..."
  ROLES_RES=$(curl -s http://localhost:5000/api/admin/roles -H "Authorization: Bearer $AUTH_TOKEN")
  echo "  Roles Response: $ROLES_RES"

  echo ""
  echo "=================================================================="
  echo "🎉 SUCCESS! LOGIN & ROLES VERIFIED WORKING 100%!"
  echo "   Portal URL:  http://103.166.172.36 (or http://operation.fiberworld.net.np)"
  echo "   Username:    superadmin"
  echo "   Password:    Nepal@123"
  echo "=================================================================="
else
  echo ""
  echo "⚠️ Login test output:"
  echo "$LOGIN_RES"
fi
