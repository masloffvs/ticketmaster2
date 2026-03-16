-- rewrite.lua
-- Перезапись URL в теле ответа через Lua body_filter
-- Ловит всё, что sub_filter не может (regex, https→http downgrade, поддомены)

local _M = {}

-- Поддомены TM, которые тоже нужно проксировать
_M.subdomain_map = {
    ["identity.ticketmaster.com"]  = "/_sub/identity",
    ["consent.ticketmaster.com"]   = "/_sub/consent",
    ["maps.ticketmaster.com"]      = "/_sub/maps",
    ["media.ticketmaster.com"]     = "/_sub/media",
    ["static.ticketmaster.com"]    = "/_sub/static",
    ["s1.ticketm.net"]             = "/_sub/s1-ticketm",
    ["cdn.cookielaw.org"]          = "/_sub/cookielaw",
    ["app.ticketmaster.com"]       = "/_sub/app",
}

-- Кешируем распарсенный PROXY_BASE_URL
local _proxy_url = nil
local _proxy_scheme = nil
local _proxy_host = nil

local function get_proxy_info()
    if _proxy_url then
        return _proxy_url, _proxy_scheme, _proxy_host
    end
    _proxy_url = os.getenv("PROXY_BASE_URL") or "https://localhost.lan"
    _proxy_scheme = _proxy_url:match("^(https?)://") or "http"
    _proxy_host = _proxy_url:gsub("^https?://", "")
    return _proxy_url, _proxy_scheme, _proxy_host
end

function _M.rewrite(body)
    if not body or body == "" then
        return body
    end

    local proxy_url, proxy_scheme, proxy_host = get_proxy_info()

    -- 1) Даунгрейд протокола: https://proxy_host → http://proxy_host
    --    (JS может строить URL через "https://" + location.host)
    if proxy_scheme == "http" then
        local escaped_host = ngx.re.gsub(proxy_host, [[\.]], "\\.", "jo")
        body = ngx.re.gsub(body,
            [[https://]] .. escaped_host,
            "http://" .. proxy_host, "ijo")

        -- JS template literals: `https://${host}` `https://${gecHost}` и т.п.
        -- В исходнике буквально "https://${" — меняем на "http://${"
        body = ngx.re.gsub(body, [[https://\$\{]], "http://${", "ijo")

        -- JS конкатенация: "https://" + host → "http://" + host
        body = ngx.re.gsub(body, [["https://"(\s*\+)]], '"http://"$1', "ijo")
        body = ngx.re.gsub(body, [['https://'(\s*\+)]], "'http://'$1", "ijo")

        -- "https://"+variable или 'https://'+
        body = ngx.re.gsub(body, [["https://"\+]], '"http://"+', "ijo")
        body = ngx.re.gsub(body, [['https://'\+]], "'http://'+", "ijo")
    end

    -- 2) Auth: identity.ticketmaster.com/sign-in → наш /sign-in
    body = ngx.re.gsub(body, [[https?://identity\.ticketmaster\.com/sign-in]], proxy_url .. "/sign-in", "ijo")
    body = ngx.re.gsub(body, [[//identity\.ticketmaster\.com/sign-in]], "//" .. proxy_host .. "/sign-in", "ijo")

    -- 3) Основной домен (regex ловит http и https)
    body = ngx.re.gsub(body, [[https?://www\.ticketmaster\.com]], proxy_url, "ijo")
    body = ngx.re.gsub(body, [[//www\.ticketmaster\.com]], "//" .. proxy_host, "ijo")
    body = ngx.re.gsub(body, [["www\.ticketmaster\.com"]], '"' .. proxy_host .. '"', "ijo")
    body = ngx.re.gsub(body, [['www\.ticketmaster\.com']], "'" .. proxy_host .. "'", "ijo")

    -- 3) Поддомены → /_sub/xxx на нашем прокси
    for domain, path in pairs(_M.subdomain_map) do
        local escaped = ngx.re.gsub(domain, [[\.]], "\\.", "jo")
        body = ngx.re.gsub(body,
            [[https?://]] .. escaped,
            proxy_url .. path, "ijo")
        body = ngx.re.gsub(body,
            [[//]] .. escaped,
            "//" .. proxy_host .. path, "ijo")
    end

    -- 4) Ловим любой оставшийся *.ticketmaster.com поддомен
    body = ngx.re.gsub(body,
        [[https?://([a-z0-9-]+)\.ticketmaster\.com]],
        proxy_url .. "/_sub/$1", "ijo")
    body = ngx.re.gsub(body,
        [[//([a-z0-9-]+)\.ticketmaster\.com]],
        "//" .. proxy_host .. "/_sub/$1", "ijo")

    return body
end

return _M
