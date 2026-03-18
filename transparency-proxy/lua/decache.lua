-- decache.lua
-- "Decentralized" persistent cache for static assets (CSS, JS, fonts, images).
-- Fetches from upstream exactly once, verifies 200, caches to disk.
-- Subsequent requests are served from the local filesystem — no more proxying.
-- Adds x-decentralized-at header with the timestamp of when the asset was cached.

local http   = require("resty.http")
local cjson  = require("cjson.safe")

local _M = {}

local CACHE_DIR = "/var/cache/decentralized"

-- ── helpers ──────────────────────────────────────────────────────

local function cache_key(uri)
    -- Strip query string for cache key (static assets don't vary by qs)
    local path = uri:match("^([^?]+)") or uri
    return ngx.md5(path)
end

local function meta_path(key)
    return CACHE_DIR .. "/" .. key .. ".meta"
end

local function data_path(key)
    return CACHE_DIR .. "/" .. key .. ".data"
end

local function file_exists(path)
    local f = io.open(path, "rb")
    if f then
        f:close()
        return true
    end
    return false
end

local function read_file(path)
    local f = io.open(path, "rb")
    if not f then return nil end
    local content = f:read("*a")
    f:close()
    return content
end

local function write_file(path, content)
    local f = io.open(path, "wb")
    if not f then
        ngx.log(ngx.ERR, "decache: cannot write ", path)
        return false
    end
    f:write(content)
    f:close()
    return true
end

-- ── serve from cache or fetch once ──────────────────────────────

function _M.serve(uri)
    local key = cache_key(uri)
    local mp  = meta_path(key)
    local dp  = data_path(key)

    -- 1) Try persistent disk cache
    if file_exists(mp) and file_exists(dp) then
        local meta = cjson.decode(read_file(mp))
        if meta then
            local body = read_file(dp)
            if body then
                ngx.status = 200
                ngx.header["Content-Type"]       = meta.content_type or "application/octet-stream"
                ngx.header["x-decentralized-at"] = meta.cached_at
                ngx.header["x-decentralized"]    = "hit"
                ngx.header["Cache-Control"]      = "public, max-age=31536000, immutable"
                ngx.header["Access-Control-Allow-Origin"] = "*"
                ngx.header["Server"] = "nginx"
                ngx.print(body)

                -- fire-and-forget metrics
                local ok, m = pcall(require, "metrics")
                if ok then m.record() end

                return ngx.exit(200)
            end
        end
    end

    -- 2) Not cached — fetch from upstream (exactly once)
    local target_host = "www.ticketmaster.com"

    local httpc = http.new()
    httpc:set_timeout(15000)

    -- Optionally go through UPSTREAM_PROXY
    local proxy_url_env = os.getenv("UPSTREAM_PROXY")
    local connect_opts = {
        scheme     = "https",
        host       = target_host,
        port       = 443,
        ssl_verify = false,
    }
    if proxy_url_env and proxy_url_env ~= "" then
        connect_opts.proxy_opts = {
            http_proxy  = proxy_url_env,
            https_proxy = proxy_url_env,
        }
    end

    local ok, err = httpc:connect(connect_opts)
    if not ok then
        ngx.log(ngx.ERR, "decache: connect failed: ", err)
        ngx.status = 502
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"upstream connect failed"}')
        return ngx.exit(502)
    end

    local res, req_err = httpc:request({
        path    = uri,
        method  = "GET",
        headers = {
            ["Host"]            = target_host,
            ["Accept-Encoding"] = "identity",
            ["User-Agent"]      = ngx.var.http_user_agent or "Mozilla/5.0",
            ["Accept"]          = ngx.var.http_accept or "*/*",
            ["Accept-Language"]  = ngx.var.http_accept_language or "en-US,en;q=0.9",
            ["Referer"]         = "https://" .. target_host .. "/",
            ["Connection"]      = "keep-alive",
        },
    })

    if not res then
        ngx.log(ngx.ERR, "decache: request failed: ", req_err)
        ngx.status = 502
        ngx.header["Content-Type"] = "application/json"
        ngx.say('{"error":"upstream request failed"}')
        return ngx.exit(502)
    end

    local status       = res.status
    local response_body = res:read_body()
    local content_type  = res.headers["Content-Type"] or "application/octet-stream"

    httpc:set_keepalive()

    -- 3) Only persist 200 responses
    if status == 200 and response_body and #response_body > 0 then
        -- Rewrite TM domains in textual content
        if content_type:find("text/", 1, true)
            or content_type:find("javascript", 1, true)
            or content_type:find("json", 1, true)
            or content_type:find("css", 1, true)
        then
            local rewrite = require("rewrite")
            local rewritten = rewrite.rewrite(response_body)
            if rewritten then
                response_body = rewritten
            end
        end

        local cached_at = ngx.http_time(ngx.time())

        local meta = {
            content_type = content_type,
            cached_at    = cached_at,
            uri          = uri,
            size         = #response_body,
        }

        write_file(dp, response_body)
        write_file(mp, cjson.encode(meta))

        ngx.status = 200
        ngx.header["Content-Type"]       = content_type
        ngx.header["x-decentralized-at"] = cached_at
        ngx.header["x-decentralized"]    = "miss"
        ngx.header["Cache-Control"]      = "public, max-age=31536000, immutable"
        ngx.header["Access-Control-Allow-Origin"] = "*"
        ngx.header["Server"] = "nginx"
        ngx.print(response_body)
        return ngx.exit(200)
    end

    -- 4) Non-200: pass through without caching
    ngx.status = status
    ngx.header["Content-Type"] = content_type
    ngx.header["x-decentralized"] = "skip"
    ngx.header["Access-Control-Allow-Origin"] = "*"
    ngx.header["Server"] = "nginx"
    if response_body then
        ngx.print(response_body)
    end
    return ngx.exit(status)
end

-- ── API: cache status / introspection ───────────────────────────

function _M.status()
    local lfs_ok, lfs = pcall(require, "lfs")

    local files = 0
    local total_size = 0
    local entries = {}

    if lfs_ok then
        for name in lfs.dir(CACHE_DIR) do
            if name:match("%.meta$") then
                local raw = read_file(CACHE_DIR .. "/" .. name)
                local meta = cjson.decode(raw)
                if meta then
                    files = files + 1
                    total_size = total_size + (meta.size or 0)
                    entries[#entries + 1] = {
                        uri        = meta.uri,
                        size       = meta.size,
                        cached_at  = meta.cached_at,
                        type       = meta.content_type,
                    }
                end
            end
        end
    else
        -- Fallback: use shell to list files
        local handle = io.popen("ls " .. CACHE_DIR .. "/*.meta 2>/dev/null | wc -l")
        if handle then
            files = tonumber(handle:read("*a")) or 0
            handle:close()
        end
    end

    return cjson.encode({
        cached_assets = files,
        total_bytes   = total_size,
        cache_dir     = CACHE_DIR,
        entries       = entries,
    })
end

-- ── API: purge cache ────────────────────────────────────────────

function _M.purge()
    os.execute("rm -f " .. CACHE_DIR .. "/*.meta " .. CACHE_DIR .. "/*.data")
    return cjson.encode({ status = "purged" })
end

-- ── warm: crawl a page → discover & cache all static assets ─────

local function fetch_raw(target_host, uri)
    local httpc = http.new()
    httpc:set_timeout(20000)

    local proxy_url_env = os.getenv("UPSTREAM_PROXY")
    local connect_opts = {
        scheme     = "https",
        host       = target_host,
        port       = 443,
        ssl_verify = false,
    }
    if proxy_url_env and proxy_url_env ~= "" then
        connect_opts.proxy_opts = {
            http_proxy  = proxy_url_env,
            https_proxy = proxy_url_env,
        }
    end

    local ok, err = httpc:connect(connect_opts)
    if not ok then return nil, err end

    local res, req_err = httpc:request({
        path    = uri,
        method  = "GET",
        headers = {
            ["Host"]            = target_host,
            ["Accept-Encoding"] = "identity",
            ["User-Agent"]      = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            ["Accept"]          = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            ["Accept-Language"] = "en-US,en;q=0.9",
            ["Referer"]         = "https://" .. target_host .. "/",
            ["Connection"]      = "keep-alive",
        },
    })

    if not res then return nil, req_err end

    local body = res:read_body()
    local ct   = res.headers["Content-Type"] or ""
    httpc:set_keepalive()

    return { status = res.status, body = body, content_type = ct }
end

-- Parse HTML/CSS for static asset URLs
local function extract_asset_urls(html, base_host)
    local urls = {}
    local seen = {}

    -- Helper: normalize a URL to a path
    local function add(raw_url)
        if not raw_url or raw_url == "" then return end
        local path = raw_url
        -- Strip protocol + host
        path = path:gsub("^https?://[^/]+", "")
        -- Strip protocol-relative
        path = path:gsub("^//[^/]+", "")
        -- Must start with / and be a static asset
        if path:sub(1, 1) ~= "/" then return end
        if not path:match("%.(css|js|woff2?|ttf|eot|svg|ico|png|jpg|jpeg|gif|webp)") then return end
        -- Strip query string for dedup
        local clean = path:match("^([^?#]+)") or path
        if not seen[clean] then
            seen[clean] = true
            urls[#urls + 1] = clean
        end
    end

    -- <link href="...">
    for url in html:gmatch('<link[^>]+href="([^"]+)"') do add(url) end
    for url in html:gmatch("<link[^>]+href='([^']+)'") do add(url) end

    -- <script src="...">
    for url in html:gmatch('<script[^>]+src="([^"]+)"') do add(url) end
    for url in html:gmatch("<script[^>]+src='([^']+)'") do add(url) end

    -- <img src="...">
    for url in html:gmatch('<img[^>]+src="([^"]+)"') do add(url) end

    -- url(...) in inline styles / CSS
    for url in html:gmatch("url%(([\"']?)([^%)\"']+)%1%)") do add(url) end

    -- <link ... as="font" / preload
    for url in html:gmatch('<link[^>]+href="([^"]+)"[^>]+as="font"') do add(url) end

    return urls
end

-- cache_asset: fetch a single asset URL and persist to decache dir
local function cache_asset(uri)
    local key = cache_key(uri)
    local mp  = meta_path(key)
    local dp  = data_path(key)

    -- Already cached?
    if file_exists(mp) and file_exists(dp) then
        return "hit"
    end

    local target_host = "www.ticketmaster.com"
    local resp, err = fetch_raw(target_host, uri)
    if not resp then
        return "error: " .. (err or "unknown")
    end

    if resp.status ~= 200 or not resp.body or #resp.body == 0 then
        return "skip:" .. tostring(resp.status)
    end

    local body = resp.body
    local ct   = resp.content_type

    -- Rewrite domains in text content
    if ct:find("text/", 1, true)
        or ct:find("javascript", 1, true)
        or ct:find("json", 1, true)
        or ct:find("css", 1, true)
    then
        local rewrite = require("rewrite")
        body = rewrite.rewrite(body)

        -- Recursively discover assets from CSS files
        if ct:find("css", 1, true) then
            local nested = extract_asset_urls(body, "www.ticketmaster.com")
            for _, nested_uri in ipairs(nested) do
                cache_asset(nested_uri) -- one level recursion
            end
        end
    end

    local cached_at = ngx.http_time(ngx.time())
    local meta = {
        content_type = ct,
        cached_at    = cached_at,
        uri          = uri,
        size         = #body,
    }

    write_file(dp, body)
    write_file(mp, cjson.encode(meta))

    return "cached"
end

function _M.warm(pages)
    if not pages or #pages == 0 then
        pages = { "/" }
    end

    local results = {}
    local total_cached  = 0
    local total_hit     = 0
    local total_skipped = 0
    local total_errors  = 0

    for _, page_uri in ipairs(pages) do
        local page_result = { page = page_uri, assets = {} }

        -- 1. Fetch the HTML page
        local resp, err = fetch_raw("www.ticketmaster.com", page_uri)
        if not resp then
            page_result.error = "fetch failed: " .. (err or "unknown")
            total_errors = total_errors + 1
            results[#results + 1] = page_result
        elseif resp.status ~= 200 then
            page_result.error = "HTTP " .. tostring(resp.status)
            total_errors = total_errors + 1
            results[#results + 1] = page_result
        else
            -- 2. Discover asset URLs from the HTML
            local asset_urls = extract_asset_urls(resp.body, "www.ticketmaster.com")
            page_result.discovered = #asset_urls

            -- 3. Cache each asset
            for _, asset_uri in ipairs(asset_urls) do
                local status = cache_asset(asset_uri)
                page_result.assets[#page_result.assets + 1] = {
                    uri    = asset_uri,
                    status = status,
                }
                if status == "cached" then
                    total_cached = total_cached + 1
                elseif status == "hit" then
                    total_hit = total_hit + 1
                elseif status:sub(1, 4) == "skip" then
                    total_skipped = total_skipped + 1
                else
                    total_errors = total_errors + 1
                end
            end

            results[#results + 1] = page_result
        end
    end

    return cjson.encode({
        pages         = results,
        summary       = {
            pages_crawled  = #pages,
            newly_cached   = total_cached,
            already_cached = total_hit,
            skipped        = total_skipped,
            errors         = total_errors,
        },
    })
end

return _M
