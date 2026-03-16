-- cookies.lua
-- Перезапись Set-Cookie заголовков:
--   1) Замена domain с *.ticketmaster.com / *.ticketm.net → наш прокси домен
--   2) Убираем Secure (мы на HTTP)
--   3) Меняем SameSite=None → SameSite=Lax (None требует Secure)
--   4) Убираем HttpOnly для доступа из JS (опционально, закомментировано)

local _M = {}

function _M.fix_cookies()
    local proxy_url = os.getenv("PROXY_BASE_URL") or "https://localhost.lan"
    local proxy_scheme = proxy_url:match("^(https?)://") or "https"
    local proxy_host = proxy_url:gsub("^https?://", ""):gsub(":%d+$", "")

    local cookies = ngx.header["Set-Cookie"]
    if not cookies then
        return
    end

    -- Nginx может вернуть строку (1 cookie) или таблицу (несколько)
    if type(cookies) == "string" then
        cookies = { cookies }
    end

    local fixed = {}
    for i, cookie in ipairs(cookies) do
        local c = cookie

        -- Убираем domain=.ticketmaster.com / domain=xxx.ticketmaster.com / domain=.ticketm.net
        c = ngx.re.gsub(c, [[;\s*[Dd]omain=[^;]*\.ticketmaster\.com]], "; Domain=" .. proxy_host, "jo")
        c = ngx.re.gsub(c, [[;\s*[Dd]omain=[^;]*\.ticketm\.net]], "; Domain=" .. proxy_host, "jo")
        c = ngx.re.gsub(c, [[;\s*[Dd]omain=[^;]*\.cookielaw\.org]], "; Domain=" .. proxy_host, "jo")

        -- Убираем Secure и SameSite=None только если прокси на HTTP
        if proxy_scheme == "http" then
            c = ngx.re.gsub(c, [[;\s*[Ss]ecure]], "", "jo")
            c = ngx.re.gsub(c, [[;\s*[Ss]ame[Ss]ite=[Nn]one]], "; SameSite=Lax", "jo")
        end

        fixed[i] = c
    end

    ngx.header["Set-Cookie"] = fixed
end

return _M
