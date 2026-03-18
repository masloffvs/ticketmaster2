import { Config } from "@/core/config";
import { Inject, Singleton } from "@/core/di";
import { Logger } from "@/core/logger";
import postgres from "postgres";

// Embed SQL at compile time — works inside bun --compile binaries
import init from "@/migrations/001_init.sql" with { type: "text" };
import emailDeliveries from "@/migrations/002_email_deliveries.sql" with {
  type: "text",
};

const MIGRATIONS: { name: string; sql: string }[] = [
  { name: "001_init.sql", sql: init },
  { name: "002_email_deliveries.sql", sql: emailDeliveries },
];

@Singleton()
export class Migrator {
  constructor(
    @Inject(Config) private config: Config,
    @Inject(Logger) private logger: Logger,
  ) {}

  async run(): Promise<void> {
    await this.ensureDatabase();
    await this.runMigrations();
  }

  private async ensureDatabase(): Promise<void> {
    const { host, port, user, password, database } = this.config.db;
    const adminUrl = `postgres://${user}:${password}@${host}:${port}/postgres`;
    const admin = postgres(adminUrl, { max: 1 });

    try {
      const result = await admin`
        SELECT 1 FROM pg_database WHERE datname = ${database}
      `;

      if (result.length === 0) {
        this.logger.info(`Creating database "${database}"...`);
        await admin.unsafe(`CREATE DATABASE "${database}"`);
        this.logger.info(`Database "${database}" created`);
      } else {
        this.logger.debug(`Database "${database}" already exists`);
      }
    } finally {
      await admin.end();
    }
  }

  private async runMigrations(): Promise<void> {
    const client = postgres(this.config.dbConnectionString, { max: 1 });

    try {
      await client.unsafe(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(512) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const applied = await client.unsafe<{ name: string }[]>(
        `SELECT name FROM _migrations ORDER BY name`,
      );
      const appliedSet = new Set(applied.map((r) => r.name));

      let ranCount = 0;
      for (const { name, sql } of MIGRATIONS) {
        if (appliedSet.has(name)) {
          this.logger.debug(`skip ${name} (already applied)`);
          continue;
        }

        if (!sql.trim()) {
          this.logger.warn(`skip ${name} (empty)`);
          continue;
        }

        this.logger.info(`running migration: ${name}`);

        await client.begin(async (tx) => {
          await tx.unsafe(sql);
          await tx.unsafe(`INSERT INTO _migrations (name) VALUES ($1)`, [name]);
        });

        this.logger.info(`applied: ${name}`);
        ranCount++;
      }

      if (ranCount === 0) {
        this.logger.info("All migrations already applied");
      } else {
        this.logger.info(`Applied ${ranCount} migration(s)`);
      }
    } finally {
      await client.end();
    }
  }
}
