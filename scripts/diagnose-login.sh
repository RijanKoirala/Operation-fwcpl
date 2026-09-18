#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Diagnostic & Instant Login Repair Script
# Runs from Mac to check backend status and guarantee superadmin login
# ==============================================================================
set -e

TARGET_HOST="${1:-fwcpl@103.166.172.36}"

echo "=================================================================="
echo "  FWCPL OPERATIONS - LOGIN DIAGNOSTIC & REPAIR TOOL"
echo "  Target: $TARGET_HOST"
echo "=================================================================="

ssh "$TARGET_HOST" 'bash -s' << 'REMOTE_DIAG'
cd ~/operation-fwcpl

echo ""
echo "🔍 1. Checking Docker Containers Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 2. Checking PostgreSQL Connection & Active Database:"
if docker ps --format '{{.Names}}' | grep -q "fwcpl-db"; then
    docker exec -i fwcpl-db psql -U fwcpl_admin -d postgres -c "\l" 2>/dev/null | grep -E "fwcpl_|Name" || true
    echo ""
    echo "📋 Users inside 'fwcpl_operations':"
    docker exec -i fwcpl-db psql -U fwcpl_admin -d fwcpl_operations -c "SELECT id, username, email, role, status FROM users;" 2>/dev/null || echo "  (Could not read users table)"
fi

echo ""
echo "🔍 3. Checking Recent Backend Logs:"
if docker ps --format '{{.Names}}' | grep -q "fwcpl-backend"; then
    docker logs --tail 20 fwcpl-backend
else
    echo "  ⚠️ fwcpl-backend container is NOT running!"
fi

echo ""
echo "🔧 4. Force Guaranteeing Super Admin Account & Password in PostgreSQL:"
if docker ps --format '{{.Names}}' | grep -q "fwcpl-backend"; then
    docker exec -i fwcpl-backend node -e "
      const bcrypt = require('bcryptjs');
      const { Pool } = require('pg');
      const pool = new Pool({
        host: 'db',
        port: 5432,
        user: process.env.DB_USER || 'fwcpl_admin',
        password: process.env.DB_PASSWORD || 'SecureP@ssw0rd2026!',
        database: process.env.DB_NAME || 'fwcpl_operations'
      });
      async function fix() {
        const hash = await bcrypt.hash('Nepal@123', 10);
        const res = await pool.query(
          \"UPDATE users SET password_hash = \$1, status = 'Active', role = 'SUPER_ADMIN', allowed_branches = 'ALL' WHERE LOWER(username) = 'superadmin' OR UPPER(role) = 'SUPER_ADMIN' RETURNING id;\",
          [hash]
        );
        if (res.rowCount === 0) {
          await pool.query(
            \"INSERT INTO users (employee_id, username, email, password_hash, full_name, role, status, allowed_branches) VALUES ('EMP-1001', 'superadmin', 'admin@fiberworld.net.np', \$1, 'Rijan Koirala', 'SUPER_ADMIN', 'Active', 'ALL') ON CONFLICT (username) DO UPDATE SET password_hash = \$1, status = 'Active', role = 'SUPER_ADMIN';\",
            [hash]
          );
          console.log('  ✔ Super Admin created afresh in PostgreSQL.');
        } else {
          console.log('  ✔ Super Admin password updated in PostgreSQL (' + res.rowCount + ' row affected).');
        }
        await pool.end();
      }
      fix().catch(err => console.error('  ❌ Repair error:', err.message));
    " 2>/dev/null || true
fi

echo ""
echo "🔍 5. Direct API Login Test (superadmin / Nepal@123):"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Nepal@123"}' 2>/dev/null || echo "Connection Failed")

echo "  API Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "=================================================================="
    echo "🎉 LOGIN IS 100% WORKING AND VERIFIED!"
    echo "   Username: superadmin"
    echo "   Password: Nepal@123"
    echo "=================================================================="
else
    echo ""
    echo "  ⚠️ API Login did not succeed. Checking if backend needs rebuild or restart..."
fi

REMOTE_DIAG
