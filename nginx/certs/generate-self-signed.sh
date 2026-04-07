#!/usr/bin/env bash
# Create fullchain.pem + privkey.pem for local/testing. Replace with Let's Encrypt for production.
# Run on the server from repo root:
#   bash nginx/certs/generate-self-signed.sh
# Then: docker compose -f docker-compose.prod.yml up -d nginx

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR"
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -days 365 \
  -subj "/CN=bloxblitz-admin"
chmod 600 "$DIR/privkey.pem"
echo "OK: wrote $DIR/fullchain.pem and $DIR/privkey.pem"
