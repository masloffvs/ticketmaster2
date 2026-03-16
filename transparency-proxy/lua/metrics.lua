-- metrics.lua
-- Approximate traffic accounting via lua_shared_dict "traffic"

local _M = {}
local cjson = require("cjson.safe")

local dict = ngx.shared.traffic

-- Ring buffer size for recent requests
local RECENT_MAX = 200

function _M.record()
    dict:incr("req_count", 1, 0)

    -- Request size
    local req_len = tonumber(ngx.var.content_length) or 0
    if req_len > 0 then
        dict:incr("bytes_in", req_len, 0)
    end

    -- Response size
    local resp_len = tonumber(ngx.var.body_bytes_sent) or 0
    if resp_len > 0 then
        dict:incr("bytes_out", resp_len, 0)
    end

    -- Start time
    if not dict:get("started_at") then
        dict:safe_set("started_at", ngx.now())
    end

    -- Status code counts: status:<code>
    local status = ngx.var.status or "0"
    dict:incr("status:" .. status, 1, 0)

    -- Status class counts
    local class = tostring(status):sub(1, 1) .. "xx"
    dict:incr("class:" .. class, 1, 0)

    -- Host breakdown
    local host = ngx.var.proxy_host or ngx.var.upstream_addr or "unknown"
    dict:incr("host:" .. host .. ":cnt", 1, 0)
    if resp_len > 0 then
        dict:incr("host:" .. host .. ":bytes", resp_len, 0)
    end

    -- Content-type category
    local ct = ngx.header["Content-Type"] or ""
    local ct_cat = "other"
    if ct:find("html", 1, true) then ct_cat = "html"
    elseif ct:find("javascript", 1, true) then ct_cat = "js"
    elseif ct:find("css", 1, true) then ct_cat = "css"
    elseif ct:find("json", 1, true) then ct_cat = "json"
    elseif ct:find("image", 1, true) then ct_cat = "image"
    elseif ct:find("font", 1, true) or ct:find("woff", 1, true) then ct_cat = "font"
    end
    dict:incr("ct:" .. ct_cat, 1, 0)

    -- Ring buffer of recent requests
    local idx = dict:incr("recent_idx", 1, 0)
    local slot = ((idx - 1) % RECENT_MAX)
    local entry = cjson.encode({
        t  = math.floor(ngx.now() * 1000),
        m  = ngx.var.request_method,
        p  = ngx.var.request_uri,
        s  = tonumber(status),
        sz = resp_len,
        rt = tonumber(ngx.var.request_time) or 0,
    })
    dict:set("rr:" .. slot, entry)
end

-- Helpers to collect prefixed keys
local function collect_prefix(prefix)
    local keys = dict:get_keys(0)
    local result = {}
    local plen = #prefix
    for _, k in ipairs(keys) do
        if k:sub(1, plen) == prefix and not k:find(":", plen + 1) then
            -- simple prefix:value keys only (skip host:x:bytes etc.)
        end
    end
    return result
end

function _M.to_json()
    local req_count  = dict:get("req_count")  or 0
    local bytes_in   = dict:get("bytes_in")   or 0
    local bytes_out  = dict:get("bytes_out")  or 0
    local started_at = dict:get("started_at") or ngx.now()
    local uptime     = ngx.now() - started_at

    -- Collect status classes
    local classes = {}
    for _, c in ipairs({"2xx", "3xx", "4xx", "5xx"}) do
        classes[c] = dict:get("class:" .. c) or 0
    end

    -- Collect content type categories
    local ct_cats = {}
    for _, c in ipairs({"html", "js", "css", "json", "image", "font", "other"}) do
        ct_cats[c] = dict:get("ct:" .. c) or 0
    end

    -- Collect host breakdown from keys
    local keys = dict:get_keys(0)
    local hosts = {}
    local seen_hosts = {}
    for _, k in ipairs(keys) do
        local h = k:match("^host:(.+):cnt$")
        if h and not seen_hosts[h] then
            seen_hosts[h] = true
            hosts[#hosts + 1] = {
                host = h,
                requests = dict:get("host:" .. h .. ":cnt") or 0,
                bytes = dict:get("host:" .. h .. ":bytes") or 0,
            }
        end
    end
    -- Sort by requests desc
    table.sort(hosts, function(a, b) return a.requests > b.requests end)

    local result = {
        requests = req_count,
        bytesIn = bytes_in,
        bytesOut = bytes_out,
        uptimeSeconds = math.floor(uptime),
        statusClasses = classes,
        contentTypes = ct_cats,
        hosts = hosts,
    }

    return cjson.encode(result)
end

function _M.recent_json()
    local total = dict:get("recent_idx") or 0
    local count = total < RECENT_MAX and total or RECENT_MAX
    local items = {}
    for i = 0, count - 1 do
        local raw = dict:get("rr:" .. i)
        if raw then
            items[#items + 1] = raw
        end
    end
    -- Return as JSON array of raw JSON strings
    return "[" .. table.concat(items, ",") .. "]"
end

return _M
