FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY bins/server.bin /app/server.bin
RUN chmod +x /app/server.bin

EXPOSE 3000
CMD ["/app/server.bin"]
