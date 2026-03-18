FROM openresty/openresty:1.25.3.2-alpine

RUN mkdir -p /var/log/openresty /etc/nginx/certs /var/www/weblayer /var/cache/nginx/tm_api /etc/nginx/lua

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /etc/nginx/lua/

EXPOSE 80 443
CMD ["openresty", "-g", "daemon off;"]
