#!/bin/sh
set -e
mkdir -p /app/data /app/backups
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data /app/backups 2>/dev/null || true
  exec gosu node "$@"
fi
exec "$@"
