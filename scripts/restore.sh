#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Comprehensive Enterprise Server Restore Script
# Restores: PostgreSQL Database + Uploads/Attachments from Backup Bundle
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$1" ]; then
    echo "=================================================================="
    echo "  FWCPL OPERATIONS - BACKUP RESTORE TOOL"
    echo "=================================================================="
    echo "Usage: $0 <backup_file_path>"
    echo ""
    echo "Examples:"
    echo "  $0 ./backups/fwcpl_backup_20260915_120000.tar.gz"
    echo "  $0 ./backups/postgres_fwcpl_operations.sql.gz"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs -0 2>/dev/null || true)
fi

DB_USER="${DB_USER:-fwcpl_admin}"
DB_NAME="${DB_NAME:-fwcpl_operations}"

echo "=================================================================="
echo "  FWCPL OPERATIONS - RESTORING SYSTEM FROM BACKUP"
echo "  Target Archive: $BACKUP_FILE"
echo "  Date:           $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

# Check Docker
if ! docker compose ps >/dev/null 2>&1; then
    echo "❌ Error: Docker Compose is not responding in $PROJECT_DIR"
    exit 1
fi

TEMP_EXTRACT="$PROJECT_DIR/backups/tmp_restore_$(date +%s)"
mkdir -p "$TEMP_EXTRACT"

cleanup() {
    rm -rf "$TEMP_EXTRACT"
}
trap cleanup EXIT

# Determine file type
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    echo "📦 Detected unified FWCPL backup bundle. Extracting..."
    tar -xzf "$BACKUP_FILE" -C "$TEMP_EXTRACT"

    # 0. Restore .env configuration if not present
    ENV_BACKUP=$(find "$TEMP_EXTRACT" -name "env.backup" | head -n 1)
    if [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$ENV_BACKUP" ]; then
        echo "⚙️ Restoring .env configuration from backup..."
        cp "$ENV_BACKUP" "$PROJECT_DIR/.env"
        chmod 600 "$PROJECT_DIR/.env"
        # Reload env vars
        export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs -0 2>/dev/null || true)
        echo "  ✔ .env configuration restored."
    fi

    # 1. Restore PostgreSQL if dump exists
    PG_FILE=$(find "$TEMP_EXTRACT" -name "postgres_*.sql.gz" | head -n 1)
    if [ -f "$PG_FILE" ]; then
        echo "🗄️ Restoring PostgreSQL Database ('$DB_NAME')..."
        DB_CMD="docker compose exec -T db"
        if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
            DB_CMD="docker exec -i fwcpl-db"
        fi
        # Ensure database exists
        $DB_CMD createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
        gunzip -c "$PG_FILE" | $DB_CMD psql -U "$DB_USER" -d "$DB_NAME"
        echo "  ✔ PostgreSQL database successfully restored."
    fi

    # 2. Restore Uploads
    UPLOADS_FILE=$(find "$TEMP_EXTRACT" -name "uploads.tar.gz" | head -n 1)
    if [ -f "$UPLOADS_FILE" ]; then
        echo "📁 Restoring Uploaded Files to /app..."
        BACKEND_CMD="docker compose exec -T backend"
        if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
            BACKEND_CMD="docker exec -i fwcpl-backend"
        fi
        $BACKEND_CMD tar -xzf - -C /app < "$UPLOADS_FILE" || true
        echo "  ✔ Uploaded files successfully restored."
    fi

elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "🗄️ Restoring single PostgreSQL gzip dump into '$DB_NAME'..."
    DB_CMD="docker compose exec -T db"
    if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
        DB_CMD="docker exec -i fwcpl-db"
    fi
    gunzip -c "$BACKUP_FILE" | $DB_CMD psql -U "$DB_USER" -d "$DB_NAME"
    echo "  ✔ PostgreSQL database successfully restored."

elif [[ "$BACKUP_FILE" == *.sql ]]; then
    echo "🗄️ Restoring single plain PostgreSQL SQL dump into '$DB_NAME'..."
    DB_CMD="docker compose exec -T db"
    if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
        DB_CMD="docker exec -i fwcpl-db"
    fi
    $DB_CMD psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    echo "  ✔ PostgreSQL database successfully restored."

else
    echo "❌ Error: Unrecognized backup format. Expected full .tar.gz bundle or .sql.gz."
    exit 1
fi

echo "------------------------------------------------------------------"
echo "✅ RESTORE COMPLETED SUCCESSFULLY!"
echo "------------------------------------------------------------------"
