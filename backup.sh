#!/bin/bash
set -uo pipefail

export PGPASSWORD="postgres"
CONTAINER="postgres"
DB_USER="postgres"
DB_NAME="variant"
BACKUP_DIR="$HOME/postgres_backups"
TIMESTAMP=$(date +%F_%H-%M-%S)
LOG_FILE="$BACKUP_DIR/backup.log"
DUMP_FILE="backup_$TIMESTAMP.dump"
TIMEOUT_SEC=30

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting backup..." >> "$LOG_FILE"

# 1. Dump
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/$DUMP_FILE" 2>> "$LOG_FILE"

# 2. Kill lingering connections
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" -e PAGER=cat "$CONTAINER" \
  psql -q -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'verify_test' AND pid <> pg_backend_pid();" >> "$LOG_FILE" 2>&1

# 3. Verify restore
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" dropdb -U "$DB_USER" --if-exists verify_test 2>> "$LOG_FILE"
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" createdb -U "$DB_USER" verify_test 2>> "$LOG_FILE"
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" pg_restore -U "$DB_USER" -d verify_test "/tmp/$DUMP_FILE" 2>> "$LOG_FILE"
RESTORE_EXIT=$?

if [ $RESTORE_EXIT -eq 0 ]; then
    TABLE_COUNT=$(gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" -e PAGER=cat "$CONTAINER" \
      psql -q -U "$DB_USER" -d verify_test -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    echo "[$TIMESTAMP] Backup verification PASSED ($TABLE_COUNT tables restored)" >> "$LOG_FILE"
    docker cp "$CONTAINER:/tmp/$DUMP_FILE" "$BACKUP_DIR/$DUMP_FILE"
    echo "[$TIMESTAMP] Backup saved: $DUMP_FILE" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] Backup verification FAILED (exit $RESTORE_EXIT) — dump NOT copied, investigate" >> "$LOG_FILE"
fi

# 4. Cleanup
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" -e PAGER=cat "$CONTAINER" \
  psql -q -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'verify_test' AND pid <> pg_backend_pid();" >> "$LOG_FILE" 2>&1
gtimeout $TIMEOUT_SEC docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" dropdb -U "$DB_USER" --if-exists verify_test 2>> "$LOG_FILE"
gtimeout $TIMEOUT_SEC docker exec "$CONTAINER" rm -f "/tmp/$DUMP_FILE"

# 5. Retention
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
