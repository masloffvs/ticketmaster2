import { Singleton } from "./di/index.js";

@Singleton()
export class Config {
  readonly port = Number(process.env.PORT ?? 3100);
  readonly poolSize = Number(process.env.POOL_SIZE ?? 3);
  readonly pageTimeout = Number(process.env.PAGE_TIMEOUT ?? 30_000);
  readonly waitUntil = process.env.WAIT_UNTIL ?? "networkidle2";
  readonly sessionTtlMs = 10 * 60 * 1000; // 10 min

  readonly ua =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  readonly clickhouse = {
    url: process.env.CLICKHOUSE_URL ?? "",
    database: process.env.CLICKHOUSE_DB ?? "logs",
    user: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
    table: "app_logs",
  } as const;
}
