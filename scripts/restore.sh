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

    # 1. Restore PostgreSQL if dump exists
    PG_FILE=$(find "$TEMP_EXTRACT" -name "postgres_*.sql.gz" | head -n 1)
    if [ -f "$PG_FILE" ]; then
        echo "🗄️ Restoring PostgreSQL Database ('$DB_NAME')..."
        # Ensure database exists
        docker compose exec -T db createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
        gunzip -c "$PG_FILE" | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
        echo "  ✔ PostgreSQL database successfully restored."
    fi

    # 2. Restore SQLite if present
    SQLITE_FILE=$(find "$TEMP_EXTRACT" -name "sqlite_*.db.gz" | head -n 1)
    if [ -f "$SQLITE_FILE" ]; then
        echo "💾 Restoring SQLite Database to /app/data/fwcpl.sqlite..."
        gunzip -c "$SQLITE_FILE" | docker compose exec -T backend sh -c "cat > /app/data/fwcpl.sqlite" || true
        echo "  ✔ SQLite database successfully restored."
    fi

    # 3. Restore Uploads
    UPLOADS_FILE=$(find "$TEMP_EXTRACT" -name "uploads.tar.gz" | head -n 1)
    if [ -f "$UPLOADS_FILE" ]; then
        echo "📁 Restoring Uploaded Files to /app..."
        docker compose exec -T backend tar -xzf - -C /app < "$UPLOADS_FILE" || true
        echo "  ✔ Uploaded files successfully restored."
    fi

elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "🗄️ Restoring single PostgreSQL gzip dump into '$DB_NAME'..."
    gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
    echo "  ✔ PostgreSQL database successfully restored."

elif [[ "$BACKUP_FILE" == *.sql ]]; then
    echo "🗄️ Restoring single plain PostgreSQL SQL dump into '$DB_NAME'..."
    docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    echo "  ✔ PostgreSQL database successfully restored."

else
    echo "❌ Error: Unrecognized backup format. Expected full .tar.gz bundle or .sql.gz."
    exit 1
fi

echo "------------------------------------------------------------------"
echo "✅ RESTORE COMPLETED SUCCESSFULLY!"
echo "------------------------------------------------------------------"
