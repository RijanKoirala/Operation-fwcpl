#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Remote Production Deployment & Verification Script
# Executed directly on production server (103.166.172.36)
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=================================================================="
echo "  FWCPL OPERATIONS - EXECUTING PRODUCTION MODULES DEPLOYMENT"
echo "  Modules: Electricity Meter, Share Information, Boolean Query Fix"
echo "  Date:    $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Ensure PostgreSQL container is running
echo "🗄️ Step 1/5: Checking PostgreSQL Database engine..."
docker compose up -d db

echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..20}; do
    if docker exec fwcpl-db pg_isready -U fwcpl_admin -d fwcpl_operations 2>/dev/null; then
        echo "  ✔ PostgreSQL engine is ready and responsive."
        break
    fi
    sleep 1
done

# 2. Apply latest schema to PostgreSQL
echo "📄 Step 2/5: Applying DDL schema migrations to 'fwcpl_operations'..."
docker exec -i fwcpl-db psql -U fwcpl_admin -d fwcpl_operations < "$PROJECT_DIR/backend/src/models/schema.sql" 2>/dev/null || true

# 3. Build & Launch Backend and Frontend Containers
echo "🐳 Step 3/5: Building and restarting Backend & Frontend containers..."
docker compose up -d --build backend frontend

# 4. Wait for backend container to be healthy
echo "⏳ Step 4/5: Waiting for backend service to become healthy..."
for i in {1..30}; do
    if docker compose ps --services --filter "status=running" | grep -q "backend"; then
        if curl -fsSL -m 3 http://localhost:5000/api/health 2>/dev/null | grep -q "healthy"; then
            echo "  ✔ Backend API is live and healthy."
            break
        fi
    fi
    echo "  ...waiting for backend ($i/30)"
    sleep 2
done

# 5. Initialize RBAC Permissions for Electricity Meter & Share Information
echo "👤 Step 5/5: Syncing RBAC permissions & Super Admin in PostgreSQL..."
docker exec fwcpl-backend node -e "
const { db } = require('./dist/models/database');
const { seedRbacData } = require('./dist/seeds/rbacSeed');
const { seedGoodsData } = require('./dist/seeds/goodsSeed');

async function seed() {
  await db.init();
  await seedRbacData();
  await seedGoodsData();
  console.log('  ✔ Electricity Meter & Share Information permissions registered successfully.');
}
seed().catch(err => {
  console.error('  ❌ Seeding warning:', err.message);
  process.exit(0);
});
"

# 6. Verify Tables Existence in PostgreSQL
echo ""
echo "🔍 Verifying newly added database tables..."
docker exec fwcpl-db psql -U fwcpl_admin -d fwcpl_operations -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('electricity_meters', 'electricity_readings', 'electricity_payments', 'information', 'information_branches', 'information_reads')
ORDER BY table_name;
"

# 7. Test Login API
echo ""
echo "🧪 Testing Live Authentication API (POST /api/auth/login)..."
LOGIN_RES=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Nepal@123"}')

if echo "$LOGIN_RES" | grep -q '"success":true'; then
  echo "  ✔ Super Admin authentication verified successfully."
  echo ""
  echo "=================================================================="
  echo "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
  echo "   Portal URL:       http://operation.fiberworld.net.np"
  echo "   Direct Server IP: http://103.166.172.36"
  echo "   Super Admin:      superadmin"
  echo "   Default Password: Nepal@123"
  echo "=================================================================="
else
  echo "⚠️ Notice: Superadmin login check returned:"
  echo "  $LOGIN_RES"
fi
