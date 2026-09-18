#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  echo "Falta .env — copia .env.example y rellena DISCORD_TOKEN y CLIENT_ID."
  exit 1
fi
npm run build
exec node dist/index.js
