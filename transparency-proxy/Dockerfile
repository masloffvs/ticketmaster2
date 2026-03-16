FROM openresty/openresty:1.25.3.2-jammy

RUN mkdir -p /var/log/nginx /var/cache/nginx/tm /etc/nginx/lua

# lua-resty-http для proxy_fetch
RUN opm get ledgetech/lua-resty-http

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /etc/nginx/lua/

EXPOSE 80
CMD ["openresty", "-g", "daemon off;"]
