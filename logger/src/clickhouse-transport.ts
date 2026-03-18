import type { LogEvent } from "pino";

/**
 * ClickHouse transport for Pino.
 *
 * Buffers log entries and flushes them via HTTP INSERT into ClickHouse
 * in JSONEachRow format. Auto-creates the target table on first flush.
 */

export interface ClickHouseTransportOptions {
  url: string; // e.g. "http://clickhouse:8123"
  database: string; // e.g. "logs"
  table?: string; // default: "app_logs"
  user?: string; // default: "default"
  password?: string; // default: ""
  batchSize?: number; // flush when buffer reaches this size (default: 50)
  flushIntervalMs?: number; // periodic flush interval (default: 2000)
}

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  msg: string;
  data: string; // JSON-encoded extra fields
}

const LEVEL_MAP: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

export class ClickHouseTransport {
  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private tableCreated = false;
  private readonly url: string;
  private readonly database: string;
  private readonly table: string;
  private readonly user: string;
  private readonly password: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  constructor(opts: ClickHouseTransportOptions) {
    this.url = opts.url.replace(/\/$/, "");
    this.database = opts.database;
    this.table = opts.table ?? "app_logs";
    this.user = opts.user ?? "default";
    this.password = opts.password ?? "";
    this.batchSize = opts.batchSize ?? 50;
    this.flushIntervalMs = opts.flushIntervalMs ?? 2000;
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

  push(record: LogEvent | Record<string, unknown>): void {
    const raw = record as Record<string, unknown>;
    const level = LEVEL_MAP[raw.level as number] ?? String(raw.level ?? "info");
    const d = raw.time ? new Date(raw.time as number) : new Date();
    // ClickHouse DateTime64 expects YYYY-MM-DD HH:MM:SS.mmm (no T/Z)
    const ts = d.toISOString().replace("T", " ").replace("Z", "");
    const msg = String(raw.msg ?? "");
    const service = String(raw.service ?? raw.name ?? "unknown");
    const env = String(raw.env ?? "production");

    // Everything else goes into data
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
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
      )
      ENGINE = MergeTree()
      ORDER BY (service, timestamp)
      TTL toDateTime(timestamp) + INTERVAL 30 DAY
    `;
    try {
      await this.query(ddl);
      this.tableCreated = true;
    } catch (err) {
      console.error("[clickhouse-transport] Failed to create table:", err);
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    this.insertBatch(batch);
  }

  private async insertBatch(batch: LogEntry[]): Promise<void> {
    await this.ensureTable();

    const body = batch.map((e) => JSON.stringify(e)).join("\n");
    const params = new URLSearchParams({
      database: this.database,
      query: `INSERT INTO ${this.table} FORMAT JSONEachRow`,
      user: this.user,
      password: this.password,
    });

    try {
      const res = await fetch(`${this.url}/?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[clickhouse-transport] INSERT failed ${res.status}: ${text.slice(0, 200)}`,
        );
      }
    } catch (err) {
      console.error("[clickhouse-transport] flush error:", err);
    }
  }

  private async query(sql: string): Promise<string> {
    const params = new URLSearchParams({
      database: this.database,
      query: sql,
      user: this.user,
      password: this.password,
    });
    const res = await fetch(`${this.url}/?${params}`, { method: "POST" });
    return res.text();
  }
}
