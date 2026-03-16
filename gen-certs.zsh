#!/usr/bin/env zsh
set -euo pipefail

CERTS_DIR="nginx-http3/certs"
mkdir -p "$CERTS_DIR"

if [[ -f "$CERTS_DIR/cert.pem" && -f "$CERTS_DIR/key.pem" ]]; then
    echo "[certs] already exist, skipping"
    exit 0
fi

echo "[certs] generating self-signed cert for local dev"
openssl req -x509 -nodes -days 365 \
-newkey rsa:2048 \
-keyout "$CERTS_DIR/key.pem" \
-out "$CERTS_DIR/cert.pem" \
-subj "/CN=localhost" \
-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "[certs] done -> $CERTS_DIR/"
