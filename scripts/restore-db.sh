#!/usr/bin/env bash
# ==============================================================================
# Fiber World Communication Pvt. Ltd. (FWCPL)
# Automated Database Restore Script (Supports PostgreSQL & SQLite)
# ==============================================================================

set -eo pipefail

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file_path>"
    echo "Example: $0 ./backups/postgres_backup_20260909_120000.sql.gz"
    echo "Example: $0 ./backups/sqlite_backup_20260909_120000.db"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' does not exist."
    exit 1
fi

echo "=== [FWCPL] Starting Database Restore from: $BACKUP_FILE ==="

if [[ "$BACKUP_FILE" == *.sql.gz ]] || [[ "$BACKUP_FILE" == *.sql ]]; then
    echo "Restoring PostgreSQL backup into 'fwcpl-db' container..."
    if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i fwcpl-db psql -U fwcpl_admin -d fwcpl_operations
    else
        cat "$BACKUP_FILE" | docker exec -i fwcpl-db psql -U fwcpl_admin -d fwcpl_operations
    fi
    echo "PostgreSQL database successfully restored."
elif [[ "$BACKUP_FILE" == *.db ]] || [[ "$BACKUP_FILE" == *.sqlite ]]; then
    echo "Restoring SQLite database to ./backend/data/fwcpl.sqlite..."
    mkdir -p ./backend/data
    cp "$BACKUP_FILE" ./backend/data/fwcpl.sqlite
    echo "SQLite database successfully restored."
else
    echo "Error: Unrecognized backup file format. Expected .sql, .sql.gz, or .db"
    exit 1
fi

echo "=== [FWCPL] Database Restore Complete ==="
