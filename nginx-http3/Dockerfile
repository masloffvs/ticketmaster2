FROM openresty/openresty:1.25.3.2-alpine

RUN mkdir -p /var/log/openresty /etc/nginx/certs /var/www/weblayer /var/cache/nginx/tm_api

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

EXPOSE 80 443
CMD ["openresty", "-g", "daemon off;"]
