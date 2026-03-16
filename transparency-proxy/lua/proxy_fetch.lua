-- proxy_fetch.lua
-- Проксирование через внешний HTTP(S) proxy используя lua-resty-http
-- Если UPSTREAM_PROXY задан — идём через него, иначе напрямую

local http = require("resty.http")

local _M = {}

local _proxy_parsed = nil

local function parse_proxy()
    if _proxy_parsed ~= nil then
        return _proxy_parsed
    end

    local proxy_url = os.getenv("UPSTREAM_PROXY")
    if not proxy_url or proxy_url == "" then
        _proxy_parsed = false
        return false
    end

    -- Парсим http://user:pass@host:port или socks5://host:port
    local scheme, userinfo, host, port = proxy_url:match("^(https?)://(.+@)?([^:/ ]+):(%d+)")
    if not scheme then
        scheme, host, port = proxy_url:match("^(socks5)://([^:/ ]+):(%d+)")
    end

    if not host then
        ngx.log(ngx.ERR, "proxy_fetch: invalid UPSTREAM_PROXY: ", proxy_url)
        _proxy_parsed = false
        return false
    end

    local user, pass
    if userinfo then
        user, pass = userinfo:gsub("@$", ""):match("^([^:]+):(.+)$")
    end

    _proxy_parsed = {
        scheme = scheme,
        host = host,
        port = tonumber(port),
        user = user,
        pass = pass,
    }

    return _proxy_parsed
end

function _M.is_configured()
    return parse_proxy() ~= false
end

-- Выполняет запрос к target через upstream proxy
-- Возвращает status, headers, body
function _M.fetch(target_url, method, headers, body)
    local proxy_info = parse_proxy()

    local httpc = http.new()
    httpc:set_timeout(15000)

    if proxy_info then
        -- Подключаемся через HTTP CONNECT proxy
        local ok, err = httpc:connect({
            scheme = "https",
            host = "www.ticketmaster.com",
            port = 443,
            ssl_verify = false,
            proxy_opts = {
                http_proxy = "http://" .. (proxy_info.user and (proxy_info.user .. ":" .. proxy_info.pass .. "@") or "") .. proxy_info.host .. ":" .. proxy_info.port,
                https_proxy = "http://" .. (proxy_info.user and (proxy_info.user .. ":" .. proxy_info.pass .. "@") or "") .. proxy_info.host .. ":" .. proxy_info.port,
            },
        })

        if not ok then
            ngx.log(ngx.ERR, "proxy_fetch: connect failed: ", err)
            return nil, err
        end
    else
        local ok, err = httpc:connect({
            scheme = "https",
            host = "www.ticketmaster.com",
            port = 443,
            ssl_verify = false,
        })

        if not ok then
            ngx.log(ngx.ERR, "proxy_fetch: direct connect failed: ", err)
            return nil, err
        end
    end

    local res, err = httpc:request({
        path = target_url,
        method = method or "GET",
        headers = headers,
        body = body,
    })

    if not res then
        ngx.log(ngx.ERR, "proxy_fetch: request failed: ", err)
        return nil, err
    end

    local response_body = res:read_body()
    local response_headers = {}
    for k, v in pairs(res.headers) do
        response_headers[k] = v
    end

    httpc:set_keepalive()

    return res.status, response_headers, response_body
end

return _M
