#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ── colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo "\n${CYAN}▶ $1${NC}" }
ok()   { echo "${GREEN}✔ $1${NC}" }
warn() { echo "${YELLOW}⚠ $1${NC}" }
fail() { echo "${RED}✖ $1${NC}"; exit 1 }

# ── preflight checks ────────────────────────────────────────────
step "preflight checks"

command -v bun   >/dev/null 2>&1 || fail "bun not found"
command -v docker >/dev/null 2>&1 || fail "docker not found"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not found"

ok "bun $(bun --version), docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ── generate TLS certs ──────────────────────────────────────────
step "TLS certificates"
zsh gen-certs.zsh
ok "certs ready"

# ── install deps (if needed) ────────────────────────────────────
step "install dependencies"
for dir in weblayer serverlayer workerslayer ticketmaster-sdk; do
    if [[ -d "$dir" && -f "$dir/package.json" ]]; then
        pushd "$dir" > /dev/null
        if [[ ! -d "node_modules" ]]; then
            echo "  bun install in $dir/"
            bun install
        fi
        popd > /dev/null
    fi
done
ok "dependencies ready"

# ── build binaries & static ─────────────────────────────────────
step "build (builder.zsh)"
zsh builder.zsh
ok "build complete"

# ── docker compose up ────────────────────────────────────────────
step "starting docker compose"
docker compose up --build -d

ok "all services up"
echo ""
echo "${GREEN}┌────────────────────────────────────────┐"
echo "│  http://localhost        (nginx → web) │"
echo "│  https://localhost       (nginx → web) │"
echo "│  http://localhost:3000   (server API)  │"
echo "│  postgresql://localhost:5432            │"
echo "└────────────────────────────────────────┘${NC}"
echo ""
echo "logs:  docker compose logs -f"
echo "stop:  docker compose down"
