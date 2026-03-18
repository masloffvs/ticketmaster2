#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:-194.76.224.148}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_KEY="${DEPLOY_KEY:-}"
DEPLOY_PASSWORD="${DEPLOY_PASSWORD:-}"
DEPLOY_DIR="${DEPLOY_DIR:-/root/ticketmaster2}"

REMOTE_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS=(
    -p "$DEPLOY_PORT"
    -o StrictHostKeyChecking=accept-new
    -o WarnWeakCrypto=no-pq-kex
    -o ServerAliveInterval=30
    -o ServerAliveCountMax=6
)

if [[ -n "$DEPLOY_KEY" ]]; then
    SSH_OPTS=(-i "$DEPLOY_KEY" "${SSH_OPTS[@]}")
fi

SSH_BASE_CMD=(ssh)
if [[ -n "$DEPLOY_PASSWORD" ]]; then
    SSH_OPTS+=(
        -o PreferredAuthentications=password
        -o PubkeyAuthentication=no
    )
    SSH_BASE_CMD=(env "SSHPASS=$DEPLOY_PASSWORD" sshpass -e ssh)
fi

DEPLOY_PATHS=(
    docker-compose.yml
    bins
    nginx-http3
    puppeteer-proxy
    serverlayer/Dockerfile
    transparency-proxy
    workerslayer/Dockerfile
)

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[1;33m'
NC=$'\033[0m'

step() { printf "\n${CYAN}▶ %s${NC}\n" "$1"; }
ok() { printf "${GREEN}✔ %s${NC}\n" "$1"; }
warn() { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
fail() { printf "${RED}✖ %s${NC}\n" "$1"; exit 1; }

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || fail "$1 not found"
}

step "preflight checks"
require_cmd ssh
require_cmd tar
require_cmd bun
require_cmd docker
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not found"
if [[ -n "$DEPLOY_PASSWORD" ]]; then
    require_cmd sshpass
fi
if [[ -n "$DEPLOY_KEY" ]]; then
    [[ -f "$DEPLOY_KEY" ]] || fail "SSH key not found: $DEPLOY_KEY"
fi
ok "local toolchain ready"

step "build artifacts"
zsh gen-certs.zsh
zsh builder.zsh
# Ensure bins/decache exists (may have been pre-warmed by cache-studio.zsh)
mkdir -p bins/decache
ok "artifacts ready"

step "connectivity check"
"${SSH_BASE_CMD[@]}" "${SSH_OPTS[@]}" "$REMOTE_TARGET" "printf 'connected to %s\n' \"\$(hostname)\""
ok "ssh connection established"

step "upload release bundle"
tar -czf - "${DEPLOY_PATHS[@]}" | "${SSH_BASE_CMD[@]}" "${SSH_OPTS[@]}" "$REMOTE_TARGET" "
  mkdir -p '$DEPLOY_DIR' '$DEPLOY_DIR/serverlayer' '$DEPLOY_DIR/workerslayer'
  rm -rf '$DEPLOY_DIR/bins' '$DEPLOY_DIR/nginx-http3' '$DEPLOY_DIR/puppeteer-proxy' '$DEPLOY_DIR/transparency-proxy'
  rm -f '$DEPLOY_DIR/docker-compose.yml' '$DEPLOY_DIR/serverlayer/Dockerfile' '$DEPLOY_DIR/workerslayer/Dockerfile'
  tar -xzf - -C '$DEPLOY_DIR'
"
ok "release uploaded to $REMOTE_TARGET:$DEPLOY_DIR"

step "remote deploy"
"${SSH_BASE_CMD[@]}" "${SSH_OPTS[@]}" "$REMOTE_TARGET" DEPLOY_DIR="$DEPLOY_DIR" 'sh -s' <<'REMOTE_SCRIPT'
set -eu

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "sudo is required to prepare the server" >&2
    exit 1
  fi
}

ensure_curl() {
  if command -v curl >/dev/null 2>&1; then
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    run_sudo dnf install -y curl
  elif command -v yum >/dev/null 2>&1; then
    run_sudo yum install -y curl
  elif command -v apt-get >/dev/null 2>&1; then
    run_sudo apt-get update
    run_sudo apt-get install -y curl
  else
    echo "curl is required but no supported package manager was found" >&2
    exit 1
  fi
}

start_docker_service() {
  if command -v systemctl >/dev/null 2>&1; then
    run_sudo systemctl enable --now docker
  else
    run_sudo service docker start
  fi
}

install_docker() {
  if [ -r /etc/os-release ]; then
    . /etc/os-release
  else
    ID="unknown"
    VERSION_ID=""
  fi

  case "$ID" in
    amazon|amzn)
      if command -v dnf >/dev/null 2>&1 && [ "${VERSION_ID:-}" = "2023" ]; then
        run_sudo dnf install -y docker || run_sudo yum install -y docker
      elif command -v amazon-linux-extras >/dev/null 2>&1; then
        run_sudo amazon-linux-extras install -y docker || run_sudo yum install -y docker
      else
        run_sudo yum install -y docker
      fi
      ;;
    ubuntu|debian)
      ensure_curl
      run_sudo sh -c 'curl -fsSL https://get.docker.com | sh'
      ;;
    *)
      ensure_curl
      run_sudo sh -c 'curl -fsSL https://get.docker.com | sh'
      ;;
  esac

  start_docker_service

  if getent group docker >/dev/null 2>&1; then
    run_sudo usermod -aG docker "$USER" || true
  fi
}

resolve_docker_cmd() {
  if docker info >/dev/null 2>&1; then
    DOCKER="docker"
  elif sudo docker info >/dev/null 2>&1; then
    DOCKER="sudo docker"
  else
    return 1
  fi
}

compose_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf "x86_64" ;;
    aarch64|arm64) printf "aarch64" ;;
    armv7l|armv6l) printf "armv7" ;;
    *) return 1 ;;
  esac
}

install_compose_plugin() {
  if command -v apt-get >/dev/null 2>&1; then
    run_sudo apt-get update
    if run_sudo apt-get install -y docker-compose-plugin; then
      return 0
    fi
  fi

  if command -v dnf >/dev/null 2>&1; then
    if run_sudo dnf install -y docker-compose-plugin; then
      return 0
    fi
  fi

  if command -v yum >/dev/null 2>&1; then
    if run_sudo yum install -y docker-compose-plugin; then
      return 0
    fi
  fi

  ensure_curl
  ARCH="$(compose_arch)" || {
    echo "unsupported architecture for Docker Compose plugin: $(uname -m)" >&2
    exit 1
  }
  TMP_FILE="$(mktemp)"
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" -o "$TMP_FILE"
  run_sudo mkdir -p /usr/local/lib/docker/cli-plugins
  run_sudo install -m 0755 "$TMP_FILE" /usr/local/lib/docker/cli-plugins/docker-compose
  rm -f "$TMP_FILE"
}

resolve_compose_cmd() {
  if $DOCKER compose version >/dev/null 2>&1; then
    COMPOSE="$DOCKER compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  elif sudo docker-compose version >/dev/null 2>&1; then
    COMPOSE="sudo docker-compose"
  else
    return 1
  fi
}

buildx_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf "amd64" ;;
    aarch64|arm64) printf "arm64" ;;
    armv7l) printf "arm-v7" ;;
    armv6l) printf "arm-v6" ;;
    *) return 1 ;;
  esac
}

resolve_buildx_version() {
  BUILDX_VERSION="$($DOCKER buildx version 2>/dev/null | sed -n 's/.* v\{0,1\}\([0-9][0-9.]*\).*/\1/p' | head -n1)"
  [ -n "${BUILDX_VERSION:-}" ]
}

version_ge() {
  MIN_VERSION="$1"
  CURRENT_VERSION="$2"
  [ "$(printf '%s\n%s\n' "$MIN_VERSION" "$CURRENT_VERSION" | sort -V | head -n1)" = "$MIN_VERSION" ]
}

install_buildx_plugin() {
  if command -v apt-get >/dev/null 2>&1; then
    run_sudo apt-get update
    if run_sudo apt-get install -y docker-buildx-plugin; then
      return 0
    fi
  fi

  if command -v dnf >/dev/null 2>&1; then
    if run_sudo dnf install -y docker-buildx-plugin; then
      return 0
    fi
  fi

  if command -v yum >/dev/null 2>&1; then
    if run_sudo yum install -y docker-buildx-plugin; then
      return 0
    fi
  fi

  ensure_curl
  ARCH="$(buildx_arch)" || {
    echo "unsupported architecture for Docker Buildx plugin: $(uname -m)" >&2
    exit 1
  }
  BUILDX_TAG="$(curl -fsSL https://api.github.com/repos/docker/buildx/releases/latest | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  if [ -z "$BUILDX_TAG" ]; then
    echo "failed to resolve the latest Docker Buildx release tag" >&2
    exit 1
  fi
  TMP_FILE="$(mktemp)"
  curl -fsSL "https://github.com/docker/buildx/releases/download/${BUILDX_TAG}/buildx-${BUILDX_TAG}.linux-${ARCH}" -o "$TMP_FILE"
  run_sudo mkdir -p /usr/local/lib/docker/cli-plugins
  run_sudo install -m 0755 "$TMP_FILE" /usr/local/lib/docker/cli-plugins/docker-buildx
  rm -f "$TMP_FILE"
}

if ! resolve_docker_cmd; then
  echo "docker is missing, installing it now"
  install_docker
  resolve_docker_cmd || {
    echo "docker installation finished, but docker is still unavailable" >&2
    exit 1
  }
fi

if ! resolve_compose_cmd; then
  echo "docker compose is missing, installing it now"
  install_compose_plugin
  resolve_compose_cmd || {
    echo "docker compose installation finished, but compose is still unavailable" >&2
    exit 1
  }
fi

MIN_BUILDX_VERSION="0.17.0"
if ! resolve_buildx_version || ! version_ge "$MIN_BUILDX_VERSION" "$BUILDX_VERSION"; then
  echo "docker buildx ${BUILDX_VERSION:-missing} is insufficient, installing/upgrading it now"
  install_buildx_plugin
  resolve_buildx_version || {
    echo "docker buildx installation finished, but buildx is still unavailable" >&2
    exit 1
  }
  if ! version_ge "$MIN_BUILDX_VERSION" "$BUILDX_VERSION"; then
    echo "docker buildx version $BUILDX_VERSION is too old, need at least $MIN_BUILDX_VERSION" >&2
    exit 1
  fi
fi

$DOCKER buildx inspect --bootstrap >/dev/null 2>&1 || true

cd "$DEPLOY_DIR"
$COMPOSE up --build -d --remove-orphans
$COMPOSE ps
REMOTE_SCRIPT
ok "remote stack is up"

printf "\n${GREEN}Server: https://%s${NC}\n" "$DEPLOY_HOST"
printf "${GREEN}Project dir: %s${NC}\n" "$DEPLOY_DIR"
