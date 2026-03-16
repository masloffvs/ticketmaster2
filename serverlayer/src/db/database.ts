import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

@Singleton()
export class DatabaseProvider {
  readonly client: ReturnType<typeof postgres>;
  readonly db: Database;

  constructor(@Inject(Config) private config: Config) {
    this.client = postgres(config.dbConnectionString);
    this.db = drizzle(this.client, { schema });
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
