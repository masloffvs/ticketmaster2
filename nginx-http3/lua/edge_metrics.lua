-- edge_metrics.lua
-- Route-level traffic distribution tracking for the edge nginx.
-- Uses lua_shared_dict "edge_traffic" to classify every request into a
-- routing category (SPA, static, API, topology, puppeteer, transparency, etc.)

local _M = {}
local cjson = require("cjson.safe")

local dict = ngx.shared.edge_traffic

-- Map a request URI to a route category.
function _M.classify(uri, upstream)
    if uri:find("^/weblayer/") then              return "static"         end
    if uri:find("^/api/topology/") then           return "topology_api"   end
    if uri:find("^/api/worker/") then             return "worker_api"     end
    if uri:find("^/api/tm/manifest/") then        return "manifest_api"   end
    if uri:find("^/api/tm/availability/") then    return "availability_api" end
    if uri:find("^/api/tm/geometry/") then        return "geometry_api"   end
    if uri:find("^/api/proxy%-metrics") then      return "metrics"        end
    if uri:find("^/api/proxy%-recent") then       return "metrics"        end
    if uri:find("^/api/edge%-metrics") then       return "metrics"        end
    if uri:find("^/api/puppeteer/") then          return "puppeteer"      end
    if uri:find("^/api/") then                    return "serverlayer_api" end
    if uri:find("^/swagger") then                 return "serverlayer_api" end
    if uri:find("^/sign%-in") then                return "spa"            end
    if uri:find("^/shell") then                   return "spa"            end
    if uri:find("^/partner") then                 return "spa"            end
    -- SPA event pages: /event/:id or /:slug/event/:id
    if uri:find("^/event/[^/]+$") then            return "spa"            end
    if uri:find("/event/[^/]+$") then             return "spa"            end
    -- /event/:slug/:id → puppeteer render
    if uri:find("^/event/[^/]+/[^/]+$") then      return "puppeteer"      end
    -- Everything else → transparency proxy
    return "transparency"
end

-- Record a completed request. Called from log_by_lua_block.
function _M.record()
    local uri      = ngx.var.request_uri or "/"
    local status   = ngx.var.status or "0"
    local resp_len = tonumber(ngx.var.body_bytes_sent) or 0
    local req_len  = tonumber(ngx.var.content_length) or 0
    local rt       = tonumber(ngx.var.request_time) or 0
    local upstream = ngx.var.upstream_addr or ""

    local cat = _M.classify(uri, upstream)

    -- Global counters
    dict:incr("total:cnt", 1, 0)
    dict:incr("total:bytes_in", req_len, 0)
    dict:incr("total:bytes_out", resp_len, 0)

    if not dict:get("started_at") then
        dict:safe_set("started_at", ngx.now())
    end

    -- Per-category counters
    dict:incr("cat:" .. cat .. ":cnt", 1, 0)
    dict:incr("cat:" .. cat .. ":bytes", resp_len, 0)
    -- Track response time sum for average calculation
    -- Multiply by 1000 to store ms as integer (avoid float drift)
    dict:incr("cat:" .. cat .. ":rt_ms", math.floor(rt * 1000), 0)

    -- Status class per category
    local class = tostring(status):sub(1, 1) .. "xx"
    dict:incr("cat:" .. cat .. ":s:" .. class, 1, 0)

    -- Recent ring buffer (last 100 classified entries)
    local idx = dict:incr("recent_idx", 1, 0)
    local slot = ((idx - 1) % 100)
    local entry = cjson.encode({
        t   = math.floor(ngx.now() * 1000),
        cat = cat,
        m   = ngx.var.request_method,
        p   = uri:sub(1, 120),
        s   = tonumber(status),
        sz  = resp_len,
        rt  = math.floor(rt * 1000),
    })
    dict:set("rr:" .. slot, entry)
end

-- All known categories
local CATEGORIES = {
    "spa", "static", "serverlayer_api", "topology_api",
    "manifest_api", "availability_api", "geometry_api",
    "puppeteer", "transparency", "metrics",
}

function _M.to_json()
    local total_cnt  = dict:get("total:cnt") or 0
    local bytes_in   = dict:get("total:bytes_in") or 0
    local bytes_out  = dict:get("total:bytes_out") or 0
    local started_at = dict:get("started_at") or ngx.now()
    local uptime     = ngx.now() - started_at

    local categories = {}
    for _, cat in ipairs(CATEGORIES) do
        local cnt = dict:get("cat:" .. cat .. ":cnt") or 0
        local bytes = dict:get("cat:" .. cat .. ":bytes") or 0
        local rt_ms = dict:get("cat:" .. cat .. ":rt_ms") or 0
        local s2 = dict:get("cat:" .. cat .. ":s:2xx") or 0
        local s3 = dict:get("cat:" .. cat .. ":s:3xx") or 0
        local s4 = dict:get("cat:" .. cat .. ":s:4xx") or 0
        local s5 = dict:get("cat:" .. cat .. ":s:5xx") or 0

        if cnt > 0 then
            categories[#categories + 1] = {
                name     = cat,
                requests = cnt,
                bytes    = bytes,
                avgMs    = math.floor(rt_ms / cnt),
                pct      = total_cnt > 0 and (cnt / total_cnt * 100) or 0,
                status   = { ["2xx"] = s2, ["3xx"] = s3, ["4xx"] = s4, ["5xx"] = s5 },
            }
        end
    end

    -- Sort by requests desc
    table.sort(categories, function(a, b) return a.requests > b.requests end)

    return cjson.encode({
        totalRequests = total_cnt,
        bytesIn       = bytes_in,
        bytesOut      = bytes_out,
        uptimeSeconds = math.floor(uptime),
        categories    = categories,
    })
end

function _M.recent_json()
    local total = dict:get("recent_idx") or 0
    local count = total < 100 and total or 100
    local items = {}
    for i = 0, count - 1 do
        local raw = dict:get("rr:" .. i)
        if raw then
            items[#items + 1] = raw
        end
    end
    return "[" .. table.concat(items, ",") .. "]"
end

return _M
