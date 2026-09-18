#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Production Enterprise PostgreSQL Server Backup Script
# Backs Up: PostgreSQL Database + Uploaded Files + Environment Config
# ==============================================================================

# 1. Determine directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
TEMP_DIR="$BACKUP_DIR/tmp_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# 2. Load environment variables if .env exists
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs -0 2>/dev/null || true)
fi

DB_USER="${DB_USER:-fwcpl_admin}"
DB_NAME="${DB_NAME:-fwcpl_operations}"

echo "=================================================================="
echo "  FWCPL OPERATIONS - AUTOMATED SERVER BACKUP"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=================================================================="

mkdir -p "$BACKUP_DIR"
mkdir -p "$TEMP_DIR"

cd "$PROJECT_DIR"

BACKUP_ITEMS=()

# ==============================================================================
# 3. BACKUP POSTGRESQL (If running and database exists)
# ==============================================================================
echo "📦 1/4 Checking PostgreSQL Database..."
PG_DUMP_FILE="$TEMP_DIR/postgres_${DB_NAME}.sql.gz"
PG_BACKED_UP=false

# Check if db service is running
if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db" || docker ps --format '{{.Names}}' | grep -q "fwcpl-db"; then
    EXEC_CMD="docker compose exec -T db"
    if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "db"; then
        EXEC_CMD="docker exec -i fwcpl-db"
    fi

    # Query existing databases
    EXISTING_DBS=$($EXEC_CMD psql -U "$DB_USER" -d postgres -t -Ac "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null || \
                  $EXEC_CMD psql -U postgres -d postgres -t -Ac "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null || true)

    TARGET_DB=""
    for candidate in "$DB_NAME" "fwcpl_ops_db" "fwcpl_operations" "postgres"; do
        if echo "$EXISTING_DBS" | grep -qx "$candidate"; then
            TABLE_COUNT=$($EXEC_CMD psql -U "$DB_USER" -d "$candidate" -t -Ac "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
            if [ "$TABLE_COUNT" -gt 0 ] || [ "$candidate" = "fwcpl_ops_db" ]; then
                TARGET_DB="$candidate"
                echo "  ℹ Found active database: '$candidate' ($TABLE_COUNT tables)."
                break
            fi
        fi
    done

    if [ -n "$TARGET_DB" ]; then
        echo "  Dumping PostgreSQL database '${TARGET_DB}'..."
        if $EXEC_CMD pg_dump -U "$DB_USER" --clean --if-exists -d "$TARGET_DB" 2>/dev/null | gzip > "$PG_DUMP_FILE"; then
            if [ -s "$PG_DUMP_FILE" ] && [ $(wc -c < "$PG_DUMP_FILE") -gt 200 ]; then
                echo "  ✔ PostgreSQL database ('$TARGET_DB') dumped successfully ($(du -h "$PG_DUMP_FILE" | cut -f1))"
                BACKUP_ITEMS+=("PostgreSQL: $TARGET_DB")
                PG_BACKED_UP=true
            else
                rm -f "$PG_DUMP_FILE"
            fi
        fi
    fi

    if [ "$PG_BACKED_UP" = false ]; then
        echo "  ❌ Error: PostgreSQL database '$DB_NAME' could not be dumped."
        exit 1
    fi
else
    echo "  ❌ Error: PostgreSQL container is not currently running."
    exit 1
fi

# ==============================================================================
# 5. BACKUP UPLOADED FILES & MEDIA (POD photos, goods receipts, attachments)
# ==============================================================================
echo "📁 3/4 Backing up Uploaded Attachments & Media..."
UPLOADS_DUMP_FILE="$TEMP_DIR/uploads.tar.gz"
UPLOADS_BACKED_UP=false

if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend" || docker ps --format '{{.Names}}' | grep -q "fwcpl-backend"; then
    BACKEND_CMD="docker compose exec -T backend"
    if ! docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
        BACKEND_CMD="docker exec -i fwcpl-backend"
    fi

    $BACKEND_CMD tar -czf - -C /app uploads 2>/dev/null > "$UPLOADS_DUMP_FILE" || true
    if [ -s "$UPLOADS_DUMP_FILE" ] && [ $(wc -c < "$UPLOADS_DUMP_FILE") -gt 100 ]; then
        echo "  ✔ Uploaded files archived from container ($(du -h "$UPLOADS_DUMP_FILE" | cut -f1))"
        BACKUP_ITEMS+=("Uploads: /app/uploads")
        UPLOADS_BACKED_UP=true
    else
        rm -f "$UPLOADS_DUMP_FILE"
    fi
fi

if [ "$UPLOADS_BACKED_UP" = false ] && [ -d "$PROJECT_DIR/backend/uploads" ]; then
    tar -czf "$UPLOADS_DUMP_FILE" -C "$PROJECT_DIR/backend" uploads 2>/dev/null || true
    if [ -s "$UPLOADS_DUMP_FILE" ]; then
        echo "  ✔ Uploaded files archived from local host folder ($(du -h "$UPLOADS_DUMP_FILE" | cut -f1))"
        BACKUP_ITEMS+=("Uploads: backend/uploads")
        UPLOADS_BACKED_UP=true
    else
        rm -f "$UPLOADS_DUMP_FILE"
    fi
fi

if [ "$UPLOADS_BACKED_UP" = false ]; then
    echo "  ℹ Uploads directory is empty or not yet created."
fi

# ==============================================================================
# 6. BACKUP CONFIGURATION (.env)
# ==============================================================================
echo "⚙️  4/4 Backing up System Environment Configuration..."
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$TEMP_DIR/env.backup"
    chmod 600 "$TEMP_DIR/env.backup"
    echo "  ✔ .env configuration saved (permissions 600)."
    BACKUP_ITEMS+=("Config: .env")
fi

# Write metadata
cat << METADATA > "$TEMP_DIR/metadata.json"
{
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project": "FWCPL Operations Management",
  "database_type": "PostgreSQL",
  "database_name": "${DB_NAME}",
  "database_user": "${DB_USER}",
  "postgresql_backed_up": ${PG_BACKED_UP},
  "uploads_backed_up": ${UPLOADS_BACKED_UP},
  "retention_days": ${RETENTION_DAYS}
}
METADATA

# ==============================================================================
# 7. PACKAGE EVERYTHING INTO SINGLE BUNDLE
# ==============================================================================
FINAL_ARCHIVE="$BACKUP_DIR/fwcpl_backup_${TIMESTAMP}.tar.gz"
tar -czf "$FINAL_ARCHIVE" -C "$TEMP_DIR" .
chmod 600 "$FINAL_ARCHIVE"

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo "------------------------------------------------------------------"
echo "✅ BACKUP SUCCESSFUL!"
echo "   File:     ${FINAL_ARCHIVE}"
echo "   Size:     $(du -h "$FINAL_ARCHIVE" | cut -f1)"
echo "   Contents:"
for item in "${BACKUP_ITEMS[@]}"; do
    echo "     - $item"
done
echo "------------------------------------------------------------------"

# ==============================================================================
# 8. RETENTION POLICY (Clean backups older than RETENTION_DAYS)
# ==============================================================================
DELETED_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "fwcpl_backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete 2>/dev/null | wc -l | tr -d ' ')
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "🧹 Retention policy: Removed ${DELETED_COUNT} obsolete backup(s) older than ${RETENTION_DAYS} days."
fi

# ==============================================================================
# 9. DISPATCH BACKUP ARCHIVE TO EMAIL (noc@fiberworld.net.np)
# ==============================================================================
EMAIL_RECIPIENT="${BACKUP_EMAIL_TO:-${NOC_ALERT_EMAIL:-noc@fiberworld.net.np}}"
if [ "${SEND_BACKUP_EMAIL:-true}" != "false" ]; then
    echo "📧 5/5 Sending backup archive via Email to ${EMAIL_RECIPIENT}..."
    ARCHIVE_NAME="$(basename "$FINAL_ARCHIVE")"

    if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
        docker compose cp "$FINAL_ARCHIVE" "backend:/tmp/${ARCHIVE_NAME}" 2>/dev/null || true
        if docker compose exec -T backend test -f "dist/scripts/sendBackupEmail.js" 2>/dev/null; then
            docker compose exec -T -e BACKUP_EMAIL_TO="$EMAIL_RECIPIENT" backend node dist/scripts/sendBackupEmail.js "/tmp/${ARCHIVE_NAME}" "$EMAIL_RECIPIENT" || true
        else
            docker compose exec -T -e BACKUP_EMAIL_TO="$EMAIL_RECIPIENT" backend npx ts-node src/scripts/sendBackupEmail.ts "/tmp/${ARCHIVE_NAME}" "$EMAIL_RECIPIENT" || true
        fi
        docker compose exec -T backend rm -f "/tmp/${ARCHIVE_NAME}" 2>/dev/null || true
    elif docker ps --format '{{.Names}}' | grep -q "fwcpl-backend"; then
        docker cp "$FINAL_ARCHIVE" "fwcpl-backend:/tmp/${ARCHIVE_NAME}" 2>/dev/null || true
        docker exec -i -e BACKUP_EMAIL_TO="$EMAIL_RECIPIENT" fwcpl-backend node dist/scripts/sendBackupEmail.js "/tmp/${ARCHIVE_NAME}" "$EMAIL_RECIPIENT" 2>/dev/null || \
        docker exec -i -e BACKUP_EMAIL_TO="$EMAIL_RECIPIENT" fwcpl-backend npx ts-node src/scripts/sendBackupEmail.ts "/tmp/${ARCHIVE_NAME}" "$EMAIL_RECIPIENT" || true
        docker exec -i fwcpl-backend rm -f "/tmp/${ARCHIVE_NAME}" 2>/dev/null || true
    else
        echo "  ℹ Backend container not running; email dispatch skipped."
    fi
fi

echo "=== [FWCPL] Backup Finished at $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo ""
