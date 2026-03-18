FROM openresty/openresty:1.25.3.2-jammy

RUN mkdir -p /var/log/nginx /var/cache/nginx/tm /etc/nginx/lua /var/cache/decentralized \
    && chown -R nobody:nogroup /var/cache/decentralized \
    && chmod 777 /var/cache/decentralized

# lua-resty-http для proxy_fetch
RUN opm get ledgetech/lua-resty-http

# LuaFileSystem для decache status (листинг кеша)
RUN luarocks install luafilesystem 2>/dev/null || true

VOLUME /var/cache/decentralized

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /etc/nginx/lua/

EXPOSE 80
CMD ["sh", "-c", "chmod 777 /var/cache/decentralized 2>/dev/null; exec openresty -g 'daemon off;'"]
