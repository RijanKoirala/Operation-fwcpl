#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Automated Database Backup Script (Supports PostgreSQL & SQLite)
# ==============================================================================

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "=== [FWCPL] Starting Database Backup: ${TIMESTAMP} ==="

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "fwcpl-db"; then
    echo "Backing up PostgreSQL from Docker container 'fwcpl-db'..."
    DOCKER_BACKUP_FILE="${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql.gz"
    docker exec -t fwcpl-db pg_dump -U fwcpl_admin fwcpl_operations | gzip > "$DOCKER_BACKUP_FILE"
    echo "PostgreSQL backup successfully saved to: ${DOCKER_BACKUP_FILE} ($(du -h "$DOCKER_BACKUP_FILE" | cut -f1))"
elif [ -f "./backend/data/fwcpl.sqlite" ]; then
    echo "Backing up SQLite database..."
    SQLITE_BACKUP_FILE="${BACKUP_DIR}/sqlite_backup_${TIMESTAMP}.db"
    cp "./backend/data/fwcpl.sqlite" "$SQLITE_BACKUP_FILE"
    echo "SQLite backup successfully saved to: ${SQLITE_BACKUP_FILE} ($(du -h "$SQLITE_BACKUP_FILE" | cut -f1))"
else
    echo "Error: No active database found to back up."
    exit 1
fi

# Retention policy: Keep backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -name "*backup*" -delete 2>/dev/null || true

echo "=== [FWCPL] Database Backup Complete ==="
