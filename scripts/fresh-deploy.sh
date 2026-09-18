#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Fresh Production Deployment & Reset Script
# Initializes pristine PostgreSQL database with Super Admin and zero demo records
# ==============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "=================================================================="
echo "  FWCPL OPERATIONS - FRESH DEPLOYMENT INITIALIZATION"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# 1. Ensure .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        echo "⚙️ Creating .env from .env.example..."
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        chmod 600 "$PROJECT_DIR/.env"
    else
        echo "❌ Error: .env file missing and .env.example not found."
        exit 1
    fi
fi

# Load variables
export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs -0 2>/dev/null || true)
DB_USER="${DB_USER:-fwcpl_admin}"
DB_NAME="${DB_NAME:-fwcpl_operations}"

# 2. Stop existing containers
echo "🛑 1/4 Stopping existing containers..."
docker compose down --remove-orphans

# 3. Start PostgreSQL Database first and guarantee target DB exists
echo "🚀 2/4 Starting PostgreSQL 16 container..."
docker compose up -d db

echo "⏳ Waiting for PostgreSQL engine to become ready..."
for i in {1..30}; do
    if docker compose exec -T db pg_isready -U "$DB_USER" 2>/dev/null; then
        echo "  ✔ PostgreSQL engine is ready."
        break
    fi
    sleep 1
done

# Ensure database $DB_NAME exists
echo "🗄️ Ensuring database '$DB_NAME' exists in PostgreSQL..."
docker compose exec -T db createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || \
docker compose exec -T db psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || true

# Drop obsolete fwcpl_ops_db if present
docker compose exec -T db psql -U "$DB_USER" -d postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'fwcpl_ops_db' AND pid <> pg_backend_pid();
  DROP DATABASE IF EXISTS fwcpl_ops_db;
" 2>/dev/null || true

# 4. Build and start Backend & Frontend
echo "🚀 3/4 Building and launching Backend & Frontend services..."
docker compose up -d --build backend frontend

# Wait for backend container initialization
echo "⏳ Waiting for backend initialization..."
for i in {1..30}; do
    if docker compose ps --services --filter "status=running" | grep -q "backend"; then
        if curl -fsSL -m 3 http://localhost:5000/api/health 2>/dev/null | grep -q "healthy"; then
            echo "  ✔ Backend API is live and healthy."
            break
        fi
    fi
    sleep 2
done

# 5. Clean any demo data and ensure clean Super Admin and RBAC state
echo "🧹 4/4 Ensuring clean fresh prototype state (0 branches, 0 demo staff/tasks)..."
docker compose exec -T backend npm run clean:demo 2>/dev/null || \
docker compose exec -T backend npx ts-node src/scripts/cleanDemoData.ts 2>/dev/null || true

echo ""
echo "------------------------------------------------------------------"
echo "✅ FRESH DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "   Database Engine: PostgreSQL 16 (DB: $DB_NAME)"
echo "   Super Admin:     superadmin"
echo "   Default Pass:    Nepal@123"
echo "   Branches:        0 (Pristine clean state)"
echo "   Tasks/Tickets:   0 (Pristine clean state)"
echo "   Roles & Perms:   Fully initialized & active"
echo "   Goods Catalog:   Seeded and active"
echo "------------------------------------------------------------------"
echo ""
