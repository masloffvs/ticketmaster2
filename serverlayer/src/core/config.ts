import { Singleton } from "@/core/di";

@Singleton()
export class Config {
  readonly port = Number(Bun.env.PORT ?? 3000);
  readonly host = Bun.env.HOST ?? "0.0.0.0";

  readonly db = {
    host: Bun.env.DB_HOST ?? "localhost",
    port: Number(Bun.env.DB_PORT ?? 5432),
    user: Bun.env.DB_USER ?? "postgres",
    password: Bun.env.DB_PASSWORD ?? "postgres",
    database: Bun.env.DB_NAME ?? "ticketmaster",
  } as const;

  readonly ticketmaster = {
    consumerKey: Bun.env.TM_CONSUMER_KEY ?? "",
    consumerSecret: Bun.env.TM_CONSUMER_SECRET ?? "",
    baseUrl: Bun.env.TM_BASE_URL ?? "https://app.ticketmaster.com",
    apiVersion: Bun.env.TM_API_VERSION ?? "v2",
  } as const;

  readonly redisUrl = Bun.env.REDIS_URL ?? "redis://localhost:6379";

  readonly mongoUrl =
    Bun.env.MONGO_URL ?? "mongodb://mongo:mongo@localhost:27017";
  readonly mongoDb = Bun.env.MONGO_DB ?? "ticketmaster";

  readonly clickhouse = {
    url: Bun.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    database: Bun.env.CLICKHOUSE_DB ?? "logs",
    user: Bun.env.CLICKHOUSE_USER ?? "default",
    password: Bun.env.CLICKHOUSE_PASSWORD ?? "",
    table: "app_logs",
  } as const;

  get dbConnectionString(): string {
    const { host, port, user, password, database } = this.db;
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }
}
