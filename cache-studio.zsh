#!/usr/bin/env zsh
set -euo pipefail
# ╔═══════════════════════════════════════════════════════════════════╗
# ║  cache-studio.zsh — pre-warm the decentralized cache locally    ║
# ║                                                                   ║
# ║  Spins up transparency-proxy + puppeteer-proxy in Docker.        ║
# ║  Puppeteer (headless Chrome) renders TM pages — bypasses bot     ║
# ║  protection. Asset URLs are extracted from the rendered HTML,     ║
# ║  then each asset is fetched through the transparency-proxy,      ║
# ║  which triggers decache.serve() and persists to disk.            ║
# ║  The cache bundle lands in ./bins/decache/ and ships with deploy.║
# ╚═══════════════════════════════════════════════════════════════════╝

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ── Config ──────────────────────────────────────────────────────────
CACHE_HOST_DIR="$ROOT_DIR/bins/decache"
PROXY_PORT="${CACHE_STUDIO_PORT:-9876}"
PUPPETEER_PORT="${CACHE_STUDIO_PUPPETEER_PORT:-9877}"
STUDIO_NET="cache-studio-net"
C_PROXY="cache-studio-proxy"
C_PUPPET="cache-studio-puppeteer"

# Pages to crawl (TM paths)
WARM_PAGES=(
  "/"
  "/discover"
  "/concerts"
  "/sport"
  "/arts"
  "/family"
)

# ── Colors ──────────────────────────────────────────────────────────
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[1;33m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'

step()  { printf "\n${CYAN}▶ %s${NC}\n" "$1"; }
ok()    { printf "${GREEN}✔ %s${NC}\n" "$1"; }
warn()  { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
fail()  { printf "${RED}✖ %s${NC}\n" "$1"; exit 1; }
info()  { printf "${DIM}  %s${NC}\n" "$1"; }

PROXY_BASE="http://localhost:${PROXY_PORT}"
PUPPET_BASE="http://localhost:${PUPPETEER_PORT}"

# ── Cleanup trap ────────────────────────────────────────────────────
cleanup() {
  info "cleaning up containers..."
  docker rm -f "$C_PROXY" "$C_PUPPET" &>/dev/null || true
  docker network rm "$STUDIO_NET" &>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Preflight ───────────────────────────────────────────────────────
step "preflight"
command -v docker >/dev/null 2>&1 || fail "docker not found"
command -v curl   >/dev/null 2>&1 || fail "curl not found"
command -v jq     >/dev/null 2>&1 || warn "jq not found — output will be raw JSON"
ok "tools ready"

# ── Prepare cache dir ──────────────────────────────────────────────
step "prepare cache directory"
mkdir -p "$CACHE_HOST_DIR"
info "cache dir: $CACHE_HOST_DIR"
EXISTING=$(find "$CACHE_HOST_DIR" -name "*.meta" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$EXISTING" -gt 0 ]]; then
  info "found $EXISTING existing cached assets (will be reused)"
fi
ok "cache dir ready"

# ── Build images ───────────────────────────────────────────────────
step "build images"
docker build -t cache-studio-tp \
  -f transparency-proxy/Dockerfile \
  transparency-proxy/ \
  2>&1 | tail -3
docker build -t cache-studio-pp \
  -f puppeteer-proxy/Dockerfile \
  puppeteer-proxy/ \
  2>&1 | tail -3
ok "images built"

# ── Create network & start containers ──────────────────────────────
step "start cache-studio containers"
docker rm -f "$C_PROXY" "$C_PUPPET" &>/dev/null || true
docker network rm "$STUDIO_NET" &>/dev/null || true
docker network create "$STUDIO_NET" &>/dev/null

# Transparency proxy
docker run -d \
  --name "$C_PROXY" \
  --network "$STUDIO_NET" \
  -p "${PROXY_PORT}:80" \
  -e PROXY_BASE_URL="${PROXY_BASE}" \
  -v "$CACHE_HOST_DIR:/var/cache/decentralized" \
  cache-studio-tp

# Puppeteer proxy
docker run -d \
  --name "$C_PUPPET" \
  --network "$STUDIO_NET" \
  -p "${PUPPETEER_PORT}:3100" \
  -e PORT=3100 \
  -e POOL_SIZE=2 \
  -e PAGE_TIMEOUT=45000 \
  --shm-size=1g \
  cache-studio-pp

info "transparency-proxy → localhost:$PROXY_PORT"
info "puppeteer-proxy    → localhost:$PUPPETEER_PORT"

# Wait for both to be healthy
info "waiting for services..."
for i in {1..60}; do
  tp_ok=false
  pp_ok=false
  curl -sf "${PROXY_BASE}/health" >/dev/null 2>&1 && tp_ok=true
  curl -sf "${PUPPET_BASE}/health" >/dev/null 2>&1 && pp_ok=true
  if $tp_ok && $pp_ok; then break; fi
  if [[ $i -eq 60 ]]; then
    $tp_ok || warn "transparency-proxy not ready"
    $pp_ok || warn "puppeteer-proxy not ready"
    docker logs "$C_PROXY" --tail 10 2>/dev/null || true
    docker logs "$C_PUPPET" --tail 10 2>/dev/null || true
    fail "services failed to start within 60s"
  fi
  sleep 1
done
ok "both services healthy"

# ── Helper: extract static asset URLs from HTML file ───────────────
extract_assets_from_file() {
  local file="$1"
  {
    # href="...static_asset..."
    grep -oEi 'href="[^"]*\.(css|js|woff2?|ttf|eot|svg|ico|png|jpe?g|gif|webp)(\?[^"]*)?"' "$file" \
      | sed -E 's/^href="//; s/"$//' || true

    # src="...static_asset..."
    grep -oEi 'src="[^"]*\.(css|js|woff2?|ttf|eot|svg|ico|png|jpe?g|gif|webp)(\?[^"]*)?"' "$file" \
      | sed -E 's/^src="//; s/"$//' || true

    # url(...)  in CSS
    grep -oE "url\(['\"]?[^)]*\.(css|js|woff2?|ttf|eot|svg|ico|png|jpe?g|gif|webp)[^)]*['\"]?\)" "$file" \
      | sed -E "s/^url\(['\"]?//; s/['\"]?\)$//" || true
  } | grep -Ei '(^/|ticketmaster\.com|ticketm\.net)' \
    | grep -viE '(googletagmanager|google-analytics|googleapis|cookielaw|facebook|twitter|doubleclick|cloudflare|braze|branch\.io|newrelic|datadome|akamai)' \
    | sed -E 's|^https?://[^/]+||; s|^//[^/]+||' \
    | grep '^/' \
    | sed -E 's/#.*//' \
    | sort -u
}

# ── Warm the cache ─────────────────────────────────────────────────
step "warming cache (crawling ${#WARM_PAGES[@]} pages via puppeteer)"

TOTAL_ASSETS=0
TOTAL_FETCHED=0
TOTAL_FAILED=0

TMPDIR_STUDIO=$(mktemp -d)

for page in "${WARM_PAGES[@]}"; do
  info "rendering page: $page"

  # 1) Render the page via puppeteer (bypasses Akamai bot protection)
  TM_URL="https://www.ticketmaster.com${page}"
  ENCODED_URL=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$TM_URL")

  HTML_FILE="${TMPDIR_STUDIO}/page_$(echo "$page" | tr '/' '_').html"

  # Fetch rendered HTML — puppeteer returns HTML directly (no &format=json needed)
  HTTP_CODE=$(curl -s -o "$HTML_FILE" -w "%{http_code}" --max-time 90 \
    "${PUPPET_BASE}/render?url=${ENCODED_URL}" 2>/dev/null || echo "000")

  HTML_LEN=$(wc -c < "$HTML_FILE" 2>/dev/null || echo 0)

  if [[ "$HTTP_CODE" != "200" || "$HTML_LEN" -lt 500 ]]; then
    warn "  page $page: HTTP ${HTTP_CODE}, ${HTML_LEN} bytes — skipping"
    continue
  fi

  info "  rendered HTML: ${HTML_LEN} bytes"

  # 2) Extract all static asset URLs from the rendered HTML
  ASSET_FILE="${TMPDIR_STUDIO}/assets_$(echo "$page" | tr '/' '_').txt"
  extract_assets_from_file "$HTML_FILE" > "$ASSET_FILE" || true
  ASSET_COUNT=$(wc -l < "$ASSET_FILE" | tr -d ' ')
  info "  discovered $ASSET_COUNT static assets"
  TOTAL_ASSETS=$((TOTAL_ASSETS + ASSET_COUNT))

  if [[ "$ASSET_COUNT" -eq 0 ]]; then
    continue
  fi

  # 3) Fetch each asset through the transparency-proxy → triggers decache.serve()
  PAGE_FETCHED=0
  PAGE_FAILED=0

  while IFS= read -r asset_url; do
    [[ -z "$asset_url" ]] && continue
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "${PROXY_BASE}${asset_url}" 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]]; then
      PAGE_FETCHED=$((PAGE_FETCHED + 1))
    else
      PAGE_FAILED=$((PAGE_FAILED + 1))
    fi
  done < "$ASSET_FILE"

  TOTAL_FETCHED=$((TOTAL_FETCHED + PAGE_FETCHED))
  TOTAL_FAILED=$((TOTAL_FAILED + PAGE_FAILED))

  CACHED_SO_FAR=$(find "$CACHE_HOST_DIR" -name "*.data" 2>/dev/null | wc -l | tr -d ' ')
  info "  fetched: $PAGE_FETCHED  failed: $PAGE_FAILED  (total cache: $CACHED_SO_FAR)"
done

ok "warm complete: fetched=$TOTAL_FETCHED  failed=$TOTAL_FAILED  total_discovered=$TOTAL_ASSETS"

# ── CSS deep scan ──────────────────────────────────────────────────
step "deep scan: extracting font/image URLs from cached CSS"

CSS_EXTRA=0
for meta_file in "$CACHE_HOST_DIR"/*.meta(N); do
  [[ -f "$meta_file" ]] || continue
  if grep -q '"content_type".*css' "$meta_file" 2>/dev/null; then
    data_file="${meta_file%.meta}.data"
    [[ -f "$data_file" ]] || continue

    CSS_ASSET_FILE="${TMPDIR_STUDIO}/css_assets.txt"
    extract_assets_from_file "$data_file" > "$CSS_ASSET_FILE" || true

    while IFS= read -r css_url; do
      [[ -z "$css_url" ]] && continue
      http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${PROXY_BASE}${css_url}" 2>/dev/null || echo "000")
      if [[ "$http_code" == "200" ]]; then
        CSS_EXTRA=$((CSS_EXTRA + 1))
      fi
    done < "$CSS_ASSET_FILE"
  fi
done

AFTER_DEEP=$(find "$CACHE_HOST_DIR" -name "*.data" 2>/dev/null | wc -l | tr -d ' ')
info "after deep scan: $AFTER_DEEP total cached assets (+$CSS_EXTRA from CSS)"

rm -rf "$TMPDIR_STUDIO"

# ── Get final cache status ─────────────────────────────────────────
step "cache status"
STATUS=$(curl -sf "${PROXY_BASE}/decache/status" 2>/dev/null || echo "{}")
if command -v jq &>/dev/null; then
  echo "$STATUS" | jq -r '"  cached assets:  \(.cached_assets // 0)\n  total size:      \((.total_bytes // 0) / 1048576 | . * 100 | floor / 100) MB"' 2>/dev/null || echo "$STATUS"
else
  echo "$STATUS"
fi

# ── Count local files ──────────────────────────────────────────────
CACHED_FILES=$(find "$CACHE_HOST_DIR" -name "*.data" 2>/dev/null | wc -l | tr -d ' ')
CACHE_SIZE=$(du -sh "$CACHE_HOST_DIR" 2>/dev/null | cut -f1)

ok "cache bundle: ${CACHED_FILES} assets, ${CACHE_SIZE}"

# ── Stop containers ────────────────────────────────────────────────
step "cleanup"
docker rm -f "$C_PROXY" "$C_PUPPET" &>/dev/null || true
docker network rm "$STUDIO_NET" &>/dev/null || true
ok "containers removed"

# ── Done ───────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}═══════════════════════════════════════════════${NC}\n"
printf "${BOLD}${GREEN}  Cache studio complete!${NC}\n"
printf "${BOLD}${GREEN}  ${CACHED_FILES} assets → bins/decache/${NC}\n"
printf "${BOLD}${GREEN}  Size: ${CACHE_SIZE}${NC}\n"
printf "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}\n"
printf "\n${DIM}  Run ${CYAN}./deploy.zsh${DIM} to ship this cache to production.${NC}\n\n"
