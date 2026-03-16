FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY bins/workerslayer.bin /app/workerslayer.bin
RUN chmod +x /app/workerslayer.bin

CMD ["/app/workerslayer.bin"]
