import { Writable } from "node:stream";
import pino from "pino";
import { Config } from "./config.js";
import { Singleton } from "./di/index.js";

// ─── ClickHouse Transport ───────────────────────────────────────

const LEVEL_MAP: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  msg: string;
  data: string;
}

class ClickHouseTransport {
  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private tableCreated = false;
  private readonly url: string;
  private readonly database: string;
  private readonly table: string;
  private readonly user: string;
  private readonly password: string;
  private readonly batchSize = 50;
  private readonly flushIntervalMs = 2000;

  constructor(opts: {
    url: string;
    database: string;
    table: string;
    user: string;
    password: string;
  }) {
    this.url = opts.url.replace(/\/$/, "");
    this.database = opts.database;
    this.table = opts.table;
    this.user = opts.user;
    this.password = opts.password;
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  push(record: Record<string, unknown>): void {
    const level =
      LEVEL_MAP[record.level as number] ?? String(record.level ?? "info");
    const d = record.time ? new Date(record.time as number) : new Date();
    const ts = d.toISOString().replace("T", " ").replace("Z", "");
    const msg = String(record.msg ?? "");
    const service = String(record.service ?? "puppeteer-proxy");
    const env = String(record.env ?? "production");

    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (
        ![
          "level",
          "time",
          "msg",
          "service",
          "name",
          "env",
          "pid",
          "hostname",
          "v",
        ].includes(k)
      ) {
        extra[k] = v;
      }
    }

    this.buffer.push({
      timestamp: ts,
      level,
      service,
      env,
      msg,
      data: JSON.stringify(extra),
    });

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  private async ensureTable(): Promise<void> {
    if (this.tableCreated) return;

    const ddl = `
      CREATE TABLE IF NOT EXISTS ${this.database}.${this.table} (
        timestamp DateTime64(3),
        level     LowCardinality(String),
        service   LowCardinality(String),
        env       LowCardinality(String),
        msg       String,
        data      String
      ) ENGINE = MergeTree()
      ORDER BY (service, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 30 DAY
    `;

    try {
      const res = await fetch(`${this.url}/?database=${this.database}`, {
        method: "POST",
        body: ddl,
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[clickhouse] DDL failed: ${body}`);
        return;
      }
      this.tableCreated = true;
    } catch (err) {
      console.error(`[clickhouse] DDL error: ${(err as Error).message}`);
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    this.doFlush(batch).catch((err) =>
      console.error(`[clickhouse] flush error: ${(err as Error).message}`),
    );
  }

  private async doFlush(batch: LogEntry[]): Promise<void> {
    await this.ensureTable();
    const body = batch.map((row) => JSON.stringify(row)).join("\n");

    const res = await fetch(
      `${this.url}/?database=${this.database}&query=${encodeURIComponent(`INSERT INTO ${this.table} FORMAT JSONEachRow`)}`,
      {
        method: "POST",
        body,
        headers: this.authHeaders(),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[clickhouse] insert failed (${res.status}): ${text}`);
    }
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "text/plain" };
    if (this.user) h["X-ClickHouse-User"] = this.user;
    if (this.password) h["X-ClickHouse-Key"] = this.password;
    return h;
  }
}

// ─── Logger ─────────────────────────────────────────────────────

let chTransport: ClickHouseTransport | null = null;

@Singleton()
export class Logger {
  private readonly instance: pino.Logger;

  constructor(config: Config) {
    const level = (process.env.LOG_LEVEL as pino.Level) ?? "info";
    const pinoBase = {
      service: "puppeteer-proxy",
      env: process.env.NODE_ENV ?? "development",
    };

    // ClickHouse side-channel
    if (config.clickhouse.url) {
      chTransport = new ClickHouseTransport({
        url: config.clickhouse.url,
        database: config.clickhouse.database,
        table: config.clickhouse.table,
        user: config.clickhouse.user,
        password: config.clickhouse.password,
      });
      chTransport.start();
    }

    const dest = new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        const str = chunk.toString();
        if (chTransport) {
          try {
            chTransport.push(JSON.parse(str));
          } catch {
            /* skip non-JSON */
          }
        }
        process.stdout.write(str);
        callback();
      },
    });

    this.instance = pino({ level, base: pinoBase }, dest);
  }

  info(msg: string, obj?: object) {
    obj ? this.instance.info(obj, msg) : this.instance.info(msg);
  }

  error(msg: string, obj?: object) {
    obj ? this.instance.error(obj, msg) : this.instance.error(msg);
  }

  warn(msg: string, obj?: object) {
    obj ? this.instance.warn(obj, msg) : this.instance.warn(msg);
  }

  debug(msg: string, obj?: object) {
    obj ? this.instance.debug(obj, msg) : this.instance.debug(msg);
  }

  child(bindings: pino.Bindings): pino.Logger {
    return this.instance.child(bindings);
  }

  get raw(): pino.Logger {
    return this.instance;
  }

  shutdown(): void {
    if (chTransport) {
      chTransport.stop();
      chTransport = null;
    }
  }
}
